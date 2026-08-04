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

const TIMEOUT_MS = 20_000;
const ATTEMPTS = 4;
/** Attesa prima del tentativo successivo: cresce (500ms, 1s, 2s). */
const retryDelay = (attempt: number) => 500 * 2 ** (attempt - 1);
/** Cache-buster per bypassare l'eventuale cache server-side di Aruba. */
const BUILD_ID = Date.now();

/**
 * STRICT: la build punta a un CMS remoto (produzione).
 * Vedi la nota estesa in `api.ts`. In sintesi: in produzione un fallback
 * silenzioso pubblica un sito monco (hero col placeholder, telefono e GA4
 * spariti) senza che nessuno se ne accorga. Meglio fermare la build e tenere
 * online l'ultimo deploy buono. `ALLOW_MOCK_FALLBACK=1` disattiva il blocco.
 */
const IS_LOCAL_CMS = /\/\/[^/]*(localhost|\.local|127\.0\.0\.1)/i.test(API_BASE);
const STRICT =
  import.meta.env.PROD && // solo in build: `npm run dev` non deve mai crashare
  !IS_LOCAL_CMS &&
  import.meta.env.ALLOW_MOCK_FALLBACK !== '1';

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
 *
 * IMPORTANTE: si memoizza SOLO il successo. Prima veniva memoizzato anche il
 * fallimento, quindi bastava un singolo timeout all'avvio della build perché
 * l'INTERO sito perdesse hero, telefono, indirizzo e GA4 senza un errore
 * visibile — è la causa della hero tornata al placeholder il 03/08/2026.
 */
let settingsPromise: Promise<SiteOverrides> | null = null;

/**
 * Legge le impostazioni globali dal CMS.
 * In produzione un guasto interrompe la build (STRICT); in locale si ricade
 * sui default statici del codice.
 */
export function fetchSettings(): Promise<SiteOverrides> {
  settingsPromise ??= requestSettings().catch((err: Error) => {
    settingsPromise = null; // fallimento NON memoizzato: si può ritentare

    if (STRICT) {
      throw new Error(
        `[settings] endpoint "/settings" irraggiungibile dopo ${ATTEMPTS} tentativi (${err.message}).\n` +
          `      Build interrotta: senza queste impostazioni il sito perderebbe hero, contatti e tracking.\n` +
          `      Verifica che ${API_BASE} risponda, poi rilancia il deploy.\n` +
          `      (Solo per emergenze: ALLOW_MOCK_FALLBACK=1 forza la build coi default statici.)`
      );
    }

    console.warn(`[settings] uso i default statici (${err.message})`);
    return {};
  });

  return settingsPromise;
}

/** Interroga /settings con timeout e tentativi crescenti. Lancia se fallisce. */
async function requestSettings(): Promise<SiteOverrides> {
  const url = `${API_BASE}/settings?_cb=${BUILD_ID}`;
  let lastError = new Error('nessun tentativo eseguito');

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
      lastError = err as Error;
      if (attempt < ATTEMPTS) {
        console.warn(
          `[settings] tentativo ${attempt}/${ATTEMPTS} fallito (${lastError.message}) → ritento`
        );
        await sleep(retryDelay(attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
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

  // Diagnostica nel log di build: dice a colpo d'occhio cosa ha risposto WP.
  if (!hero || typeof hero !== 'object') {
    console.info('[hero] WP non ha restituito la sezione hero → default statici');
    return {};
  }
  console.info(
    `[hero] campi da WP: ${Object.keys(hero).join(', ') || 'nessuno'} | immagine: ${
      hero.image?.url ?? 'assente'
    }`
  );

  if (!hero.image?.url) return hero;

  const usable = await firstReachable(imageCandidates(hero.image.url));

  if (!usable) {
    if (STRICT) {
      throw new Error(
        `[hero] l'immagine impostata in WordPress non è scaricabile: ${hero.image.url}\n` +
          `      Build interrotta: pubblicheremmo la home col placeholder invece della foto scelta.\n` +
          `      Ricarica l'immagine in WordPress (o togli il campo "Immagine hero"), poi rilancia il deploy.`
      );
    }
    console.warn('[hero] immagine WP non raggiungibile, uso il fallback locale');
    const { image, ...rest } = hero;
    return rest;
  }

  if (usable !== hero.image.url) {
    console.info(`[hero] immagine servita da ${new URL(usable).host}`);
  }
  return { ...hero, image: { ...hero.image, url: usable } };
}

/**
 * URL da provare per l'immagine, in ordine di preferenza.
 *
 * WordPress costruisce gli URL degli allegati dall'option `siteurl`, che qui
 * è `www.media-aptitude.it`: ma su quel dominio risponde Cloudflare Pages (il
 * front-end statico), non WordPress — l'immagine passa solo grazie a una regola
 * di proxy. Proviamo quindi PRIMA l'host da cui parliamo con il CMS
 * (cms.media-aptitude.it), che arriva direttamente a WordPress, e solo dopo
 * l'URL originale. Entrambi gli host sono in `image.remotePatterns`.
 */
function imageCandidates(url: string): string[] {
  const candidates: string[] = [];

  try {
    const api = new URL(API_BASE);
    const original = new URL(url);
    if (original.host !== api.host) {
      const viaCms = new URL(url);
      viaCms.protocol = api.protocol;
      viaCms.host = api.host;
      candidates.push(viaCms.href);
    }
  } catch {
    /* URL malformato: resta il solo originale */
  }

  candidates.push(url);
  return [...new Set(candidates)];
}

/** Primo URL della lista che risponde davvero, altrimenti null. */
async function firstReachable(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    if (await isReachable(url)) return url;
  }
  return null;
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
