/**
 * Client REST centralizzato per il WordPress headless.
 *
 * Tutte le chiamate ai contenuti passano da qui: i componenti e le pagine
 * importano solo i getter (getServices, getCaseStudies, ...), mai fetch sparsi.
 *
 * Strategia: le richieste girano a BUILD-TIME (Astro SSG), quindi nessun
 * impatto runtime e nessun problema di CORS. Se WordPress non risponde
 * (spento in dev, build offline, payload vuoto), si ricade automaticamente
 * sui dati mock di `content.ts`: la build non si rompe mai.
 */
import {
  services as mockServices,
  serviceGroups as mockServiceGroups,
  caseStudies as mockCaseStudies,
  team as mockTeam,
  stats as mockStats,
} from '../data/content';
import type { Service, ServiceGroup, CaseStudy, TeamMember, MediaImage, Stat, Testimonial } from '../data/content';
import { site } from '../data/site';

/** Base URL della REST custom. Override via .env (WP_API_URL). */
const API_BASE = (
  import.meta.env.WP_API_URL ?? 'http://mediaaptitude.local/wp-json/mediaaptitude/v1'
).replace(/\/$/, '');

/** Timeout per evitare build appese se WP è irraggiungibile. */
const TIMEOUT_MS = 20_000;

/**
 * MODALITÀ STRICT: attiva quando la build punta a un CMS REMOTO (produzione).
 *
 * Perché esiste: i mock sono una rete di sicurezza per lo sviluppo, ma in
 * produzione un fallback silenzioso è PEGGIO di un errore. È già successo:
 * `getStaticPaths` di /lavori/[slug] ha ricevuto i mock (una fetch andata in
 * timeout) mentre le pagine renderizzate dopo hanno ricevuto i dati veri →
 * sono state generate le pagine dei case study FINTI, e i link ai lavori reali
 * puntavano a URL inesistenti (404), con la sitemap piena di slug sbagliati.
 *
 * Con STRICT attivo, un endpoint CRITICO che non risponde fa fallire la build:
 * Cloudflare non pubblica nulla e resta online l'ultimo deploy buono.
 *
 * Disattivabile con `ALLOW_MOCK_FALLBACK=1` (build di emergenza col CMS giù).
 */
const IS_LOCAL_CMS = /\/\/[^/]*(localhost|\.local|127\.0\.0\.1)/i.test(API_BASE);
const STRICT =
  import.meta.env.PROD && // solo in build: `npm run dev` non deve mai crashare
  !IS_LOCAL_CMS &&
  import.meta.env.ALLOW_MOCK_FALLBACK !== '1';

/**
 * Massimo di richieste in volo verso WP.
 * Astro valuta TUTTI i `getStaticPaths` in parallelo all'inizio della build:
 * senza freno partono N richieste insieme e l'hosting condiviso (Aruba, con il
 * cache-buster che bypassa AHSC) va in timeout proprio nella fase in cui si
 * decidono le route. Le richieste vengono quindi messe in coda.
 */
const MAX_CONCURRENCY = 2;

let active = 0;
const queue: (() => void)[] = [];

/** Semaforo: esegue `task` quando c'è uno slot libero. */
async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENCY) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  active++;
  try {
    return await task();
  } finally {
    active--;
    queue.shift()?.();
  }
}

/**
 * ID univoco per ogni build (valutato una volta al caricamento del modulo).
 * Aggiunto come query param alle GET build-time per BYPASSARE la cache
 * server-side di Aruba (AHSC), che altrimenti servirebbe dati vecchi e il
 * sito statico "cuocerebbe" contenuti non aggiornati. Non tocca il runtime.
 */
const BUILD_ID = Date.now();

/** Accoda il cache-buster all'URL, rispettando eventuali query già presenti. */
function bustCache(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}_cb=${BUILD_ID}`;
}

/** Tentativi per endpoint prima di arrendersi (rete/Aruba lenta). */
const FETCH_ATTEMPTS = 4;
/** Attesa prima del tentativo successivo: cresce (500ms, 1s, 2s). */
const retryDelay = (attempt: number) => 500 * 2 ** (attempt - 1);

/**
 * Cache dei risultati RIUSCITI e dedup delle richieste in volo, per build.
 * Motivo: ogni pagina statica chiama gli stessi endpoint; senza questa cache
 * si fanno N richieste identiche a WP e basta che UNA vada in timeout perché
 * quella pagina "cada" sui mock (es. home coi lavori finti mentre /lavori ok).
 * Cachiamo solo i successi: un fallback non viene memorizzato, così una pagina
 * successiva può ritentare e, se WP risponde, ottenere comunque il dato reale.
 */
const successCache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * WP ha risposto correttamente ma la lista è vuota (es. nessuna statistica
 * inserita nel CMS). NON è un guasto: niente retry e niente build fallita,
 * si usano semplicemente i mock/placeholder.
 */
class EmptyPayloadError extends Error {}

/** Singola GET con timeout; lancia in caso di errore o payload vuoto. */
async function fetchOnce<T>(url: string, fallback: T): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(bustCache(url), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as T;

    // Liste vuote o malformate: meglio il fallback dei mock.
    if (Array.isArray(fallback) && (!Array.isArray(data) || data.length === 0)) {
      throw new EmptyPayloadError('payload vuoto o non valido');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Opzioni per endpoint. */
interface FetchOptions {
  /**
   * Endpoint da cui dipende la STRUTTURA del sito (route generate, link,
   * sitemap). Se non risponde, in produzione la build deve fallire: pubblicare
   * una versione parziale genererebbe 404 e slug sbagliati in sitemap.
   */
  critical?: boolean;
  /**
   * Una lista vuota è un ERRORE, non un caso legittimo. Vale per i contenuti
   * che in produzione ci sono per forza (i case study): se WP li restituisce
   * vuoti, pubblicheremmo i lavori FINTI di `content.ts` spacciandoli per veri.
   * Per il blog, invece, "nessun articolo" è uno stato normale.
   */
  emptyIsError?: boolean;
}

/**
 * Esegue la GET su un endpoint e ritorna il JSON tipizzato.
 * Accetta path relativi alla REST custom oppure URL assoluti (REST core).
 *
 * Ritenta fino a FETCH_ATTEMPTS volte con attesa crescente. Poi:
 * - endpoint CRITICO + build di produzione → lancia (build fallita, vedi STRICT);
 * - altrimenti → ritorna il fallback (mock) con un warning.
 *
 * Risultati riusciti e richieste concorrenti sono condivisi via cache/dedup.
 */
async function fetchApi<T>(
  endpoint: string,
  fallback: T,
  { critical = false, emptyIsError = false }: FetchOptions = {}
): Promise<T> {
  if (successCache.has(endpoint)) {
    return successCache.get(endpoint) as T;
  }
  const pending = inflight.get(endpoint);
  if (pending) {
    return pending as Promise<T>;
  }

  const url = /^https?:\/\//.test(endpoint)
    ? endpoint
    : `${API_BASE}/${endpoint.replace(/^\//, '')}`;

  const run = (async (): Promise<T> => {
    for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
      try {
        const data = await withSlot(() => fetchOnce<T>(url, fallback));
        successCache.set(endpoint, data); // solo i successi vengono cachati
        return data;
      } catch (err) {
        const message = (err as Error).message;

        // Risposta valida ma vuota: non è un guasto, inutile insistere.
        if (err instanceof EmptyPayloadError) {
          if (emptyIsError && STRICT) {
            throw new Error(
              `[api] "${endpoint}" ha risposto ma non contiene nulla.\n` +
                `      Build interrotta: pubblicheremmo i contenuti di esempio al posto di quelli reali.\n` +
                `      Controlla che i contenuti siano pubblicati in WordPress, poi rilancia il deploy.`
            );
          }
          console.info(`[api] "${endpoint}" non ha contenuti in WP → uso i dati statici`);
          return fallback;
        }

        const last = attempt === FETCH_ATTEMPTS;
        if (!last) {
          console.warn(
            `[api] "${endpoint}" tentativo ${attempt}/${FETCH_ATTEMPTS} fallito (${message}) → ritento`
          );
          await sleep(retryDelay(attempt));
          continue;
        }

        if (critical && STRICT) {
          // Fallire qui è VOLUTO: meglio nessun deploy che un deploy incoerente.
          throw new Error(
            `[api] endpoint critico "${endpoint}" irraggiungibile dopo ${FETCH_ATTEMPTS} tentativi (${message}).\n` +
              `      Build interrotta per non pubblicare un sito con contenuti finti e link rotti.\n` +
              `      Verifica che ${API_BASE} risponda, poi rilancia il deploy.\n` +
              `      (Solo per emergenze: ALLOW_MOCK_FALLBACK=1 forza la build coi dati statici.)`
          );
        }

        console.warn(`[api] "${endpoint}" non disponibile (${message}) → uso i dati statici`);
        return fallback; // non cachato: ritentabile da altre pagine
      }
    }
    return fallback;
  })().finally(() => inflight.delete(endpoint));

  inflight.set(endpoint, run);
  return run as Promise<T>;
}

/** Servizi offerti (sezione "Servizi"). */
export const getServices = () => fetchApi<Service[]>('services', mockServices);

/**
 * Gruppi di servizi = pagine /servizi/[slug] + tab in home.
 * Da WP arrivano già coi servizi inclusi risolti (`services`). Se WP non ha
 * gruppi (o è offline) si ricade sui mock di content.ts, risolvendo gli
 * `serviceSlugs` nei rispettivi servizi così la shape resta identica.
 */
export async function getServiceGroups(): Promise<ServiceGroup[]> {
  // Critico: da qui nascono le route /servizi/[slug] e le voci del menu.
  const groups = await fetchApi<ServiceGroup[] | null>('service-groups', null, {
    critical: true,
  });
  if (Array.isArray(groups) && groups.length > 0) {
    return groups;
  }

  // Fallback: risolvo gli serviceSlugs dei mock in oggetti `services`.
  const bySlug = new Map(mockServices.map((s) => [s.slug, s]));
  return mockServiceGroups.map((g) => ({
    ...g,
    services: g.serviceSlugs
      .map((slug) => bySlug.get(slug))
      .filter((s): s is Service => Boolean(s))
      .map((s) => ({ icon: s.icon, title: s.title, summary: s.summary, bullets: s.bullets })),
  }));
}

/**
 * Case study / lavori. CRITICO: genera le route /lavori/[slug], i link delle
 * card e le voci di sitemap. Un fallback qui, con le altre pagine sui dati
 * veri, produce link a pagine mai generate (404) — è il bug del 04/08/2026.
 */
export const getCaseStudies = () =>
  fetchApi<CaseStudy[]>('case-studies', mockCaseStudies, {
    critical: true,
    emptyIsError: true,
  });

/** Membri del team. */
export const getTeam = () => fetchApi<TeamMember[]>('team', mockTeam);

/**
 * Statistiche "trust bar". Dal CPT WP `ma_stat`; se WP è offline o non ne ha,
 * si usano i placeholder onesti di content.ts (la fascia resta sempre presente).
 */
export const getStats = () => fetchApi<Stat[]>('stats', mockStats);

/* ------------------------------------------------------------------ */
/* Recensioni: importate da Google (Places API) a BUILD-TIME. */

/**
 * Recensioni dal profilo Google Business, via Places API (New).
 * - Place ID pubblico in `site.google.placeId`; API key SEGRETA in env
 *   `GOOGLE_PLACES_API_KEY` (resta nell'ambiente di build, mai nel client).
 * - Se non configurate o in errore → lista vuota: la sezione recensioni
 *   semplicemente non compare (si attiva da sola quando ci saranno recensioni).
 * - Nota: l'API restituisce al massimo 5 recensioni e non è filtrabile.
 */
export async function getReviews(): Promise<Testimonial[]> {
  const placeId = site.google?.placeId ?? '';
  const key = import.meta.env.GOOGLE_PLACES_API_KEY ?? '';
  if (!placeId || !key) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      signal: controller.signal,
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'reviews',
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as any;
    const reviews = Array.isArray(data?.reviews) ? data.reviews : [];

    return reviews
      .filter((r: any) => r?.text?.text || r?.originalText?.text)
      .map((r: any): Testimonial => {
        const attr = r.authorAttribution ?? {};
        const photoUri = typeof attr.photoUri === 'string' ? attr.photoUri : '';
        return {
          quote: String(r.text?.text ?? r.originalText?.text ?? '').trim(),
          author: String(attr.displayName ?? 'Cliente Google'),
          role: String(r.relativePublishTimeDescription ?? 'Recensione Google'),
          rating: typeof r.rating === 'number' ? r.rating : undefined,
          sourceUrl: typeof attr.uri === 'string' ? attr.uri : undefined,
          photo: photoUri ? { url: photoUri, width: 44, height: 44 } : null,
        };
      });
  } catch (err) {
    console.warn(`[api] recensioni Google non disponibili (${(err as Error).message})`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/*
 * RIMOSSO (04/08/2026) — `getSeo(path)` / endpoint `/seo?path=...`.
 *
 * Il passthrough Yoast non risolveva l'URL nel post corrispondente e cadeva
 * SEMPRE sulla front page di WordPress: ogni pagina del sito riceveva title,
 * description e og:* della home (per giunta ancora il testo demo inglese del
 * vecchio tema). Duplicazione di title/description su tutto il sito = il danno
 * SEO peggiore che potessimo farci.
 *
 * La SEO ora ha due sole sorgenti, entrambe nostre e prevedibili:
 * 1) i campi SEO nativi del CMS (box "SEO" sui case study / gruppi servizi),
 *    passati alle pagine via la prop `seo` di BaseLayout;
 * 2) i default per pagina (title/description scritti in ogni .astro).
 * Per i post del blog resta `parseYoast(post.yoast)`, che legge lo yoast_head_json
 * del SINGOLO post incluso nel payload di /wp/v2/posts (quello è corretto).
 */

/* ------------------------------------------------------------------ */
/* Blog: post nativi WordPress (endpoint core /wp/v2, non il namespace custom) */

/** Post del blog, normalizzato dalla REST core di WP. */
export interface BlogPost {
  slug: string;
  /** Titolo in plain text (entità HTML risolte). */
  title: string;
  /** Estratto in plain text, senza markup. */
  excerpt: string;
  /** Contenuto dell'articolo, HTML renderizzato da WP. */
  contentHtml: string;
  /** Date ISO 8601 (con timezone) per schema Article e <time>. */
  published: string;
  modified: string;
  image?: MediaImage | null;
  /** yoast_head_json del post, se presente (da passare a parseYoast). */
  yoast?: Record<string, unknown> | null;
}

/** Radice della REST core (/wp-json), derivata dalla base del namespace custom. */
const WP_ROOT = API_BASE.replace(/\/mediaaptitude\/v1$/, '');

/** Risolve le entità HTML più comuni nei titoli WP (plain text, no DOM in build). */
function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#821[67];/g, (m) => (m === '&#8216;' ? '‘' : '’'))
    .replace(/&nbsp;/g, ' ');
}

/** Converte l'HTML di un excerpt WP in plain text compatto. */
function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/** Estrae la featured image dal payload _embedded, se disponibile. */
function featuredImage(raw: any): MediaImage | null {
  const media = raw?._embedded?.['wp:featuredmedia']?.[0];
  if (!media?.source_url) return null;
  return {
    url: media.source_url,
    width: media.media_details?.width ?? 1200,
    height: media.media_details?.height ?? 675,
    alt: media.alt_text || undefined,
  };
}

/**
 * Post pubblicati, dal più recente. Fallback: lista vuota (il blog parte
 * senza articoli e /blog mostra l'empty state; la build non si rompe).
 */
export async function getPosts(): Promise<BlogPost[]> {
  // Critico: genera le route /blog/[slug]. Lista vuota = blog senza articoli
  // (non è un errore); irraggiungibile in produzione = build fermata.
  const raw = await fetchApi<any[]>(
    `${WP_ROOT}/wp/v2/posts?status=publish&per_page=100&_embed=wp:featuredmedia`,
    [],
    { critical: true }
  );
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((p) => p?.slug && p?.title?.rendered)
    .map((p) => ({
      slug: p.slug,
      title: decodeEntities(String(p.title.rendered)),
      excerpt: stripHtml(String(p.excerpt?.rendered ?? '')),
      contentHtml: String(p.content?.rendered ?? ''),
      published: String(p.date_gmt ? `${p.date_gmt}Z` : p.date),
      modified: String(p.modified_gmt ? `${p.modified_gmt}Z` : p.modified),
      image: featuredImage(p),
      yoast: p.yoast_head_json ?? null,
    }));
}

/* ------------------------------------------------------------------ */
/* Pagine statiche editabili in WP (Privacy, Cookie Policy, ...) */

/** Pagina WP (contenuto legale/informativo gestito dal cliente nel CMS). */
export interface WpPage {
  title: string;
  /** HTML renderizzato da WP. */
  contentHtml: string;
  /** Data ultima modifica (ISO), per il "aggiornato il". */
  modified?: string;
  yoast?: Record<string, unknown> | null;
}

/**
 * Recupera una pagina WordPress per slug (endpoint core /wp/v2/pages).
 * Ritorna null se WP è offline o la pagina non esiste → la pagina Astro
 * usa il proprio contenuto statico di fallback (non resta mai vuota).
 */
export async function getPage(slug: string): Promise<WpPage | null> {
  const raw = await fetchApi<any[]>(
    `${WP_ROOT}/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=title,content,modified_gmt,yoast_head_json`,
    []
  );
  const p = Array.isArray(raw) ? raw[0] : null;
  if (!p?.content?.rendered) return null;
  return {
    title: decodeEntities(String(p.title?.rendered ?? '')),
    contentHtml: String(p.content.rendered),
    modified: p.modified_gmt ? `${p.modified_gmt}Z` : undefined,
    yoast: p.yoast_head_json ?? null,
  };
}

/** Payload del form di contatto. `company` è l'honeypot anti-bot (resta vuoto). */
export interface LeadPayload {
  name: string;
  email: string;
  message: string;
  source?: string;
  company?: string;
}

export interface LeadResult {
  ok: boolean;
  /** Messaggio d'errore leggibile, presente solo se ok === false. */
  error?: string;
}

/** Base URL pubblica della REST, per gli usi lato browser (risolta a build-time). */
export const apiBase = (): string => API_BASE;

/**
 * Invia il form di contatto a POST /lead.
 *
 * A differenza dei GET (build-time), questa parte dal BROWSER in runtime:
 * richiede quindi CORS abilitato sull'endpoint WordPress. `baseUrl` va passato
 * esplicitamente perché in Astro le env non-PUBLIC non arrivano al client: la
 * pagina lo risolve a build-time da WP_API_URL e lo inietta nel componente.
 */
export async function postLead(payload: LeadPayload, baseUrl: string): Promise<LeadResult> {
  const url = `${baseUrl.replace(/\/$/, '')}/lead`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // L'endpoint risponde con { message } in caso di errore di validazione.
      let msg = 'Invio non riuscito. Riprova tra poco.';
      try {
        const data = await res.json();
        if (data && typeof data.message === 'string') msg = data.message;
      } catch { /* corpo non JSON: tengo il messaggio generico */ }
      return { ok: false, error: msg };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Connessione non riuscita. Controlla la rete e riprova.' };
  }
}
