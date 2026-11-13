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
