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
These source corpora provide inputs for future localized editorial content;
they do not themselves certify or enable a translated public experience.
