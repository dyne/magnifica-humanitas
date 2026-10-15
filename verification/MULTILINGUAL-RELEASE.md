# Local multilingual release evidence

15 October 2026, L12.2. This is a verified local candidate on
`feat/multilingual-reading`, based on `d3348afe98c5651731fb9638f35acb8e6fc5a5ce`
with the uncommitted L12 integration/evidence changes. It is ready for the
supervisor's L12 review and the later fresh whole-branch terminal review.
It does not record acceptance of either review or publication of this candidate.
No push or deployment was performed.

## Content and provenance audit

All ten enabled editions (`en`, `it`, `de`, `es`, `fr`, `pt`, `pl`, `be`, `ru`,
`ar`) validate with 245 source paragraphs, 224 local notes, 245 standalone
contexts, 245 source-ordered entries, 27 concepts, 44 directed relations and six
finite trails each. Stable IDs preserve 203 main and 42 optional-context source
positions. Every catalog has the complete 291-key English schema and matching
placeholder occurrences; no placeholder edition was enabled to pass a count.

`scripts/audit-release.mjs` reuses the content/message validators and checks
current review, revision and artifact hashes. Each additional edition has
245 alignment records, 27 terminology entries, 224 aligned notes, 762 public
block review records and 224 reviewed notes. The three locale review files
still bind the current authored inputs. English retains its original Markdown
semantic/trail reviews. Historical pending-supervisor status strings and earlier
enabled-locale lists remain unchanged; they are not live workflow state or
evidence of independent proofreading.

All 18 additional-edition HTML/PDF snapshots match their manifests' byte counts
and SHA-256 values. The nine official HTML editions were acquired on 14 October
2026; requested/final URLs, language witnesses and extraction choices remain in
their individual manifests. English keeps the owner's PDF authority and its
explicit §82 HTML difference. Both owner's original workspace files were present
and matched the recorded hashes. The audit also works in a clean clone where
those external originals are absent.

No source, reading, message catalog or accepted editorial JSON changed in L12.
Belarusian's linked English PDF and extra §215 note-84 marker, Arabic's empty
§66 anchor and bibliographic note 133, Polish note-anchor defects, and all other
frozen edition witnesses remain intact. Exact quotations come from the local
official corpus; authored adaptations are separately labelled. This release
audit checks existing evidence and bindings; it does not perform a new semantic
comparison of every paragraph or establish native-speaker fidelity.

## Fresh sequential gates

Environment: Linux, Node 24.22.0, npm 11.19.1, Python 3.13.5, Playwright 1.64.0,
Chrome for Testing 156.0.8078.4. Matching browser executable:
`/tmp/magnifica-playwright/chromium-1248/chrome-linux64/chrome`.
The production gates were run in this order, without concurrent builds:

```sh
npm run check
npm run source:check
PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright BROWSER_EVIDENCE_DIR=output/release/hosting npm run test:browser:all
```

- `check`: typecheck, editorial/reading validation, **302/302** unit tests and
  production build passed; zero unit failures, cancellations or skips.
- `source:check`: deterministic English and nine official editions passed,
  including four acquisition and ten parser regression tests.
- Production browser gate: **611/611 at `/` and 611/611 at
  `/magnifica-humanitas/`**, zero failures, skips, flakes or global errors.
  This includes the 95-case shared [language matrix](LANGUAGE-MATRIX.md),
  26 new release loading/layout cases and all existing locale/reader checks.

The initial full attempt passed 611 root cases but failed one subpath case:
an existing Atlas test synchronously counted links immediately after navigation,
before asynchronous activation mounted the application. Its four count checks
now use retrying `toHaveCount`, retaining the exact 27 concepts and 44 relations
contract. Five consecutive focused repetitions passed, followed by the fresh
complete sequential gates above. Initial reports remain under
`output/release/attempts/initial-hosting/`; no production defect or source change
was substituted for that correction.

The isolated nonshipping runtime fixture was rebuilt and passed **11/11**
current RTL/cancellation/history cases, including exact title/state preservation
on failed or cancelled switches and duplicate-current-route cancellation:

```sh
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ npx vite build --mode locale-fixture
MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/ PLAYWRIGHT_BROWSERS_PATH=/tmp/magnifica-playwright npx playwright test --config playwright.locale.config.ts
node scripts/audit-release.mjs dist output/release/artifact-audit.json
```

The fixture remains outside shipping `dist/` at
`/tmp/magnifica-locale-fixture-dist`. The production artifact audit passes after
that build. Gate logs are archived under `output/release/gates/`; the hosting
runner records per-base commands, results and JavaScript hashes in
`output/release/hosting/browser-evidence.json`.

## Bounded visual and accessibility review

The release cases measure the longest concept and trail titles in each selected
corpus, instead of inferring wrapping from English. French supplies the longest
Latin concept (`ai-limits`, 49 code points) and trail (`worth-not-reward`, 58);
Spanish adds its 45-code-point AI concept; Russian supplies the longest
Cyrillic concept (`peace`, 35) and trail (`justice-in-structures`, 45); Arabic
uses `subsidiarity` (38) and `ai-purpose` (32). Counts include the actual Unicode
characters and combining marks, without altering source or display text.

For each of these four locales, Concept, Trails and Trail ending were captured
at **390×844 and 1440×900, 100% and 200% text, at both hosting bases**: 96 PNGs
under `output/release/visual/`. Eight contact sheets were inspected, followed by
the final regenerated French desktop pair. Forty-seven cross-base PNG pairs
were byte-identical; the remaining French desktop Trails pair was visually
reviewed without a layout defect. Two additional inspected Arabic sheets cover
Source, Note, Read and Search at all four viewport/text combinations, using
the current full-suite screenshots under `output/arabic/`.

No horizontal clipping, obscured controls or missing glyphs was observed in
these samples. At 200% on phones, long headings and words can wrap over many
lines; ordinary scrolling keeps the complete content reachable. Focus outlines
in the captures are the intended keyboard orientation. Enlarged screenshots
show viewport crops, not the whole long page. No product redesign was performed.

The new cases verify Language → Appearance → Text-size keyboard order and
reduced-motion state for all 16 locale/viewport/text combinations. Existing
suite journeys retain keyboard switching, source/return focus, history and
reflection checks. Twelve supplementary axe scans per base (three long-copy
surfaces in four locales at phone/100%) found zero WCAG 2 A/AA and 2.1 AA
violations, alongside the existing locale surface scans. Automated scans and
headless keyboard checks do not establish comprehensive accessibility.

Chromium's painted-font evidence uses bundled Noto Sans Arabic for Arabic,
Syne for French/Spanish headings, and Inter for Russian headings, with no OS
fallback in the sampled headings. Existing complete Arabic/Cyrillic tests also
check prose glyphs, source citations, bidi isolation and the real corpus.
The L12.1 Impeccable detector returned no findings for the seven changed views;
L12.2 changes no view styling or layout.

## Artifact, loading and rights

The final project-subpath artifact has **62 files, 8,570,917 uncompressed bytes**,
including exactly **40 distinct locale modules**: library, messages, sequence
and source context for every edition. The audit records each file's SHA-256,
size and JavaScript gzip size. The app entry is 61,934 gzip bytes (about
60.5 KiB). All ten fresh Atlas entries request exactly their active reading
library and locale message chunk, with no inactive reading library or eager
sequence/source-context request. Bootstrap English fallback/schema wording is
still part of the shared app; it is not an extra English reading library.

Vite reports the existing >500 kB warning for the Russian source-context
chunk (about 102 KiB gzip). It remains deferred until source/note navigation;
the complete content was retained and the warning was not suppressed. This is
a bounded loading result, not a network-speed guarantee or device benchmark.

All eleven emitted WOFF/WOFF2 assets match the pinned Fontsource dependency
files. The separately pinned Noto Arabic font is 844,676 bytes, SHA-256
`63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e`.
The source notice, six license/notice files and Arabic font are byte-identical
between `public/` and `dist/`; five dependency notices also match their installed
locked sources. The accepted Noto OFL text, including its whitespace, is
unchanged. Disposable-copy negative checks rejected both a modified NOTICE and
a synthetic locale chunk. No synthetic corpus ID/chunk or Org coordination
file exists in the shipped artifact. The English catalog's unused fixture-notice
message remains an intentional non-rendered key.

The notice now explicitly attributes all nine additional official editions.
Vatican source copyright, theme MIT and font OFL rights remain distinct; no
license for original code/commentary or official endorsement was invented.

## Evidence identity and publication limits

These are hashes of this local evidence snapshot; later reruns produce new
reports with new observation times. `output/release/evidence-index.json` records
the candidate's changed-file hashes, reports, logs and screenshots.

| Report | SHA-256 |
| --- | --- |
| `output/release/artifact-audit.json` | `6cdc9ecdb9ce343204afe458fa3dc4871703103f8d87cea09dc957eec9bb1639` |
| `output/release/hosting/root-browser-results.json` | `e6a4f9ed2f294d90a931d410503aea512551237d1d3ac65e0485b270586c934a` |
| `output/release/hosting/subpath-browser-results.json` | `1906457657fe8587484afa7b8d0057fe91090cf779626cbd58461cbf4f3823dc` |
| `output/release/rtl-browser-results.json` | `12332a13fc765428148e3830a4679fec76e0a92c6a99267cca39e8596bed84da` |

No physical-device, independent native-speaker, screen-reader or reader-learning
study was performed. Agent source comparison and automated/hash checks have
different evidential limits; neither certifies semantic perfection. Publication
of this multilingual candidate has not been verified. Its later release needs
reviewed commits, the authorized deployment workflow, and checks on the actual
published origin as described in [DEPLOYMENT](../docs/DEPLOYMENT.md).
