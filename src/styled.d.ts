import type { AppTheme } from "./shared/theme";

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends AppTheme {}
}

// Injected by vite.config.ts define — true only on Vercel CI builds (process.env.VERCEL === "1")
declare global {
  const __IS_VERCEL_BUILD__: boolean;
}
