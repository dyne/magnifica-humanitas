# Magnifica Humanitas: project guide

## Purpose and product

A static, multilingual reading companion to Leo XIV's *Magnifica Humanitas*.
The app offers a question-led concept atlas, directed relationships, finite
reading trails, a source-ordered adaptation, source contexts/notes, search and
local saved places. It helps readers explore a long text without flattening its
arguments. It is an independent editorial reading, not an official Vatican app.

The supported editions are `en`, `ar`, `be`, `de`, `es`, `fr`, `it`, `pl`, `pt`
and `ru`. **`be` is Belarusian.** Arabic uses RTL. Each edition currently has
245 paragraph contexts and sequential entries, 224 notes, 27 concepts,
44 relations, six trails and 291 interface messages. Counts are structural
checks, not evidence that prose is faithful.

This file covers repository-specific knowledge. Agent orchestration, approvals,
plan lifecycle and general tool/skill workflows are supplied by Gestalt.

## Read first, according to the task

| Document | What it governs |
| --- | --- |
| `PRODUCT.md` | Product direction and audience |
| `research/DECISIONS.md` | Owner decisions; distinguish confirmed decisions from historical proposals |
| `research/ANALYSIS.md`, `research/EXPERIENCE.md` | Source analysis and reading experience |
| `content/editorial/CONTRACT.md` | Fidelity, protected arguments, devotional exclusions and placement |
| `docs/EDITORIAL.md` | Content-editing and review procedure |
| `docs/CONTENT-SCHEMA.md` | Stable identities, schemas, quotations, localization and revisions |
| `content/source/README.md` | Source authority, ingestion, provenance and edition anomalies |
| `docs/ATTRIBUTION.md` | Separate source, application, theme and font rights |
| `docs/DEPLOYMENT.md` | Hosting, Pages workflow and published-site checks |
| `verification/LANGUAGE-MATRIX.md`, `verification/MULTILINGUAL-RELEASE.md` | Multilingual verification methods, evidence and limitations |

Research and verification documents include historical observations. Inspect
current code, Git state and remote checks rather than treating old status text,
test counts or deployment observations as current facts.

## Stack and repository map

Vue 3 Composition API, TypeScript and Vue Router run in Vite 8. This is an ESM
repository (`type: module`). There is no server API, database, account system or
runtime translation/AI service. Authored content is compiled into static assets.
Dependencies and the Dyne theme revision are pinned in `package-lock.json` and
`package.json`; a build must not rely on a sibling theme checkout.

| Location | Responsibility |
| --- | --- |
| `src/main.ts` | Vue initialization, router readiness and bootstrap errors |
| `src/App.vue` | Shared shell, language selector, appearance/text controls, navigation and status announcements |
| `src/router.ts` | Hash routes, locale activation guards and successful-navigation bookkeeping |
| `src/views/` | Atlas, Concept, Relation, Foundation, Trails, Trail, TrailEnd, Read, Source, Note, Search, Saved, About and Unavailable |
| `src/components/` | Reusable prose, citations, caller-return links, saves, resume and reflections |
| `src/reading-types.ts` | Public reading and location TypeScript shapes |
| `src/reading.ts` | Active library and atomic locale activation |
| `src/sequence.ts`, `src/source-context.ts` | Deferred sequence/context loading and readiness promises |
| `src/locale.ts`, `src/messages.ts` | Active locale, document language/direction, formatting, URLs and typed messages |
| `src/navigation.ts` | Scroll/focus restoration, caller state and cancellation tokens |
| `src/local-state.ts` | Reactive saved/recent/visited state, storage fallback and reader actions |
| `scripts/reading-state.mjs` | Pure persistence validation, migrations and stable location URLs |
| `scripts/locales.mjs`, `scripts/locale-loader.mjs` | Locale registry/resolution and per-locale resource cache |
| `scripts/search.mjs`, `scripts/messages.mjs` | Search normalization/indexing and catalog validation/formatting |
| `scripts/validate-editorial.mjs`, `scripts/reading-content.mjs` | Executable editorial/public-content contracts and context-index construction |
| `vite.config.ts` | Locale virtual modules, validation, hosting base and isolated test fixture build |
| `src/style.css`, `src/*-fonts.css` | Product styles, RTL and extended Latin/Cyrillic font coverage |
| `public/` | Static notices, licenses and the pinned Arabic font |
| `tests/*.test.mjs` | Node unit/content/runtime-contract tests |
| `tests/browser/`, `tests/locale-browser/` | Production browser journeys and isolated synthetic RTL regressions |
| `design/journeys.json` | Reading journeys and real-source anchors |
| `output/`, `dist/` | Ignored verification artifacts and generated production site |

Shared pure logic lives in `.mjs` modules so Node tests and the browser can use
it; paired `.d.mts` declarations describe those interfaces to TypeScript. Update
both when changing an exported contract.

## Content pipeline and source authority

```text
Frozen official inputs -> deterministic Python ingestion -> source corpus
Source corpus + editorial ledgers + authored reading + messages
  -> validation and Vite virtual modules -> lazy browser resources
```

- `content/source/en/` retains the owner's English PDF authority. The saved
  original text has mojibake; PDF parsing handles headings, running headers,
  paragraph boundaries and notes. `research/source-manifest.json` records the
  original inputs. Preserve originals in the parent workspace when present.
- The other `content/source/<locale>/` directories contain frozen official
  Vatican HTML/PDF snapshots, manifests, corpora and alignment evidence.
  Their HTML is authoritative for ingestion. Belarusian's linked PDF is English;
  Arabic HTML avoids PDF bidi/extraction artifacts. Recorded defects and
  edition differences must remain explicit, never silently repaired.
- English editorial inputs are directly in `content/editorial/`; other editions
  use `content/editorial/<locale>/`. Each has coverage, concepts and relations.
- `content/reading/<locale>.json` contains authored public reading content.
  `content/messages/<locale>.json` contains interface wording. English defines
  the catalog key/placeholder schema; localized catalogs must match it exactly.
- Non-English alignment, semantic and interface review JSON records bind source,
  content and catalog hashes. English retains its Markdown semantic/trail
  reviews. Historical pending-review fields are not live workflow state.

Official quotations come directly from the corresponding official edition,
never a model translation. Site-authored adaptations are compared with that
edition, rather than merely translating the English adaptation. Preserve agency,
polarity, certainty, scope, causal relations and necessary qualifications.

Quotation coordinates are **UTF-16 offsets with exclusive end** into the frozen
corpus. Exact text and hashes must match; do not splice separated spans into a
quotation. Paragraph identities are `p001`–`p245`; note identities are
`n001`–`n224`. Concept, relation, trail, step and block IDs are stable across
languages and independent of display text. Do not renumber or recycle them.

The main path is secular; attributed theological foundations remain reachable
in optional depth. Exclude only the reviewed prayer/liturgical forms, retaining
surrounding arguments and institutional criticism. Distinguish quotation,
paraphrase, interpretation and invented scenario. Source positions are not
scientific consensus, and understanding a position must not require agreeing.

Every paragraph needs coverage, rationale and preserved qualifications. A
`Source.vue` explanation is rendered independently: the main reading or an
optional foundation cannot compensate for a missing argument in that context.
For material prose edits, renew relevant comparisons, anchors, hashes and the
reading revision; recompute trail estimates via `estimateTrailReading()`.
See the schema for source-location-scoped incomplete devotional fragments;
complete invocations remain globally excluded.

## Runtime and navigation contracts

Vite validates content and emits four distinct lazy modules per enabled locale:
library, messages, sequence and source context. `virtual:locale-registry` and
`virtual:locale-loaders` expose the registry and dynamic imports. Entry loads the
active library/messages; sequence and context stay deferred until needed.
Do not import all reading JSON into the application shell. Registry availability
requires complete reviewed inputs, not just a source snapshot.

`createLocaleLoader()` caches by locale **and resource**, evicts failed loads
for retry, and uses generation tokens so superseded activations cannot publish.
`activateReading()` installs library/messages together. Views invalidate pending
requests across locale changes. Preserve this behavior when modifying loaders.

Routes use `createWebHashHistory(import.meta.env.BASE_URL)`, for example
`/#/ar/concepts/dignity` at domain root or
`/magnifica-humanitas/#/ar/concepts/dignity` at the project base.

- Neutral entries choose the first supported primary language in ordered
  `navigator.languages`, case-insensitively, then `navigator.language`, then
  English. Regional tags such as `pt-BR` resolve to `pt`.
- Explicit supported locale URLs win. Unsupported locale-prefixed valid routes
  fall back to English; unknown IDs/routes retain their supported URL locale.
- Switching retains stable route identities, query and anchor state, but drops
  caller labels from the previous language. A selection does not override the
  browser default on a later neutral visit.
- Failed/cancelled navigation must not overwrite the successful destination's
  title, active location, last/recent state or history. Keep the `afterEach`
  failure guard and navigation-token cleanup, including duplicate navigation.
- Dynamic view titles update after rendering and observe route changes, including
  same-entity query changes. Generic router titles must not overwrite them.
- `navigation.ts` restores scroll and focus using `mhReader`, `mhRestore`,
  `mhResume` and `mhCaller` history fields. Preserve normal Back/Forward and
  explicit user focus while asynchronous content is loading.

## Persistence, search and visual behavior

English retains storage key `mh-reading-v1`; other editions use
`mh-reading-v1-<locale>`. Schema 1 records locale, edition and content revision.
Locations store IDs and bounded offsets, never translated labels. The pure
state decoder validates untrusted storage, migrates missing blocks and preserves
unavailable destinations for the UI. Current limits are 50 saves, 10 recent
places and 300 visited locations; consult `scripts/reading-state.mjs` before
changing them.

Failed writes keep locale-scoped temporary state within the current tab, even
across switches. Retry persists it; clearing replaces/removes it. It does not
survive reload. Storage must never choose the visitor's language.

Search uses active-locale content, casing, sorting, paragraph terms and digits.
Do not apply blanket accent stripping across scripts: Cyrillic distinctions
such as `й/и`, `ё/е` and Belarusian `ў` matter. Arabic has deliberate harakat,
tatweel and alif folding; preserve the distinctions covered by search tests.
Use locale formatting/bidi helpers for numbers and embedded LTR references.

The visual authority is the pinned Dyne theme, with product-specific composition.
Keep ordinary scrolling, visible controls, text equivalents for graph relations,
finite trails and optional reflection. No mandatory quizzes, swipe-only routes,
streaks, autoplay or tracking. Bundled fonts cover extended Latin/Cyrillic and
Arabic; Arabic needs actual shaping, bidi, punctuation and numeral checks, not
only `dir=rtl`. Preserve keyboard orientation and reduced-motion behavior.

## Development and verification

Requirements: Node **>=22.12.0** (CI uses 24), npm, Python 3, and matching
Playwright Chromium. Normal build/checks use repository snapshots, not an
external PDF or live Vatican request. Acquisition/re-ingestion is a separate
operation described in the source README.

```sh
npm ci
npm run dev
# Browser prerequisite, if absent:
npx playwright install chromium
```

`VITE_BASE` defaults to `/magnifica-humanitas/` and must start/end with `/`.
Use the same value for build and preview/browser checks. Production Playwright
starts its own preview on port 4173; it does not reuse an existing server.

| Command | Scope |
| --- | --- |
| `npm test` | Node unit and content tests |
| `npm run typecheck` | Vue/TypeScript interfaces |
| `npm run content:check` | Editorial and public reading contracts |
| `npm run check` | Types, content, unit tests, production build |
| `npm run source:check` | Offline deterministic source reproduction and acquisition/parser regressions |
| `npm run test:browser:all` | Sequential production builds/tests at `/` and `/magnifica-humanitas/` |
| `node scripts/audit-release.mjs dist` | Source/review bindings, actual artifact chunks, fonts and notices |

For full local release verification run `check`, `source:check`, then
`test:browser:all` sequentially. Do not run a second build during the hosting
runner: both use `dist/`. `BROWSER_EVIDENCE_DIR` selects the hosting report
location. If Chromium was installed under `/tmp/magnifica-playwright`, set
`PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright` on browser commands;
that temporary installation is environment-specific, not a project dependency.

A focused production run still needs a matching build first, for example:

```sh
VITE_BASE=/ npm run build
VITE_BASE=/ npx playwright test tests/browser/language-matrix.spec.ts
```

Activation/history changes also need the isolated nonshipping RTL suite:

```sh
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ npx vite build --mode locale-fixture
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ npx playwright test --config playwright.locale.config.ts
```

It uses port 4174 and `/tmp/magnifica-locale-fixture-dist`, never shipping `dist/`.
The explicit mode prevents accidentally publishing synthetic `qps` content.

`language-matrix.spec.ts` covers all editions, route switching, storage and load
failures. `release-evidence.spec.ts` covers deferred resources and long-copy
layout/font checks. Review Arabic plus long Latin/Cyrillic samples at 390×844
and 1440×900, 100%/200% text, keyboard and reduced motion. Automated accessibility
and hash checks do not establish native-speaker fidelity or complete accessibility.

## Hosting and rights

Repository: `dyne/magnifica-humanitas`. CI (`.github/workflows/ci.yml`) verifies
pushes and PRs. `.github/workflows/pages.yml` deploys pushes to `main`; manual
Pages runs also target `main`. Feature branches do not deploy. Static hosting
needs the entire `dist/`, including `NOTICE.txt`, fonts and licenses. Hash routes
need no server-side rewrite rules. Published checks use `EXPECTED_RELEASE_SHA`,
`PUBLISHED_URL` and `npm run test:published`; see `docs/DEPLOYMENT.md`.

Vatican source copyright, Dyne theme MIT and font OFL notices remain separate.
No license for original project code/commentary has been selected. Do not apply
dependency licenses to source text or imply official endorsement. The pinned
Noto Arabic OFL file deliberately preserves upstream whitespace for hash identity.

## Known limitations to carry forward

- Terminal review of `0280bfb` found a P2 bootstrap failure: aborting the Arabic
  library on a fresh explicit Arabic URL leaves English language/title/error
  text. The error mentions an original link that is not rendered because the
  app never mounts. This is distinct from the static no-JavaScript fallback.
  Inspect `src/main.ts`, `src/reading.ts` and `scripts/locale-loader.mjs` when
  fixing it; localized switch/context failures already have regression coverage.
- The Russian source-context chunk exceeds Vite's 500 kB raw warning threshold
  (about 102 KiB gzip in the release audit); it is deferred, not entry-loaded.
- Long headings can wrap over many lines at 200% mobile text. Existing samples
  had no clipping; preserve reachability rather than shrinking requested text.
- Verification has not included independent native-speaker proofreading,
  physical-device, screen-reader-user or learning studies. Local results do not
  establish publication status.
