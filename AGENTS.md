# Working on Magnifica Humanitas

## Current stage

Complete local application with a verified source and editorial contract. Read
content/editorial/CONTRACT.md, research/ANALYSIS.md,
research/EXPERIENCE.md and research/DECISIONS.md before making product choices.
Do not treat proposed choices as owner decisions. The active plan is supplied
by the supervisor; use that exact workspace-local path and its state machine.
The current local reading includes English, Italian, German, Spanish, French,
Portuguese, Polish, Belarusian, Russian and Arabic. Local verification does not
establish that the multilingual revision has been published.

## Source and editorial fidelity

- Preserve the owner's source files at workspace root. Source paragraphs are
  numbered 1–245. Refer to paragraphs, not extraction line numbers or guessed
  web anchors.
- English retains its owner-PDF authority. Each additional language uses its
  frozen official Vatican HTML, local corpus and alignment/review records;
  never model-translate an official quotation or reuse English span offsets.
  Belarusian's linked PDF is English; Arabic HTML avoids PDF bidi artifacts.
  Preserve recorded edition defects and note differences rather than repairing
  frozen sources. Source contexts render independently of the main adaptation.
- The saved text has mojibake. PDF extraction is cleaner but has running
  headers, page breaks, footnotes and headings that need structural handling.
  A regex splitting on paragraph numbers alone is not a finished parser.
- Apply Humanizer's semantic preservation gate to adaptations: preserve
  agency, causal relationships, scope, qualifications, polarity and certainty.
- Remove prayers and liturgical formulas from the adapted experience as
  requested. Do not erase a theological premise, ethical argument or criticism
  of Church institutions merely because it uses religious language. Follow the
  owner's selected editorial policy once recorded.
- Label quotation, paraphrase, interpretation and invented scenario separately.
  Keep source references with every substantive explanation. Never fabricate
  quotations or merge several paragraphs into an apparent quotation.
- Do not present the source's normative positions or claims about AI
  consciousness as scientific consensus. Do not silently update historical or
  empirical claims. Any external context requires its own attribution and date.
- Every paragraph needs a coverage disposition and rationale; mixed passages
  need a record of which material was excluded. Full original text remains
  accessible through a clearly labelled external source link.
- Never make comprehension checks into tests of political or religious
  agreement. A reader may understand and disagree.

## Product and design

Use Impeccable for product context, design and bounded finish review. Write
PRODUCT.md after the decision interview; use Dyne vite-theme as visual authority.
Its documentation-site composition is not the layout for this product.

Use visible controls, normal scrolling, meaningful links and browser history.
Every visual relationship needs an equivalent text path. No swipe-only actions,
mandatory quizzes, infinite feeds, streak pressure, autoplay or engagement tracking.
Session endings and an easy return are part of the product.

## Implementation and verification

`npm test` runs the current content suite; `npm run source:check` verifies
deterministic source reconstruction and `npm run content:check` validates editorial
references, exact spans and relationship types. These are content checks, not UI
verification. Public adaptation must preserve the coverage ledger's qualifications
and separate exact quotation from paraphrase and interpretation.

Use the owner-confirmed Vite stack. Pin the theme to a reproducible revision;
a clean clone must not depend on a sibling checkout or unpublished registry package.
Keep core content authored and deterministic; do not substitute runtime generated
answers for the source-reviewed corpus.

Implement meaningful content-contract tests, route and persistence tests, and
production browser checks. Verify phone layouts, 200% text, keyboard navigation,
reduced motion and root/subpath deployment. Automated accessibility scans do
not prove accessibility. Record real checks and their limits.

Use Conventional Commits. During supervised Org execution, the supervisor
owns review acceptance and commits. Exclude generated files, credentials and
workspace coordination files from commits. Keep source attribution distinct
from the license selected for original code and commentary. A remote push or
site deployment requires a user-authorized destination.

## Contributor and release operations

Read docs/EDITORIAL.md and docs/CONTENT-SCHEMA.md before content changes.
Content JSON is authored input; virtual Vite modules and `dist/` are generated.
Keep stable IDs and preserve saved-location compatibility. After material prose
changes update the content revision, semantic review evidence and source anchors.
Never rewrite frozen source files to make a validator pass.

Install with `npm ci`; run `npm run check`, `npm run source:check` and
`npm run test:browser:all`. Python 3 and the matching Playwright Chromium binary
are required for those separate checks. Build/test does not require an external
PDF. The hosting runner rebuilds sequentially: do not run a concurrent build.
Document observable results and environment; automated checks do not establish
learning efficacy or comprehensive accessibility.

For multilingual release evidence, run `node scripts/audit-release.mjs dist`
after the production gates. It checks current content/review/source bindings,
the actual artifact's forty locale chunks, fonts and notices, with its default
generated report under `output/release/`. The shared language matrix and release
layout/loading checks run within the production browser suite. Retain the
isolated nonshipping RTL regression suite when changing activation or history;
its build requires `MAGNIFICA_RTL_FIXTURE=1 VITE_BASE=/` and `--mode locale-fixture`.
See verification/LANGUAGE-MATRIX.md and verification/MULTILINGUAL-RELEASE.md.
Historical pending-review fields in accepted records are not current workflow
state. Do not rewrite them or claim native-speaker proofreading from hashes.

docs/ATTRIBUTION.md and public/NOTICE.txt keep source copyright, theme MIT and
font OFL notices separate. No license for original code/commentary has been
selected in this repository; do not invent one or apply dependency licenses to
the Vatican source. Retain public/licenses in every static artifact.

The authorized destination is dyne/magnifica-humanitas. Pages deploys automatically
on pushes to main after the workflow's source, build and browser checks pass.
Manual reruns must also select main. Follow docs/DEPLOYMENT.md and verify the
actual published URL after deployment. Do not claim publication from local
preview evidence.
