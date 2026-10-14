# Locale runtime verification

L2 infrastructure, 14 October 2026. Production publishes English only. Official
source acquisition is independent of reading/interface publication; no other
locale is offered until its complete authoring and review milestone passes.

## Focused runtime checks

`tests/locales.test.mjs` covers preference ordering, BCP47 region/case handling,
malformed/empty/unsupported input, navigator fallback, explicit routes, unknown
identities and preservation of query/anchor bytes. Nonshipping availability
injection exercises future languages without distributing placeholder readings.

`tests/locale-delivery.test.mjs` covers full catalog/placeholder parity, missing
locale rejection, active source hashes/quotation matching, atomic activation,
stale failure/cancellation, per-locale cache and retry isolation, localized search,
English saved-state migration, and dynamic disposition/saved block labels.
Static Vue prose/accessibility-name coverage complements those dynamic checks.

Production reader/search/source/return-state journeys passed after the runtime
refactor, including lazy failures/retries and legacy English saves. Their
current full-suite confirmation belongs to the parent review gate.

## Layout and interaction matrix

`tests/browser/locale-layout.spec.ts` captures English selector, Atlas, Read,
Source, Saved and Search at 390×844 and 1440×900, each at 100% and 200% text.
`tests/locale-browser/rtl.spec.ts` repeats that matrix against a synthetic,
explicitly nonshipping RTL fixture. All 48 named PNG captures are generated
under `output/locale-layout/`. The tests check document overflow, current
language/direction, and hidden unfinished production locales. Text sizing is
set with the application's control; reduced motion is enabled throughout.

The fixture additionally verifies keyboard-only language changes, selector
focus restoration, equivalent stable route/query/anchor state, fresh neutral
browser defaults, failed switch/retry, a late context request after returning
to English, and cancellation while a new library is still pending. It never
uses English reading text as an Arabic translation. The visible fixture notice,
`qps` route and `nonshipping-rtl-fixture` edition distinguish all synthetic data.

Reproduce the separate fixture artifact and eleven browser cases:

```sh
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ npx vite build --mode locale-fixture
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test --config playwright.locale.config.ts
```

The explicit fixture flag requires `locale-fixture` mode. Its artifact is always
`/tmp/magnifica-locale-fixture-dist`, separate from shipping `dist/`; normal
production builds neither enable nor emit this pseudo-locale. The custom
Playwright configuration serves only that temporary artifact on port 4174.

The bounded visual inspection reviewed the incumbent English theme and Arabic
shaping, enlarged phone headings, wrapped controls, source numbers and RTL
search. No horizontal clipping was observed in the tested matrix. At enlarged
phone sizes, long headings wrap over several lines; ordinary page scrolling
remains available. The mechanical Impeccable detector returned no findings.
Chromium reported installed DejaVu Sans Bold painting Arabic heading glyphs
in all four RTL combinations. No additional font asset is distributed; existing
OFL font notices remain intact (see `docs/ATTRIBUTION.md`).

This establishes the tested Linux/Chromium layout and runtime behavior. It does
not claim native-speaker proofreading, Arabic editorial completeness, testing
on every operating system/font installation, physical-device/screen-reader
review, or learning efficacy. Each real locale still requires its own source,
semantic and integrated browser review.

## Parent gate evidence

After all three child checkpoints, sequential parent gates passed:

- `npm run check`: typecheck, editorial validation, 64 unit tests (zero failures
  or skips), and production build.
- `npm run source:check`: unchanged English source, all nine deterministic
  official corpora (245 paragraphs/224 notes each), four acquisition tests and
  ten parser tests.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npm run test:browser:all`:
  root and project-subpath builds, each with 84 browser tests, zero failures,
  skips or flakes. Reports are `output/hosting/{root,subpath}-browser-results.json`.

Detailed logs: `/tmp/magnifica-l2-{check,source,browser}.log`. The separate
nonshipping RTL suite passed eleven cases; its report is
`output/locale-fixture-results.json`. Shipping asset inspection found only
English library/messages/sequence/context chunks and no synthetic reading/source
content or fixture edition. The English catalog contains the fixture notice key;
production never renders it because its registry has no fixture locale.
Git scope inspection confirmed no source, English reading
or editorial corpus changes. Original licensing and frozen inputs remain intact.


## Review correction: failed navigation side effects

The parent review found that Vue Router invokes `afterEach` for unsuccessful
navigation too. Those callbacks now leave reading state and title untouched.
Cancellation carries the originating navigation token, so an abandoned language
request cannot cancel a newer successful destination's orientation. A failed
history rollback also clears the traversal flag, including its silent popstate,
so subsequent scrolling can still persist the current reading position.

The fixture suite now additionally holds a language library request while the
reader opens a different English concept, then releases it and checks the exact
current title, last/recent/visited places and a new save. A failed source-language
switch preserves its exact existing source title and state. A failed restored
history traversal rolls back and still captures and saves a later paragraph.
The three focused regressions passed; the complete fixture suite passed 11/11.
Current correction logs use `/tmp/magnifica-l2-review-{focused,fixture,check,source,browser}.log`.

A fourth review regression reproduces a duplicate-current-route race: Vue Router
skips `beforeEach` for that request, so the older locale activation must be
cancelled explicitly in its failed `afterEach`. The test failed with synthetic
RTL content under an English URL before the fix and passes after cancellation.
All four review regressions are included in the eleven-case fixture suite.

## Fresh review verification

The existing correction was inspected and rerun from starting commit
`e17cf42c9d2561f679efe682a04dbebb962dce65` on 14 October 2026. Sequential
`npm run check`, `npm run source:check` and
`PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npm run test:browser:all`
all passed: 64 unit tests, four acquisition tests, ten parser tests, and 84
browser cases at each deployment base, with no failures, skips or flakes.
The separate fixture commands above then passed the build and all eleven cases,
including the four navigation review regressions. Fresh reports are
`output/hosting/{root,subpath}-browser-results.json` and
`output/locale-fixture-results.json`; logs are
`/tmp/magnifica-l2-fresh-{check,source,browser,fixture-build,fixture}.log`.

`git diff --check` passed. The complete 64-file scope contains no frozen source,
authored English reading or editorial corpus changes. The shipping registry
still offers only English, and its artifact contains only English library,
messages, sequence and context chunks. The fixture build remains isolated in
`/tmp/magnifica-locale-fixture-dist`. No additional implementation correction
was needed during this verification pass.
