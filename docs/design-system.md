# Design System — Stitch-Aligned Editorial

This document is the long-term UI source of truth for the AI News Brief app.
All page redesigns start from here.

## Design Principles

- **Editorial** — serif display typography for headlines, authored page hierarchy
- **Technical** — sans-serif UI text for labels, forms, navigation
- **Premium** — flat surfaces, crisp borders, restrained color accents
- **High-contrast** — both modes should be legible and never washed out
- **Non-generic** — no ambient blobs, no glass blur haze, no SaaS startup aesthetic

## Typography

| Role | Font | Usage |
|------|------|-------|
| Display | `Newsreader` (serif) | Page headlines, section headings, document titles |
| Body/UI | `IBM Plex Sans` (sans) | Labels, buttons, body text, forms, nav |
| Code | `Geist Mono` (mono) | Only for code/diagnostic/inline code text |

- Display font uses `.font-display` class
- Body font uses `.font-body` class (also the body default)
- Never use `Newsreader` for form labels, buttons, or nav text

## Design Tokens

### Dark Mode (noir editorial console)

| Token | Value |
|-------|-------|
| `--ds-bg` | `#0b0b0b` |
| `--ds-surface-1` | `#141414` |
| `--ds-surface-2` | `#1c1c1c` |
| `--ds-border` | `#44445a` |
| `--ds-text` | `#f4eee1` (ivory) |
| `--ds-text-muted` | `#c2b8a8` |
| `--ds-text-dim` | `#93897b` |
| `--ds-accent` | `#00f5e8` (aqua) |
| `--ds-accent-soft` | `rgba(0,245,232,0.12)` |
| `--ds-accent-glow` | `0 0 0 1px rgba(0,245,232,0.92), 0 0 16px rgba(0,245,232,0.28)` |

### Light Mode (markup paper)

| Token | Value |
|-------|-------|
| `--ds-bg` | `#f7f0df` (warm ivory) |
| `--ds-surface-1` | `#fffdfa` |
| `--ds-surface-2` | `#f2e8d3` |
| `--ds-border` | `#111111` (black rules) |
| `--ds-text` | `#111111` |
| `--ds-text-muted` | `#4b443a` |
| `--ds-text-dim` | `#71695e` |
| `--ds-accent` | `#111111` (black) |
| `--ds-accent-soft` | `rgba(17,17,17,0.05)` |
| `--ds-accent-glow` | `none` |

> **Modes are separately authored.** Light mode does NOT inherit dark-mode glow logic.

## Surfaces

All surfaces live in `src/components/page-shell.tsx`.

| Component | Usage | Styling |
|-----------|-------|---------|
| `PageShell` | App layout (sidebar + content) | Grid layout, no ambient backgrounds |
| `ShellHero` | Primary page hero/header | Flat surface with border, no blur |
| `ShellCard` | Standard content panels | Flat surface with border, no blur |
| `ShellSoftCard` | Secondary panels, pill tab containers | `surface-2` tint with border, no blur |

### Shared rules
- All surfaces: `border: 1px solid var(--ds-border)`, `background: var(--ds-surface-X)`, `border-radius: 12px`
- No `backdrop-blur`, no gradients, no shadows in base surfaces

## Radii

| Element | Dark mode | Light mode |
|---------|-----------|------------|
| Shells/cards | `12px` | `12px` |
| Pills/tabs | `10px` | `999px` |
| Inputs/toggles | `10px` | `10px` |

## Border & Shadow Rules

- **Dark mode:** subtle inset depth via border color only; active/focus states use `--ds-accent-glow`
- **Light mode:** black 1px outlines, no shadow, no glow
- Focus states on inputs: `var(--ds-accent)` border; dark mode gets glow, light mode gets black outline only

## Sidebar

- Sticky sidebar at `270px` width
- Flat surface (`surface-1`) with border
- Brand icon: `ds-accent` fill background with `ds-bg` icon color
- Nav items: `rounded-10px`, transparent background by default
  - Active: `ds-accent-soft` background + `ds-accent` text
  - Dark mode active additionally gets `ds-accent-glow` box-shadow
- Personalization panel: `surface-2` tint, compact label/value layout
- Pills/badges in sidebar: `surface-1` with border, `rounded-full`

## Buttons

| Class | Usage |
|-------|-------|
| `.ds-btn` | Primary action — accent background, dark-text-on-light |
| `.ds-btn-secondary` | Secondary — border + surface-1 background |

States: default → hover (opacity change or border-color change) → focus (glow in dark, outline in light) → disabled (opacity 0.5).

## Tabs (Section Navigation)

- Horizontal pill row inside a `ShellSoftCard`
- Pill styling: `rounded-full` (light) / `rounded-full` (dark), `ds-accent-soft` for active
- Text: `ds-text-muted` default, `ds-accent` when active

## Inputs & Selects

Class: `.ds-input`, `.ds-select`
- `background: ds-surface-2`, `border: 1px ds-border`, `border-radius: 10px`
- Focus: border becomes `ds-accent`; dark mode gets glow, light mode gets black outline

## Toggle

Theme toggle uses `ds-btn-secondary` pattern with icon + label + state pill.

## Document Page Patterns (Privacy, Terms)

- Sidebar with brand, version info, quick links nav, contact card
- Hero: compact prefix line + serif headline + paragraph description + metric tiles
- Document panel: flat surface, serif section headings, muted body text, bordered tables
- Tables: `surface-2` header row, bordered rows, code tokens in accent color
- Links: underline style with accent color

## Explicit Don'ts

- NO glassmorphism haze or blur
- NO washed-out gray text (everything should be at least readable contrast)
- NO oversized empty hero areas
- NO multi-accent rainbow UI (only `ds-accent` for emphasis)
- NO generic SaaS KPI cards unless product-relevant
- NO ambient blobs or gradient fields
- NO shimmer effects on cards
