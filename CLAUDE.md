# app-ts-sv

SvelteKit 2 + Svelte 5 template for web apps and SaaS: Bun, Tailwind 4, shadcn-svelte, Prisma 7
on Postgres with row-level security, better-auth, paraglide i18n. `README.md` explains every
module; `DESIGN.md` holds the visual rules. Read the section for what you're touching first.

## Rules that override a skill's defaults

- **ui/ components are vendored, never `shadcn-svelte add`.** `src/lib/components/ui` is the
  authoring flavour ( bare `cn-*` markers styled per appearance style ). Update or add with
  `bun run sync:ui -- --source <shadcn-svelte checkout> <name>`; the CLI's resolved components
  would ignore the style switcher. The shadcn-svelte skill's composition and styling rules
  still apply.
- **Design work: `/impeccable`, within `DESIGN.md`.** Tokens only, never `--radius` in a style,
  no raw colours in components. New public themes and house styles must be fully distinct —
  DESIGN.md has the rulesets. A project made from this template runs `/impeccable init` once
  to write its own `PRODUCT.md`; when impeccable documents the project's visual system in
  DESIGN.md, extend the existing rules there rather than replacing them.
- **Tenant data goes through `db`, not `prisma`.** `db` ( `$lib/server/db` ) scopes every query
  to the request's tenant; `prisma` is the raw client for the control plane and tests. A new
  tenant-scoped table calls `SELECT app_enable_tenant_rls( '<table>' )` in its migration.
  Write migrations with `prisma migrate diff` and review them; tests assert as the app role.

- **Optional features are modules** ( `config/modules.ts`, README "Modules and clients" ).
  Code that uses a module from outside it guards with the literal `MODULES.<id>` so a build
  without it drops the code; core server code calls mail and notifications through their
  `gate.ts`. A new optional feature gets a registry entry, its own routes listed there,
  and `module` on its nav items.

## Conventions

- **Every user-facing string is a message** ( `messages/en.json` and `messages/id.json`, both ),
  used as `m.key()`. English is the base locale.
- **Validate at the boundary with valibot**: `readJson( request, schema )` in endpoints,
  `validateForm` in actions — the same schema the browser used.
- **House style**: tabs, spaces inside parens, aligned colons in multi-line objects, LF.
  Comments explain why, in the `/* ―― » … */` banner for longer notes. Match the surrounding code.
- **Dev-only code** lives in `src/routes/(dev)` ( the `/hello` playground — show every new UI
  piece there ); production builds stub it to 404.

## Checks

Browser checks sign in as the seeded demo admin ( `DEMO_EMAIL` / `DEMO_PASSWORD` in `.env` ).

```bash
bun run check        # svelte-check
bun run test         # server ( node + PGlite ) and client ( Chromium ) projects
bun run build
```

## Skills

Project skills live in `.claude/skills`. Installed from their authors' repos with skilld
( locked in `.skills/skilld-lock.yaml` ): svelte-code-writer, svelte-core-bestpractices,
shadcn-svelte, best-practices + security ( better-auth ), prisma-cli, prisma-client-api,
supabase-postgres-best-practices, vitest. Plus `impeccable` ( its own installer ) and
`spec-chore` ( ours: the coverage chore ). Refresh with `npx skilld update` and
`npx impeccable update`; stop the dev server first on Windows.
