# Italian reading and interface — L3 verification

Local review on 15 October 2026, after accepted dependency correction `a40916d`.
This records the Italian candidate after the full sequential gates passed.
Supervisor acceptance remains pending. No deployment is claimed.

## Delivered interface

`content/messages/it.json` supplies all 291 schema keys with exact placeholder
parity. It covers navigation, route titles, metadata, About and attribution,
source/note labels, reasoning kinds, relationships, trails, reflection, search,
saved places, storage failures, live announcements, retry and unavailable states.
The document title is language-specific. Proper document names and templates
containing only names/placeholders remain language-neutral.

Italian uses the L3.1 terminology, including IA, dignità ontologica,
destinazione universale dei beni and sussidiarietà. Every directed relationship
verb agrees with the term map. The explanation of abbreviated bibliographic
context covers both `ibid.` and the local author abbreviation `Id.`. About names
the actual Italian source edition and distinguishes source copyright from
original editorial text and dependency/font notices. The original-source links
lead to the Italian Vatican document.

Only English and Italian are enabled. The other eight acquired source editions
remain unavailable to readers. Source, reading and catalog checks pass before
this availability change; integrated review confirms the candidate. Stable IDs,
explicit English URLs, per-locale storage and browser-default behavior are kept.
No shared runtime or styling change was needed in this child.

## Browser evidence

Production Chromium checks use `/tmp/magnifica-playwright` and sequential builds,
at `/` and `/magnifica-humanitas/`. There were 26 passing Italian cases per base
plus four English layout regressions per base: 60 passes in total, no final
failures, skips or flaky cases. The two final additional cases verify deferred
active-language loading and failed English activation from an Italian source
note. The archived results split them from the other cases:

| Base | Reports under `output/italian/` | Passes |
| --- | --- | ---: |
| `/` | `root-browser-results.json`, `root-english-layout-results.json`, `root-additional-results.json` | 24 + 4 + 2 |
| `/magnifica-humanitas/` | `subpath-browser-results.json`, `subpath-additional-results.json` | 28 + 2 |

The journeys cover ordered browser preferences (`fr-FR,it-IT,en-US`, `IT-ch`,
English-first and unsupported languages), explicit English, fresh neutral entry,
keyboard equivalent-route switching with query/anchor and selector focus,
accent-insensitive Italian and paragraph-keyword search, empty/unavailable
results, exact saved paragraph resumption, caller return through source and note,
locale-isolated persistence, blocked storage and translated live notices.

Failed and cancelled activation retain the exact current title, locale and
last/recent/saved/visited state. Delayed Italian context cannot overwrite a return
to English. Both directions of language failure are tested. Italian note and
sequence loading failures show localized retry states and recover. Atlas entry
requests the Italian reading library, not the English one, and defers source and
sequence modules. All six Italian trail endings expose the actual optional,
unscored reflection and keep a visible stopping point.

Exact quotation and note checks include the Italian §52 span, note 124's local
backlink, note 211's preceding citation and note 223's untouched bibliographic
title. Source and note pages show `mh-it-official-html-2026-10-14`; external source
links remain in the Italian edition.

Reproduce the complete focused matrix with the final tests:

```sh
VITE_BASE=/ npm run build
VITE_BASE=/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test tests/browser/italian.spec.ts tests/browser/locale-layout.spec.ts
VITE_BASE=/magnifica-humanitas/ npm run build
VITE_BASE=/magnifica-humanitas/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test tests/browser/italian.spec.ts tests/browser/locale-layout.spec.ts
```

## Screenshot and font review

The actual Italian Atlas, Concept, Trail, Read, Source, Note, Search, Saved and
About surfaces were captured at 390×844 and 1440×900, at 100% and 200% text, at
both bases. There are 72 named-surface captures, eight selector captures and
eight additional dark About captures. The 88 primary screenshot hashes and
viewport metadata are recorded in `content/editorial/it/interface-review.json`.

Files follow `output/italian/<root|subpath>-<390|1440>-<100|200>-<surface>.png`.
Four inspection sheets per base collect the nine named surfaces in this order:
Atlas, Concept, Trail; Read, Source, Note; Search, Saved, About. They were visually
inspected, with separate phone selector and dark-mode inspection. The initial
phone 200% pass revealed awkward breaks inside the long Atlas/About titles.
One bounded copy correction shortened them to `Esplora le idee` and
`Su questa lettura`; the confirmation captures wrap cleanly. Ordinary vertical
scrolling remains necessary at enlarged text. No horizontal overflow was found
in the checked matrix, and controls/labels remain available.

CDP `CSS.getPlatformFontsForNode` confirms the licensed, locally served Syne and
Inter actually paint the Italian headings and paragraphs in every surface/size
combination. Font attachments are in the archived browser reports. Accents,
curly apostrophes and long labels are present in real content; the review did
not substitute synthetic translated headings.

Eighteen axe scans (all nine surfaces at phone 100% at both bases) reported zero
WCAG 2 A/AA and WCAG 2.1 AA tag violations. Keyboard checks include selector to
appearance order, switching, saved/caller return and reflection reveal focus.
The complete layout matrix runs with reduced motion. Dark About captures
confirm inherited colors and legibility visually; no comprehensive dark-mode
accessibility certification is claimed.

## Bounded Impeccable audit

Implementation integrity passes within this locale's scope: terminology,
source/editorial labels, finite trails, ordinary scrolling, explicit return and
local-only state remain coherent with the reading product. The mechanical scan
`impeccable detect --json content/messages/it.json` returned no findings. Since
this child changes catalog data and registry/tests, that detector result is not
a fresh audit of every inherited Vue or CSS rule.

| Dimension | Score | Evidence and limit |
| --- | ---: | --- |
| Accessibility | 3/4 | 18 clean automated scans and concrete keyboard journeys; no physical screen-reader review |
| Performance | 3/4 | Active-library/deferred-data request checks; no fresh CPU/network usability study |
| Responsive design | 3/4 | Both viewports and text sizes inspected; no physical-device review |
| Theming | 3/4 | Inherited tokens and light/dark captures; not every possible preference combination |
| Implementation integrity | 4/4 | Reviewed corpus, catalog parity, stable IDs, attributed source and meaningful navigation |
| Total | 16/20 | Good within the bounded review; no unresolved P0/P1 found in this scope |

The root-hosted production build measured 61,125 gzip bytes for the entry JS,
40,862 for the deferred Italian library, 34,789 for its sequence and 82,610 for
its source-context bundle. These are artifact sizes, not measured transfer or
interaction times. Source and sequence stay deferred on the atlas. The local
fixture build goes to `/tmp/magnifica-locale-fixture-dist`, outside production.

## Focused gates and limits

Typecheck passed. The following focused unit command passed 34 tests, with zero
failures, cancellations or skips:

```sh
node --test tests/italian-interface.test.mjs tests/locales.test.mjs tests/locale-delivery.test.mjs tests/italian-reading.test.mjs tests/italian-alignment.test.mjs
```

The isolated nonshipping RTL regression suite passed 11 tests, with zero final
failures/skips. Its preview must use the same root base as its build; a mismatched
base was corrected before the recorded passing run:

```sh
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ npm run build -- --mode locale-fixture
VITE_BASE=/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test --config playwright.locale.config.ts
```

These checks complement the 762-block source-led semantic comparison recorded
in the Italian editorial review. They do not establish native-speaker
proofreading, comprehensive accessibility, physical-device behavior, independent
scientific/historical correctness of source claims or improved understanding by
readers. The fresh parent suite is recorded below; supervisor review remains pending. No source or English authored prose changed in L3.

## Final L3 gates and review scope

Starting L3 commit: `62519e62f56b258c78b82558366f7f1ef38bc589`. Accepted
validator dependency correction/current HEAD: `a40916d0b81daf86a7fd51cbd81a1ee080c91fde`.
Branch: `feat/multilingual-reading`. All three child milestones are DONE; L3 is
submitted for supervisor review with its changes uncommitted.

The following commands ran sequentially on the final implementation, with no
concurrent builds:

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run check` | PASS: typecheck, content validation, 94 unit tests, production build; 0 failures/cancellations/skips | `/tmp/magnifica-it-final-check.log` |
| `npm run source:check` | PASS: all 10 editions, 245 paragraphs and 224 notes each; 10 parser fixtures; 0 failures/skips | `/tmp/magnifica-it-final-source.log` |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npm run test:browser:all` | PASS: 110 root + 110 subpath tests; 0 failures/skips/flaky | `/tmp/magnifica-it-final-browser.log`, `output/hosting/{root,subpath}-browser-results.json` |

The first full-browser attempt stopped at root with 108 passes and two obsolete
en-only shell assertions. The correction uses pending French for unsupported
locale recovery and asserts Italian browser preference followed by explicit
English. All required gates were restarted and passed. Existing fallback,
query/anchor, race, cancellation and failure behavior remains tested.

The full run regenerated the 88 primary captures. Their current hashes are in
the interface review; four changed subpath desktop 200% captures were visually
rechecked through the regenerated nine-surface sheet and full selector image.
Catalog and all four authored-content hashes still match their review records.

The complete intended dirty scope is 18 files, sorted below. Shared-code impact
is limited to enabling the reviewed Italian registry entry and evolving locale
assertions; no accepted runtime implementation changed. Frozen sources and
English public prose are unchanged. `git diff --check` passed; the index is empty.

```text
content/editorial/it/REVIEW.md
content/editorial/it/alignment-review.json
content/editorial/it/concepts.json
content/editorial/it/coverage.json
content/editorial/it/interface-review.json
content/editorial/it/relations.json
content/editorial/it/semantic-review.json
content/messages/it.json
content/reading/it.json
scripts/locales.mjs
tests/browser/italian.spec.ts
tests/browser/locale-layout.spec.ts
tests/browser/shell.spec.ts
tests/italian-alignment.test.mjs
tests/italian-interface.test.mjs
tests/italian-reading.test.mjs
tests/locales.test.mjs
verification/ITALIAN.md
```

No staging, commit, push or deployment has occurred. The full-suite evidence is
automated verification and the described visual/source-led review; it does not
expand the native-speaker, reader-study or accessibility claims above.
