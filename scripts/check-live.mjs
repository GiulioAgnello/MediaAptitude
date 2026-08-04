/**
 * Verifica del sito — sulla cartella `dist` appena costruita oppure sul sito
 * già pubblicato.
 *
 * Nasce dal guasto del 04/08/2026: una build aveva generato le pagine dei case
 * study FINTI mentre i link puntavano a quelli veri (404), e la hero era
 * tornata al placeholder. Nessuno dei due problemi era visibile dal log di
 * build. Questo script guarda il risultato FINITO, come farebbe Google.
 *
 * Controlla:
 *   1. ogni URL della sitemap esiste davvero;
 *   2. ogni case study pubblicato in WordPress ha la sua pagina;
 *   3. non ci sono lavori di esempio finiti in sitemap;
 *   4. i <title> sono unici (il passthrough Yoast li rendeva tutti uguali);
 *   5. la hero usa la foto di WordPress e non il placeholder locale.
 *
 * Uso:
 *   node scripts/check-live.mjs dist          # prima di pushare
 *   node scripts/check-live.mjs               # sito pubblicato (www)
 *   node scripts/check-live.mjs https://...   # un deploy di anteprima
 *
 * Esce con codice 1 se trova problemi.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const TARGET = process.argv[2] ?? 'https://www.media-aptitude.it';
const IS_LIVE = /^https?:\/\//.test(TARGET);
const SITE = TARGET.replace(/\/$/, '');

const CMS =
  process.env.WP_API_URL?.replace(/\/$/, '') ??
  'https://cms.media-aptitude.it/wp-json/mediaaptitude/v1';

const problems = [];
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const ko = (msg) => {
  problems.push(msg);
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
};

/** GET con timeout: ritorna { status, body } senza mai lanciare. */
async function httpGet(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'manual' });
    return { status: res.status, body: await res.text() };
  } catch (err) {
    return { status: 0, body: '', error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Legge una pagina, dal sito pubblicato o dalla cartella di build.
 * `pathname` è sempre nella forma servita, con lo slash finale ("/lavori/x/").
 */
async function page(pathname) {
  if (IS_LIVE) return httpGet(`${SITE}${pathname}`);

  const file = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  try {
    return { status: 200, body: await readFile(join(SITE, file), 'utf8') };
  } catch (err) {
    return { status: 404, body: '', error: err.code };
  }
}

/** La sitemap, letta dalla stessa sorgente delle pagine. */
async function sitemapPaths() {
  const res = IS_LIVE
    ? await httpGet(`${SITE}/sitemap-0.xml`)
    : await page('/sitemap-0.xml');
  return [...res.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';

/* ------------------------------------------------------------------ */

console.log(`\nVerifica di ${SITE}${IS_LIVE ? '' : ' (cartella di build)'}\n`);

// 1. Sitemap e pagine --------------------------------------------------
console.log('Sitemap e pagine');
const paths = await sitemapPaths();

if (paths.length === 0) {
  ko('sitemap-0.xml vuota o non trovata');
} else {
  ok(`sitemap con ${paths.length} URL`);
}

const titles = new Map(); // title -> [pathname]
let allPagesOk = true;
for (const pathname of paths) {
  const res = await page(pathname);
  if (res.status !== 200) {
    ko(`${pathname} → ${res.status || res.error}`);
    allPagesOk = false;
    continue;
  }
  const t = titleOf(res.body);
  if (!titles.has(t)) titles.set(t, []);
  titles.get(t).push(pathname);
}
if (paths.length && allPagesOk) ok('tutte le pagine della sitemap esistono');

// 2. Case study: WordPress vs sito ------------------------------------
console.log('\nCase study: WordPress vs sito');
const cs = await httpGet(`${CMS}/case-studies?_cb=${Date.now()}`);
let wpSlugs = [];
try {
  wpSlugs = JSON.parse(cs.body).map((c) => c.slug);
  ok(`WordPress espone ${wpSlugs.length} case study`);
} catch {
  ko(`/case-studies non leggibile (${cs.status || cs.error}) — controllo saltato`);
}

for (const slug of wpSlugs) {
  const res = await page(`/lavori/${slug}/`);
  if (res.status === 200) ok(`/lavori/${slug}/ presente`);
  else ko(`/lavori/${slug}/ manca (${res.status || res.error}) — pagina non generata dalla build`);
}

// 3. Lavori di esempio rimasti in giro --------------------------------
const orphans = paths
  .filter((p) => p.startsWith('/lavori/') && p !== '/lavori/')
  .map((p) => p.replace(/^\/lavori\/|\/$/g, ''))
  .filter((s) => s && wpSlugs.length > 0 && !wpSlugs.includes(s));
if (orphans.length) {
  ko(`in sitemap ci sono lavori che WordPress non ha: ${orphans.join(', ')} (contenuti di esempio finiti online)`);
} else if (wpSlugs.length) {
  ok('nessun lavoro di esempio in sitemap');
}

// 4. Title duplicati ---------------------------------------------------
console.log('\nTitle unici');
const dupes = [...titles.entries()].filter(([, list]) => list.length > 1);
if (dupes.length === 0) ok('nessun <title> duplicato');
for (const [t, list] of dupes) {
  ko(`title "${t}" ripetuto su ${list.length} pagine: ${list.join(', ')}`);
}

// 5. Immagine della hero ----------------------------------------------
console.log('\nHero');
const home = await page('/');
const figure = home.body.match(/<figure class="hero__media[\s\S]{0,1500}?<\/figure>/)?.[0] ?? '';
if (!figure) {
  ko('non trovo la figure della hero nella home');
} else if (/home-team\./.test(figure)) {
  ko("la hero usa il placeholder locale (home-team.jpg): l'immagine di WordPress non è entrata nella build");
} else if (/_astro\//.test(figure)) {
  ok('la hero usa la foto di WordPress, ottimizzata a build-time');
} else {
  ko('la hero non passa da astro:assets: immagine non ottimizzata');
}

/* ------------------------------------------------------------------ */

console.log(
  problems.length === 0
    ? '\n\x1b[32mTutto a posto.\x1b[0m\n'
    : `\n\x1b[31m${problems.length} problemi da sistemare.\x1b[0m\n`
);
process.exit(problems.length === 0 ? 0 : 1);
