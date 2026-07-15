# Curator extension changelog

## 1.0.5 — 2026-07-14

Visual polish to match the Curator web app design system.

### CTA buttons

- **Squircle CTAs** — Sign in, Add URL, Add images, and other primary actions now use the same glossy squircle buttons as the web app (via Lisse smooth corners).
- **Hover and press states** — Gradient transitions, press scale, and disabled/loading opacity match the dashboard and auth flows.
- **No square flash on load** — Pill fallback radius and Lisse pending-state masking prevent squared-edge flicker when the panel opens.

### Branding

- **Logo depth restored** — The sign-in lockup SVG again includes highlight and stroke layers so the mark matches the web app’s 3D appearance.

### Store listing update (Chrome Web Store)

There is no separate “What’s new” field for extension updates. Append release notes to the **Detailed description** on the **Store listing** tab before you submit. Google’s docs describe this as the place for “update logs” alongside your main listing copy.

Suggested paragraph to add at the bottom of your description:

> **v1.0.5** — Updated buttons and sign-in logo to match the Curator web app, with smoother loading and no corner flash on open.

---

## 1.0.4 — 2026-07-09

Panel and image-pick motion polish for a smoother save flow.

### Panel transitions

- **URL ↔ Image tab crossfade** — Switching tabs now uses a brief blur-and-fade instead of an instant swap.
- **Empty canvas ↔ image stack** — The placeholder and populated image view crossfade when the first image is selected or the last is cleared.
- **Save controls entrance** — Collection picker and save button blur-fade in when the first image is added.
- **Smoother height changes** — Panel layout uses eased timing instead of spring overshoot when content height changes.
- **Stable tab height** — URL and image tabs share a consistent minimum content height to prevent layout jumps during transitions.

### Image stack

- **Remove fade-out** — Deselecting a non-last image fades the card out in the stack, whether you remove it from the panel or by clicking the image on the page.
- **Cursor-following remove badge** — The remove control on hovered stack cards follows the pointer with a subtle spring.
- **Reliable stack hover** — Hover and remove targets resolve to the topmost card under the pointer, including across shadow DOM boundaries.

### Store listing update (Chrome Web Store)

There is no separate “What’s new” field for extension updates. Append release notes to the **Detailed description** on the **Store listing** tab before you submit. Google’s docs describe this as the place for “update logs” alongside your main listing copy.

Suggested paragraph to add at the bottom of your description:

> **v1.0.4** — Smoother panel animations when switching tabs and selecting images, plus fade-out when removing images from your selection.

---

## 1.0.3

Internal iteration on panel motion (superseded by 1.0.4).

## 1.0.2

- Faster promo toast dismiss transitions.
- Promo toast auto-dismiss when the extension is installed.

## 1.0.1

- Extension promo toast on the Curator web app.

## 1.0.0

Initial Chrome Web Store release: URL save, multi-image pick mode, connect-from-tab auth, and bulk image save.
