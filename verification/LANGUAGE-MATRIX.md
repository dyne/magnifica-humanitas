# Ten-language production integration matrix

L12.1 verification, 15 October 2026. All ten shipping editions (`en`, `it`,
`de`, `es`, `fr`, `pt`, `pl`, `be`, `ru`, `ar`) use the same production browser
contract in `tests/browser/language-matrix.spec.ts`. The matrix uses the actual
reviewed reading and message bundles, with no synthetic source translations.

## Observable coverage

Each edition exercises ordered browser preferences with an unsupported first
choice, uppercase regional tags, explicit links, explicit English, and a fresh
neutral entry after selector use. Additional cases cover `navigator.language`
backup, empty/unsupported preferences, English fallback and unsupported locale
prefixes while retaining query/anchor bytes.

The route matrix switches to the next edition in the shipping registry on all
13 route shapes: Atlas, Concept, Relation, Foundation, Trails, Trail step,
Trail ending, Read, Source, Note, Search, Saved and About. It verifies stable
identities, queries, anchors, selector focus, discarded caller labels, exact
localized document titles, document language/direction, navigation/control
accessible names and the edition's official Vatican URL. Source/note links
remain in the active locale. Real source-to-note navigation and Back/Forward
restore the correct edition, title and quotation or explanation.

Every edition saves and resumes paragraph 176 with working storage, denied
storage reads and denied writes. Saves remain isolated by edition, survive a
switch away/back in the same tab, and survive reload when device storage works.
A separate case clears temporary saves and recovers them to device storage.
Temporary data does not promise persistence across reloads.

For every edition, aborting its library preserves the previous URL, title,
content and localized failure notice; retry is held to inspect the unchanged
edition before activation. Context failures expose a localized retry without
an old quotation. Delayed context responses cannot overwrite a newer edition,
and a new context loading screen contains no prior-edition quotation. Unknown
concept, source, note and route identities retain the URL's supported locale.

## Regressions corrected

- Failed device-storage writes previously lost in-tab saved places on an
  edition change. Locale-scoped temporary snapshots now retain unsaved state;
  successful persistence and clearing remove or replace that snapshot.
- Dynamic page watchers could run before the router's generic title update.
  They now observe route changes after rendering, including equivalent routes
  with unchanged content identities and query/anchor-only changes.
- Catch-all routes have no `:locale` parameter. Activation now reads the
  resolved URL locale, keeping localized unavailable pages and official links
  consistent instead of activating English under a different locale URL.

The accepted source corpora, reading prose, interface catalogs, editorial
decisions and source anomalies are unchanged.

## Fresh focused evidence

Linux/headless Chromium, Playwright 1.64.0, matching Chromium installed under
`/tmp/magnifica-playwright`; production builds run sequentially.

```sh
VITE_BASE=/ npm run build
VITE_BASE=/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test tests/browser/language-matrix.spec.ts --max-failures=1
VITE_BASE=/magnifica-humanitas/ npm run build
VITE_BASE=/magnifica-humanitas/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test tests/browser/language-matrix.spec.ts
```

Both production bases passed **95/95** cases, with zero failures, skips or
flakes. Reports: `output/release/language-matrix/{root,subpath}-browser-results.json`.
Detailed local logs: `/tmp/magnifica-l12-matrix-{root,subpath}.log`.

The separate nonshipping fixture also passed **11/11** existing RTL,
cancellation, failed-history and duplicate-navigation regressions:

```sh
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ npx vite build --mode locale-fixture
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test --config playwright.locale.config.ts
```

Its build remains isolated at `/tmp/magnifica-locale-fixture-dist`; the report
is archived at `output/release/language-matrix/rtl-fixture-results.json`.
Existing saved-state/return coverage passed **16/16** at the project subpath:

```sh
VITE_BASE=/magnifica-humanitas/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test tests/browser/return-state.spec.ts
```

Its report is `output/release/language-matrix/return-state-browser-results.json`.
`npm test` passed **302/302**, with zero failures, skips or cancellations;
`npm run typecheck` passed. The Impeccable mechanical detector returned no
findings for the seven changed views; their visual layout is unchanged.

These results establish the tested production browser behavior, not semantic
fidelity, native-speaker proofreading, physical-device or screen-reader review,
learning efficacy or publication. The complete visual/editorial audit, fresh
full sequential gates and release/publication status belong to L12.2 and the
subsequent parent and whole-branch reviews. No push or deployment occurred.
