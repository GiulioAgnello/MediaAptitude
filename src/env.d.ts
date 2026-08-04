/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Base URL della REST custom del WordPress headless. */
  readonly WP_API_URL?: string;
  /** API key Google Places (recensioni a build-time). Segreta, solo server/build. */
  readonly GOOGLE_PLACES_API_KEY?: string;
  /**
   * Valvola di emergenza: '1' consente di completare la build coi dati statici
   * anche se WordPress non risponde. Da usare SOLO se serve pubblicare col CMS
   * giù, sapendo che i contenuti saranno quelli di `content.ts`.
   */
  readonly ALLOW_MOCK_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
