# Authored English reading library

`en.json` contains 27 concepts, all 44 accepted directed relationships, 245
individually authored paragraph contexts, and a source-ordered adaptation of
every coverage disposition. Six finite question-led trails include source-backed transitions, qualifications,
related next paths and optional reflection with explanatory feedback.
This content is authored from the frozen English source, not generated at
runtime and not a copy of the editorial model presented as a finished library.

Concepts retain accepted definitions, distinctions, source quotation and stable
IDs. New reasoning explains premises, consequences and limits in connected
prose. Existing reasoning IDs remain usable. Relationships keep their exact
accepted types, endpoints, direction, attribution and evidence. The optional
`faith-foundations` concept explains the source's own religious justification;
it is not an agreement requirement or a replacement secular proof.

## Continuous reading data for L5

`readingSequence` is in original paragraph order. Stable `read-pNNN` IDs must
survive wording changes. Every entry has a title, its own `sourceRefs`, a
reviewed `contextId`, accepted `conceptIds`, and an explicit placement:

- `main` has its own labelled `explanation`. Mixed passages have separately
  authored secular main prose and full, attributed source context. Main prose
  identifies the source's premises without asking readers to profess them.
- `optional-context` has a labelled `contextLinkLabel` to the reviewed context
  at that exact source position. It must not vanish from the continuous route
  or have its religious/historical material injected into main prose.
- `foundationContextId` points to the full paragraph explanation wherever the
  ledger records faith premises, including premises not exhausted by a brief
  concept foundation. No context route contains a performed devotional formula.

The 42 context entries remain reachable at their source positions; 203 main
entries contain adapted prose. This data completes the mapping contract.
Rendering this sequence, atlas regions, search and fuller trail interactions
belongs to L5. The existing reader can already open every concept, relation,
paragraph context, foundation and source note by its stable destination.

## Source context and notes

The build-time lazy index includes all 245 reviewed contexts with original
paragraph numbers, PDF pages, source hashes, source-note links, editorial
placement and exclusion counts. It never injects raw paragraph bodies or joins
fragments into quotations. The only published paragraph quotation remains the
accepted contiguous §52 span.

All 224 source notes were screened. `reviewedNotes` explicitly binds each to
its frozen source hash and identifies citation-only notes versus notes that
include an argument (`n132`, `n174`, `n175`, `n182`). Religious document titles,
historical references to prayer and institutional requests for pardon are not
prayers performed for the reader. Notes remain exact source text with backlinks;
L5 should use their classification when labelling note types. Source errors
and edition differences are not silently corrected.

The validator rejects incomplete libraries, inaccessible references, missing
premises, changed accepted distinctions/relationships, reordered coverage,
spliced quotations, stale note reviews and excluded performed forms. The
location-specific §241 connective `prayer and` is checked in its source scope;
it is not a global prayer-word blacklist, which would reject the accepted
model's explanation and Benedict's historical example. Full prayer, blessing
and response spans remain checked across all public prose.

## Verification and limits

Run `npm run content:check` and
`node --test tests/concept-library.test.mjs tests/reading-content.test.mjs`.
Regression cases protect completeness, placement, exact note evidence and
important semantic anchors. Machine checks cannot prove the fidelity of new
prose: comparison with the complete source and Humanizer's gate remains
necessary. SEMANTIC-REVIEW.md records this writer's comparison for root review.

Production checks exercise all concept deep links, contexts and notes at root
and project-subpath hosting alongside existing return, history, keyboard,
enlarged-text and reduced-motion checks. No reader study or comprehensive
accessibility claim is made. Changes remain uncommitted through root review.

## Six authored trails and L5 presentation

Every trail has a stable question, source-backed `introduction`, `qualification`,
finite `steps`, `ending`, `relatedTrailIds` and `optionalConceptIds`. Existing
`worth-not-reward`, `intrinsic-worth` and `rights-in-practice` IDs survive the
expansion from two to five steps. The six paths follow the research questions
about worth, AI purposes, work, judgment, justice and peace. No theological
foundation is a required trail step.

`reflection` has a stable ID, retrieval/transfer kind, `optional: true` and a
`think-then-reveal` format. Prompt and feedback are separately source-linked
editorial interpretations. Fictional situations have a separate
`editorial-scenario` body beginning with an explicit fictional label. No response
or agreement score is part of the data, and nothing requires an answer to
unlock a step. L5 renders the optional reveal; it must not persist answers.

`readingEstimate` is explicitly an estimate. Its words count includes the
introduction, qualification, every step's full concept definition/distinction/
reasoning and visible relationship explanations, transitions, ending and
optional prompt/scenario/feedback. A concept's prose is counted each time the
step shows it. Navigation labels, source pages and optional foundation detours
are excluded. At an openly assumed 200 words per minute, minutes are rounded
up; actual reading and reflection time varies. L5 must update the estimate
method if it changes what a trail renders, rather than leaving a stale number.

`tests/trails-content.test.mjs` validates source and destination reachability,
finite identities, preserved distinctions, explicit fictional attribution,
optional unscored reflection and estimates changing with displayed prose.
Production trail tests open every step and ending through ordinary skip links.
The existing views show the authored steps and transitions; L5 still owns the
new qualification, estimate, companion-path and optional-reflection surfaces.
TRAIL-REVIEW.md records the source comparison and its limits.
