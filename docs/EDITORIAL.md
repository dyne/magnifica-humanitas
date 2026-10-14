# Edit without losing the argument

Begin with [the editorial contract](../content/editorial/CONTRACT.md), the
paragraph's coverage record, [schema](CONTENT-SCHEMA.md), and the accepted
[semantic comparison](../content/reading/SEMANTIC-REVIEW.md) or
[trail comparison](../content/reading/TRAIL-REVIEW.md). Identify the source
paragraph, existing public block and reason for the change before editing.

1. Compare the complete source paragraph and relevant notes, not just a selected
   quotation. Record facts, agency, causal relationships, polarity, certainty,
   conditions, exceptions and scope that must survive.
2. Make the lightest useful change in the appropriate authored JSON. Keep source
   quotations, paraphrases, editorial interpretations and fictional scenarios
   visibly separate. Every substantive explanation needs source references.
3. Preserve required qualifications in the opening sequence. Attribute normative
   positions and anthropological claims to the author. Do not certify doctrine
   as scientific consensus or silently modernize empirical/historical claims.
4. Remove only recorded prayers/liturgical forms from adapted prose. Retain
   theological premises as optional attributed context and preserve institutional
   criticism. Exact excluded spans cannot be spliced into a new quotation.
5. Compare the candidate against the meaning map; revert any change to agency,
   certainty, polarity, condition, scope or material nuance. Update the relevant
   semantic-review record and public `revision` for a material change. Recompute
   trail estimates if displayed word counts changed.
6. Run content/source checks, unit tests and production browser journeys. Have
   the supervisor review the intended diff before acceptance. Test success alone
   does not constitute semantic review or a reader study.

To verify editing mechanics in a disposable copy, add a temporary word to the
title of `readingSequence[0]` in `content/reading/en.json`, run
`npm run content:check` and `npm test`, then restore the file and validate again.
This tests authoring/validation plumbing, not an editorial approval. Do not
ship a sample title or arbitrary rewrite.

For new concepts or relations, update the editorial model and public library
together, supply legitimate source anchors and assess corpus reachability.
Keep existing stable IDs. New trails must have finite endings and optional,
source-backed reflection. A reader can skip, stop, disagree and return; never
score religious or political agreement, infer mastery from visits or lock content.

For another language, start from its official translation and source manifest.
Verify paragraph/footnote alignment and differences; review adaptations against
that edition. Translated labels must not alter stable identities or silently mix
English source and another language's interpretation. Revisit font subsets,
layout and actual language-specific browser cases.

Re-ingestion is a separate operation with an explicitly supplied matching owner
PDF, Poppler version and checksum, documented in
[content/source/README.md](../content/source/README.md). Normal installation and
deployment use frozen repository inputs. Never mutate source text or weaken
validators to make an adaptation pass.
