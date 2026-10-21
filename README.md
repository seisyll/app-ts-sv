# app-ts-sv

SvelteKit + Svelte 5 + Tailwind 4 + shadcn-svelte template (Bun).

```bash
bun install
bun run dev      # http://localhost:5173/hello  ← UI/UX playground (dev only)
bun run check
```

## Defaults

| What | Where |
|---|---|
| Default locale (`en`) and the locale list | `project.inlang/settings.json` → `baseLocale`, `locales` |
| Translations | `messages/<locale>.json` |
| Currency (`USD`), time zone (`UTC`) | `src/lib/config.ts` |

The locale is resolved per request from the `PARAGLIDE_LOCALE` cookie, then `baseLocale`
(see `strategy` in `vite.config.ts`). Formatting helpers live in `src/lib/format.ts`.

## Playground

`src/routes/(dev)/` holds the playground and its mock API (`/api/hello`, fixed JSON, no
database). Everything under it returns 404 outside `vite dev`.

| Page | Shows |
|---|---|
| `/hello` | i18n, formatting, the mock API |
| `/hello/save-bar` | `SaveBar` + `Draft` (`src/lib/components/save-bar`) |
| `/hello/data-table` | `DataTable` (`src/lib/components/data-table`): in memory and server-paged against a mock endpoint |
| `/hello/forms` | `apiForm` + SaveBar against a mock endpoint, and a form action that works without JS |
| `/hello/shell` | `AppShell` (`src/lib/layout`): sidebar, breadcrumb, command palette (Ctrl/⌘+/), user menu, `NavProgress` |
| `/hello/media` | `MediaField` + library picker, `MediaGrid` (masonry / grid / list), `MediaLightbox`, `MediaDropzone` against a mock library |
| `/hello/site` | Every public-site theme, switchable, with sign-up on or off |

The palette button in the playground's header tries every palette, style and radius on every
page here (it only paints; reload to go back).

## Public site and themes

`/` is the public site: a landing page (hero, features, how it works, stats, testimonials,
pricing, FAQ, call to action) with a header and footer. Its look is a **theme**, and only
the active theme is built: `$theme` points at `src/lib/themes/<THEME>` (`svelte.config.js`),
and the `(site)` routes import nothing else.

```bash
THEME=plain bun run dev     # or THEME=… in .env; restart after changing it
```

| Theme | Look |
|---|---|
| `aurora` (default) | billing-app's landing page: dark ink, teal, a light serif display, the network globe |
| `plain` | The app's own tokens and ui/ components, light and dark. A neutral starting point |

- **Copy:** the words live in `src/lib/themes/content.ts` and the `site_*` messages, shared
  by every theme. Change your marketing copy there, not in a theme.
- **Contract:** a theme is a folder whose `index.ts` exports `id`, `Header`, `Footer` and
  `Home`, typed by `src/lib/themes/contract.ts`. Style it under `.theme-<id>` (the `(site)`
  wrapper has that class) so nothing reaches `/app` or `/login`. Re-pointing the shadcn
  tokens there (`--background`, `--primary`, …) restyles any ui/ component used inside.
- **New theme:** copy `plain/` and change `id`, then add it to the lists in
  `src/lib/themes/themes.svelte.test.ts` (contract tests) and `/hello/site`.
  `bun run check` fails if it breaks the contract.
- **No database:** the public site works before `db:setup`, and on a shared deployment's
  bare domain.
- **Detach:** delete `src/routes/(site)`, `src/lib/themes` and `/hello/site`, remove `$theme`
  from `svelte.config.js` and the `site_*` messages. The `@fontsource-variable` packages
  other than Inter are aurora's.

## Appearance

People pick how the app looks: a **palette** (8 colour sets, light and dark), a **style** (shadcn's
8 component grammars — Vega, Nova, Maia, Lyra, Mira, Luma, Sera, Rhea) and a **radius** (5
corners). An admin sets the workspace default at `/app/settings/appearance` and decides whether
people may override it; each person overrides any knob from the palette button in the header.

- **How it paints:** the answer is three classes on `<html>`, server-rendered from an
  `appearance` cookie so pages never flash; the `/app` layout reads the truth from the database
  and heals the cookie. Catalog and resolution: `src/lib/appearance.ts`.
- **Storage:** `appearance_settings` (one row per workspace, under RLS; no row = defaults) and
  three nullable columns on `users` (null = follow the workspace). Turning overrides off ignores
  people's choices without deleting them.
- **Components:** `src/lib/components/ui/` is shadcn-svelte's *authoring* flavour — bare `cn-*`
  markers — and `src/lib/styles/style-<id>.css` holds each style's look. Update or add components
  with `bun run sync:ui -- --source <shadcn-svelte checkout> [name …]`, not `shadcn-svelte add`.
- **Adding a palette:** a row in `PALETTES`, then `bun run generate:palettes`. **Shipping fewer
  styles:** drop rows from `STYLES` and the matching `@import`s in `app.css`.
- **Rules** for new palettes, styles and house styles (and for public themes): `DESIGN.md`.
- **Detach:** keep one style (`STYLES = [ 'vega' ]` and its import), delete the picker, the
  settings page, `/api/appearance` and the migration's table/columns; leave `style-vega` on
  `<html>`, since the components are unstyled without a style class.

## Media

Uploads of images and PDFs, a library at `/app/media`, and an image field for forms. The
fundraiser app's storage, grid and lightbox, with billing-app's rules for what gets stored.

- **On disk:** `UPLOAD_ROOT/<tenant>/<yyyy>/<mm>/<id>[-thumb].<ext>`, named by the `media` row's
  id (under RLS) — no client input ever reaches a path. In Docker, mount `UPLOAD_ROOT` as a
  writable volume. Back it up with the database: a row without its file shows as missing.
- **What is accepted** is decided by the bytes, not the name or Content-Type: PNG, JPEG, WebP,
  GIF, AVIF and PDF by their magic numbers. SVG and HTML can't match, so an upload can't carry
  script. 10 MB per file (`MAX_BYTES` in `src/lib/media.ts`); set `BODY_SIZE_LIMIT` above it.
- **Images** are shrunk in the browser first when large (and JPEGs re-encoded, so EXIF/GPS
  never leaves the device), then the server re-does it as the guarantee: sharp turns them
  upright, strips metadata, stores WebP at most 2560px plus a 480px thumbnail (an animated GIF
  keeps its first frame). **PDFs** are stored as sent and always downloaded.
- **Serving:** `/media/<id>` and `/media/<id>/thumb`, to signed-in members of the workspace
  only (`media: [ 'list' ]`); private, immutable caching; a `sandbox` CSP; `nosniff` on every
  response.
- **Permissions:** members list and upload, admins also delete (`src/lib/permissions.ts`).
- **Components** (`src/lib/components/media`): `MediaField` (value = media id; `name` posts it
  with a form), `MediaPicker`, `MediaGrid`, `MediaLightbox` (zoom, pan, pinch, swipe, details,
  delete), `MediaDropzone`, `uploadMedia()`, `MediaFeed`.
- **Not built:** per-workspace quotas (the fundraiser app's `StorageUsage` is the model),
  public media, more image sizes, streaming uploads.
- **Detach:** delete `src/lib/components/media`, `src/lib/server/media.ts`, `src/lib/media.ts`,
  `/app/media`, `/api/media`, `/media`, the migration and `sharp`.

## DataTable

```svelte
<DataTable data={rows} {columns} />                           <!-- in memory -->
<DataTable source={new TableSource( { path, initial } )} {columns} />  <!-- server-paged -->
```

- **Server mode**: create the `TableSource` in the page component from the load's first
  page (so the server render already has rows). The endpoint reads the request with
  `parsePageQuery( url.searchParams )` and answers `Paged<T>` —
  see `src/routes/(dev)/api/hello/customers/+server.ts`. `parsePageQuery` only shapes the
  input: allow-list `sort`, `searchBy` and filter columns in the endpoint.
- A column with a string `header` gets a sort button; `enableSorting: false` opts out.
- Helpers: `selectColumn()`, `rowNumberColumn()`, `facetedFilter`, `dateRangeFilter`,
  `textCell()` (escapes HTML), `runBulk()` for bulk actions.

## HTTP and forms

- **`http`** (`src/lib/http.ts`): `http.get/post/put/patch/delete`. JSON in and out,
  15 s timeout, every failure an `HttpError` (`.status`, `.messageOr( fallback )`,
  `.fieldErrors`, `.unreachable`). In a load or action pass `event.fetch`.
  `errorMessage( error )` gives the text to show a user.
- **`mutate( path, { body, success } )`** (`src/lib/mutate.ts`): a write from the browser,
  toast on success or failure, then `invalidateAll()`.
- **Validation messages** (`src/lib/validation.ts`): valibot's defaults go through
  paraglide, so schemas stay plain (`v.pipe( v.string(), v.nonEmpty(), v.email() )`) and
  messages follow the user's language in the browser and the request's on the server.
- **One schema, validated twice.** The browser validates for convenience; the server
  validates because it must:

| Form | Browser | Server |
|---|---|---|
| Saves to a JSON endpoint | `apiForm( schema, { submit } )` (`src/lib/forms.ts`) | `await readJson( request, schema )` — 400 with field errors, shown under the fields |
| `<form>` action (works without JS) | `superForm( data.form, { validators: valibot( schema ) } )` | `validateForm( event, schema, save )` (`src/lib/server/forms.ts`) |

`apiForm` pairs with SaveBar: `<SaveBar show={form.isTainted( $tainted )} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />`
inside the `<form use:enhance novalidate>`. See `/hello/forms`.

## Database

Postgres 18 + Prisma 7, tenant-isolated by row-level security.

```bash
cp .env.example .env   # once
bun run db:setup       # docker Postgres on 127.0.0.1:5433 → migrate → provision app_rls → seed
bun run db:reset       # wipe and set up again
```

- **Two roles.** Migrations and seeds run as the owner (`DATABASE_OWNER_URL`). The app
  connects as `app_rls` (`DATABASE_URL`): not the owner, not superuser, so every policy
  applies. The app refuses to start resolving tenants under an unsafe role.
- **Tenancy switch** (`TENANCY`): `single` — one tenant (`TENANT_SLUG`); also the
  one-deploy-per-client setup. `shared` — tenant from the host: a custom `domain`, else
  `<slug>.APP_DOMAIN`. Same data model either way.
- **Queries** (`src/lib/server/db`): `db.<model>` is scoped to the request's tenant
  (`hooks.server.ts` puts it in scope; looked up only when first needed).
  `tenantTransaction( tx => … )` for several statements; `runWithTenant( tenant, … )` in
  scripts and jobs; `prisma` (unscoped) only for the `tenants` table.
- **A new tenant-scoped table:** add the model with
  `tenantId String @default(dbgenerated("app_current_tenant()")) @map("tenant_id") @db.Uuid`,
  create the migration with `bunx prisma migrate dev --create-only --name <name>`, and
  append `SELECT app_enable_tenant_rls( '<table>' );` to it. `src/lib/server/db/rls.test.ts`
  fails until every table with a `tenant_id` is isolated.
- **Tests** run on PGlite (Postgres in-process, `src/lib/test/database.ts`): the real
  migrations, no Docker.

## Auth

better-auth on the tenant-scoped database: an account belongs to one tenant; a session
from one tenant doesn't exist in another; the same email can sign up separately in each.

- **Pages:** `/login`, `/signup` (404 unless `AUTH_SIGNUP=true`), `/logout` (a POST), and
  the signed-in area `/app` (profile, password, admin-only settings). All are form actions:
  they work without JavaScript.
- **First admin:** `bun run db:seed` creates `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `TENANT_SLUG`.
- **Roles:** `src/lib/permissions.ts` (`admin`, `member`). Add a resource there and grant it.
- **Guards** (`src/lib/server/guards.ts`):

| | Signed out | Lacks permission |
|---|---|---|
| Page: `requireUser( event )`, `requirePermission( event, { settings: [ 'update' ] } )` | → `/login?redirectTo=…` | 404 |
| Endpoint: `requireApiUser`, `requireApiPermission` | 401 | 403 |

  Everything under `/app` is guarded in `hooks.server.ts` — a check in `+layout.server.ts`
  alone doesn't protect a page's load or actions (they run in parallel). Pages that need
  more than a signed-in user call `requirePermission` themselves.
- **Nav:** give a `NavItem` a `permission` and pass the nav through `filterNav( nav, … )` to
  hide it from users without it (the page still guards itself).
- **Env:** `BETTER_AUTH_SECRET` (≥ 32 chars), `BETTER_AUTH_URL` (single tenancy; shared
  derives it per request), `AUTH_SIGNUP`.

### Users (`/app/users`)

Admins list, add, re-role, ban, sign out and delete the tenant's users. Reads go through
the tenant-scoped `db` (`listUsers` in `src/lib/server/users.ts`); changes go through
better-auth's admin API, which hashes the password, ends a banned user's sessions and checks
the caller's permission again. Your own row has no actions, and the endpoints refuse them
(`400`), so a tenant can't lock out its last admin.

- **Endpoints:** `GET`/`POST /api/users`, `PATCH /api/users/:id` with
  `{ action: 'set-role' | 'ban' | 'unban' | 'revoke-sessions' }`, `DELETE /api/users/:id`.
- **A list endpoint of your own:** `listArgs( parsePageQuery( url.searchParams ), spec )` in
  `src/lib/server/list.ts` turns the DataTable's query into Prisma
  `{ where, orderBy, skip, take }`. The `spec` allow-lists the search, facet and sort fields.
  Date ranges are calendar days in `APP.timeZone`.

## Testing

```bash
bun run test           # everything, once
bun run test:server    # Node only — fast
bun run test:client    # components in headless Chromium
bun run test:watch     # watch mode
bun run test:coverage  # + coverage report in /coverage
```

Two Vitest projects, chosen by file name (config in `vite.config.ts`):

| File | Runs in | For |
|---|---|---|
| `*.test.ts` | Node | logic, stores, endpoints — e.g. `table-source.test.ts`, `query.test.ts` |
| `*.svelte.test.ts` | real Chromium | components — e.g. `SaveBar.svelte.test.ts`, `DataTable.svelte.test.ts` |

Put the test next to the file it tests. Component tests have no SvelteKit runtime, so
route `$app/*` to the test kit in `src/lib/test/`:

```ts
vi.mock( '$app/state', () => import( '$lib/test/app-state.svelte' ) )      // page, navigating, setPath()
vi.mock( '$app/navigation', () => import( '$lib/test/app-navigation' ) )   // goto spy, attemptNavigation()
```

`render()` from `vitest-browser-svelte` returns a promise — `await` it. Query the way a
user would (`page.getByRole( 'button', { name: 'Save' } )`) and assert with
`expect.element(…)`, which retries until the DOM settles. Playwright is pinned to the
version whose Chromium is installed; after bumping it, run `bunx playwright install chromium`.

## Dashboard shell

`AppShell` takes the whole sidebar as one `NavGroup[]` config (`src/lib/layout/nav.ts`);
breadcrumbs and the command palette are derived from it. Pass `open` from the
`sidebar_state` cookie in a server load (see `src/routes/(dev)/hello/shell/+layout.server.ts`).
