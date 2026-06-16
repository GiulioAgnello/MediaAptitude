// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build
export default defineConfig({
  // URL pubblico del sito: usato per sitemap, canonical e meta tag.
  // Da aggiornare con il dominio definitivo in produzione.
  site: 'https://www.mediaaptitude.it',
  build: {
    // HTML statico per la massima SEO (SSG).
    format: 'directory',
    // CSS inline nell'HTML: meno richieste di rete, meglio per i Core Web Vitals.
    inlineStylesheets: 'always',
  },
});
