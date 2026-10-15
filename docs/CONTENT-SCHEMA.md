# Content schema and stable identity

The validators are executable contracts; TypeScript interfaces document shapes.
Read `content/editorial/types.d.ts`, `content/source/types.d.ts` and
`src/reading-types.ts` alongside `scripts/validate-editorial.mjs` and
`scripts/reading-content.mjs`. The latter checks the authored public library and
builds source context; runtime interfaces alone are not full schema validation.

| Input | Responsibility |
| --- | --- |
| `content/source/en/corpus.json` | Frozen edition, 245 source paragraphs and 224 notes, text, page provenance, headings, hashes and backlinks |
| `content/editorial/coverage.json` | Exactly one disposition/rationale per paragraph, protected spans, necessary qualifications, faith premises and exact mixed exclusions |
| `content/editorial/concepts.json` | 27 stable concept definitions, distinctions, foundations and exact quotation coordinates |
| `content/editorial/relations.json` | 44 stable, directed, typed relations with grounded explanations and main/optional placement |
| `content/reading/en.json` | Reviewed public concepts, reasoning, relations, source explanations, notes, six trails and the 245-entry source-ordered sequence |
| `design/journeys.json` | Contracted routes and real-source walkthrough anchors |

Source identities are `p001`–`p245` and `n001`–`n224`. Concept, relation,
trail, step, reflection and prose-block IDs are independent of translated titles.
Never recycle or renumber an ID. Paragraph numbers, not PDF extraction line
numbers, are citation identities. Every future locale gets an edition manifest
and reviewed paragraph alignment, rather than silently reusing English prose.

An editorial prose block has `kind`, `text` and nonempty `sourceRefs`.
Allowed kinds depend on placement: `paraphrase`, `editorial-interpretation`,
`editorial-instruction` and source annotations are different contracts. A
quotation additionally has `paragraphId`, `start`, `end` and `text`; coordinates
are UTF-16 offsets into the unchanged corpus, with exclusive `end`. The exact
substring must match. Never concatenate fragments into an apparent quotation.

Coverage dispositions are `retain`, `adapt`, `context` and `omit-devotional`.
No current paragraph is wholly omitted: mixed devotional forms have exact
exclusions and preservation instructions. `sourceSha256` binds each decision
to its source body. Historical/theological context retains thought outside the
secular primary path, with a reachable labelled destination.

Exclusion `scope` describes grammatical form. Optional `matchScope` separately
controls matching reach: absent or `global` rejects the exact form everywhere;
`source-location` rejects it in authored blocks citing the excluded paragraph
and source notes linked to that paragraph. Unknown, empty or invalid location
references fail closed. Only reviewed incomplete clause fragments may use
`source-location`; a `clause` scope alone does not authorize it. Complete
invocations, blessings and responses remain global. This lets an unrelated
bibliographic title contain an ordinary fragment without treating the title as
a performed prayer. Exact source offsets, hashes and quotation/exclusion
intersection checks always apply, regardless of matching reach.

Relation types: `grounds`, `requires`, `supports`, `qualifies`, `applies-to`,
`puts-in-tension`, `provides-test-for`, `provides-source-foundation-for` and
`has-source-foundation-in`. `from`/`to` must exist and retain direction;
placement is `main` or `optional-foundations`. An editorial relation is not a
quotation or empirical causal finding.

Each public concept has a definition, necessary distinction and reasoning;
foundations remain optional and attributed. `contexts` cover every paragraph.
`readingSequence` preserves source order: 203 main entries and 42 optional-context
entries with no missing positions. `reviewedNotes` identifies bibliographic
versus argument-and-citation notes and binds review to source hashes.

Trails have finite ordered steps, transitions, a visible qualification, an ending,
related paths and optional reflection. Reflection uses labelled source-grounded
explanation; fictional scenarios carry `editorial-scenario` and no invented
evidence. Reading estimates count rendered authored prose at an assumed 200
words/minute, rounded up; they are estimates, not measured reading times.
Recompute with exported `estimateTrailReading()` after relevant edits.

`schemaVersion` describes data shape; `revision` identifies public content for
local saved-state compatibility. Material content revisions require renewed
semantic review and a deliberate revision change. Coverage's historical
`pending-supervisor-review` field is not public evidence of acceptance; milestone
review and the semantic-review documents provide that evidence.

Validation commands:

```sh
npm run source:check
npm run content:check
npm test
npm run typecheck
npm run build
npm run test:browser:all
```

Source ingestion is deterministic from repository snapshots. It is not a
runtime generation step; see [source reproduction](../content/source/README.md).
Tests reject missing coverage, stale hashes, changed exact spans, dangling
identities, excluded forms, lost protected arguments and incomplete trails.
They cannot independently prove semantic fidelity; compare prose with the
source using the [editorial workflow](EDITORIAL.md).

The nine additional official editions live in `content/source/<locale>/` for
`ar`, `be` (Belarusian), `de`, `es`, `fr`, `it`, `pl`, `pt` and `ru`.
Each has its own frozen HTML/PDF provenance manifest, reviewed structural block
inventory, complete corpus, explicit paragraph/note alignment and boundary
verification. English files retain their existing authority and shape.
`OfficialSourceCorpus` in `content/source/types.d.ts` adds source block/link
metadata, complete ancillary records and UTF-16 note-reference coordinates.
HTML editions have empty `pages` arrays; source block IDs supply provenance.
Local heading IDs and section contexts belong to the edition; alignment to
English chapter-heading groups does not imply identical heading block counts.
All ten editions now have complete public readings and interface catalogs.
The source corpora alone do not certify or enable a translated experience;
the local editorial models and review records remain separate requirements.

## Localized authoring and publication

`content/messages/en.json` is the complete interface key schema. Every localized
`content/messages/<locale>.json` must contain exactly those nonempty keys, with
identical named-placeholder occurrences. `src/messages.ts` checks keys at compile
time; `validateMessages()` rejects missing/extra keys and placeholder differences
at build time. Values are rendered as text, never translated HTML. Several
messages surround semantic inline elements, so preserve their sentence context.
The catalog includes About, region questions, route titles, source attribution,
accessibility labels, failure/retry text, saved-state notices and search labels.
Reading estimates and other authored content metadata stay in the reading JSON.

A new edition supplies `content/reading/<locale>.json` and
`content/editorial/<locale>/{coverage,concepts,relations}.json`, based on its
frozen `content/source/<locale>/corpus.json`. Editorial `language`, concept
`locale`, reading `locale` and every `editionId` must match that edition. Quote
coordinates, coverage hashes, exact exclusions and note reviews belong to its
own source. The original English paths and revision contract are unchanged.
Non-English readings with fictional scenarios also supply
`localeMetadata.scenarioPrefix`: the translated visible fictional attribution
that each scenario must begin with. Optional-context link labels, trail questions,
estimate labels and estimate-method descriptions must be authored in that locale.
Reviewed notes may supply `previousNoteId` for a preceding bibliographic context;
this avoids recognizing a translated abbreviation through an English regex.

Stable concept, reasoning-block, relation/endpoint/type, trail/step/reflection
and sequential identities remain aligned with English. Translated display text
never becomes identity. Both editorial and public validators run before Vite
publishes any bundle. A source snapshot alone never makes a locale available:
`scripts/locales.mjs` additionally requires complete reading, messages and review
flags. Enable those flags only after the locale milestone's fidelity and interface
review; do not insert English placeholder bundles to satisfy a gate.

Vite emits distinct lazy library, sequence, context and message modules for each
published locale. Only the active library is needed at entry; sequence/context
remain deferred until their routes need them. Cache keys include both locale
and resource. A rejected request is evicted for retry without disturbing another
locale; a superseded activation cannot publish content or failure state. UI
instances remount per active locale and invalidate unfinished view requests.

Browser language is resolved afresh for neutral entries. Explicit locale links
win; a selector change must use equivalent stable routes, retain query/anchor
state and discard old caller labels. No saved preference changes the next neutral
entry's browser default. Search uses the active catalog, locale casing/sorting,
localized paragraph keyword and digit recognition; numeric UI values use `Intl`.

English device storage retains `mh-reading-v1`, schema 1 and its existing
revision migration. Other editions use `mh-reading-v1-<locale>` with their own
edition/revision, isolating progress and unavailable destinations. Navigation
and saved URLs are generated for the active locale; stored places retain stable
identities and never store localized labels. Storage does not select a language.
Failed writes retain a separate temporary snapshot for each edition in the
current tab, including after switching away and back. Successful retry persists
that snapshot; clearing discards its saved/recent/visited state. Temporary
snapshots do not survive a page reload. Supported locale prefixes also govern
unknown-route errors, where the catch-all route has no `:locale` parameter.

Each non-English edition has `alignment-review.json`, `semantic-review.json`
and `interface-review.json` under its editorial directory. The records bind
source HTML, editorial inputs, public reading/revision and message catalog by
hash. Their historical pending-status text is not live acceptance state.
English retains its Markdown semantic/trail review documents and original
schema. `scripts/audit-release.mjs` validates all ten current models, checks
these bindings and inventories the built artifact; its JSON output is generated
evidence, not authored content or proof of semantic fidelity.
