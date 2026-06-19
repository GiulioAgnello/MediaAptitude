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
import type { Service, CaseStudy, TeamMember } from '../data/content';

/** Base URL della REST custom. Override via .env (WP_API_URL). */
const API_BASE = (
  import.meta.env.WP_API_URL ?? 'http://mediaaptitude.local/wp-json/mediaaptitude/v1'
).replace(/\/$/, '');

/** Timeout per evitare build appese se WP è irraggiungibile. */
const TIMEOUT_MS = 8000;

/**
 * Esegue la GET su un endpoint e ritorna il JSON tipizzato.
 * In caso di errore (rete, HTTP non 2xx, timeout, payload vuoto) ritorna
 * il fallback fornito e logga un avviso, senza propagare l'eccezione.
 */
async function fetchApi<T>(endpoint: string, fallback: T): Promise<T> {
  const url = `${API_BASE}/${endpoint.replace(/^\//, '')}`;
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
