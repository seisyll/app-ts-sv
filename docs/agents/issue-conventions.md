# Issue conventions

How issues and pull requests are filled in for this repo. Written once by `/seisyll:dev` at setup. Skills and agents that create or triage issues follow it.

Each fact lives in one place. The type says what kind of work it is. Fields hold Priority, Effort and dates. Labels carry only state, risk and area.

## Types

| Work | Type | Label that goes with it |
|------|------|-------------------------|
| Something behaves or renders wrongly | Bug | none |
| Someone can see or do what they should not | Bug | `security` |
| The layout or look of something that works | Update | `area:ui` |
| A change to existing behaviour | Update | none |
| New behaviour | Feature | none |
| A chore with one obvious right answer | Task | none |
| Structure changes, behaviour stays | Task | `refactor` |
| Dependency update | Task | `dependencies` |
| Docs | Task | `documentation` |

## Labels in this repo

| Group | Labels | Meaning |
|-------|--------|---------|
| State, one at a time | `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `backlog`, `wontfix`, `duplicate` | Whether a run may pick the issue up |
| Risk | `risk:data`, `risk:auth` | Forces a question first, a security review and a full CI run |
| Area | `area:ui` ( components, pages, themes ), `area:db` ( Prisma schema, migrations, RLS ), `area:tooling` ( build, scripts, CI, skills ) | Which part of the code |
| Quality | `regression`, `manual-check`, `accessibility` | A bug that came back. A bug closed with a written check instead of a test |

`bug` and `enhancement` are written by triage. The type is set from them.

## Fields

| Field | Value |
|-------|-------|
| Priority | Urgent for a security fix. High for anything with a risk label or marked urgent. Low for a parked task. Otherwise Medium |
| Effort | Low, Medium or High, by the size of the work |
| Start date, Target date | Only on a feature that has a milestone |

## Relationships

- A feature split into pieces is a parent with sub-issues.
- An issue that needs another one first is marked blocked by it.
- The branch for an issue is created from the issue, so it shows under Development.

## Pull requests

- Assigned to the author.
- Closes its issues with `Closes #N` lines.
- A bug fix names its test and states that it failed before the fix and passed after.
- A pull request touching a risk label always runs CI and always requests a review.
