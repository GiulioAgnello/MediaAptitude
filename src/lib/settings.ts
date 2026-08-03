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

/** Immagine hero risolta da WP: URL assoluto + dimensioni reali (anti-CLS). */
export interface HeroImage {
  url: string;
  width: number;
  height: number;
}

/** Contenuti della hero home editabili da WP. Tutti opzionali: i campi non
 *  compilati non vengono nemmeno inviati e restano ai default di Hero.astro. */
export interface HeroContent {
  badge?: string;
  title?: string;
  lead?: string;
  ctaLabel?: string;
  ctaHref?: string;
  cta2Label?: string;
  cta2Href?: string;
  image?: HeroImage;
  imageAlt?: string;
}

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
  hero?: HeroContent;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Memoize della richiesta: l'endpoint viene interrogato UNA volta per build
 * anche se più moduli lo usano (site.ts a top-level, Hero.astro via getHero).
 */
let settingsPromise: Promise<SiteOverrides> | null = null;

/** Legge le impostazioni globali; in caso di errore ritorna {} (usa i default). */
export function fetchSettings(): Promise<SiteOverrides> {
  settingsPromise ??= requestSettings();
  return settingsPromise;
}

async function requestSettings(): Promise<SiteOverrides> {
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

/**
 * Contenuti della hero home. Ritorna {} se WP non è raggiungibile o la sezione
 * non è compilata: Hero.astro usa i propri default.
 *
 * L'immagine viene tenuta SOLO se effettivamente scaricabile: `astro:assets`
 * ottimizza le immagini remote a build-time e, se l'URL non risponde, farebbe
 * fallire l'intera build. Meglio ricadere sull'asset locale.
 */
export async function getHero(): Promise<HeroContent> {
  const { hero } = await fetchSettings();
  if (!hero || typeof hero !== 'object') return {};

  if (hero.image?.url && !(await isReachable(hero.image.url))) {
    console.warn('[hero] immagine WP non raggiungibile, uso il fallback locale');
    const { image, ...rest } = hero;
    return rest;
  }

  return hero;
}

/** HEAD (con fallback GET) per verificare che l'immagine remota esista. */
async function isReachable(url: string): Promise<boolean> {
  for (const method of ['HEAD', 'GET'] as const) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { method, signal: controller.signal });
      if (res.ok) return true;
    } catch {
      /* provo il metodo successivo */
    } finally {
      clearTimeout(timer);
    }
  }

  return false;
}
