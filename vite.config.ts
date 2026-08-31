import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Slice 1–4 shell (spec §9): a standalone Vite + React app. The runtime-caching
// service worker (spec §7 / MM §12.4) and the Cloudflare Worker wrangler config
// land when the full UI is vendored in; kept out here so the design shell stays
// installable and boots with no backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
});
