# Product

<!-- impeccable:product-schema 1 -->

<!-- This record describes the TEMPLATE. A project made from it replaces this file with its own
     ( /impeccable init ) before any design work on that product. -->

## Platform

web

## Users

Developers starting a web app or SaaS from this template, usually solo or in a small team, often
working with a coding agent. They clone it, pick a client config ( modules, theme ), and build
their product on top. The `/hello` playground is how they see every piece the template ships
before deciding what to keep.

## Product Purpose

A production-ready starting point: auth, multi-tenancy with row-level security, settings,
appearance, media, mail, notifications, audit and sign-in logs, a public site, i18n and a deploy
bundle, already wired together and tested. Success is a developer shipping their own product
without rebuilding any of that, and switching off what they don't need without leaving dead code.

## Positioning

Every optional feature is a detachable module: a client config decides what a build contains,
and a module that's off is absent from the bundle, not hidden. Two real products ( a fundraiser
app and a billing app ) are the lineage, so the defaults come from shipped software.

## Operating Context

- Developers read README.md ( every module ), DESIGN.md ( visual rules ) and CLAUDE.md ( rules for
  agents ), and browse `/hello` in `bun run dev`.
- End users of apps built on it are workspace admins and members using `/app`: dashboard,
  settings, users, media, notifications. The template's UI must serve them well too, since it is
  what a new product inherits.

## Capabilities and Constraints

- Stack: SvelteKit + Svelte 5 on Bun, Tailwind 4, vendored shadcn-svelte ( `ui/` is synced, never
  hand-edited ), Prisma on Postgres with RLS, better-auth, paraglide.
- English default plus Indonesian; currency USD. Every user-facing string is a message.
- Appearance is per workspace and per person: palette, component style ( eight shadcn grammars )
  and radius. Components never carry colour; everything goes through tokens ( DESIGN.md ).
- Public-site themes and house styles must each be fully distinct from their siblings.

## Brand Commitments

None of its own: the template must not impose a brand. Products made from it bring theirs.

## Evidence on Hand

The playground pages under `src/routes/(dev)/hello` and the demo workspace from the seed. No
customers, testimonials or metrics exist; never invent them.

## Product Principles

1. Detachable over configurable: a feature that's off leaves nothing behind.
2. Tokens over components: a look is a set of variables, never a component edit.
3. Shipped defaults: patterns come from the two source apps, not from speculation.
4. Show everything: every UI piece is visible in the playground.

## Accessibility & Inclusion

Not set as a product requirement yet; follows the vendored components' accessibility.
