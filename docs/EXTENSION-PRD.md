# Product Requirements Document: Curator Browser Extension

## Overview

A browser extension that lets authenticated Curator users save inspiration from any webpage into their private boards. Clicking the extension icon opens a **persistent on-page panel** (not a dismissible toolbar popup) as a **compact floating card** with the same **URL | Image** segmented control as the web app’s Add item dialog.

**Relationship to main PRD:** Implements the Phase 3 “browser extension for quick-save” item from [PRD.md](../PRD.md).

**Design reference:** Panel styling should follow [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md). Layout frames and flows: [Design (Figma)](#design-figma) below.

---

## Goals

- Save **URLs** and **images** from any webpage — core content types from the web app, with a leaner save form (no title or notes fields)
- Minimize friction: one click to open the panel; collection choice persists when switching URL | Image modes
- **Sign in once:** after the first successful auth, the extension retains the session across browser restarts with silent token refresh — no repeated login on every use
- Support **bulk image save** via multi-select on the page before confirming
- Reuse existing backend logic (metadata fetch, image compression, Supabase storage, RLS)
- Target **Chrome (Manifest V3)** first; Firefox as a follow-up

## Non-Goals (MVP)

- Right-click / context menu saves
- Video upload
- Offline saving or sync queue
- Editing or deleting items from the extension (use the web app)
- Sign-out control in the extension (use the web app)
- Public sharing or collaboration
- Pinterest/bookmark import
- CSS background-image detection
- Safari extension

---

## User Stories

1. **As a user**, I want to click the extension icon and immediately see an add-item panel so I can save without leaving the page I’m browsing.
2. **As a user**, I want to switch between URL and Image modes with a segmented control so I can change my mind mid-flow without starting over.
3. **As a user**, I want the current tab’s URL captured automatically so I only need to choose viewport and collection before saving.
4. **As a user**, I want to pick a viewport size for URL saves so live previews match how I view the site in Curator.
5. **As a user**, I want to select multiple images on a page and save them in one batch so I can capture a mood board quickly.
6. **As a user**, I want a visual signifier on hoverable images (exact design TBD) so I know what I can select.
7. **As a user**, I want to choose which collection to save into after I’ve captured a URL or selected images so items land in the right board.
8. **As a user**, I want the extension to connect automatically when I’m signed into Curator in another tab so I don’t have to log in twice.
9. **As a user**, I want to sign in inside the extension (with the same look and feel as the web app) when connect isn’t available so I can still save from any page.
10. **As a user**, I want a confirmation after save with a prominent link to the collection so I know it worked and can view my items; I can dismiss the card anytime via the header close icon.

---

## Core UX

### Entry point

Clicking the extension toolbar icon **always opens the persistent panel** on the current tab. There is no separate “picker vs URL” chooser step before the panel appears.

The panel:
- Does **not** close when the user clicks elsewhere on the page
- Is dismissed only via the **close icon** in the top-right corner of the card (present on all views: auth, add form, and post-save success)
- Uses a **compact floating card** layout (see below) — not a full-height side sheet
- Contains: header, **URL | Image** toggle, tab content, primary action (no title or notes fields). **User choices come after content is captured** — see each tab’s flow below.

### Panel layout: compact floating card

The panel is a **small floating card** injected on the page, sized similarly to the web app auth card (`max-w-[375px]` on `app/auth/login/page.tsx`). It should feel lightweight and stay out of the way of the content underneath.

| Property | Guidance |
|----------|----------|
| **Width** | 375px max (match auth card); full width on very narrow viewports with margin |
| **Height** | Content-driven; cap with internal scroll if needed (e.g. bulk upload progress) — not full viewport height |
| **Position** | Fixed float, default top-right with offset from viewport edge (exact offset TBD in design) |
| **Surface** | `bg-card`, `rounded-3xl`, auth-card shadow stack — same family as login |
| **Header** | Title area + **close icon** (top-right), on every view (auth, add form, post-save) |
| **Intrusiveness** | Card only; no page dimming overlay. Image pick highlights on the page are separate from the card chrome. |

The **close icon** in the top-right is the only dismiss control — no separate close button or link in the card body.

### Tab behavior

The panel is **bound to the browser tab** where the user clicked the extension icon.

- **Switching to a different browser tab** does **not** close the panel. It stays open on the original tab; when the user returns to that tab, the card (and image pick mode, if active) is still there.
- **Opening the extension on another tab** is independent — each tab can have its own panel state, or opening on a new tab while another tab’s panel is open is TBD in implementation (default: one panel per tab, no cross-tab interference).

The panel is **not** a global overlay that follows the user across browser tabs.

Auth, URL save, image save, and **post-save success** all use the same card container — only inner content changes. The segmented toggle and form fields must fit comfortably without resembling the web app’s large add-item side panel (`575px` wide).

### Post-save success

After a successful save (single URL, single image, or bulk image batch), replace the form with a **success state** inside the same floating card:

1. **Confirmation message** — e.g. “Saved to [Collection name]” (for bulk: “3 images saved to [Collection name]”).
2. **View collection** (primary) — prominent button; opens `/dashboard/collections/{boardId}` in a new tab.

The **close icon** in the top-right corner stays visible on the success screen and is the way to dismiss the card (less prominent than the View collection button). There is no additional close control in the card body.

The card does **not** auto-close and does **not** return to the add form automatically. To save again, the user reopens the extension from the toolbar icon.

On save **failure**, stay on the form with an inline error; do not show the success state.

### URL | Image toggle

Same mental model as `AddItemDialog` in the web app:

| Tab | Behavior |
|-----|----------|
| **URL** | Active tab URL is **captured automatically**; user then chooses **viewport** and **collection**, then **Add URL** |
| **Image** | User **selects images on the page** first; then chooses **collection** and confirms save |

**Shared state across URL | Image modes** (persists when switching the segmented toggle):
- Collection (when set)
- Viewport (URL tab only; default `desktop`)

**Tab-specific state:**
- URL: captured website link (read-only display)
- Image: selected image URLs / blobs, selection count

**Switching mid-flow:**
- **URL → Image:** URL draft is preserved; pick mode activates on the page.
- **Image → URL:** Pick overlays are removed; selected images remain as a draft if the user switches back within the same session.
- During an active **bulk upload**, hide the toggle (same as web app `inImageSaveStage`) until the batch completes or is cancelled.

### URL save flow

When the **URL** tab is active:

1. **Capture URL** — read from the active tab’s URL automatically. This happens without user input; the user does not pick a collection or viewport before the URL is captured.
2. **User choices** — select **viewport size** and **collection** (collection pre-filled with last-used if available).
3. **Add URL** — save to the chosen collection at the chosen viewport.

**URL tab UI:** **Read-only URL display** (plain text or non-editable field — not an input the user types into; unlike the web app, which requires paste). Viewport selector and collection picker appear alongside. Collection is not a prerequisite step before the URL is known — the URL is captured first, then the user makes the two remaining selections.

### Image pick mode (on-page)

When the Image tab is active:

1. A content script enables selection on saveable `<img>` elements on the page.
2. Images show a **visual signifier** on hover indicating they can be selected (exact treatment TBD in design).
3. Click toggles selection; selected images show a persistent selected state.
4. A compact **selection summary** appears in the panel (e.g. “3 images selected”) with ability to clear selection.
5. **After at least one image is selected**, the panel shows the **confirm step**: collection picker (pre-filled with last-used collection if available) and **Save** button. User does not choose a collection before picking images.
6. User picks **one collection** for the entire batch and confirms. All selected images are saved to that same collection (no per-image collection picker in MVP).

**Image tab UI states:**
- **0 images selected:** selection summary + pick instructions only; no collection picker, no save button.
- **1+ images selected:** confirm step with collection picker + save button.

**Saveable image criteria (MVP):**
- `<img>` elements with a resolvable `src`
- Minimum dimensions filter to skip icons/tracking pixels (threshold TBD in implementation; suggest 80×80px rendered size)
- Prefer largest URL from `srcset` / `<picture>` when present

**Not in MVP:** CSS `background-image`, inline SVGs, canvas captures.

### Authentication

Auth uses a **connect-first, login-fallback** model. Both paths use the same Supabase session; the extension stores tokens in `chrome.storage` and refreshes them for API calls.

**Sign-in-once behavior:** If extension storage already holds a valid session (or one that can be silently refreshed), open the add-item UI immediately — no connect attempt and no login form. The user should only see auth UI on first setup or when the session can no longer be refreshed. There is **no sign-out control** in the extension; signing out happens in the web app only.

#### Primary: Connect from open Curator tab (default when not signed in)

When extension storage has **no valid session**, attempt to **read an existing session from an open Curator tab** before showing the login form:

1. Find a browser tab on the Curator app origin (e.g. `localhost:3000` in dev, production domain in prod).
2. Read the Supabase auth session from that tab (via content script or cookie bridge — implementation detail in Phase 1 spike).
3. If valid, copy session into extension storage and show the add-item UI immediately.

**UX:** No user action when already signed into Curator in another tab. Optional subtle “Connected to Curator” state in panel header.

**When connect fails** (no Curator tab open, tab not signed in, session expired, permission denied): fall through to native login below.

#### Fallback: Native login in extension

If connect does not yield a valid session, show an **in-panel sign-in screen** styled to match the web app login (`app/auth/login/page.tsx`):

- Curator logo lockup
- “Sign in to your inspiration board”
- Email + password fields (same labels and placeholders)
- Primary **Sign in** button
- **Forgot password?** → opens Curator web app in a new tab (`/auth/forgot-password`)
- **Sign up** link → opens Curator web app in a new tab (`/auth/sign-up`)

Native login calls **Supabase `signInWithPassword`** directly from the extension (not the web app server action). On success, persist session in extension storage and proceed to add-item UI.

Design tokens and components should follow [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) so the form feels like Curator, not a generic extension popup.

#### Session lifecycle

- **Persist** session (access + refresh tokens) in extension `storage` across browser restarts.
- **On panel open:** if stored session is valid or refreshable, go straight to add-item UI — user does not sign in again.
- **Refresh** access tokens silently via Supabase client before API calls; user never sees this.
- **Re-prompt login** only when: no stored session, or refresh fails (e.g. signed out on web app, password changed, session revoked).
- **No sign-out in extension.** To end the extension session, user signs out in the Curator web app or removes/reinstalls the extension. Extension should detect invalidated sessions on next panel open or API call and show connect/login again.

#### Auth in API routes

Extension sends `Authorization: Bearer <access_token>` (or equivalent) on `GET /api/extension/boards`, `save-url`, and `save-image`. Server validates with Supabase and enforces RLS.

### Collections

- **Collection is required** for every save from the extension.
- **No collections yet:** Block save actions; show empty state with a link to open Curator and create the first collection. Inline collection creation is out of scope for MVP.
- **Has collections:** On URL tab, viewport + collection pickers in save form (after URL captured). On Image tab, collection picker in confirm step (after selection). Remember last-used collection in extension storage.

---

## Feature Parity with Web App

| Capability | Web app | Extension MVP |
|------------|---------|---------------|
| Save URL | ✓ (editable paste field) | ✓ (read-only display from active tab) |
| Viewport selector | Mobile, Tablet, Desktop | Same |
| URL metadata | `/api/metadata` | Same API |
| Save image | File upload (JPG, PNG, WebP) | Page multi-select |
| WebP compression | ✓ (max 1920px, ~0.75MB target) | Same (server-side) |
| Notes | Optional | Omitted in extension; add or edit in web app |
| Title | Optional in web app | Omitted in extension; auto from URL metadata or image source |
| Collection | Via `defaultBoardId` or edit flow | URL: after URL captured, with viewport. Image: after image selection |
| Bulk images | Multi-file wizard | Multi-select on page, sequential save |
| Toggle URL ↔ Image mid-flow | ✓ (except during upload) | ✓ |
| Auth | Web app (Supabase SSR) | Connect from Curator tab; native login fallback |

**Supported image formats:** JPEG, PNG, WebP (aligned with `add-item-dialog.tsx`).

**Viewport options:**
- Mobile (393×852)
- Tablet (768×1024)
- Desktop (1440×900)

---

## Technical Architecture

### High-level diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser tab                                            │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │ Compact floating card│  │ Page (pick mode)        │  │
│  │ (content script UI)  │  │ image highlights        │  │
│  │ URL | Image toggle   │  │ click-to-select         │  │
│  └──────────┬───────────┘  └────────────┬────────────┘  │
└─────────────┼───────────────────────────┼───────────────┘
              │ messages                   │
              ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│  Extension service worker (background)                  │
│  - session management                                   │
│  - fetch image blobs (extension-privileged)             │
│  - orchestrate API calls                              │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + auth
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Curator Next.js app                                    │
│  GET  /api/extension/boards                               │
│  POST /api/extension/save-url                           │
│  POST /api/extension/save-image                         │
│  POST /api/metadata (existing)                          │
└──────────────────────────┬──────────────────────────────┘
                           ▼
                    Supabase (Auth, DB, Storage)
```

### Why API routes (not direct Supabase from extension)

- Single implementation for compression, storage paths, and inserts (reuse web app logic)
- Simpler auth validation on the server
- Avoid duplicating `createImageItem` / URL insert logic from `add-item-dialog.tsx`
- Metadata fetch already lives at `app/api/metadata/route.ts`

### Extension project structure (proposed)

```
extension/
  manifest.json
  src/
    background/          # service worker
    panel/               # React panel UI (URL | Image toggle, forms)
    content/             # pick mode overlays, panel mount point
  icons/
```

**Suggested tooling:** Plasmo or Vite + CRXJS for MV3 bundling with TypeScript/React. Share types from `lib/types.ts`.

### Manifest permissions (MVP)

**Site access (decided):** Use broad host permissions — `host_permissions: ["<all_urls>"]` — so panel injection, image pick mode, and image fetch from arbitrary CDNs work reliably. In Chrome extension settings this appears as **“On all sites”** (“read and change all your data on websites you visit”). Prioritize save reliability over a minimal permission footprint for MVP; narrowing to an allowlist is a future optimization if install friction becomes an issue.

| Permission | Purpose |
|------------|---------|
| `activeTab` | Read active tab URL and title |
| `storage` | Persist auth session, last-used collection |
| `scripting` | Inject content scripts for panel, pick mode, and session read on Curator tabs |
| `tabs` | Find open Curator tab for connect flow |
| Host: `<all_urls>` | Inject panel and pick mode on any page; fetch selected image URLs from any CDN/host |
| Host: Curator app origin | API calls, auth connect (may be redundant with `<all_urls>` but explicit for clarity) |

```json
{
  "host_permissions": ["<all_urls>"]
}
```

- **Privacy policy (extension):** `{SITE_URL}/privacy` — required for Chrome Web Store (`<all_urls>` permission)

---

## API Contract (new routes)

All routes require authenticated user via `Authorization: Bearer <access_token>` from the extension session (see Authentication).

### `GET /api/extension/boards`

Returns the user’s collections for the panel picker.

**Response:**
```json
{
  "boards": [{ "id": "uuid", "name": "string" }]
}
```

### `POST /api/extension/save-url`

**Request:**
```json
{
  "url": "https://example.com",
  "viewport": "desktop",
  "boardId": "uuid | null"
}
```

**Behavior:** Normalize URL, call `/api/metadata`, insert `items` row (`type: "url"`) with `notes: null`, link `item_boards` if `boardId` provided. Title is set from fetched metadata (or tab title as fallback), not from extension input.

**Response:**
```json
{
  "item": { "id": "uuid", "type": "url", "original_url": "...", "title": "..." }
}
```

### `POST /api/extension/save-image`

**Request:** `multipart/form-data`
- `file` — image blob (JPEG, PNG, or WebP)
- `boardId` (optional)

**Behavior:** Compress to WebP, upload to Supabase `images` bucket, insert `items` row (`type: "image"`) with `notes: null`, link `item_boards`. Title is derived server-side from the image source (e.g. filename), not from extension input.

**Response:**
```json
{
  "item": { "id": "uuid", "type": "image", "file_url": "...", "title": "..." }
}
```

### Bulk image save

**One collection per batch:** After picking images, the user chooses a single collection in the confirm step. Every image in the multi-select batch is linked to that same `boardId`. There is no per-image collection assignment in MVP.

MVP: client sends **sequential** `save-image` requests (one per selected image), each with the same shared `boardId`. Progress UI: “Saving 2 of 5”. Optional batch endpoint is a future optimization.

---

## Error Handling & Edge Cases

| Scenario | Expected behavior |
|----------|-------------------|
| Not authenticated | Attempt connect, then show native login; block save until signed in |
| Connect fails, native login fails | Show error from Supabase; keep login form visible |
| Session expired mid-save | Refresh token; on failure prompt re-connect or re-login |
| No collections | Block save; show empty state with link to open Curator and create first collection (no inline create in MVP) |
| Invalid / empty URL | Disable save; inline validation |
| Metadata fetch fails | Save URL anyway with tab title as fallback |
| Image fetch blocked (CORS/hotlink) | Show per-image error; continue saving others |
| Image too large / compression fails | Show error; allow retry |
| User switches to another browser tab | Panel **stays open** on the tab where it was activated; visible again when user returns to that tab |
| SPA lazy-loaded images | `MutationObserver` rescans for new `<img>` nodes while pick mode is active |
| Duplicate URL | Save anyway in MVP; duplicate detection is a web app Phase 2 feature |

---

## Out of Scope (Future)

- Firefox / Safari builds
- Detached popup window as primary UI
- Title or notes fields in extension (use web app to add context after save)
- Inline collection creation
- Keyboard shortcuts within the extension
- Narrowing site access to a CDN allowlist (future optimization)
- Batch `save-images` API endpoint

---

## Testing

### Manual test matrix

**Panel & toggle**
- [ ] Icon click opens compact floating card; clicking page does not dismiss it
- [ ] Card size and styling align with auth card (375px max width, rounded card)
- [ ] Card does not use full-height side sheet or page dimming overlay
- [ ] URL ↔ Image toggle preserves collection selection
- [ ] Close icon (top-right) dismisses panel and tears down pick mode on all views
- [ ] Toggle hidden during bulk upload; restored after completion
- [ ] Switching browser tabs does not close panel on the tab where extension was opened
- [ ] Returning to that tab restores panel (and pick mode if applicable)

**Post-save**
- [ ] Success message shows collection name after URL save
- [ ] Success message shows count + collection name after bulk image save
- [ ] “View collection” is the primary action on success screen; close icon remains in top-right
- [ ] “View collection” opens `/dashboard/collections/{boardId}` in new tab
- [ ] No separate close button or link in card body
- [ ] Card stays on success screen until user closes via top-right icon or reopens extension (no auto-close, no auto-return to form)
- [ ] Failed save shows inline error; form remains editable

**URL save**
- [ ] Active tab URL captured and shown as read-only display (not editable)
- [ ] User selects viewport and collection after URL is captured (not before)
- [ ] Last-used collection pre-filled on URL tab
- [ ] Viewport options save correctly
- [ ] Metadata populated when `/api/metadata` succeeds
- [ ] Save without metadata when fetch fails
- [ ] Item appears in chosen collection in web app

**Image save**
- [ ] Collection picker hidden until at least one image is selected
- [ ] Confirm step shows collection picker + save after selection
- [ ] Last-used collection pre-filled in image confirm step
- [ ] Pick mode highlights images; signifier visible on hover (once designed)
- [ ] Multi-select and clear selection
- [ ] Bulk save with progress indicator
- [ ] Small/icon images filtered out
- [ ] Mixed success/failure across a batch

**Auth**
- [ ] Connect succeeds when Curator tab is open and signed in
- [ ] Connect skipped / fails gracefully when no Curator tab or tab is signed out
- [ ] Native login matches web app styling and signs in via Supabase
- [ ] Forgot password and sign up open correct web app routes
- [ ] Session persists across browser restart
- [ ] Expired or revoked session (e.g. after web app sign-out) prompts re-connect or re-login

**Collections**
- [ ] User with no collections sees empty state and link to web app; save is disabled
- [ ] After creating a collection in the app, extension picker reflects new collection on refresh/reopen

**Sites**
- [ ] Static blog / marketing page
- [ ] Image-heavy gallery (Pinterest, Dribbble, etc.)
- [ ] SPA with lazy-loaded images

### Dev workflow

1. Build extension (`pnpm build` in `extension/`)
2. Load unpacked at `chrome://extensions`
3. Debug panel, service worker, and content script via Chrome DevTools
4. Reload extension after code changes

### Pre-publish

- Privacy policy at `/privacy` (see [EXTENSION-STORE-LISTING.md](./EXTENSION-STORE-LISTING.md))
- Minimal permissions justification for Chrome Web Store review
- Test on clean Chrome profile

---

## Success Metrics

- Extension installs and weekly active savers
- Saves per session (URL vs image split)
- Bulk save usage (avg images per batch)
- Save failure rate (auth, image fetch, API errors)
- Time from icon click to successful save

---

## Implementation Phases

### Phase 1 — Foundation (1–2 weeks)
- Extension scaffold (MV3, React panel shell — compact floating card 375px)
- Auth spike: connect-from-tab session bridge + native login UI (web app parity)
- `GET /api/extension/boards` with bearer auth
- Persistent panel with URL | Image toggle (toggle switches UI only)

### Phase 2 — URL save (~1 week)
- `POST /api/extension/save-url`
- URL form with metadata, viewport, collection picker
- Post-save success state (confirmation, primary View collection button)
- End-to-end URL save from any page

### Phase 3 — Image pick & bulk save (1–2 weeks)
- Content script pick mode + selection state
- Image fetch in service worker
- `POST /api/extension/save-image`
- Bulk sequential save with progress UI; success state for batch

### Phase 4 — Polish & publish (~1 week)
- Production config (`VITE_CURATOR_API_URL` origin for connect-from-tab; see `extension/.env.production.example`)
- Privacy policy at `/privacy`; store listing copy in [EXTENSION-STORE-LISTING.md](./EXTENSION-STORE-LISTING.md)
- QA on target sites (checklist in store listing doc)

**Deferred from original Phase 4 scope (intentional):**
- Last-used collection pre-fill — collection picker starts empty so users choose explicitly
- Hide URL | Image toggle during save — toggle stays visible; tab switch blocked while saving
- Partial bulk-save failure UI — successes show success screen; fringe-case failures dropped silently
- Success CTA as primary button — "View on Curator" stays secondary
- "Connected to Curator" header indicator — not implemented

---

## Design (Figma)

Extension layout mockups live in Figma. Use **node links** (copy link to frame/selection) so `node-id=` is present — required for design-to-code tooling.

**Figma file:** <!-- add link, e.g. [Curator Extension](https://figma.com/design/…) -->

| Screen / state | Figma frame | PRD section |
|----------------|-------------|-------------|
| Auth (native login) | https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=395-743&t=0EFBJRkiSDQYBPLn-11 | [Authentication](#authentication) |
| URL save | https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=395-841&t=0EFBJRkiSDQYBPLn-11 | [URL save flow](#url-save-flow) |
| Image pick — 0 selected | https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=395-1028&t=0EFBJRkiSDQYBPLn-11 | [Image pick mode](#image-pick-mode-on-page) |
| Image pick — confirm (N selected) | image pick mode state 1: https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=400-617&t=0EFBJRkiSDQYBPLn-11  image pick mode state 2: https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=425-599&t=x2m7MHAElZWneKMe-11| [Image pick mode](#image-pick-mode-on-page) |
| Bulk upload progress |  | [Bulk image save](#bulk-image-save) |
| Post-save success | image success: https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=408-598&t=0EFBJRkiSDQYBPLn-11 url success: https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=408-657&t=0EFBJRkiSDQYBPLn-11 | [Post-save success](#post-save-success) |
| No collections (empty state) | https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=395-841&t=0EFBJRkiSDQYBPLn-11 | [Collections](#collections) |
| Image hover / selection signifier (on-page) | https://www.figma.com/design/CWPkKIkZ356qCcQG2dLDq1/Curator?node-id=395-1068&t=x2m7MHAElZWneKMe-11 | [Image pick mode](#image-pick-mode-on-page) |

_Add rows as needed. Leave the Figma frame cell empty until the link is ready._

---

## References

- Main product PRD: [PRD.md](../PRD.md)
- Design system: [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)
- Web app add-item implementation: `components/dashboard/add-item-dialog.tsx`
- URL metadata API: `app/api/metadata/route.ts`
- Data model: `lib/types.ts`, `scripts/001_create_schema.sql`
