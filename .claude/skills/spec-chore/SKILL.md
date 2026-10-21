---
name: spec-chore
description: Incremental test-writing chore toward 100% coverage. Use when asked to run the test chore, write today's tests, add a bite of coverage, continue the coverage grind, or bootstrap/inspect the coverage ledger. Triggers include "/spec-chore", "spec chore", "test chore", "daily tests", "next coverage bite", "raise coverage", "work toward 100% coverage".
user-invocable: true
argument-hint: "[init|status|<file-or-area>] — no args = pick the next target from the ledger"
---

# Test chore — one bite per session toward 100% coverage

Each invocation is ONE small, finishable unit of work: pick a target file (or accept one
from the arguments), write good Vitest tests for it, prove coverage moved, record it in the
ledger, stop. Never try to cover everything in one session — the whole point is steady,
reviewable progress. (From the fundraiser app's chore, adapted to this template.)

Method follows the Vitest guide "Writing Tests with AI"
(https://main.vitest.dev/guide/learn/writing-tests-with-ai). Read the README's **Testing**
section at the start of every session — it is the source of truth for the suite's layout
and helpers.

## The ledger — `tests/coverage-chore.md`

Persistent state between sessions. Structure:

```markdown
# Coverage chore ledger

Overall (last full run YYYY-MM-DD): lines X% · functions X% · branches X% · statements X%

## Backlog (next up first)
| Tier | Target | Test file | Est. size | Notes |
|------|--------|-----------|-----------|-------|
| 1 | src/lib/format.ts | src/lib/format.test.ts | S | pure |

## Done
| Date | Target | Test file | File coverage before → after | Notes |

## Won't cover (decided)
| Target / lines | Why | Handling (ledger-only / v8-ignore / threshold cap) |
```

Tiers order the backlog by effort-to-value (work top down):

1. **Pure logic** — `src/lib/*.ts` helpers (format, appearance, media, editor schema…) → a
   co-located `*.test.ts`, no mocks.
2. **Server logic with mockable boundaries** — `src/lib/server/**` guards, auth errors →
   `*.test.ts`, mock with `vi.mock` at the boundary (reference: `src/lib/server/guards.test.ts`).
3. **Data layer** — anything that touches `db` → `*.test.ts` on PGlite with the real migrations
   via `createTestDatabase()` ( `src/lib/test/database.ts` ). Assert as the app role
   (`asApp()`), never as owner: RLS must be what keeps tenants apart (reference:
   `src/lib/server/users.test.ts`).
4. **Endpoints** — `src/routes/api/**/+server.ts`: test the service they call in tier 3; test
   the handler only for its own branches (permission, parsing, status codes).
5. **Svelte components** — co-located `*.svelte.test.ts` (client project, real Chromium;
   reference: `src/lib/components/save-bar/SaveBar.svelte.test.ts`). Route `$app/*` to
   `$lib/test/app-navigation` / `app-state.svelte` with `vi.mock`.
6. **Deferred** — needs infra or a design decision; park it here rather than skip silently.

## Session workflow

### `/spec-chore init` (or ledger missing)
1. Coverage pass for the landscape: `bun run test:coverage` (needs Playwright Chromium; the
   server-only fallback is `bunx vitest run --project server --coverage`).
2. Create `tests/coverage-chore.md` with the overall numbers and a tiered backlog of the top
   ~20 uncovered / low-coverage files. Skip what `coverage.exclude` in `vite.config.ts` already
   excludes — never test generated code, barrels, `components/ui` ( vendored ) or `(dev)`.
3. Report the plan; do NOT also write tests in the init session unless asked.

### `/spec-chore status`
Read the ledger, optionally re-run coverage, summarise progress and what's next. No writing.

### `/spec-chore` (default) or `/spec-chore <file-or-area>`
1. **Pick** — the top backlog item, or the user's argument resolved to concrete file(s). One
   source file per session by default (a tightly related pair is fine).
2. **Gather context (never skip — this is what makes AI tests good):**
   - Read the FULL target file and the modules it imports (at least their signatures).
   - Read one existing test of the same tier as the style reference (see the tiers above).
   - Know which project runs it: `*.svelte.test.ts` → client ( browser ), any other
     `*.test.ts` under `src/` → server.
3. **Plan the cases before writing** — happy paths, validation and error branches, boundaries
   (empty, null / undefined, zero / negative, too long), and every `if` / `catch` / early return.
   Branch coverage is the goal, not touching lines.
4. **Write** the test file following the quality rules and the house style.
5. **Run scoped, immediately:**
   ```bash
   bunx vitest run --project server --coverage --coverage.include='src/lib/foo.ts' src/lib/foo.test.ts
   ```
   ( client tier: `bunx vitest run --project client src/…/Foo.svelte.test.ts` ). Iterate until
   green AND the target's lines / branches are 100%, or every remaining line has a recorded
   "won't cover" decision.
6. **Regression check** — run the whole project the file belongs to ( `bun run test:server` /
   `bun run test:client` ) and `bun run check`.
7. **Record** — update the ledger: move the target to Done with dated before → after numbers.
8. **Report and stop** — what is covered now, what the next bite is. Don't start the next one
   unless asked.

### Finishing the chore
When the backlog is empty, run `bun run test:coverage`, then add `coverage.thresholds` to
`vite.config.ts` so CI enforces it ( cap or `/* v8 ignore */` the documented won't-cover lines
first ).

## Quality rules

- **Vitest APIs only** — `vi.fn()`, `vi.mock()`, `vi.spyOn()`; never `jest.*`. Explicit imports
  from `'vitest'` (no globals). Import source through `$lib/…`.
- **Never start watch mode** — always `vitest run` / `bun run test` ( `test:watch` hangs the session ).
- **Meaningful assertions** — assert real return values and state. "Doesn't throw" or "the mock
  was called" alone is not done; when a call IS the behaviour, assert its arguments.
- **Test behaviour, not implementation** — mock at real boundaries ( database, auth, fetch,
  filesystem ), never the module's own internals.
- **This template's classics** — another tenant's rows must be invisible ( run the same call
  inside a second `runWithTenant` ); a role without the permission must be refused; user-facing
  text comes from `m.*()` ( the base locale is `en` in tests ); unknown ids degrade instead of
  throwing where the code says they do.
- **Mock hygiene** — `vi.restoreAllMocks()` in `afterEach`, or `vi.spyOn` + `mockRestore`. When
  a module caches config, `vi.resetModules()` + dynamic import ( `createTestDatabase` does it ).
- **Concise names** — `it( 'refuses changes to your own account' )`, not "should correctly…".
- **Prefer table tests** ( `it.each` ) for mappers and formatters with many input → output pairs.
- **Determinism** — pin dates ( pass `now`, or `vi.setSystemTime` ), no real network, no
  reliance on test order.

## House style (match it exactly)

Tabs; spaces inside parens ( `describe( 'X', () => {`, `expect( fn( a ) ).toBe( b )` ); `async()`
with no space; aligned colons in multi-line objects; LF line endings; one `describe` per unit;
the test file named after the unit and next to it ( `foo.ts` → `foo.test.ts` ).

## Commands

```bash
bun run test                 # everything once ( server + client; client needs Chromium )
bun run test:server          # server project only — the fast default
bun run test:client          # components in Chromium
bun run test:coverage        # full coverage → ./coverage ( HTML + lcov are authoritative on Windows )
bunx playwright install chromium   # once, for the client project
```

Windows note: quote globs, and trust the HTML / lcov reports over the terminal table for
per-file numbers.
