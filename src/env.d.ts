/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Base URL della REST custom del WordPress headless. */
  readonly WP_API_URL?: string;
  /** API key Google Places (recensioni a build-time). Segreta, solo server/build. */
  readonly GOOGLE_PLACES_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
