# Pages ( src/routes )

**Hard rule: run `/impeccable` before you change anything a page renders.** This covers a new
page or layout, a redesign, a layout or spacing change, copy, and empty, loading or error states.
It applies however small the change is. Skipping it is a bug, even when the code works.

- Work within `DESIGN.md`. Use its tokens only, no raw colours, and never `--radius` in a style.
- A new public theme ( `(site)` ) or house style must be fully distinct from its siblings.
  `DESIGN.md` has the rulesets.
- Show every new UI piece in the `/hello` playground ( `(dev)` ).
- `/svelte-code-writer` still applies to every `.svelte` file.

Server-only files with no rendered change don't need `/impeccable`. That means `+page.server.ts`,
`+layout.server.ts`, `+server.ts`, `api/`, `csp/`, `health/` and `internal/`.
