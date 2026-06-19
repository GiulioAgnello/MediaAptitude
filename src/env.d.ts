/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Base URL della REST custom del WordPress headless. */
  readonly WP_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
