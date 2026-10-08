/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Base URL of the Java REST API — server-side only, never PUBLIC_ */
  readonly API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
