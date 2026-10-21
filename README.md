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
| `/hello/shell` | `AppShell` (`src/lib/layout`): sidebar, breadcrumb, command palette (Ctrl/⌘+/), user menu, `NavProgress` |

## Dashboard shell

`AppShell` takes the whole sidebar as one `NavGroup[]` config (`src/lib/layout/nav.ts`);
breadcrumbs and the command palette are derived from it. Pass `open` from the
`sidebar_state` cookie in a server load (see `src/routes/(dev)/hello/shell/+layout.server.ts`).
