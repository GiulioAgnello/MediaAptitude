// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build
export default defineConfig({
  // URL pubblico del sito: usato per sitemap, canonical e meta tag.
  // Da aggiornare con il dominio definitivo in produzione.
  site: 'https://www.media-aptitude.it',
  // Genera /sitemap-index.xml a build-time leggendo tutte le route statiche.
  integrations: [sitemap()],
  image: {
    // Domini da cui è lecito ottimizzare immagini remote: le foto caricate in
    // WordPress (es. la hero della home) vengono scaricate e riconvertite in
    // AVIF/WebP responsive a BUILD-TIME, come fossero asset locali.
    // Nessuna richiesta a WordPress dal browser dell'utente.
    remotePatterns: [
      { protocol: 'https', hostname: 'media-aptitude.it' },
      { protocol: 'https', hostname: 'www.media-aptitude.it' },
      // Sottodominio da cui è raggiunto WordPress in produzione: a seconda di
      // come sono impostate le option siteurl/home, gli URL degli allegati
      // possono arrivare da qui. Se l'host non è autorizzato la build FALLISCE.
      { protocol: 'https', hostname: 'cms.media-aptitude.it' },
      // Ambiente di sviluppo locale (LocalWP).
      { protocol: 'http', hostname: 'mediaaptitude.local' },
    ],
  },
  build: {
    // HTML statico per la massima SEO (SSG).
    format: 'directory',
    // CSS inline nell'HTML: meno richieste di rete, meglio per i Core Web Vitals.
    inlineStylesheets: 'always',
  },
});
