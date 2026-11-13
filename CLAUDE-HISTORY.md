# Claude History

A running record of prompts to Claude and Claude's responses, as required by
`CLAUDE.md`. Newest entries go at the bottom.

---

## 2026-11-14 — Session 1

### Prompt

> Lets make a start on this project, read the CLAUDE.md file carefully.

### Response

Scaffolded the whole app from an empty repository (only `CLAUDE.md` existed)
and built a working first version. Nothing was committed.

**What was built**

- Tooling: Bun, Vite 8, TypeScript 7 (strict), Tailwind 4, Biome 2, Vitest 5,
  TanStack Router (file-based SPA), Zod 4.
- `src/lib/draw.ts` — pure draw taking an injected RNG. Nobody draws
  themselves, everyone gives and receives once, and no pairing from earlier
  years repeats. Uses augmenting-path matching, so it reports
  `no-valid-pairing` only when no valid draw truly exists.
- `src/lib/history.ts` — parser for pasted chat announcements. A line with a
  year starts that year; pairings accept arrows, "gives to", "has", colons
  and dashes; bullets and emoji are ignored. Unreadable lines are reported
  with line numbers, never dropped.
- `src/lib/storage.ts` — the only module touching `localStorage`. Keys
  `kk:v1:history` and `kk:v1:participants`, Zod-validated on read and write,
  never throws.
- Draw page (`/`): participant list, year, "avoid repeats from" selector,
  result table, save to history, copy for chat.
- History page (`/history`): one text box to paste or edit, live preview,
  error list, "remove unreadable lines", save.
- `Dockerfile` (Bun build stage, static-web-server runtime on scratch, both
  pinned by tag and digest) and `sws.toml` (SPA fallback, cache headers).

**Verification**

- 156 tests pass (`bun run test:run`); `src/lib/` has 100% line coverage.
- `bun run lint` and `bun run typecheck` are clean.
- The production build was driven in headless Edge: add people, draw, save,
  paste history, reload on `/history`, 25 next-year draws with no repeated
  pairing, not-found page, dark theme, 360px width, no console errors.
- Colour tokens checked against WCAG AA in light and dark.
- Bundle: 106 kB gzip JS (react-dom is 63% of it), 3.8 kB gzip CSS.
- Not verified: the Docker image. Docker is not installed on this machine,
  so the `Dockerfile` and `sws.toml` have never been built or run.

**Decisions made along the way**

- Added an "avoid repeating pairings from" setting (all years, last 5/3/2/1,
  none). A strict never-repeat rule becomes impossible after N-1 years, so
  the user needs a way to relax it.
- Used `zod/mini` instead of full Zod: 81 kB → 17 kB minified.
- Tailwind 4 has no `tailwind.config`; tokens are CSS custom properties
  exposed through `@theme` in `src/styles/global.css`. Its `dark:` variant
  already follows `prefers-color-scheme`.
- Pinned jsdom to 29: jsdom 30+ needs Node ≥ 22.22.2, local Node is 22.14.0.
- Added `.gitattributes` forcing LF, because Biome formats to LF and git
  `core.autocrlf` is `true` on this machine.
- Biome keeps its default tab indentation.

**Things flagged to the user**

- `bun test` (as written in `CLAUDE.md`) runs Bun's built-in test runner,
  not Vitest, and 43 tests fail under it. Use `bun run test`,
  `bun run test:run` and `bun run test:coverage`.
- Biome's formatter rewrote `CLAUDE.md` during the first lint run. It was
  restored to its original bytes (19,422, CRLF) and Markdown is now excluded
  in `biome.json`.
- A stray temp folder was left at
  `C:\Users\friendywill\AppData\Local\Temp\tmp.QZh1siCVTT` (one generated
  `tsconfig.json`); a safety check blocked its removal.

---

## 2026-11-14 — Session 1, prompt 2

### Prompt

> Okay, start committing, we will start on some more logic for this. I would
> like to ensure data validility, where only people who are on a list can be
> added to this history. So if William is on the list, Will will show up as
> invalid unless added to this list. Another task to get started on, is to
> ensure that the couples do not buy for each other in this kris kringle as
> they will already get each other gifts. This means, we need to have a list
> that shows couples, and use that logic so that couples never buy for each
> other.

### Response

Committed the existing work as five commits on `master` (the repository had
no history, so there was nothing to branch from), then built both features on
a new branch, `feat/people-list-and-couples`, as two commits.

**History only accepts people on the list**

- "The list" is the existing people list on the Draw page.
- `parseHistory(text, people)` now rejects any pairing naming someone who is
  not on it: with William listed, `Will -> Sarah` is an error
  ("Not on the people list: Will.") and saving is blocked.
- Names match ignoring case and spacing and are saved in the list's
  spelling, so `sarah -> CAROL` is stored as `Sarah -> Carol`.
- The History page offers "Add Will" (and "Add all N") beside the errors, so
  a real person can be added without leaving the page and losing pasted
  text.
- History already saved that names someone later removed from the list shows
  as invalid the next time the History page is opened.

**Couples never buy for each other**

- New "Couples" card on the Draw page: pick two people, add the couple,
  remove it with ×. A person can be in one couple only.
- Stored under `kk:v1:couples` as pairs of names, Zod-validated like the
  rest.
- The draw blocks both directions for every couple. Unlike the history rule
  this is never relaxed, including with "ignore history" selected.
- Removing a person from the list also removes their couple.
- If the couples make a draw impossible (for example three people, two of
  them a couple) the page says so instead of drawing.

**Verification**

- 215 tests pass; `bun run lint` and `bun run typecheck` are clean;
  `src/lib/` remains at 100% line coverage.
- The production build was driven in headless Edge: 40 draws with two
  couples never paired a couple; removing a person removed their couple; a
  pasted history with `Will` and `Bobby` was flagged and blocked; "Add Will"
  cleared his error and kept the pasted text; saved history used the list's
  spelling; no console errors.

**Things flagged to the user**

- Because there is one list, removing someone who has left the family draw
  makes their old history rows invalid. The draw already ignores history
  about people who are not taking part, so nothing is lost by deleting those
  rows, but a separate "known people" roster would avoid it if wanted.
- `wrap-break-words` in `HistoryEditor.tsx` (a change made outside this
  session) produces no CSS. Tailwind's utility is `wrap-break-word`. Left as
  it was.

---

## 2026-11-14 — Session 1, prompt 3

### Prompt

> Great work, lets move on to another feature I would like, which is to add a
> kids list, not for the kids to buy for each other, but rather for each
> adult to buy for a kid in another family. So, each mother and father will
> get presents for their kids regardless of this kris kringle, so we need to
> come up with a list of families with kids and their parents, so that we can
> avoid adding a parent buying for their own child, but they will be added to
> buy for a child outside their family, and preferable not a child they have
> bought for in the past

### Response

Built on branch `feat/kids-presents` (from `master`), in four commits.

**Families**

- New **Kids** page (`/kids`). A family is created from its kids' names;
  parents are then picked from the people list. A child belongs to one
  family; an adult may be a parent in more than one (blended families).
- A family with no parents set is allowed: any adult may buy for those kids.
- Removing a family's last child removes the family. Removing someone from
  the people list drops them as a parent but keeps their kids.
- Stored under `kk:v1:families`.

**The kids' draw** (`src/lib/kidsDraw.ts`)

- Every adult on the people list buys for one child. Never their own child:
  that is the only hard rule.
- Then, in order: every child gets a present if there are enough adults who
  aren't their parents; presents are spread as evenly as possible (5 adults,
  4 kids → one child gets two); and nobody buys for a child they bought for
  in an earlier year.
- Avoiding repeats is a preference, as asked. A repeat is only made when
  avoiding it would leave a child or adult out or make the spread less even,
  and the page names who repeated.
- Kids left without a present, or adults with no child to buy for, are
  named on the page instead of failing the draw.
- Kids' history is stored separately (`kk:v1:kids-history`), so the adults'
  rotation and the kids' rotation don't affect each other.

**History page**

- Now has two editors: Kris Kringle and Kids' presents. In the kids editor,
  givers must be on the people list and receivers must be kids in a family.

**Verification**

- 279 tests pass; lint and typecheck clean.
- Production build driven in headless Edge: 40 draws never gave a parent
  their own child and always reached all four kids; after saving, 25
  next-year draws repeated no adult–child pairing; kids' history saved
  apart from adults'; a non-kid receiver flagged in the kids editor;
  removing a person from the list removed them as a parent; no sideways
  scroll at 360px; no console errors.

**Open questions for the user**

- Couples are not considered in the kids' draw, so two partners can draw the
  same child. Easy to prevent if wanted.
- Every adult buys for a child. If some adults should sit the kids' draw
  out, that needs an opt-out per person.
