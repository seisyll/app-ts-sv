# Design

Durable visual rules for this template: how its looks are built, and what a new one must do to be
genuinely different. Read this before adding a palette, a style, a house style or a public-site
theme. Sources: billing-app's ADR 0010 and DESIGN.md (appearance, the Astro house style) and the
fundraiser app's DESIGN.md §8 (public themes).

## The system in one paragraph

Every visual decision reaches the screen through **CSS custom properties**. Components never
carry colour: the vendored `ui/` components render bare `cn-*` marker classes plus layout, and the
style sheets give those markers their look from tokens only (`bg-card` is `var(--card)`). So
re-colouring the app means redefining variables, never touching a component. Three classes ride
`<html>` — `palette-<id> style-<id> radius-<id>` (see `src/lib/appearance.ts`) — and a fourth,
`.dark`, is mode-watcher's. The public site is separate: its theme styles itself under
`.theme-<id>` on the `(site)` wrapper and never reaches `/app`.

## Layering

Tailwind declares `@layer theme, base, components, utilities`. **Unlayered CSS beats every layer
at any specificity.** The style sheets are imported `layer(base)` in `app.css`, so any unlayered
sheet outranks them without a specificity fight. **`!important` is banned**: it inverts layer
order and hands precedence back to the vendored sheets. Palettes are `html.palette-<id>` and
`html.dark.palette-<id>`, which outrank `:root` and `.dark` whatever the file order.

## Tokens

- `--radius` is the only shape token, and the radius knob owns it. **No style, house style or
  theme sets it**: hard-coded corners silently disable a control people were given. Derive
  shapes from it: `calc( var( --radius ) * n )`.
- Colour tokens are the shadcn set. A palette redefines them; nothing else in the app may.
- **No raw colour in a component.** Charts read `--chart-1..5`. The one exception is a catalog
  swatch, which is data describing a palette, not styling.

## Palettes, styles and radii

- **Palettes** are generated, never hand-written: add a recipe to `PALETTES` (a shadcn registry
  base colour and accent), then `bun run generate:palettes`. The generator keeps colour
  variables only and fails if a palette's light and dark blocks define different variables.
- **Styles** are shadcn-svelte's eight grammars (Vega, Nova, Maia, Lyra, Mira, Luma, Sera,
  Rhea), vendored by `bun run sync:ui` and **never edited by hand**: the next sync would undo it.
  To ship fewer, remove the row from `STYLES` and its `@import` from `app.css`; the tests check
  the two stay in step. Lyra and Sera force square corners, Rhea refuses `large`
  (`coupledRadius`); the stored choice is kept and returns with another style.
- New `ui/` components come from `bun run sync:ui -- --source <shadcn-svelte checkout> <name>`,
  not `shadcn-svelte add` (which writes one style baked in, so it wouldn't switch).
- The stock styles are deliberately restrained: no glassmorphism, no gradient buttons, no
  decorative noise. That restraint is what a workspace gets by default.

## House styles: the rules for a style that is fully its own

A house style is a ninth style with its own identity — billing-app's Astro (a nebula-ground
operations console drawn from its logo) is the model; this template ships none. It is the one
place the restraint above may be lifted, by explicit decision, and the lift does not travel:
nothing outside that style's sheet may adopt its devices.

### 1. Write the direction contract first

Five short paragraphs, in this doc, before any CSS:

- **THESIS** — what it looks like and, just as important, which familiar looks it refuses
  (Astro refused both the neutral-card-on-white panel and the near-black-plus-one-neon dark
  theme). Identity carried by **structure** (a recurring mark, a signature edge), not by glow.
- **OWN-WORLD** — the ground, the surfaces, the one signature device, the type treatment.
- **STORY** — what a person recognises in the first second, and what still reads comfortably
  in a dense table.
- **FIRST VIEWPORT** — sidebar, header, cards, figures as they first appear.
- **FORM** — the metaphor (Astro: an instrument panel), pinned by the brief.

### 2. Be different on purpose

Treat every existing style and house style as an **anti-reference**. A new house style must
differ from each of them on at least **two of three axes**: colour strategy, type treatment,
and structural signature (how surfaces, edges and active states are marked). If a choice would
make it look like a sibling, choose differently. One that could pass for a retinted Vega has
failed before it ships.

### 3. Structure and identity are separate files

- **Structure:** `sync:ui` derives `style-<id>.css` from a stock sheet (Astro used Vega),
  re-scoped to `.style-<id>`, so every marker stays covered — including markers upstream adds
  later. Add the style to a `DERIVED_STYLES` map in `scripts/sync-ui.ts`; never hand-edit it.
- **Identity:** one hand-written, **unlayered** sheet imported after `palettes.css`, scoped to
  `html.style-<id>` and its palettes. It carries every visual decision; a re-sync can't touch it.

### 4. What a house style may not change

- **The radius knob keeps working:** every corner derives from `var( --radius )`.
- **Density is not its to change:** row heights, control sizes and spacing come from the base
  sheet. It restyles surfaces and chrome; switching styles must not mean relearning a table.
- **No `!important`.**

### 5. Palettes: its own, swapped in, never added

A house style that owns its colours brings its **own palette catalog** with namespaced ids (they
exist in no generated sheet). The pickers **swap** the colour row while it's active rather than
growing a second one, and the person's stock palette is kept for the switch back — resolution
falls to the house catalog's default instead of refusing the pair (the same keep-and-ignore rule
as `coupledRadius`). Code: a per-style palette list in the catalog, `paletteForStyle()` in
`resolveAppearance`, the pickers reading it.

### 6. Single mode falls out of the cascade

If it has one mode, let the cascade make it so: `html.palette-<house-id>` (0,1,1) outranks
`.dark` (0,1,0) because no generated `.dark` block exists for it, so every colour token is
mode-invariant without a special case. Then **hide** the light/dark toggle (a `singleMode` flag
in the catalog) rather than leaving it inert. Be honest about the limit: a few `dark:` utilities
inside vendored components still follow mode-watcher's class.

### 7. Contrast is proven, not asserted

A test parses the shipped CSS and fails the build on any token pair under WCAG AA — composited
over the real ground when surfaces are translucent — plus chart-ramp separation, that the sheet
never sets `--radius`, never uses `!important`, and stops its motion under reduced motion.

### 8. Restraint inside the identity

- **One glow:** primary actions and focus rings. Everything else earns its edge from the
  signature device, hairlines and elevation.
- **One focus ring per focused object**, on the box a person sees (a group, not the input in it).
- **The signature marks surfaces with a head** (cards, table shells, tabs), not list rows; an
  active nav row gets its own vertical mark sized to its text.
- **Motion has a reason:** decoration is slow and measures nothing; a loading state may move
  because it says something. Animate gradients' angles, not elements' transforms. Everything
  stops under `prefers-reduced-motion`. No pulse, no tick, no fake "live" labels.
- **One ground:** nothing above `<body>` paints an opaque background over it; the sidebar is a
  tint over the same field, not a panel pasted on.

## Public-site themes: the rules for a theme that is fully its own

Public themes (`src/lib/themes/<id>`, see the README) are complete designs, not tints.

- **Divergence.** Every theme must be unmistakable from every sibling: no two share their type
  pairing, colour strategy *and* layout signature — differ on at least two. Read every sibling
  as an anti-reference before choosing anything.
- **Full surface.** A theme is every section of the home page — header, each band, pricing,
  FAQ, footer — plus any overlay it opens and its loading, empty and error states. Divergence
  applies **per section**: a band that would look at home in a sibling, or a white card on the
  theme's tinted canvas, fails.
- **Chrome.** Header and footer must differ in layout signature (grid, block order, link
  arrangement, edges, bottom bar), not just colour and font. Two footers that could swap
  palettes and pass for each other have failed.
- **Shared components stay token-only.** Anything shared between themes styles itself only with
  the shadcn tokens the theme defines. When a theme needs a different structure, fork the
  component into the theme's folder — never restyle the shared copy toward one theme.
- **Copy stays in `content.ts`.** Themes own the look, never the words.
- **Portals leave the theme.** bits-ui overlays portal to `<body>`, outside `.theme-<id>`: re-apply
  the class on the overlay's content, or use an in-place element (aurora's menu is a `<dialog>`).
- **The floor applies to every theme:** visible focus, keyboard-reachable controls, AA contrast,
  reduced motion honoured.
