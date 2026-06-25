# Curator browser extension

Chrome MV3 extension for saving URLs and images to Curator boards.

## Setup (local dev)

1. Copy env vars:

```bash
cp extension/.env.example extension/.env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from root .env.local
# VITE_CURATOR_API_URL defaults to http://127.0.0.1:3000
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the Next.js app and extension dev server in parallel:

```bash
pnpm dev              # from repo root
pnpm extension:dev    # or: pnpm --dir extension dev
```

4. Load unpacked in Chrome:
   - Open `chrome://extensions`
   - Enable Developer mode
   - Load unpacked → select `extension/dist`

Reload the extension after code changes.

## Production build (Chrome Web Store)

1. Deploy the Curator web app and note your production URL (`NEXT_PUBLIC_SITE_URL`).

2. Copy and fill production env:

```bash
cp extension/.env.production.example extension/.env.production
```

Set `VITE_CURATOR_API_URL` to your deployed URL (e.g. `https://your-domain.com`). The extension derives connect-from-tab auth origins from this URL.

3. Build:

```bash
pnpm extension:build
```

4. Test `extension/dist` on a clean Chrome profile, then zip for upload:

```bash
cd extension/dist && zip -r ../curator-extension.zip .
```

See [EXTENSION-STORE-LISTING.md](../docs/EXTENSION-STORE-LISTING.md) for store copy, permission justifications, and QA checklist.

## Privacy policy

The web app serves the extension privacy policy at `/privacy`. Use `{SITE_URL}/privacy` in the Chrome Web Store listing.

## Features

- Compact floating panel (375px) with URL | Image toggle
- Connect-from-tab auth + native Supabase login
- URL save with viewport and collection picker
- Image pick mode with multi-select and bulk save
- Post-save success with link to collection
