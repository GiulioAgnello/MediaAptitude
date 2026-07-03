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
  build: {
    // HTML statico per la massima SEO (SSG).
    format: 'directory',
    // CSS inline nell'HTML: meno richieste di rete, meglio per i Core Web Vitals.
    inlineStylesheets: 'always',
  },
});
