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
