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
| Error page (plain, every route) | `src/routes/+error.svelte`; `src/error.html` when even that can't render |

The locale is resolved per request from the `PARAGLIDE_LOCALE` cookie, then `baseLocale`
(see `strategy` in `vite.config.ts`). Formatting helpers live in `src/lib/format.ts`:
`money`, `date`, `initials`, `slugify`, and `maskEmail` / `maskPhone` / `maskName` for
personal details on a public page — mask in the load function, not in the browser.

## Agent skills

`CLAUDE.md` is the agent's brief: the stack, the rules that override a skill's defaults, the
checks. Skills live in `.claude/skills/` ( vendor skills via [skilld](https://skilld.dev),
pinned in `.skills/skilld-lock.yaml` ) — design work goes through `/impeccable`. A new project
runs `/impeccable init` once to write its `PRODUCT.md`. Refresh with `npx skilld update` and
`npx impeccable update` ( on Windows, stop the dev server first ).

## Playground

`src/routes/(dev)/` holds the playground and its mock API (`/api/hello`, fixed JSON, no
database). Everything under it returns 404 outside `vite dev` (production builds stub it
out, see Modules and clients). A module's playground pages show only when the build ships
it.

| Page | Shows |
|---|---|
| `/hello` | i18n, formatting, the mock API |
| `/hello/save-bar` | `SaveBar` + `Draft` (`src/lib/components/save-bar`) |
| `/hello/data-table` | `DataTable` (`src/lib/components/data-table`): in memory, and server-paged against a mock endpoint with its query in the URL |
| `/hello/pickers` | `RemotePicker` (`src/lib/components/pickers`): one choice and several, over the mock customers endpoint |
| `/hello/forms` | `apiForm` + SaveBar against a mock endpoint, a form action that works without JS, `MoneyInput` / `MaskedInput`, `FormSection` / `SettingsSection`, and a dialog taller than the window |
| `/hello/components` | The `ui/` components the app doesn't use yet: chart, tabs, accordion, calendar, carousel, empty, item, input-otp, native-select, slider, progress, radio-group, button-group, pagination, menubar, navigation-menu, context-menu, drawer, hover-card |
| `/hello/dashboard` | `Figure`, `StatCards`, `LifecycleRail`, `TrendChart` ( bar / area ), `UnitGrid`, `StatBreakdown`, `MonthPicker` on made-up numbers, with a reroll and a failed read |
| `/hello/shell` | `AppShell` (`src/lib/layout`): sidebar, breadcrumb, command palette (Ctrl/⌘+/), user menu, `NavProgress` |
| `/hello/brand` | `BrandMark` with and without a logo, `FaviconPreview`, the sign-in header |
| `/hello/audit` | `AuditEntry`: trail entries worded from their stored action, names and changes |
| `/hello/sign-ins` | `SignInList` and `OutcomeBadge` on made-up attempts |
| `/hello/captcha` | `CaptchaWidget` with Turnstile's and hCaptcha's test keys |
| `/hello/social` | `SocialButtons` and `ConnectedAccounts` (`src/lib/components/social`), posting to stand-in actions |
| `/hello/media` | `MediaField` + library picker, `MediaGrid` (masonry / grid / list), `MediaLightbox` (with the public switch), `MediaDropzone` against a mock library |
| `/hello/editor` | `RichEditor` with images and template variables; the server's validation and its HTML and email renders |
| `/hello/notifications` | `NotificationBell`, `NotificationList` and the all-clear moment against a mock inbox |
| `/hello/mail` | The dev outbox: every email the app sent, as HTML and text, plus a sample of each email |
| `/hello/site` | Every public-site theme, switchable, with sign-up, a logo and a workspace's footer details on or off |
| `/hello/seo` | `<Seo>`: the tags it writes and a link preview with the theme's share image |

The palette button in the playground's header tries every palette, style and radius on every
page here (it only paints; reload to go back).

## Modules and clients

Every optional feature is a **module**, and a **client config** picks the ones a build ships.
This comes from the fundraiser app's extension system. It's the template's "detachable"
rule: a module that's off isn't hidden, it isn't in the bundle at all.

| Module | What |
|---|---|
| `site` | The public site, in the client's theme. Off: `/` sends people to `/app` |
| `users` | User administration (`/app/users`) |
| `appearance` | The palette / style / radius picker and settings. Off: everyone gets the defaults |
| `media` | Uploads, the media library, the image field, the editor's image picker |
| `editor` | Rich text (TipTap), its validation and its HTML / email renders |
| `notifications` | The bell, the inbox, per-type preferences |
| `mail` | Per-workspace SMTP, password reset, verification, invites, notification emails. Needs `editor` |

Always there (core): auth, the dashboard shell, DataTable, forms, settings and the
playground's core pages.

```ts
// config/clients/acme.ts → CLIENT=acme bun run dev / bun run build
export default defineClient( { extends: core, modules: { users: true, media: true, mail: true, editor: true }, theme: 'plain' } )
```

- **The registry** (`config/modules.ts`) lists each module: its description, the routes it
  owns (route ids such as `/app/media` or `/(auth)/reset-password`), what it `requires`, and
  an optional `whenOff` redirect.
- **Client configs** (`config/clients/<name>.ts`) build on presets (`config/presets`:
  `full` has everything, `core` has nothing). Any module they don't mention is off.
  - `CLIENT` picks the config; without it, `config/clients/default.ts` (everything) is
    used.
  - A config with an unknown module, a missing requirement or a theme that doesn't exist
    fails the build, naming each problem.
  - The dev server prints the client and its modules on start. Restart it after changing
    `CLIENT` or a config.
- **Off at build:**
  - Every file under a module's routes is swapped for a 404 stub (or the `whenOff`
    redirect), in dev too, so `CLIENT=x bun run dev` is exactly x's build. The playground
    under `(dev)` is stubbed in every production build.
  - In the source, `MODULES.<id>` is replaced by `true` or `false`, so
    `if ( MODULES.media )` and `{#if MODULES.media}` drop the disabled branch and the
    imports only it used.
  - Server code outside a module reaches mail and notifications through their gates,
    `$lib/server/mail/gate` and `$lib/server/notifications/gate`, which load the module
    with a dynamic import behind the flag.
  - A build without mail contains no nodemailer and no TipTap. `bun run build` with a
    small client is the way to check.
- **Off per workspace** (shared tenancy):
  - `bun run tenant:modules acme -mail` switches a built module off for one tenant;
    `+mail` turns it back on, and `all` turns everything the build ships back on. With no
    arguments it lists every tenant.
  - Its routes then answer 404 (`handleModules` in hooks). The `/app` layout passes the
    active list as `data.modules`, which the nav (`NavItem.module`) and shared pieces check.
  - Turning a module off also turns off any module that requires it.
  - Changes land within a minute (the tenant cache).
  - Settings shows each module as on, off for this workspace, or not in the build.
- **Runtime checks:** `isBuilt( id )` (`$lib/modules`) answers for this build;
  `activeModules()`, `moduleActive( id )` and `requireModule( id )`
  (`$lib/server/modules`) answer for the current workspace. Only the literal
  `MODULES.<id>` is replaced at build, so `MODULES[ id ]` is a runtime error.
- **Adding a module:**
  - Add a registry entry and a label in `moduleLabel`.
  - Guard its entry points in shared code with `MODULES.<id>`. Give it a gate if core
    server code calls it.
  - Tag its nav items with `module`.
- **Not built:** tiers and quotas (the fundraiser app's plans), and an operator UI for the
  per-workspace switches.

## Public site and themes

`/` is the public site: a landing page (hero, features, how it works, stats, testimonials,
pricing, FAQ, call to action) with a header and footer. Its look is a **theme**, and only
the active theme is built: the client config's `theme` (see Modules and clients; `aurora`
by default) becomes the `$theme` alias (`svelte.config.js`), and the `(site)` routes import
nothing else. A build without the `site` module has no public site at all.

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
  bare domain. With one, it shows the workspace's logo (see Logo and favicon) and what the
  workspace set in **Settings → Public site** (below).
- **The workspace's own words** (`/app/settings/site`, permission `site: manage`):
  - **Pages** — Privacy policy, Terms of service and About, written with the rich-text
    editor and served at `/privacy`, `/terms`, `/about`. One copy per language; a visitor
    whose language has none reads another. Saving an empty page takes it down. A page's
    images go public when it is saved. Published pages join the footer, and Terms and
    Privacy appear under the sign-up button. Add one with a key in `SITE_PAGES`
    (`src/lib/site.ts`) and its title message. Pages need the `editor` module.
  - **Footer** — a tagline (blank keeps `site_tagline`), contact email and phone, and
    links to X, Facebook, Instagram, LinkedIn, YouTube, WhatsApp and GitHub (`https://`
    only; blank ones are hidden). A theme's Footer gets them as `site.contact` and
    `site.social`, with `NetworkIcon` ( `$lib/components/site` ) for the marks.
- **Detach:** turn the `site` module off in the client config. To delete it for good,
  remove `src/routes/(site)`, `src/routes/app/settings/site`, `src/lib/themes`,
  `src/lib/site.ts`, `src/lib/server/site.ts`, `src/params/site_page.ts`, `/hello/site`,
  `$theme` in `svelte.config.js`, the `site_*` messages, and the `site_settings` and
  `site_pages` tables ( `prisma/schema/Site.prisma` ). The `@fontsource-variable` packages
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
  The vendored set was synced from upstream commit `bc3c203`; syncing a newer checkout also
  refreshes every existing component — do that as an upgrade, on purpose. Deliberate
  divergences (a self-providing tooltip, dialogs that scroll inside the screen, the sidebar's
  context key) are `PATCHES` in `scripts/sync-ui.ts`, so a sync keeps them. Chart needs
  `layerchart` + `d3-scale`, drawer `vaul-svelte`, carousel `embla-carousel-svelte`; charts
  colour series with `var( --chart-1…5 )`.
- **Adding a palette:** a row in `PALETTES`, then `bun run generate:palettes`. **Shipping fewer
  styles:** drop rows from `STYLES` and the matching `@import`s in `app.css`.
- **Rules** for new palettes, styles and house styles (and for public themes): `DESIGN.md`.
- **Detach:** turn the `appearance` module off (everyone gets the defaults). To delete it for good: keep one style (`STYLES = [ 'vega' ]` and its import), delete the picker, the
  settings page, `/api/appearance` and the migration's table/columns; leave `style-vega` on
  `<html>`, since the components are unstyled without a style class.

### Logo and favicon

On the same settings page, above the colours: a **logo** (the sidebar's square, the public
site's header and footer, above the sign-in forms) and a **favicon** (the browser tab), each
with a preview, saved with the rest under the SaveBar.

- **Storage:** `logo_media_id` / `favicon_media_id` on `appearance_settings`, pointing at
  media; deleting the file clears them. Saving checks each is an image of this workspace and
  makes it **public** (see Media) — visitors who aren't signed in load them too.
- **Reading:** the root layout's load (`loadBrand`, `src/lib/server/brand.ts`) gives every
  page `data.brand` = `{ name, logo, favicon }` (thumbnail URLs), or `null` with no database
  or no tenant — then each surface shows its own mark: initials in the sidebar and above
  sign-in, the theme's mark on the public site, no favicon.
- **Themes** get `site.logo` and show it instead of their mark.
- **Not built:** an Apple touch icon or `/favicon.ico` (the favicon is the WebP thumbnail),
  wide-logo layouts in the sidebar (it's a square there).
- **Detach:** delete `src/lib/brand.ts`, `src/lib/server/brand.ts`, `src/routes/+layout.server.ts`,
  `BrandMark` / `FaviconPreview` uses, the two cards and the migration's columns.

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
  (`media: [ 'list' ]`), private and immutable caching; a `sandbox` CSP; `nosniff` on every
  response. The row is read through RLS first, so another workspace's id is a 404.
- **Public files** (`media.public`): served to anyone on the workspace's host, cached
  publicly for a day — a logo, an image in an email. Files start private; an admin switches
  one in the lightbox's details (`PATCH /api/media/<id> { public }`), which also copies its
  link. A globe marks public files in the grid. Making one private again reaches shared
  caches within that day.
- **Permissions:** members list and upload, admins also delete and publish (`src/lib/permissions.ts`).
- **Components** (`src/lib/components/media`): `MediaField` (value = media id; `name` posts it
  with a form), `MediaPicker`, `MediaGrid`, `MediaLightbox` (zoom, pan, pinch, swipe, details,
  delete), `MediaDropzone`, `uploadMedia()`, `MediaFeed`.
- **Not built:** per-workspace quotas (the fundraiser app's `StorageUsage` is the model),
  more image sizes, streaming uploads.
- **Detach:** turn the `media` module off. To delete it for good: delete `src/lib/components/media`, `src/lib/server/media.ts`, `src/lib/media.ts`,
  `/app/media`, `/api/media`, `/media`, the migration and `sharp`.

## Rich text

A TipTap editor (from the fundraiser app) that stores **JSON** and renders on the **server**.

```svelte
<RichEditor label="Body" bind:value={body} variables={[ { name: 'customer_name', label: 'Customer name' } ]} />
<!-- or name="body" to post it with a form -->
```

```ts
const schema = v.object( { body: richTextSchema } )            // validate on save ( $lib/editor/document )
const html = renderRichText( body )                             // in a load → <RichText {html} />
const mail = renderEmailHTML( body, { baseUrl, values: { customer_name: 'Ada' } } )
```

- **One schema** (`src/lib/editor/schema.ts`) for the editor, the validator and both renderers,
  so a document can only hold what all of them understand: headings, marks, lists, quote,
  code, divider, links, alignment, images, `{{variables}}`.
- **Safe by construction:** `richTextSchema` rejects anything the schema can't build, links
  that aren't http(s)/mailto/relative, images that aren't https or this app, malformed
  variable names, and documents over 256 KB. The renderer escapes text and attributes, so
  `<RichText>` needs no sanitizer — but only ever give it `renderRichText()` output.
- **Images** come from the media library (the picker), resizable and alignable in place.
- **Email HTML** is inline-styled, with absolute URLs and variables filled in (escaped).
  A recipient has no session, so an image in an email must be a **public** file (see Media).
- **Not built:** Markdown output, collaborative editing, tables, alt-text editing, keyboard
  resizing of images.
- **Detach:** turn the `editor` module off (mail needs it; the public site's pages go with it). To delete it for good: delete `src/lib/editor`, `src/lib/components/editor`, `/hello/editor` and the
  `@tiptap/*` and `svelte-tiptap` packages.

## Notifications

In-app notifications (from the fundraiser app): a bell with an unread badge in the `/app`
header, the inbox at `/app/notifications`, and per-type preferences at
`/app/account/notifications`.

```ts
await notify( { type: 'user.joined', params: { name, email }, to: { roles: [ 'admin' ], except: [ actorId ] } } )
```

- **The catalog** (`src/lib/server/notifications/catalog.ts`) says what each type means: a
  params schema, labels for the preferences page, and a `render` to title / body / link. The
  database stores only type + params, so rewording needs no migration and each reader gets
  their own language. Adding a type: one catalog entry, messages, and an icon in
  `src/lib/components/notifications/icons.ts`.
- **`notify()` never throws** — a notification can't fail the action that sent it. One event
  row, one recipient row per reader: roles and/or users, minus `except`, minus anyone who
  turned the type off, and only users visible in the current workspace (RLS).
- **Shipped types:** `user.joined` (admins, on sign-up or when an admin adds someone) and
  `role.changed` (the person whose role changed).
- **The queue** shows what's unread; opening an item or its check marks it read. Emptying it
  plays the all-clear. The badge comes with the server render, then polls every 30 s and on
  returning to the tab.
- **Email:** readers choose per type; until they do, the catalog's `email` default applies
  (`role.changed` on, `user.joined` off). Copies go out after the response, through the
  workspace's mail (see Mail).
- **Not built:** push delivery, live push (SSE), a read-history view, cleanup of old rows.
- **Detach:** turn the `notifications` module off. To delete it for good: delete `src/lib/server/notifications`, `src/lib/components/notifications`,
  `src/lib/notifications.ts`, `/app/notifications`, `/app/account/notifications`,
  `/api/notifications`, the `notify()` calls and the migration.

## Mail

Each workspace sends through **its own SMTP server**, set in Settings → Mail
(`/app/settings/mail`). There is no deployment-wide fallback. The password is encrypted with
`BETTER_AUTH_SECRET`; if you rotate the secret, enter the SMTP password again.

```ts
await sendMail( { to: { email, name }, template: 'user.invite', values: { inviter, link } } )
```

- **What sends mail:**
  - password reset: "Forgot password?" on `/login` → `/forgot-password` → `/reset-password`, which signs you in
  - email verification: with `AUTH_SIGNUP=true`, a new account must verify before it can sign in
  - invites: add a user without a password
  - notification emails: an Email switch per type at `/app/account/notifications`
  - a test email from the settings page
- **Not set up:** without a mail server, features that need email hide or ask for something
  else: no "Forgot password?" link, no sign-up page, and an admin must choose a new user's
  password. **In dev**, every email also lands in the outbox at `/hello/mail`, which is the
  only place it goes until a server is set up.
- **The catalog** (`src/lib/server/mail/templates.ts`) lists every email: its variables,
  default subject and body (written as messages, in both languages), and the button it ends
  with.
  - A workspace can reword the subject and body per language in the TipTap editor, with
    `{{variables}}`. The rendering uses the email HTML renderer from Rich text, in a
    table-and-inline-style layout with a plain-text copy.
  - The button and its link can't be edited, so a reworded email can't lose its link.
  - To add an email: add a catalog entry and its messages, then call `sendMail` where it
    happens.
- **Invites** reuse better-auth's reset token with a 7-day expiry, so accepting an invite is
  the reset page. If the link expires, "Forgot password?" sends a new one. If the invite
  email can't be sent, the new account is removed again. Users who haven't accepted show as
  *Invited* in the Users table.
- **Abuse limits:**
  - At most one reset email per account per minute.
  - The forgot-password form gives the same answer whether or not the address has an
    account.
  - In shared tenancy, the SMTP host must resolve to a public address, so a workspace admin
    can't use "send test email" to probe the internal network. The app connects to the
    address it checked.
- **Not built:**
  - a send queue with retries: each email is sent within the request that triggers it, and
    notification emails go out after the response
  - each user's own language: notification emails use the language of the request that
    triggered them
  - images in email bodies: media can be public now (see Media), but the mail editor doesn't
    offer images yet
  - removing a workspace's mail settings from the UI
- **Detach:** turn the `mail` module off. To delete it for good:
  - delete `src/lib/server/mail`, `src/lib/mail.ts`, `/app/settings/mail`, `/hello/mail`,
    `/api/hello/mail`, `/forgot-password` and `/reset-password`, and the migration
  - remove the `sendMail` calls in `src/lib/server/auth.ts` (reset and verification),
    `src/lib/server/users.ts` (invites) and `src/lib/server/notifications`
  - set `requireEmailVerification` back to `false`

## Dashboard

`/app` opens on the workspace's figures (`src/lib/server/dashboard.ts`), built from billing-app's
dashboard pieces in `src/lib/components/dashboard`:

| Piece | Shows |
|---|---|
| `Figure` | A big number that rolls to its new value (NumberFlow; reduced motion honoured; plain text kept for screen readers): `count`, `money` (`APP.currency`), `percent` |
| `StatCards` | The 2-4 across figure row |
| `StatBreakdown` | One total and its parts: two figures, a stacked bar, a legend with counts and shares |
| `UnitGrid` | A whole as 100 cells (a waffle); legend rows can filter |
| `LifecycleRail` | A population as a journey: stops on a rail, exits branching off; stops can filter |
| `TrendChart` | A figure per period, grouped bars or an area (layerchart) |
| `MonthPicker` | Previous / this month / next, never past the current month |

- **A failed read is a dash, never a zero.** Each figure is its own query; one that throws is
  `null` (logged) and its card says `—` (`unavailable`), the rest still show. A figure whose
  module is off is left out.
- **Shares add up to 100** (`shares()`, largest remainder), so a bar and its legend agree.
- **Colours are tokens:** `var( --chart-1…5 )`, and `var( --destructive )` for the one thing
  that must stand out.
- **Months** (`src/lib/months.ts`) are calendar months in UTC; `lastMonths( 6 )` keeps a quiet
  month as a zero bar. The home page reads `?month=YYYY-MM`.
- **The home page:** people (for those who may list users: invited → active, banned —
  each stop opens the users table filtered to it), sign-ups in the month and the six before,
  roles, files by kind and storage, unread notifications.
- **Detach:** delete `src/lib/components/dashboard`, `src/lib/server/dashboard.ts`,
  `src/routes/app/+page.server.ts`, `/hello/dashboard` and `@number-flow/svelte`, and put a
  welcome back on `/app`.

## Audit trail

Who changed what in the workspace, at `/app/settings/audit` (module `audit`, permission
`audit: [ 'list' ]`, admins): searchable, filterable by area and date, exportable, its query in
the URL. From billing-app's audit log.

```ts
await audit( event, { action: 'user.role', target: { id, label: 'Bob <bob@x>' }, changes: { role: [ 'member', 'admin' ] } } )
await audit( event, { action: 'captcha.settings', changes: changesBetween( before, form.data, { secret: [ 'secret' ] } ) } )
```

- **Explicit, everywhere it matters.** Every handler that changes something calls `audit()`
  after the change (users, media, appearance and brand, mail, sign-in protection, own
  account, sign-up, reset links, provider links through better-auth's hooks).
  `src/lib/server/audit-coverage.test.ts` fails when a mutating route records nothing,
  unless it is in its exemption list with a reason — sign-in, sign-out, a person's own
  preferences, test buttons.
- **Never fails the change.** Awaited, but an error only goes to the log.
- **Append-only:** the app role may insert and read `audit_logs`, never update or delete. The
  actor's name is a snapshot: a deleted account's entries keep it. Rows are kept forever.
- **Worded per reader:** a row stores its action (`<resource>.<verb>`), target name and changed
  fields (`{ field: [ before, after ] }`, a secret only as "changed"); `src/lib/audit.ts` turns
  them into "Ada changed the role of Bob — Role: member → admin" in the reader's language.
  Adding an action: an entry in `AUDIT_ACTIONS` and its message.
- **Detach:** turn the module off (`audit()` becomes a no-op), or delete `src/lib/audit.ts`,
  `src/lib/server/audit*.ts`, `src/lib/components/audit`, `/app/settings/audit`, `/api/audit`,
  `/hello/audit`, the `audit()` calls and the migration.

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
- **URL state** (`syncUrl`, one table per page): page, size, sort, search and filters live in
  the address bar — `?page=2&size=20&sort=name&dir=desc&q=ada&in=email&from=…&to=…&role=admin`
  (defaults left out; any other key is a facet, so don't name a filter column like those
  keys). Written with `replaceState`: reload and share keep the view, Back leaves the list.
  The load must read the same query so the server render matches:
  `listUsers( toPageQuery( fromUrlParams( url.searchParams ) ) )` (see `/app/users`).
- A column with a string `header` gets a sort button; `enableSorting: false` opts out.
- **Export** (`exportTitle`, server mode): CSV, Excel and PDF of every row matching the current
  search, facets and sort. The endpoint answers `?export=csv|xlsx|json` with
  `exportResponse( format, title, columns, ( await list( exportAll( query ) ) ).rows, { filters } )`
  (`src/lib/server/export.ts`, see `/api/users`): CSV with a BOM and CRLF that Excel opens
  cleanly, and a leading quote on any cell a spreadsheet would run as a formula; `.xlsx` with
  real numbers and dates; at most 50,000 rows. **PDF** is `/app/print?src=…`, which reads the
  list as JSON through the visitor's own session (only `/api/` lists of this app, never
  `/api/auth`) and prints a branded report — logo, title, the filters in words
  (`describeQuery`), row count, date — light on paper whatever the theme. `?preview` skips the
  print dialog.
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

Numbers that arrive as text — a query string, FormData read by hand, a client that quotes
its numbers — go through `numberish()` / `integerish()` (`src/lib/validation.ts`): a number
or a string holding one, never the `true` or `''` that `Number()` turns into 1 and 0.
`blankOr( schema )` reads an emptied box as left out. Superforms coerces its own fields.

**Picking a record** from a list that can be long: `RemotePicker` searches any paged list
endpoint (the DataTable contract: `?search=&take=`) as the person types — never a `<select>`
over a first page that silently leaves the rest out — and says how many more there are.

```svelte
<RemotePicker path="/api/users" toOption={( user ) => ( { value: user.id, label: user.name, hint: user.email } )} bind:value bind:label name="ownerId" />
<RemotePicker path="/api/users" {toOption} multiple bind:values bind:selected params={{ 'f.role': 'admin' }} name="reviewers" />
```

`apiForm` pairs with SaveBar: `<SaveBar show={form.isTainted( $tainted )} saving={$submitting} saveType="submit" ondiscard={() => form.reset()} />`
inside the `<form use:enhance novalidate>`. See `/hello/forms`.

**Shaped inputs** (`src/lib/components/inputs`, on maska): the person sees the shape while
typing, the form posts the plain value.

- `MoneyInput` — `bind:value` is a number or null; digits group in the reader's locale, the
  currency's symbol sits beside them and decimals follow the currency (none for IDR or JPY).
  `min={0}` drops the minus sign. `<MoneyInput bind:value currency="IDR" name="price" />`
- `MaskedInput` — any maska mask (`'+## ###-####-####'`, `'#### ####'`); `bind:unmasked`
  and `name` carry the plain value, the shaped one never posts.

**Long forms and settings pages** (`src/lib/components/sections`): `FormSection` groups a
form's fields under a caption, a hairline between groups; `SettingsSection` puts what a
setting is on the left and its control on the right. Neither boxes its group in a card.

**Scroll affordances** (`src/lib/layout/scroll-fade.css`, global, CSS only): the sidebar and
the command palette fade an edge only when there is more beyond it; a dialog taller than the
window scrolls inside it with its scrollbar showing, and its footer stays pinned over a fade.

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
- **Refused writes** (`src/lib/server/db/errors.ts`): `isUniqueViolation` (taken in this
  workspace, 409), `isForeignKeyViolation` (a parent that isn't there, or another
  workspace's, 400), `isRestrictViolation` (a delete the row's children refuse, 409) — catch
  the constraint instead of checking first. `withUniqueRetry( () => tenantTransaction( … ) )`
  runs a write again when it lost a race for a generated value, such as the next number.
- **Tests** run on PGlite (Postgres in-process, `src/lib/test/database.ts`): the real
  migrations, no Docker. It serves one connection, and a failed statement closes it: a test
  that expects a refused write gives it a database of its own.

## Redis

Optional: set `REDIS_URL` (`docker-compose.dev.yml` runs one on `127.0.0.1:6380`) and the
counters in `src/lib/server/redis.ts` are shared by every instance. Without it — or while
it's down — each helper answers `null` and its caller carries on: nothing that needs Redis
may stop people signing in.

```ts
const window = await hit( await tenantKey( 'login', email ), 15 * 60_000 )   // { count, ttlMs } | null
const { allowed } = await rateLimit( await tenantKey( 'contact', ip ), 5, 60_000 )
```

- **Keys** go through `tenantKey()`, so one workspace's counters never touch another's.
- **Windows are fixed:** the first hit starts one, later hits don't move its end.
- `redis()` is the ioredis client itself (or `null`), for anything else.
- **Detach:** delete `src/lib/server/redis.ts`, the compose service and `ioredis`; the
  sign-in throttle goes with it.

## Auth

better-auth on the tenant-scoped database: an account belongs to one tenant; a session
from one tenant doesn't exist in another; the same email can sign up separately in each.

- **Pages:**
  - `/login`
  - `/signup`: 404 unless `AUTH_SIGNUP=true` and the workspace can send mail; new accounts
    verify their email
  - `/forgot-password` and `/reset-password`, which also accepts invites (see Mail)
  - `/logout` (a POST)
  - the signed-in area `/app`: profile, password, admin-only settings

  All are form actions, so they work without JavaScript. A password reset ends every
  session of that account.
- **First admin:** `bun run db:seed` creates `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `TENANT_SLUG`.
- **Demo admin:** the seed also creates `DEMO_EMAIL` / `DEMO_PASSWORD` (`.env.example` ships
  a known pair) for local work and coding agents' browser checks — never when
  `NODE_ENV=production`. Empty either one to skip it.
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

### Sign-in protection (`/app/settings/security`)

The fundraiser app's three layers, in `src/lib/server/sign-in-guard.ts` as better-auth hooks —
so they cover the form actions (which call `auth.api` directly and never meet better-auth's
own limiter) as well as `/api/auth/*`:

1. **better-auth's rate limit**, per address, on `/api/auth/*` in production.
2. **The throttle**, in Redis (see Redis), per email and per address over 15 minutes: from 3
   failed sign-ins each attempt waits longer (0.5 s steps, at most 5 s); at 10 the email is
   refused (`429`, saying for how long) until the window ends — or asks for the captcha
   instead when one is on, so nobody can lock someone else out for good. An address that
   failed 30 times, across any emails, is treated the same. A success clears the email's
   count. Sign-up and forgot-password get a per-address budget (5 and 3 a minute). No
   Redis: no throttle.
3. **The captcha** (module `captcha`), set per workspace: Cloudflare Turnstile, Google
   reCAPTCHA v3 or hCaptcha, on sign-in after N failures for the email or address (or
   always), and on sign-up and forgot-password whenever it's on. The secret is encrypted
   with `BETTER_AUTH_SECRET`; the preview's **Test** checks the saved keys against the
   provider from this domain. Half-set (no secret) means off, never locked out. The
   answer travels as `x-captcha-response` (forms post it as `captcha`).

- **The visitor's address** is `event.getClientAddress()`, put in `x-client-ip` by this
  server only (a client's own is overwritten). Behind a proxy set adapter-node's
  `ADDRESS_HEADER` / `XFF_DEPTH`, or every visitor shares the proxy's address.
- **Wrong credentials count; nothing else does** (unverified, banned, a refused captcha).
- **Detach:** turn the `captcha` module off, or delete `src/lib/captcha.ts`,
  `src/lib/server/captcha.ts`, `src/lib/components/captcha`, `/app/settings/security`,
  `/hello/captcha` and the migration. The throttle goes with `src/lib/server/sign-in-guard.ts`
  and its two hooks in `src/lib/server/auth.ts`.

### Social sign-in

**Google** and **Apple** (module `social`), each on when its credentials are in the
environment (`src/lib/server/social.ts`, see `.env.example`): "Continue with …" under the sign-in and
sign-up forms, and **Connected accounts** on the profile page.

- **Anyone** may sign in with a provider: a new person gets an account (a member) even with
  `AUTH_SIGNUP` off, and the admins are notified as for a sign-up. An existing account with
  the same email is linked on first use (both providers are trusted for linking).
- **Profile:** connect a provider (off to it and back) or disconnect one — never the last way
  to sign in (better-auth refuses; a social-only person sets a password through *Forgot
  password?*). Disconnecting wants a recent sign-in.
- **Plain forms:** the buttons post to `/login/social`, which sends the browser on to the
  provider — no JavaScript needed. The provider comes back through
  `/api/auth/callback/<provider>`; a refusal lands on `/login?social&error=…`.
- **Redirect URIs:** each provider's app lists `https://<host>/api/auth/callback/<provider>`
  — every workspace host, in shared tenancy (Google takes many; Apple a list of domains).
- **Apple:** the client secret is a JWT signed with your key that lasts at most six months —
  `bun run apple:secret -- --team … --key-id … --client-id … --key AuthKey.p8` makes one; set a
  reminder to make the next. Apple posts its answer from `appleid.apple.com`, so
  `svelte.config.js` trusts that origin for form posts (only in a build with the module).
- **Not built:** more providers (better-auth has ~35: a provider here is one entry in
  `socialProviders()`, a label and an icon), per-workspace OAuth apps.
- **Detach:** turn the `social` module off (no providers, whatever the environment says), or
  delete `src/lib/social.ts`, `src/lib/server/social.ts`,
  `src/lib/components/social`, `/login/social`, `/hello/social`, `scripts/apple-client-secret.ts`,
  and the social lines in `src/lib/server/auth.ts`, the auth pages and `/app/account`.

### Sign-in log (`/app/settings/sign-ins`)

Every attempt to sign in (module `signins`, from billing-app's login log): when, the email
typed, the account it belongs to, the outcome (signed in, wrong password, locked out, captcha
refused, unverified, banned), the method (password, Google, Apple), the address and the
device. The sign-in guard's hooks write password attempts — including the ones it refuses
itself before better-auth runs — and better-auth's session hook writes provider sign-ins.

- **Admins** (`signin: [ 'list' ]`): figures for the last 24 hours (signed in, refused, refused
  addresses — many refusals from few addresses is guessing), successes vs refusals per day for
  14 days, and the table (filters, URL state, export).
- **Everyone** sees their own latest attempts on the Password page — failed ones on their
  email included — to spot a sign-in that wasn't them.
- **Kept 90 days:** the scheduler's purge removes older entries (until it lands, nothing does).
- **Detach:** turn the module off, or delete `src/lib/sign-ins.ts`, `src/lib/server/sign-ins.ts`,
  `src/lib/components/sign-ins`, `/app/settings/sign-ins`, `/api/sign-ins`, `/hello/sign-ins`,
  the `recordSignIn` calls and the migration.

### Users (`/app/users`)

Admins list, add (with a password, or by invite when mail is set up), re-role, ban, sign out
and delete the tenant's users. Reads go through
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

## Logs

`log` (`src/lib/server/log.ts`, on pino, from the fundraiser app's Trace) instead of
`console`: `log.warn( 'message' )`, or `log.error( { err: caught, scope: 'mail' }, 'the invite
failed' )` — `err` keeps its stack.

- **Production:** one JSON object per line on stdout, ISO time and the level by name — the
  container's log, which Docker keeps and rotates and any collector reads. **Dev:** the same,
  readable (pino-pretty, which never reaches the build).
- **Every request has an id** — the proxy's `X-Request-ID` if it sent one, else new —
  returned in `X-Request-ID`, and every line logged while answering carries it with the
  method, path and host, with no logger to pass around. One line per request at `debug`;
  over a second, a `warn` (production only).
- **Never a secret:** `password`, `secret`, `token`, cookies and authorization headers are
  redacted wherever they sit in a logged object.
- `LOG_LEVEL`: `trace`, `debug`, `info` (default), `warn`, `error`, `fatal`, `silent` (tests).

## SEO

- **`<Seo>`** (`$lib/components/seo`): a page's title, description, canonical URL (this host,
  no query), Open Graph and Twitter tags, and optional JSON-LD — in the server-rendered HTML
  crawlers read. Render it from **pages only**: `<svelte:head>` appends, so a layout writing
  meta too would leave duplicates. The home page sends `Organization` data (name, address,
  logo); `/privacy`, `/terms` and `/about` describe themselves with their opening words.
- **Share image:** each theme exports `shareImage` (1200×630, no words — previews print the
  title beside it); a page can pass its own `image`. Replace `src/lib/themes/<id>/share.png`
  with your own.
- **Indexing:** only the public site — every other response says `X-Robots-Tag: noindex`
  (`hooks.server.ts`), and `/robots.txt` disallows `/app` and `/api`. `SEO_INDEX=false` keeps
  crawlers out of everything, for a staging copy.
- **`/sitemap.xml`:** home and the pages this host's workspace has published, built per
  request — each workspace has its own in shared tenancy. `/robots.txt` points at it.
- `/hello/seo` shows the tags `<Seo>` writes and a link preview.

## Security

- **Content security policy** (`svelte.config.js`, enforced): scripts only from the app — its
  inline ones carry a per-request nonce — plus the captcha providers in a build with
  `captcha`. Inline styles are allowed (Svelte transitions need them); images from anywhere
  over https (rich text may show one); no framing (`frame-ancestors 'none'`), no plugins,
  forms post only here (and to Google / Apple with `social`). Browsers report what it blocks
  to `/csp`, which logs one line each — a policy too tight for a new feature shows up there.
  A new third party goes in the directive it needs, under its module's guard. An inline
  script of your own must carry `nonce="%sveltekit.nonce%"`, which only `src/app.html` can:
  that's why mode-watcher's pre-paint snippet lives there (`src/lib/csp.test.ts`).
- **Headers** (`hooks.server.ts`): `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  a `Permissions-Policy` that turns off camera, microphone, location and payment, and in
  production over HTTPS `Strict-Transport-Security` for a year (no preload — your call).
- **Environment** (`src/lib/server/env.ts`): checked when the server starts — one line per
  broken variable; production refuses to start, development warns. It insists on the secret's
  length, `DATABASE_URL` as `app_rls`, `BETTER_AUTH_URL` (single) or `APP_DOMAIN` (shared), and
  each social provider's ID and secret together. Add a rule with each variable that must be
  right before anyone visits.
- **Errors** (`handleError`): only 5xx reach the log, with method, path and stack; 404s from
  scanners and other 4xx stay quiet. What the visitor sees doesn't change.
- **Permission ratchet** (`src/lib/server/permission-coverage.test.ts`): every route handler is
  signed-in (a guard, or under `/app`), or listed as public with its reason; and the
  permission each one asks for is on record. Taking a check out — or weakening one — fails by
  name. A new handler is a line there, like the audit trail's tripwire next to it.

## Deploy

`deploy/` is a production stack for one server — the app behind Caddy (automatic HTTPS,
on demand for workspace hosts), Postgres, Redis, migrations before every start, and daily
backups — fed by the image `.github/workflows/image.yml` pushes to GHCR. Its README is the
guide: `DOMAIN=… IMAGE=… ADMIN_EMAIL=… deploy/first-run.sh` on a fresh server.

- **Image** (`Dockerfile`): built for one client config (`--build-arg CLIENT=…`), runs as
  `bun`, no secrets at build time; it also carries what `bun run db:deploy` needs
  (migrations, `app_rls`'s password, the seed) — which is why `prisma` is a dependency.
- **`/health`**: 200 while the database answers, 503 when it doesn't (the image's
  `HEALTHCHECK`); Redis is reported, never fatal.
- **`/internal/tls-ask`**: Caddy's question before an on-demand certificate — yes only for
  an active workspace's subdomain or custom domain, in shared tenancy. The Caddyfile keeps
  `/internal/*` from the public side.
- **Behind the proxy:** adapter-node reads the visitor's address from `X-Forwarded-For`
  (which Caddy overwrites) and the URL from `X-Forwarded-Proto` / `-Host`.

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
