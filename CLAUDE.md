# CLAUDE.md

This file provides guidance to Claude Code when working with code in this
repository.

---

## Repository Purpose

Kriskringle generator with simple history to rotate present giving to prevent
giving to the same person in two or more years.

This will be a simple website application, history will be saved but is not
critical data, so we don't need to do to much for this.

History will be editable, which means we can copy and paste history from
chat messages announcing the Kriskringle, making it simple.

The stack is:

- **Framework**: TanStack Router (client-side SPA, file-based routing)
- **Persistence**: Browser `localStorage` — no database, no server state
- **Deployment**: Static assets served from a self-hosted Docker container
- **Development Tools**: Bun, Tailwind, Biome, and Vite
- **Language**: TypeScript throughout (strict mode), no js files allowed.

The app is intentionally minimal. There is no backend, no accounts, and no
authentication — optimise for readability and load performance over
engineering complexity.

---

## Project Structure

```
.
├── src/
│   ├── routes/              # TanStack Router file-based routes
│   │   ├── __root.tsx       # Root layout (fonts, global meta, providers)
│   │   ├── index.tsx        # Draw page (participants + generate)
│   │   └── history.tsx      # History view / paste-and-edit editor
│   ├── components/          # Shared UI components
│   │   ├── ui/              # Primitive/generic components (Button, Card…)
│   │   └── kriskringle/     # Domain components (ParticipantList,
│   │                        # HistoryEditor, DrawResult…)
│   ├── lib/
│   │   ├── storage.ts       # localStorage read/write (only module that
│   │   │                    # touches localStorage)
│   │   ├── draw.ts          # Pairing/rotation algorithm (pure)
│   │   ├── history.ts       # Parsing and serialising pasted history text
│   │   └── utils.ts         # Pure utility functions (no side effects)
│   ├── styles/
│   │   └── global.css       # Tailwind entry + CSS custom properties
│   └── types/               # Shared TypeScript types and Zod schemas
├── public/                  # Public assets
├── Dockerfile               # Build + static serve
├── biome.json               # Linter / formatter config
├── vite.config.ts           # Build tool
├── tsconfig.json
├── index.html
└── package.json
```

Rules:

- Route files own **only** routing logic and data loading (`loader`). Business
  logic belongs in `src/lib/`, UI in `src/components/`.
- Never import from `src/routes/` in any other module.
- Do not create barrel `index.ts` files unless the directory has ≥4 exports
  that are always imported together.

---

## Coding Standards

### TypeScript

- `strict: true` in `tsconfig.json` — no exceptions.
- Prefer `type` over `interface` for object shapes. Use `interface` only for
  declaration merging or class contracts.
- No `any`. Use `unknown` and narrow explicitly. If a third-party type gap
  forces it, suppress with a comment explaining why.
- Avoid type assertions (`as Foo`) except at library/API boundaries. Highly
  prioritize runtime validation with Zod.
- Export types from `src/types/`. Do not co-locate type-only files with
  implementation files.

### General

- Soft 80-column limit. Exceptions: import paths, URLs, generated code.
- Use Biome for both linting and formatting with project defaults
  (`biome.json`). Do not add Prettier.
- No `console.log` in committed code. Use a logger abstraction or
  `console.error` for caught exceptions only.
- Prefer early returns over nested conditionals.
- Name booleans with `is`, `has`, or `can` prefixes (`isLoading`, `hasError`).

---

## Data Layer (localStorage)

History is convenience data, not a system of record. A cleared browser losing
it is acceptable — do not build around durability guarantees it cannot make.

### Access

- `src/lib/storage.ts` is the **only** module that may reference
  `localStorage`. Components and routes call its typed functions.
- Namespace every key with a `kk:` prefix and a schema version, e.g.
  `kk:v1:history`, `kk:v1:participants`. Define keys as constants in one
  place.
- Every read and write goes through `try`/`catch`. `localStorage` throws in
  private browsing, when quota is exceeded, and when site data is blocked —
  the app must render correctly with no stored value.
- A missing or unparseable value is not an error state: fall back to a
  documented empty default.

### Validation

- Parse stored JSON through a Zod schema on every read. Never trust the shape
  of what came out of storage — it may have been written by an older version
  or edited by hand.
- On a validation failure, discard the value and fall back to the empty
  default. Do not throw into the render path.
- Pasted history text is untrusted input: parse it in `src/lib/history.ts`,
  validate with Zod, and surface parse errors to the user rather than
  silently dropping rows.

### Shape

- Store plain serialisable data only — no `Date` objects, no `Map`/`Set`, no
  class instances. Timestamps are ISO 8601 strings.
- Every history entry records the year it belongs to, so the rotation rule
  ("not the same person in two or more years") is computed from stored data
  rather than inferred from ordering.
- Keep stored payloads small. Do not cache derived values that
  `src/lib/draw.ts` can recompute.

### Migrations

- When a stored shape changes, bump the key version and write a migration
  function in `src/lib/storage.ts` that reads the old key, converts, writes
  the new one, and leaves the old key in place for one release.
- Never mutate a user's stored data as a side effect of a read other than a
  deliberate, explicit migration.

---

## Application Boundaries

- There is no server, no API, and no server functions. Everything runs in the
  browser.
- Do not add `fetch` calls to a backend, server-side rendering, or any
  Node-only dependency to application code.
- Route `loader`s read from `src/lib/storage.ts`. Mutations call storage
  functions from event handlers and invalidate the router.
- The draw algorithm in `src/lib/draw.ts` must be pure and deterministic
  given its inputs plus an explicitly passed seed/RNG — no reading storage,
  no `Math.random()` called inline.

---

## UI Components

### File conventions

- One component per file. Filename matches the exported component name in
  PascalCase.
- Co-locate a `ComponentName.test.tsx` file when the component has non-trivial
  logic.
- Props types are defined in the same file, directly above the component.

### Patterns

- Prefer functional components. No class components.
- Use `React.memo` only with a measurable performance justification — not
  pre-emptively.
- Avoid prop drilling beyond 2 levels. Lift state or use context/TanStack
  Store.
- Client-side state: use TanStack Store or React `useState`/`useReducer`.
  Do not reach for an external state library without discussion.
- Async UI: use TanStack Router's built-in `loader` + `Suspense`. Do not
  read storage inside `useEffect` for data that belongs in the route loader.

### Styling

- Tailwind utility classes in the markup are the default. Do not add CSS
  Modules or a second styling system alongside it.
- Design tokens (colours, spacing, typography scale) are defined once as CSS
  custom properties in `src/styles/global.css` and exposed to Tailwind
  through its theme config — not duplicated as hardcoded utility values.
- Extract a component before extracting an `@apply` class. Reserve `@apply`
  for cases where a component boundary genuinely does not fit.
- No inline `style={{}}` props except for truly dynamic values (e.g. a width
  derived from a measurement).
- Dark mode via Tailwind's `dark:` variant driven by `prefers-color-scheme`
  (`darkMode: 'media'`). Do not use a JS-toggled class strategy.

### Accessibility

- All interactive elements must be keyboard-navigable and have accessible
  names.
- Images require meaningful `alt` text; decorative images use `alt=""`.
- Use semantic HTML first (`<nav>`, `<main>`, `<article>`, `<section>`,
  `<time>`, etc.) before reaching for ARIA.
- Colour contrast must meet WCAG AA (4.5:1 for body text, 3:1 for large text).

---

## Routing (TanStack Router)

- Use file-based routing in `src/routes/`.
- Route files export a `Route` created with `createFileRoute`.
- Data loading uses `loader` on the route — not `useEffect` or component-level
  reads.
- Mutations call storage functions from event handlers, then invalidate the
  affected route.
- Layouts live in `__root.tsx` and layout route files (`_layout.tsx`).
  Do not nest layout logic inside page components.
- Keep routes thin: import components and storage functions, wire them
  together, done.

---

## Testing

### Philosophy

Test behaviour, not implementation. A test should answer: "does this do what
the user/caller needs?" not "does this call this internal function?"

### Unit tests (`*.test.ts` / `*.test.tsx`)

- Framework: Vitest.
- Cover: all functions in `src/lib/`, all non-trivial utilities, Zod schemas.
- `src/lib/draw.ts` is the highest-value target — cover the rotation rule
  explicitly, including the case where no valid pairing exists.
- `src/lib/history.ts` must be tested against real pasted-message text,
  including malformed input.
- Use `vi.mock` sparingly — prefer dependency injection over module mocking.
  Pass the RNG into the draw function rather than mocking `Math.random`.

### Component tests (`*.test.tsx`)

- Framework: Vitest + Testing Library (`@testing-library/react`).
- Cover: components with conditional rendering, form validation, user
  interaction logic.
- Query by accessible role/label, not by CSS class or test ID. Use
  `data-testid` only as a last resort.

### Storage tests

- Run against the jsdom `localStorage` implementation, not a hand-rolled
  mock. Clear storage between tests.
- Cover the failure paths: absent key, malformed JSON, schema mismatch, and a
  throwing `localStorage` (simulate by stubbing the accessor to throw).

### Coverage

- Aim for ≥80% line coverage on `src/lib/`. Do not chase 100% — untested
  trivial getters are not a problem.

### Commands

```bash
bun run test          # run unit + component tests (watch mode)
bun run test:run      # single run (CI)
bun run test:coverage # coverage report
```

---

## Environment & Configuration

- All environment variables are documented in `.env.example` with placeholder
  values and a one-line comment.
- `.env` is gitignored. Never commit secrets.
- This app has no server, so every variable is build-time and client-visible.
  Prefix them with `VITE_` and treat anything added as public — never put a
  secret in one.
- There are currently no required environment variables.

---

## Deployment (Docker, self-hosted)

- The build output is static assets. The container builds with Bun and serves
  the `dist/` directory from a small static server — the runtime image must
  not carry the toolchain.
- Use a multi-stage `Dockerfile`: a build stage running `bun install` +
  `bun run build`, and a minimal runtime stage containing only `dist/` and
  the server.
- The static server must fall back to `index.html` for unknown paths so
  client-side routes resolve on direct navigation and refresh.
- Pin base images to a specific tag/digest. Do not use `latest`.
- No file system writes at runtime, no background jobs, no scheduled work —
  the container is a static file server and nothing else.
- Keep the image small and the build reproducible: commit the lockfile and
  copy it before the source so dependency layers cache.

---

## Commit Style

Follow the conventional commits guide:

The Conventional Commits specification is a lightweight convention on top of
commit messages. It provides an easy set of rules for creating an explicit
commit history; which makes it easier to write automated tools on top of. This
convention dovetails with SemVer, by describing the features, fixes, and
breaking changes made in commit messages.

The commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

The commit contains the following structural elements, to communicate intent to
the consumers of your library:

- fix: a commit of the type fix patches a bug in your codebase (this
  correlates with PATCH in Semantic Versioning).
- feat: a commit of the type feat introduces a new feature to the codebase
  (this correlates with MINOR in Semantic Versioning).
- BREAKING CHANGE: a commit that has a footer BREAKING CHANGE:, or appends a
  ! after the type/scope, introduces a breaking API change (correlating with
  MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of
  any type.
- types other than fix: and feat: are allowed, for example
  @commitlint/config-conventional (based on the Angular convention) recommends
  build:, chore:, ci:, docs:, style:, refactor:, perf:, test:, and others.
- footers other than BREAKING CHANGE: <description> may be provided and
  follow a convention similar to git trailer format.

Additional types are not mandated by the Conventional Commits specification,
and have no implicit effect in Semantic Versioning (unless they include a
BREAKING CHANGE). A scope may be provided to a commit’s type, to provide
additional contextual information and is contained within parenthesis, e.g.,
feat(parser): add ability to parse arrays.

## Examples

Commit message with description and breaking change footer

```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other
config files
```

Commit message with ! to draw attention to breaking change

```
feat!: send an email to the customer when a product is shipped
```

Commit message with scope and ! to draw attention to breaking change

```
feat(api)!: send an email to the customer when a product is shipped
```

Commit message with both ! and BREAKING CHANGE footer

```
feat!: drop support for Node 6

BREAKING CHANGE: use JavaScript features not available in Node 6.
```

Commit message with no body

```
docs: correct spelling of CHANGELOG
```

Commit message with scope

```
feat(lang): add Polish language
```

Commit message with multi-paragraph body and multiple footers

```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123
```

Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”,
“SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be
interpreted as described in RFC 2119.

  1. Commits MUST be prefixed with a type, which consists of a noun, feat,
      fix, etc., followed by the OPTIONAL scope, OPTIONAL !, and REQUIRED
      terminal colon and space.
  2. The type feat MUST be used when a commit adds a new feature to your
      application or library.
  3. The type fix MUST be used when a commit represents a bug fix for your
      application.
  4. A scope MAY be provided after a type. A scope MUST consist of a noun
      describing a section of the codebase surrounded by parenthesis, e.g., fix
      parser):
  5. A description MUST immediately follow the colon and space after the type
      scope prefix. The description is a short summary of the code changes,
      e.g, fix: array parsing issue when multiple spaces were contained in
      string.
  6. A longer commit body MAY be provided after the short description,
      providing additional contextual information about the code changes. The
      body MUST begin one blank line after the description.
  7. A commit body is free-form and MAY consist of any number of newline
      separated paragraphs.
  8. One or more footers MAY be provided one blank line after the body. Each
      footer MUST consist of a word token, followed by either a :<space> or
      space># separator, followed by a string value (this is inspired by the
      git trailer convention).
  9. A footer’s token MUST use - in place of whitespace characters, e.g.,
      Acked-by (this helps differentiate the footer section from a
      multi-paragraph body). An exception is made for BREAKING CHANGE, which
      MAY also be used as a token.
  10. A footer’s value MAY contain spaces and newlines, and parsing MUST
      terminate when the next valid footer token/separator pair is observed.
  11. Breaking changes MUST be indicated in the type/scope prefix of a commit,
      or as an entry in the footer.
  12. If included as a footer, a breaking change MUST consist of the uppercase
      text BREAKING CHANGE, followed by a colon, space, and description, e.g.,
      BREAKING CHANGE: environment variables now take precedence over config
      files.
  13. If included in the type/scope prefix, breaking changes MUST be indicated
      by a ! immediately before the :. If ! is used, BREAKING CHANGE: MAY be
      omitted from the footer section, and the commit description SHALL be used
      to describe the breaking change.
  14. Types other than feat and fix MAY be used in your commit messages, e.g.,
      docs: update ref docs.
  15. The units of information that make up Conventional Commits MUST NOT be
      treated as case-sensitive by implementors, with the exception of BREAKING
      CHANGE which MUST be uppercase.
  16. BREAKING-CHANGE MUST be synonymous with BREAKING CHANGE, when used as a
      token in a footer.

Commit subject length should be 50 characters if possible, and the column width
limit for the commit describption is 80 characters, if it does reach 80
characters, a new line must be created to continue the description.

---

## Record all prompts

All prompts to Claude, and responses by Claude, should be recorded in a
CLAUDE-HISTORY.md file.

---

## What Not To Do

- Do not add dependencies without checking bundle impact first.
- Do not add a backend, database, or API — history lives in `localStorage`.
- Do not touch `localStorage` outside `src/lib/storage.ts`.
- Do not read or write stored data without Zod validation and a `try`/`catch`.
- Do not use `useEffect` for loading stored data — use route loaders.
- Do not store secrets in code, comments, commit messages, or `VITE_` vars.
- Do not `console.log` debugging output in committed code.
- Do not call `Math.random()` inside the draw algorithm — pass an RNG in.
- Do not add CSS Modules or a second styling system alongside Tailwind.
- Do not use `any` as a shortcut.



Craig-Tully
Brooke-Powder
Chris-Craig
Georgie-Brooke
Tully-Sarah
Powder-Scott
Scott-Mathew
Sarah-Will
Mathew-Scott
Will-Chris
