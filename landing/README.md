# Mord Hive — landing page

Static landing page for `hive.mordheimmanager.net`, deployed as its own assets-only Cloudflare Worker (`mordhive-landing`). No build step, no Worker code: `wrangler.jsonc` serves `public/` as-is.

- `public/index.html` — the page (Codex skin, tokens copied from `src/index.css`)
- `public/404.html` — same page, served for unknown paths
- `public/favicon.svg` — copy of the app's favicon

Deploy: Cloudflare dashboard → Workers & Pages → Create → Import a repository → this repo, branch `landing-page` (or `main` once merged), root directory `landing`, build command empty, deploy command `npx wrangler deploy`. Then attach the custom domain `hive.mordheimmanager.net`.

Temporary: replace with the app itself once Mord Hive is deployed on this hostname.
