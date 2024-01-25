/* eslint-disable @typescript-eslint/consistent-type-definitions */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_APPLICATION_DISABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
