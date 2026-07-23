/**
 * Impostazioni globali del sito lette da WordPress (endpoint /settings) a
 * BUILD-TIME. Modulo volutamente AUTONOMO: non importa src/data/site.ts, così
 * evitiamo cicli di import (site.ts lo usa per risolvere i propri default con i
 * valori editati in WP admin).
 *
 * Se WP è offline o l'endpoint non risponde, ritorna {} → restano i default
 * statici del codice. I campi vuoti in WP non vengono nemmeno inviati dal
 * backend, quindi non possono "svuotare" un default.
 */

const API_BASE = (
  import.meta.env.WP_API_URL ?? 'http://mediaaptitude.local/wp-json/mediaaptitude/v1'
).replace(/\/$/, '');

const TIMEOUT_MS = 8000;
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;
/** Cache-buster per bypassare l'eventuale cache server-side di Aruba. */
const BUILD_ID = Date.now();

/** Override provenienti da WP: sottoinsieme dei campi di `site`. */
export interface SiteOverrides {
  name?: string;
  legalName?: string;
  tagline?: string;
  description?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  whatsappMessage?: string;
  priceRange?: string;
  streetAddress?: string;
  postalCode?: string;
  addressLocality?: string;
  addressRegion?: string;
  areaServed?: string[];
  social?: string[];
  geo?: { lat: string; lng: string };
  ogImage?: string;
  analytics?: { ga4: string };
  google?: { placeId: string };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Legge le impostazioni globali; in caso di errore ritorna {} (usa i default). */
export async function fetchSettings(): Promise<SiteOverrides> {
  const url = `${API_BASE}/settings?_cb=${BUILD_ID}`;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as unknown;
      return data && typeof data === 'object' ? (data as SiteOverrides) : {};
    } catch (err) {
      if (attempt === ATTEMPTS) {
        console.warn(`[settings] uso i default statici (${(err as Error).message})`);
        return {};
      }
      await sleep(RETRY_DELAY_MS);
    } finally {
      clearTimeout(timer);
    }
  }

  return {};
}
