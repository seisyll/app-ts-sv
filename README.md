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
