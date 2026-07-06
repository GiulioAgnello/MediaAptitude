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
  caseStudies as mockCaseStudies,
  team as mockTeam,
} from '../data/content';
import type { Service, CaseStudy, TeamMember, MediaImage } from '../data/content';

/** Base URL della REST custom. Override via .env (WP_API_URL). */
const API_BASE = (
  import.meta.env.WP_API_URL ?? 'http://mediaaptitude.local/wp-json/mediaaptitude/v1'
).replace(/\/$/, '');

/** Timeout per evitare build appese se WP è irraggiungibile. */
const TIMEOUT_MS = 8000;

/**
 * Esegue la GET su un endpoint e ritorna il JSON tipizzato.
 * Accetta path relativi alla REST custom oppure URL assoluti (REST core).
 * In caso di errore (rete, HTTP non 2xx, timeout, payload vuoto) ritorna
 * il fallback fornito e logga un avviso, senza propagare l'eccezione.
 */
async function fetchApi<T>(endpoint: string, fallback: T): Promise<T> {
  const url = /^https?:\/\//.test(endpoint)
    ? endpoint
    : `${API_BASE}/${endpoint.replace(/^\//, '')}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
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
  } catch (err) {
    console.warn(
      `[api] fallback ai mock per "${endpoint}" (${(err as Error).message})`
    );
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** Servizi offerti (sezione "Servizi"). */
export const getServices = () => fetchApi<Service[]>('services', mockServices);

/** Case study / lavori (collage portfolio). */
export const getCaseStudies = () =>
  fetchApi<CaseStudy[]>('case-studies', mockCaseStudies);

/** Membri del team. */
export const getTeam = () => fetchApi<TeamMember[]>('team', mockTeam);

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
