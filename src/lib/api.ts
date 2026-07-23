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
const TIMEOUT_MS = 8000;

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

/** Tentativi per endpoint prima di arrendersi ai mock (rete/Aruba lenta). */
const FETCH_ATTEMPTS = 3;
/** Attesa tra un tentativo e l'altro. */
const RETRY_DELAY_MS = 500;

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
      throw new Error('payload vuoto o non valido');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Esegue la GET su un endpoint e ritorna il JSON tipizzato.
 * Accetta path relativi alla REST custom oppure URL assoluti (REST core).
 * Ritenta fino a FETCH_ATTEMPTS volte; se tutti i tentativi falliscono ritorna
 * il fallback (mock) senza propagare l'eccezione. Risultati riusciti e
 * richieste concorrenti sono condivisi via cache/dedup (vedi sopra).
 */
async function fetchApi<T>(endpoint: string, fallback: T): Promise<T> {
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
        const data = await fetchOnce<T>(url, fallback);
        successCache.set(endpoint, data); // solo i successi vengono cachati
        return data;
      } catch (err) {
        const last = attempt === FETCH_ATTEMPTS;
        console.warn(
          `[api] "${endpoint}" tentativo ${attempt}/${FETCH_ATTEMPTS} fallito (${(err as Error).message})${last ? ' → mock' : ' → ritento'}`
        );
        if (last) return fallback; // non cachato: ritentabile da altre pagine
        await sleep(RETRY_DELAY_MS);
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
  const groups = await fetchApi<ServiceGroup[] | null>('service-groups', null);
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

/** Case study / lavori (collage portfolio). */
export const getCaseStudies = () =>
  fetchApi<CaseStudy[]>('case-studies', mockCaseStudies);

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

/**
 * Dati SEO (yoast_head_json) per una pagina. Endpoint: /seo?path=...
 * Ritorna null in fallback: la SEO ricade sui default di `site.ts`.
 * Il wiring completo nei componenti arriva con S4 (SEO tecnica).
 */
export const getSeo = (path = '/') =>
  fetchApi<Record<string, unknown> | null>(
    `seo?path=${encodeURIComponent(path)}`,
    null
  );

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
  const raw = await fetchApi<any[]>(
    `${WP_ROOT}/wp/v2/posts?status=publish&per_page=100&_embed=wp:featuredmedia`,
    []
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
