# Curator Extension — Chrome Web Store Listing

Use this document when submitting the extension to the Chrome Web Store. Replace `{SITE_URL}` with your deployed Curator app URL (same value as `NEXT_PUBLIC_SITE_URL` / `VITE_CURATOR_API_URL`).

---

## Store fields

| Field | Value |
|-------|--------|
| **Name** | Curator |
| **Category** | Productivity |
| **Language** | English |
| **Privacy policy URL** | `https://curator-grid.app/privacy` |
| **Official website / Homepage** | `https://curator-grid.app` |

---

## Short description (≤ 132 characters)

Save URLs and images from any webpage into your Curator inspiration boards.

---

## Detailed description

Curator is your personal inspiration board. This extension lets you save design references from anywhere on the web without leaving the page you are browsing.

**Save URLs** — Capture the current tab's link, choose a viewport (mobile, tablet, or desktop), and add it to a collection.

**Save images** — Select one or more images on a page and save them in a batch to a single collection.

**Sign in once** — Connect from an open Curator tab or sign in directly in the extension. Your session persists across browser restarts.

**Built for Curator users** — Saved items appear in your existing Curator collections in the web app, with the same compression and storage as uploads from the dashboard.

The extension only reads page data when you click the toolbar icon and use the save panel. It does not track your browsing history.

Requires a free Curator account. Create collections in the web app at `https://curator-grid.app`.

---

## Permission justifications (Chrome Web Store review)

| Permission | Why it is needed |
|------------|------------------|
| **Read and change all your data on all websites** (`host_permissions: <all_urls>`) | Inject the save panel when you click the extension icon; enable image pick mode on the current page; download image URLs you select from third-party CDNs. Used only on user action, not in the background. |
| **activeTab** | Read the active tab URL and title for URL saves. |
| **storage** | Persist your sign-in session and cached collection list locally. |
| **scripting** | Inject the content script on demand if the panel has not loaded yet. |
| **tabs** | Find an open Curator tab to connect your existing web app session. |
| **cookies** | Read Supabase auth cookies from an open Curator tab for connect-from-tab sign-in. |

### Additional privacy form fields

**Host permission justification:**

Curator uses host access to inject the save panel only after the user clicks the extension icon, highlight selectable images while image pick mode is active, and download only the image URLs the user selects for saving. It does not monitor browsing activity in the background.

**Remote code:**

Select **No, I am not using remote code**.

Curator does not load or execute JavaScript or WebAssembly from remote servers. The extension code is bundled in the submitted package. Network requests are used only for Curator API calls, Supabase authentication, metadata fetching, and downloading user-selected images.

### Data usage disclosure

Recommended selections:

- [x] **Personally identifiable information** — user account email is used for sign-in / account identity.
- [x] **Authentication information** — native extension login accepts credentials and sends them to Supabase Auth; the extension stores the resulting session locally.
- [x] **Website content** — the extension reads the active tab URL/title for URL saves and downloads image URLs explicitly selected by the user.
- [ ] **Health information**
- [ ] **Financial and payment information**
- [ ] **Personal communications**
- [ ] **Location**
- [ ] **Web history** — Curator does not collect a browsing history list; it only saves URLs/images the user explicitly chooses.
- [ ] **User activity** — Curator does not log browsing behavior, keystrokes, mouse position, scrolling, or network monitoring.

Certification checkboxes:

- [x] I do not sell or transfer user data to third parties, outside of approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

---

## Assets checklist

Before submitting, prepare:

- [ ] **Icon** — 128×128 PNG (included in `extension/icons/`)
- [ ] **Screenshots** — At least 1, up to 5 (1280×800 or 640×400). Suggested captures:
  - URL save panel with collection picker
  - Image pick mode with selection on a gallery page
  - Post-save success state
  - Auth / sign-in screen
- [ ] **Promotional tile** (optional) — 440×280 small promo, 920×680 marquee
- [ ] **Privacy policy** live at `https://curator-grid.app/privacy`

---

## Production build

1. Copy `extension/.env.production.example` → `extension/.env.production`
2. Set `VITE_CURATOR_API_URL` to `https://curator-grid.app` (no trailing slash)
3. Set Supabase keys from production project
4. Build:

```bash
pnpm extension:build
```

5. Upload `extension/dist` as an unpacked test, then zip for store submission:

```bash
cd extension/dist && zip -r ../curator-extension.zip .
```

6. Bump `version` in `extension/manifest.config.ts` and `extension/package.json` for each store release.

---

## Pre-submit QA

Run through this checklist on a **clean Chrome profile** with the **production** build pointed at `{SITE_URL}`.

### Panel & auth
- [ ] Icon opens panel on a normal https page
- [ ] Panel does not open on `chrome://` pages (expected)
- [ ] Connect-from-tab works when signed into Curator in another tab
- [ ] Native login works when no Curator tab is open
- [ ] Session persists after browser restart

### URL save
- [ ] Tab URL captured; save to a collection succeeds
- [ ] Item appears in web app collection
- [ ] Success screen opens collection in new tab

### Image save
- [ ] Pick mode highlights images on hover
- [ ] Multi-select and bulk save with progress
- [ ] Items appear in web app

### Target sites
- [ ] Static blog / marketing page
- [ ] Image-heavy gallery (e.g. Pinterest, Dribbble)
- [ ] SPA with lazy-loaded images

### Store compliance
- [ ] Privacy policy URL loads without login
- [ ] Permissions match listing justifications
- [ ] No console errors on panel open / save

---

## Single purpose statement (if prompted)

Curator lets authenticated users save URLs and images from webpages into their private Curator inspiration boards.
