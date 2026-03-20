# Form Fields & Search Field — Styling Specification

**Source:** [Curator — Form Field (55:541)](https://www.figma.com/design/dR0mlOdDlNmSqNg7sYl9BJ/Curator?node-id=55-541&m=dev) · [Curator — Search (55:340)](https://www.figma.com/design/dR0mlOdDlNmSqNg7sYl9BJ/Curator?node-id=55-340&m=dev)

This document defines the canonical styling for form input fields and the search field in the Curator project, including smooth transitions between states.

---

## Overview

- **Shape:** Pill (fully rounded) — 24px border radius.
- **States:** Default, Hover, Active (focus).
- **Transitions:** All state changes use **0.15s** duration for smooth animation (border, shadow, background).

---

## Transitions (All Fields)

Apply to the **input container** (form field wrapper or search wrapper) so state changes animate smoothly:

```css
transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
```

- **Duration:** `0.15s` (150ms).
- **Properties to transition:** `border-color`, `box-shadow`, `background-color` (if it ever changes).
- **Easing:** `ease` (or `ease-in-out` if preferred).

---

## Form Fields

### Structure

- **Wrapper:** Flex column, `gap: 8px`, full width.
- **Label:** Above the input; primary text color.
- **Input container:** Pill-shaped background; contains the actual `<input>` or text.

### States

| State   | Border                          | Shadow / Focus ring                    |
|--------|----------------------------------|----------------------------------------|
| Default | None (no visible border)        | None                                   |
| Hover   | 2px solid `var(--border/main)`  | None                                   |
| Active  | 2px solid `var(--border/main)`  | `0 0 0 4px var(--grayscale/50)` (focus ring) |

### Form Field — Design Tokens

| Token | Fallback | Usage |
|-------|----------|--------|
| `--surface/primary` | `#f5f5f5` | Input background (default) |
| `--surface/secondary` | `#ffffff` | Input background (hover) |
| `--border/main` | `#b3b3b3` | Border (Hover, Active) |
| `--grayscale/50` | `#dbdbdb` | Focus ring (Active only) |
| `--text/bodyprimary` | `#333` | Label text |
| `--text/bodysecondary` | `#6f6f6f` | Placeholder / input text |
| `--font/family/all` | `'Host_Grotesk', sans-serif` | Font family |
| `--font/weight/regular` | `400` | Label and input text |
| `--font/size/base` | `16px` | Font size |
| `--font/line-height/base` | `24px` | Line height |

### Form Field — Layout & Sizing

- **Border radius:** `24px`.
- **Padding:** `16px` horizontal, `12px` vertical.
- **Label:** 16px, regular weight, primary text color.
- **Input text / placeholder:** 16px, regular weight, secondary text color (`#6f6f6f`).

### Form Field — CSS Summary

```css
/* Form field input container — base */
.form-field-input {
  background-color: var(--surface/primary, #f5f5f5);
  border-radius: 24px;
  padding: 16px 16px 12px 12px;
  border: 2px solid transparent; /* avoids layout shift when border appears */
  box-shadow: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.form-field-input:hover {
  background-color: var(--surface/secondary, #ffffff);
  border-color: var(--border/main, #b3b3b3);
}

.form-field-input:focus,
.form-field-input:focus-visible,
.form-field-input.active {
  background-color: var(--surface/secondary, #ffffff);
  border-color: var(--border/main, #b3b3b3);
  box-shadow: 0 0 0 4px var(--grayscale/50, #dbdbdb);
}
```

---

## Search Field

### Structure

- **Wrapper:** Single pill-shaped container with flex row, icon + placeholder/text.
- **Icon:** 16×16px (e.g. Lucide search) on the left.
- **Gap:** 8px between icon and text.

### States

| State   | Border                          | Shadow / Focus ring                    |
|--------|----------------------------------|----------------------------------------|
| Default | None (no visible border)        | None                                   |
| Hover   | 2px solid `var(--border/main)`  | None                                   |
| Active  | 2px solid `var(--border/main)`  | `0 0 0 4px var(--grayscale/50)` (focus ring) |

### Search Field — Design Tokens

Same as form fields, with one extra:

| Token | Fallback | Usage |
|-------|----------|--------|
| `--surface/secondary` | `white` | Search field background (default) |

(All other tokens — `--border/main`, `--grayscale/50`, `--text/bodysecondary`, typography — match the form field table above.)

### Search Field — Layout & Sizing

- **Border radius:** `24px`.
- **Padding:** `20px` horizontal, `12px` vertical.
- **Gap:** `8px` between icon and text.
- **Icon:** 16×16px, secondary or primary color as per design.
- **Placeholder:** “Search”, 16px, regular weight, `--text/bodysecondary`.

### Search Field — CSS Summary

```css
/* Search field container — base */
.search-field {
  background-color: var(--surface/secondary, white);
  border-radius: 24px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid transparent;
  box-shadow: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.search-field:hover {
  border-color: var(--border/main, #b3b3b3);
}

.search-field:focus-within,
.search-field.active {
  border-color: var(--border/main, #b3b3b3);
  box-shadow: 0 0 0 4px var(--grayscale/50, #dbdbdb);
}
```

---

## Summary Checklist for Implementation

- [ ] Use design tokens (CSS variables) for colors and typography.
- [ ] Form field: Default (no border), Hover (2px border), Active (2px border + 4px focus ring).
- [ ] Search field: Same three states; background `--surface/secondary` (white).
- [ ] Apply **0.15s** transitions for `border-color`, `box-shadow`, and `background-color` on the interactive container.
- [ ] Use `border: 2px solid transparent` in default state to avoid layout shift when border appears on Hover/Active.
- [ ] Pill radius: **24px** for both form and search fields.
- [ ] Typography: Body/Base — Regular (16px, 24px line height) for labels, placeholders, and search text.
