# Source-faithful editorial contract

This is a coverage and authoring contract for all 245 paragraphs of the owner's
English edition. It is not the complete public adaptation, a new translation of
the encyclical, or a statement that the site adopts every source position.
The source remains attributed to Leo XIV, *Magnifica Humanitas*, 15 May 2026,
with its separate Vatican copyright notice in `../source/README.md`.
Original editorial decisions and code must not be represented as source text.

The owner selected English first, secular main paths, optional clearly labelled
theological foundations, and removal of prayers and liturgical formulas.
Readers may understand the source and disagree with its premises or conclusions.
For any future language, begin from its official translation and verify paragraph
alignment and relevant differences. Do not merely translate the English adaptation.
Keep paragraph, concept and relation IDs stable; localized titles and route slugs
are display/navigation fields, not replacements for those identities.

## Coverage and placement

`coverage.json` records one disposition and an individually written rationale
for every paragraph. `sourceSha256` binds the decision to the actual source body,
so changed source text requires renewed review. All records cite their own source
paragraph and have concept associations. `authority` names the document and author;
a source claim is never silently certified as scientific consensus.

- **retain:** Preserve the argument and its qualifications in the main reading
  path. This does not mean copy the whole original paragraph or leave its source
  voice and religious motivation unlabelled.
- **adapt:** Re-express the argument with explicit attribution, intelligible
  distinctions and appropriate placement of premises. Excluded forms, when any,
  are separately identified; this category grants no blanket deletion license.
- **context:** Keep the material accessible as source-linked history, theological
  foundations or another labelled explanation rather than primary secular prose.
  Context is retained thought, not an omission or a completeness gap.
- **omit-devotional:** Omit only a genuinely wholly devotional paragraph from
  adapted prose, with an exact reason and source record. None of the current 245
  paragraphs is assigned this category: even the devotional conclusion contains
  arguments, premises, narrative or practical commitments. Mixed paragraphs use
  `adapt` or `context` with precise exclusions instead.

The parser's original source corpus is unchanged. Full source access through the
[official document](https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html)
remains clearly distinguished from the adapted experience.

## Exclusions are forms with surrounding thought

Eighteen individually reviewed spans identify prayer, blessing, liturgical
response, devotional acclamation or ceremonial address. Each has exact source
coordinates, its sentence context, a specific reason and a `preserve` instruction.
Offsets are UTF-16 indices into the frozen corpus body, with an exclusive end.
Sentence contexts provide review boundaries; source abbreviations and quotations
may produce several adjacent contexts. Exact offsets are authoritative.

A mixed sentence may contain an excluded prayer clause and a required practical
claim. Preserve the claim through a faithful, separately labelled paraphrase;
never produce an apparent quotation by concatenating the surviving fragments.
The unarmed, persevering ideal of peace in §228 remains an ethical claim even
though its repeated blessing is excluded. Sacramental membership and its social
consequences in §§234–235 remain theological arguments even when recited responses
are excluded. Source passages named in `protectedSpans` must not be removed.

These decisions were made by function and context, not by a prayer-word blacklist.
Nehemiah's reported prayer (§§8, 241), the prayers named in Frankl's testimony
(§121), Benedict's historical prayer/work relationship (§148), titles such as
Blessed (§125), and the institutional request for pardon (§176) are not prayers
performed for the adapted reader. Generic calls to invoke ethics (§§106, 173, 199)
and figurative faith in markets (§201) are not devotional material.

`faithPremises` identify source claims with exact quotation anchors and a stated
interpretation. `contextSpans` mark optional-foundations placement of those
anchors. They are review annotations, not an automatic text-slicing algorithm
or authorization to publish every remaining sentence. L4 must preserve the
complete argument and its additional premises from the cited paragraph.

## Meaning that must survive adaptation

Apply Humanizer's semantic-preservation gate before clarity or cadence edits:
keep facts, agency, causal and conditional relations, polarity, scope, uncertainty,
exceptions, meaningful ambiguity, voice and attributions. Use the lightest useful
change. Reject or soften a candidate that changes meaning; no stylistic benefit
can compensate for a lost qualification.

Necessary qualifications have explicit authoring instructions. Particularly:

- Four meanings of dignity (§52) must remain separate. Intrinsic worth cannot
  fall with moral failure, social exclusion or loss of felt worth.
- Property has a recognized right and a social limit (§66). Subsidiarity requires
  support and wider safeguards, and explicitly rejects State withdrawal (§§68–72).
- AI's effective capabilities coexist with the author's categorical claims about
  experience and conscience (§99). Attribute those claims and the fast-changing,
  limited treatment (§§97–98); do not label them scientific consensus.
- Diverse enhancement/posthumanist currents are not one extreme program (§116).
  Relieving suffering is explicitly right (§118). Acceptance of finitude does
  not imply refusal of care; grace (§§127–128) is not technical self-enhancement.
- Work expresses dignity without conferring intrinsic worth. Emergency aid can
  be necessary, relief from dangerous tasks is desirable, transitions differ,
  and participation must survive unemployment (§§149–154).
- The source's family definition (§165) and abortion/euthanasia positions (§55)
  remain visible with attribution. Do not silently broaden their scope, remove
  them to achieve secular tone, or require a reader's agreement.
- Internal Church duties (§§86–89), journalists and abuse (§138), slave ownership,
  legitimation, delayed condemnation, pardon and present prevention (§§176–179)
  stay explicit. Caution against anachronism does not cancel admitted complicity.
- Last-resort legitimate self-defense, non-delegation of lethal decisions,
  possible values work, accountable chains, judgment time, civilians and effective
  human control all matter (§§197–200). A nominal human button is insufficient.
- Keep practical peacebuilding (§228), vulnerable people (§231), action rather
  than spiritual retreat (§236), concrete care (§239), hidden labor (§240), and
  everyday sharing (§245). §244's sufferers, widows, orphans, strangers, wounded
  children, exiles and fugitives remain in the main argument.

The ledger's instructions do not replace source reading when authoring public
prose. Adjacent paragraphs and note references may contain necessary context.
No unmarked external scientific, legal, historical or clinical update is permitted;
new context needs its own attribution and date, and must be distinguished from
the saved source edition.

## Concepts, relationships and quotation kinds

`concepts.json` establishes 27 stable concepts with sourced definitions and
necessary distinctions. Definitions are labelled **paraphrase**; distinctions
are **editorial interpretation**. The exact source quotation example is stored
separately with paragraph and offsets. These are content-model definitions for
later authoring, not the complete public explanation library or trail prose.

`relations.json` contains 44 directed relations. Every relation names endpoints,
a semantic type, an explanation labelled **editorial interpretation**, and source
paragraphs. The connection is an editorial reading of the source's reasoning;
it is not a source quotation, a statistical association or a numerical distance.
Foundation relations remain optional. Other types include grounds, requires,
supports, qualifies, applies-to, puts-in-tension and provides-test-for.

Public content must label quotation, paraphrase, interpretation and any later
invented scenario separately. A quotation is one exact contiguous source span;
never merge paragraphs or silently remove clauses inside a quoted sentence.
Paraphrase carries source references while keeping scope and epistemic strength.
An illustrative scenario must be explicitly fictional and must not fabricate a
quotation, named event, measurement or probability. This milestone includes no
scenario content.

## Validation and limits

```sh
node --test tests/editorial.test.mjs
npm run content:check
```

The focused checks enforce complete coverage, distinct rationales, source hashes,
valid references and endpoints, typed relationships, exact quote/exclusion spans,
sentence contexts, source/editorial labels, optional foundations, protected
argument boundaries and regression cases for malformed content. They also reject
invented or spliced quotations and wholesale omissions of protected mixed passages.

These checks establish a structural contract and preserve review anchors. They
do not prove that an adaptation is semantically faithful, establish a scientific
consensus, measure reader understanding or verify any UI. Public prose still needs
L4 fidelity review; rendering, navigation and accessibility belong to later work.
`reviewStatus: pending-supervisor-review` does not claim that those later products
or this L1 have been accepted. After L1 review, its acceptance is recorded through
the workflow; published prose needs its own review evidence.
