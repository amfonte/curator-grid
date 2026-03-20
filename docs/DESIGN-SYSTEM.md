# Curator Design System

This document defines the design system for the Curator project: **Figma variables** (extracted from the Curator Figma file) and **codebase rules** for integrating Figma designs and maintaining consistent styling.

**Figma file:** [Curator](https://www.figma.com/design/dR0mlOdDlNmSqNg7sYl9BJ/Curator)  
**Variables node:** `node-id=55-647`

---

## 1. Figma Variables (Design Tokens)

### 1.1 Primitive colors — Grayscale

Base palette used by semantic tokens. Values are hex.

| Token   | Value     | Description        |
|--------|-----------|--------------------|
| 10     | `#FFFFFF` | White              |
| 20     | `#F5F5F5` | Very light gray   |
| 30     | `#EDEDED` | Light gray        |
| 40     | `#EBEBEB` | Light gray        |
| 50     | `#DBDBDB` | Medium light gray |
| 60     | `#B3B3B3` | Medium gray       |
| 70     | `#6F6F6F` | Medium dark gray  |
| 80     | `#585958` | Dark gray         |
| 90     | `#333333` | Very dark gray    |
| 100    | `#262626` | Almost black      |

---

### 1.2 Semantic colors

Semantic tokens reference the Grayscale primitive. Modes: **Light** and **Dark**.

#### Text

| Semantic         | Light mode    | Dark mode    |
|------------------|---------------|--------------|
| **Headlines**    | Grayscale/90  | Grayscale/10 |
| **BodyPrimary**  | Grayscale/80  | Grayscale/20 |
| **BodySecondary**| Grayscale/70  | Grayscale/30 |

#### Surface

| Semantic   | Light mode    | Dark mode    |
|------------|---------------|--------------|
| **Primary**   | Grayscale/20 | Grayscale/80 |
| **Secondary** | Grayscale/10 | Grayscale/90 |
| **Tertiary**  | Grayscale/30 | Grayscale/70 |
| **Overlay**    | Grayscale/100| Grayscale/100|

#### Icon

| Semantic   | Light mode    | Dark mode    |
|------------|---------------|--------------|
| **Primary** | Grayscale/100 | Grayscale/10 |

#### Border

| Semantic | Light mode    | Dark mode    |
|----------|---------------|--------------|
| **Button** | Grayscale/50 | Grayscale/100|
| **Main**   | Grayscale/60 | Grayscale/60 |

---

### 1.3 Typography

| Category       | Token   | Value        |
|----------------|--------|--------------|
| **Font family**| All    | Host Grotesk |
| **Font weight**| Regular| Regular      |
|                | Medium | Medium       |
|                | Medium Italic | Medium Italic |
|                | Extra bold | Extra bold |
| **Font size**  | Small  | 12 (px)      |
|                | Base   | 16 (px)      |
|                | Medium | 24 (px)      |
|                | Large  | 32 (px)      |
| **Line height**| Small  | 16 (px)      |
|                | Base   | 24 (px)      |
|                | Medium | 28 (px)      |
|                | Large  | 44 (px)      |

---

## 2. Design System Structure (Codebase)

### 2.1 Token definitions

- **Location:** `app/globals.css`
- **Format:** CSS custom properties on `:root` and `.dark`, plus Tailwind v4 `@theme inline` mapping.
- **Structure:**
  - Raw tokens: `--background`, `--foreground`, `--primary`, `--border`, etc. (oklch or hex).
  - Theme mapping: `--color-background: var(--background)`, `--radius-lg: var(--radius)`, `--font-sans`, `--font-mono`.
- **Transformation:** None beyond CSS variables; Tailwind utilities consume `@theme` variables.
- **Token picker / autocomplete:** Default Tailwind theme colors are cleared via `@theme { --color-*: initial; }` so only Curator design-system tokens appear in IDE token menus and suggestions.

**Token picker (Search tokens):** To see only Curator tokens and avoid Tailwind internals (`--tw-*`):

- **Workspace settings** (`.vscode/settings.json`): Compiled `.next/**/*.css` is treated as plaintext so Tailwind’s internal variables are not suggested. Design tokens are listed in `.vscode/curator-tokens.css-data.json` and loaded via `css.customData` so they appear first in completions.
- **In the Search tokens field:** Type a prefix to filter, e.g. `gray`, `background`, `foreground`, `sidebar`, `card`, `primary`, `muted`, `accent`, `border`, `ring`, `destructive`, `overlay`, `icon`. Do **not** use variables that start with `--tw-` (Tailwind internals).

```css
/* app/globals.css — :root and .dark define tokens; @theme inline maps to Tailwind */
:root {
  /* Grayscale primitives */
  --gray-10: #FFFFFF;
  --gray-20: #F5F5F5;
  --gray-30: #EDEDED;
  --gray-40: #EBEBEB;
  --gray-50: #DBDBDB;
  --gray-60: #B3B3B3;
  --gray-70: #6F6F6F;
  --gray-80: #585958;
  --gray-90: #333333;
  --gray-100: #262626;

  /* Semantic colors — Light mode */
  --background: var(--gray-20);
  --foreground: var(--gray-90);
  --card: var(--gray-10);
  --muted-foreground: var(--gray-70);
  /* ... */
}
.dark {
  --background: var(--gray-80);
  --foreground: var(--gray-10);
  /* ... */
}
@theme inline {
  --color-background: var(--background);
  --font-sans: 'Host Grotesk', ui-sans-serif, system-ui, sans-serif;
  /* ... */
}
```

---

### 2.2 Component library

- **UI primitives:** `components/ui/` — Button, Input, Label, Textarea, Checkbox, Dialog, Select, Tabs, Dropdown, Slider, ScrollArea, etc.
- **Architecture:** React functional components; `class-variance-authority` (cva) for variants; `cn()` (clsx + tailwind-merge) for class names; Radix UI for accessibility.
- **Documentation:** No Storybook; Figma links in component comments where relevant (e.g. `CreateCollectionFolder`).

```tsx
// components/ui/button.tsx — variant/size via cva
const buttonVariants = cva("inline-flex items-center justify-center ...", {
  variants: { variant: { default: "...", outline: "..." }, size: { default: "h-9 px-4", ... } },
})
```

---

### 2.3 Frameworks and libraries

- **UI:** React 19, Next.js 16 (App Router).
- **Styling:** Tailwind CSS v4 (`@import 'tailwindcss'`), tw-animate-css, PostCSS (`@tailwindcss/postcss`).
- **Build:** Next.js (Turbopack in dev).

---

### 2.4 Asset management

- **Figma-derived assets:** `public/figma-assets/` — SVGs and images from Figma (e.g. folder components).
- **User content:** Supabase Storage bucket `images`; paths referenced as `/storage/v1/object/public/images/...`.
- **Optimization:** Next.js image handling where applicable; no project-specific CDN config.

---

### 2.5 Icon system

- **Icons:** `lucide-react` for UI icons; Figma SVGs in `public/figma-assets/` for custom illustrations/components.
- **Usage:** Import from `lucide-react` or reference `/figma-assets/...` for custom assets.
- **Naming:** Figma exports keep descriptive names (e.g. `folder-union.svg`, `folder-rect1.svg`).

---

### 2.6 Styling approach

- **Methodology:** Utility-first with Tailwind; design tokens in `app/globals.css` only (no separate token package).
- **Global styles:** `app/globals.css` — Tailwind import, `:root`/`.dark` variables, `@theme inline`, `@layer base` (e.g. `body`, border outline).
- **Responsive:** Tailwind breakpoints (`sm:`, `md:`, `lg:`); no custom breakpoint config in this doc.

---

### 2.7 Project structure

- **App routes:** `app/` — `layout.tsx`, `auth/login`, `auth/sign-up`, `dashboard/`, `dashboard/collections/[id]`.
- **Components:** `components/ui/` (shared UI), `components/dashboard/` (dashboard-specific).
- **Lib:** `lib/utils.ts` — `cn()`, viewport helpers.
- **Pattern:** Feature components in `components/dashboard/`; shared primitives in `components/ui/`.

---

## 3. Figma MCP Integration Rules

Use these rules when implementing or updating UI from Figma.

### 3.1 Required flow

1. Call **get_design_context** for the exact node(s) to implement.
2. If the response is too large, call **get_metadata** to get the node map, then **get_design_context** for the required node(s) only.
3. Call **get_screenshot** for visual reference.
4. After you have design context and screenshot, download any assets and implement.
5. Translate Figma output (e.g. React + Tailwind) into this project’s stack: **Next.js, Tailwind v4, tokens in `app/globals.css`**.
6. Validate against the Figma screenshot for visual parity before considering the task complete.

### 3.2 Implementation rules

- Treat Figma MCP output as **design and behavior reference**, not final code style.
- **IMPORTANT:** Use design tokens from `app/globals.css` only. Map Figma variables to existing `:root`/`.dark` and `@theme` tokens (or extend them using the Figma variable tables above).
- Reuse components from `components/ui/` (Button, Input, Label, Dialog, etc.) instead of building one-off markup.
- Use the project’s semantic color names (`bg-background`, `text-foreground`, `border-border`, `ring-ring`, etc.) and avoid hardcoded hex in components.
- Respect existing patterns: `cn()` for class names, cva for variants, Radix where applicable.
- Aim for 1:1 visual parity with the Figma design and check against the screenshot.

### 3.3 Mapping Figma variables to code

When updating `app/globals.css` to match Figma:

- **Primitive Grayscale:** Map to `:root`/`.dark` semantic tokens (e.g. background → Grayscale/20 in light, Grayscale/80 in dark).
- **Semantic names:** Prefer names that match or align with current tokens: `foreground` (headlines/body primary), `muted-foreground` (body secondary), `background` (surface primary), `card` or similar (surface secondary), `border` (border main), etc.
- **Typography:** Set `--font-sans` to **Host Grotesk** (or the project’s chosen fallback stack). Add or align font-size/line-height in `@theme` with Figma: Small (12/16), Base (16/24), Medium (24/28), Large (32/44).

### 3.4 Assets

- If the Figma MCP returns a **localhost** (or MCP) URL for an image or SVG, use that URL directly; do not replace with placeholders.
- **IMPORTANT:** Do not add new icon libraries for assets that come from Figma; store downloaded assets under `public/figma-assets/` and reference them by path.

---

## 4. Summary

| Aspect        | Source / location |
|---------------|-------------------|
| **Figma vars**| Primitive Grayscale (10–100), Semantic (Text, Surface, Icon, Border), Typography (Host Grotesk, 3 sizes + line heights). |
| **Tokens in code** | `app/globals.css` (`:root`, `.dark`, `@theme inline`). |
| **Components**| `components/ui/` (primitives), `components/dashboard/` (feature). |
| **Styling**   | Tailwind v4, design tokens only; no default Tailwind theme for colors/type beyond what’s in `@theme`. |
| **Figma → code** | get_design_context → get_screenshot → implement using tokens and existing components; validate with screenshot. |

Use this doc to keep Figma variables and codebase rules in sync and to drive global style updates (e.g. replacing default Tailwind styles with the Curator token set above).
