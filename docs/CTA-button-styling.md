# CTA Button Component — Styling Specification

**Source:** [Curator — Button (Figma)](https://www.figma.com/design/dR0mlOdDlNmSqNg7sYl9BJ/Curator?node-id=32-413&m=dev)

This document defines the canonical styling for all CTA (call-to-action) buttons in the Curator project.

---

## Overview

- **Shape:** Pill (full rounded) for text buttons; circle for icon-only buttons.
- **Effect:** Glossy, convex look via gradients and inset shadows.
- **Typography:** Body/Base — Medium (see tokens below).

---

## Button Types

| Type | Use case |
|------|----------|
| **Primary** | Main actions (dark background, white text) |
| **Secondary** | Secondary actions (light background, dark text) |
| **Icon only primary** | Primary action, icon only (dark, circular) |
| **Icon only secondary** | Secondary action, icon only (light, circular) |

---

## States

Each type has four states: **Default**, **Hover**, **Pressed**, **Disabled (loading)**.

- **Default:** Base appearance.
- **Hover:** `cursor: pointer`; slightly adjusted gradient/shadows.
- **Pressed:** Slightly scaled down via `transform: scale(...)` so the button appears pressed into the surface. **Narrow text buttons** (e.g. non–full-width CTAs): `scale(0.97)`. **Full-width auth CTAs** (e.g. login/sign up using `w-full`): `scale(0.99)`. **Icon-only** (`.cta-icon`): `scale(0.96)` so the press is as noticeable on small buttons. Box-shadow is unchanged from default/hover (no separate pressed shadow).
- **Disabled (loading):** When the button is disabled while an action is in progress (e.g. sign in, create account, confirming collection creation), it must keep **full opacity** (`opacity: 1`). Do not apply reduced opacity; the button should look solid while the system processes the request.

---

## Design Tokens

Use these CSS variables (with fallbacks) so theming stays consistent.

### Colors

| Token | Fallback | Usage |
|-------|----------|--------|
| `--border/button` | `#262626` | Primary border |
| `--border/button` | `#dbdbdb` | Secondary border |
| `--grayscale/10` | `white` | Secondary default fill (light) |
| `--grayscale/40` | `#e6e6e6` | Secondary hover/pressed fill |
| `--grayscale/50` | `#dbdbdb` | Secondary shadow / gradient stop |
| `--grayscale/80` | `#595959` | Primary default gradient start |
| `--grayscale/90` | `#333` | Primary hover/pressed gradient |
| `--grayscale/100` | `#262626` | Primary gradient end / dark shadow |
| `--text/bodyprimary` | `white` | Primary button label |
| `--text/bodyprimary` | `#333` | Secondary button label |

### Typography

| Token | Fallback | Usage |
|-------|----------|--------|
| `--font/family/all` | `'Host_Grotesk', sans-serif` | Button label font |
| `--font/weight/medium` | `normal` (500) | Button label weight |
| `--font/size/base` | `16px` | Button label size |
| `--font/line-height/base` | `24px` | Button label line height |

---

## Primary Button (Text)

- **Background:** Gradient from `var(--grayscale/80)` to `var(--grayscale/100)`.
- **Border:** `2px solid var(--border/button, #262626)` (1.98px when pressed).
- **Padding:** `20px` horizontal, `12px` vertical (Default/Hover); pressed: ~`19.8px` horizontal, height `47.52px`.
- **Border radius:** `48px` (pill); pressed: `47.52px`.
- **Label:** White, 16px, medium weight, centered.
- **Inner shadow (gloss):**
  - Default/Hover: `inset 0 3px 0 rgba(255,255,255,0.35)`, `inset 0 8px 6px var(--grayscale/100)`, `inset 0 -6px 6px rgba(255,255,255,0.25)`.
  - Pressed: Same as default/hover (implementation uses only transform for pressed feel).

---

## Secondary Button (Text)

- **Background:** Gradient from `var(--grayscale/10)` to `var(--grayscale/50)`.
- **Border:** `2px solid var(--border/button, #dbdbdb)` (1.98px when pressed).
- **Padding:** Same as primary (`20px` / `12px`; pressed ~`19.8px` horizontal, height `47.52px`).
- **Border radius:** `48px` (pressed `47.52px`).
- **Label:** Dark text `var(--text/bodyprimary, #333)`, same typography as primary.
- **Inner shadow (gloss):**
  - Default: `inset 0 3px 0 rgba(255,255,255,0.7)`, `inset 0 8px 6px var(--grayscale/40)`, `inset 0 -6px 6px rgba(255,255,255,0.8)`.
  - Hover: Same with `var(--grayscale/50)` for the mid shadow.
  - Pressed: Same as default/hover (implementation uses only transform for pressed feel).

---

## Icon-Only Primary

- **Size:** `48px × 48px` (Default/Hover); pressed: `47.04px × 47.04px`.
- **Padding:** `12px` (Default/Hover); pressed: ~`19.6px` (to keep icon centered with smaller size).
- **Border:** Same as primary text button (2px; 1.96px when pressed).
- **Background & gradient:** Same as primary text button.
- **Inner shadow:** Same gloss as primary (3px / 8px 6px / -6px 6px; pressed with 2.94px / 7.84px / 5.88px).
- **Icon:** 24×24px, white; when pressed the icon container can be 23.52px.

---

## Icon-Only Secondary

- **Size:** Same as icon-only primary (48px; 47.04px pressed).
- **Padding / border / radius:** Same as secondary text button (2px; 1.96px when pressed).
- **Background & gradient:** Same as secondary text button.
- **Inner shadow:** Same gloss as secondary text button (including Default/Hover/Pressed variants).
- **Icon:** 24×24px, dark (`#333` / body primary).

---

## Layout & Behavior

- **Alignment:** Content (label or icon) centered horizontally and vertically.
- **Hover:** Add `cursor: pointer` for all interactive states.
- **Disabled (loading):** When `disabled` is set during an async action, keep `opacity: 1` (override any generic disabled-opacity utility for CTA buttons so they remain visually solid).
- **Structure:** Use a single wrapper (e.g. `div` or `button`) with:
  - Gradient background
  - Border and border-radius
  - Flexbox (or equivalent) for centering
  - Optional overlay layer for inset shadows so they respect `border-radius` (e.g. `rounded-[inherit]`).

---

## Summary Checklist for Implementation

- [ ] Use design tokens (CSS variables) for colors, typography, and borders.
- [ ] Implement all four types: Primary, Secondary, Icon only primary, Icon only secondary.
- [ ] Support four states: Default, Hover, Pressed (transform: scale(...); text 0.99, icon-only 0.96), Disabled/loading (full opacity).
- [ ] Apply pill radius (48px) for text buttons and circle for icon-only.
- [ ] Apply glossy inner shadows per type/state as above.
- [ ] Use Body/Base — Medium for labels; 24×24px for icons (23.52px when pressed if desired).
- [ ] Ensure high contrast: white on dark (primary), dark on light (secondary).
