# An atlas that teaches relationships

The owner selected an interactive concept atlas as the primary experience,
English first, with secular main paths. This document proposes mechanisms to
evaluate and implement; it does not claim they have already succeeded with
this audience.

## The navigation problem

A table of contents preserves document order but makes a new reader supply the
motivation and connections. A full graph exposes connections but can make the
reader decode a dense picture before understanding a single idea. The atlas
needs both orientation and a clear first action.

Proposed opening: a compact set of named conceptual regions, expressed through
human questions and plain labels. A selected concept reveals a focused
neighborhood. Each connection states what it does: **depends on**, **applies
to**, **qualifies**, **puts in tension**, or **provides a test for**. These are
editorial relationship types backed by paragraph references.

The map should not invent a numerical distance between ideas. Node size should
not imply importance unless its meaning is explicit. Color groups concepts but
is never their only identifier. Avoid a constantly moving force simulation.

On a phone, begin with the selected concept and a small set of legible related
concepts, followed by an ordinary scrollable reading surface. Offer an equivalent
relationship list. The larger atlas remains available for orientation. Desktop
can show the overview and selected reading pane together. The exact arrangement
will be chosen through Impeccable's surface process.

## Evidence and what it does not prove

### Progressive disclosure

Keep the first explanation complete enough to be useful, then offer deeper
reasoning and source context. Controls must describe what they reveal. Avoid
repeated nesting: the reader should not open an accordion inside an accordion
to reach a qualification that changes the claim. This follows established
[progressive-disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/).
The recommendation is about managing complexity; it is not evidence that a
particular graph layout improves learning.

### Recognition in navigation

Show related concepts and the recent path with readable labels, rather than
requiring readers to remember where a term appeared. Familiar words, visible
choices and a clear return path reduce recall demands in navigation. This
applies [recognition-over-recall guidance](https://www.nngroup.com/articles/recognition-and-recall/).

### Recall in learning

Navigation should be easy to recognize, while an optional learning prompt can
ask a reader to retrieve an idea before revealing an explanation. These are
different tasks. Retrieval with feedback has a substantial research basis;
it does not mean compulsory quizzes, points or repetitive tapping teach a
philosophical argument. See the researchers' guidance on
[retrieval and feedback](https://www.retrievalpractice.org/feedback/) and the
[review of classroom evidence](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2019.00005/full).
Transfer to this voluntary reading context remains a hypothesis to test.

### Accessible reflow

Ordinary prose and controls must remain usable when enlarged and on narrow
screens. A spatial overview cannot be the only means of navigating the
material. The implementation should meet the applicable
[WCAG reflow criterion](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
and include manual keyboard and reading-order review.

These techniques are selected for the task, not because they are new. The
modern contribution is their coherent implementation around this corpus.

## The depth model

Every concept has a stable URL and these content roles:

1. **The idea:** a short opening that preserves the claim's conditions.
2. **The reasoning:** connected prose explaining premises and implications;
   the reader can continue normally without a reveal after every paragraph.
3. **A necessary distinction:** what the claim should not be confused with.
4. **Connections:** a small set of named relationships, with explanatory links.
5. **Source and foundations:** paragraph references, source context, footnotes
   and optional theological premises, clearly separated from editorial prose.

These are roles, not five mandatory nested panels. Primary reasoning remains
visible. Ancillary context opens one level away and returns to the same position.
A “read continuously” option avoids forcing long-form readers through cards.

## Proposed interactions

| Mechanism | What the reader learns or gains | Constraint |
| --- | --- | --- |
| Follow a named relationship | Why two concepts belong together | Every edge has explanatory copy and source evidence |
| Compare meanings | How a term changes with context | Preserve full definitions, not just opposing slogans |
| Trace a decision | Where choices and responsibility enter a process | Label illustrative scenarios; do not invent outcome probabilities |
| Reveal a qualification | Where an appealing generalization stops working | Do not hide a qualification needed to understand the opening claim |
| Try a transfer question | Whether a distinction applies in another situation | Optional, with feedback; never a score for agreeing with the author |
| Resume a saved place | Continuity after interruption | Store locally, tolerate failure, provide reset and clear state labels |
| Inspect source context | Whether the explanation is faithful | Stable paragraph IDs; no guessed external deep-link anchors |

Entertainment should come from discovery: noticing an unexpected link, testing
an assumption or seeing the consequences of a changed premise. Motion can
show where a concept went as the atlas refocuses. It should stop once orientation
is achieved and disappear under reduced motion. No countdowns, streaks,
unearned badges, mystery rewards, locked chapters or endless feeds.

## Worked journey: an efficient decision

**Entry node: Accountability.** Opening question: “If a system rejects your
application, who must answer for the decision?”

The scenario is explicitly fictional: an employer uses an automated system
to filter applications. Do not add invented accuracy rates, medical information,
or a claim that a named company does this.

**First view:** the decision is fast, but speed does not establish whether its
criteria are fair or whether someone can challenge a mistake. The encyclical
locates responsibility throughout design and use (§§104–105).

**Trace the chain:** choose among visible steps—setting objectives, choosing
data, approving deployment, acting on the result and providing recourse. Each
reveals the corresponding responsibility. This is an explanatory diagram,
not a simulation that pretends to calculate justice.

**Follow “depends on”: Human dignity.** The deeper argument is that a person
cannot be reduced to a profile whose classification ends all possibility of
response (§§50–58, 102–105, 164). The source's theological grounding is available
in the foundations layer; the secular main path explains unconditional worth.

**Follow “is strengthened by”: Participation.** An appeal after rejection
matters, but communities also need a say before the system's priorities are
fixed (§§71–72, 107, 109).

**Optional reflection:** “A company adds an appeal form but keeps the model's
objectives beyond discussion. Which part of the argument remains unanswered?”

Feedback explains the difference between recourse and meaningful participation.
It does not say the appeal form is useless, nor treat either safeguard as a
complete solution. Include a link back to the relevant passages.

**A real ending:** “You explored accountability, dignity and participation.”
Offer save, return to the atlas, or the related question of who owns the data.
Do not claim the reader mastered these subjects from a few interactions.

## Information architecture and content model proposal

Use language-independent IDs for `concept`, `relation`, `trail`, `sourceParagraph`
and `reflection`. English display names and slugs must not be primary keys.

- `SourceEdition`: language, document URL/date, local input hashes, extraction
  method, paragraph and footnote mapping, verified differences.
- `SourceParagraph`: stable number, chapter/section, original text and references.
- `EditorialDisposition`: paragraph ID, retained/adapted/context/omitted material,
  reasons, associated concepts and reviewer status.
- `Concept`: localized title, question, explanation, distinctions, source IDs,
  optional foundation, associated reflection and relationships.
- `Relation`: endpoints, explicit type, direction where relevant, localized
  explanation and source IDs. An editorial relation is identified as such.
- `Trail`: ordered concept steps plus a named purpose, transitions and end state.
- `Reflection`: prompt, response format, explanation, relevant sources and
  whether it checks recall, distinction or transfer.
- `ReadingState`: schema/content version, recent location and saved IDs. It
  records visited/saved places, not inferred belief or mastery.

Translation must start from each language's official source. Reuse concept IDs
and verify paragraph alignment. Review the adapted wording against that edition,
including important differences. An unavailable translation is visibly
unavailable; do not silently mix languages or fake completeness.

Proposed routes: `/en/atlas`, `/en/concepts/:slug`, `/en/trails/:slug`,
`/en/read`, `/en/source/:paragraph`, `/en/saved`, and `/en/about`.
Root chooses the shipped English edition; no empty language menu. The final
router must support a static host and configurable base path. Hash routing or
generated route documents is an explicit implementation choice, not a reliance
on an unconfigured server fallback.

## Evaluation before claims

Engineering gates can be checked without inventing users: complete source
coverage, valid links, keyboard access, route refresh, state restoration,
empty/error behavior, text enlargement, motion preferences and measured load.

A proposed later reader study should ask participants to find a personally
relevant concept, explain a distinction, follow a relationship, inspect a source
and resume after interruption. Observe wrong turns and whether people notice
that the source and commentary differ. Do not treat session duration as success.
Recruitment and scheduling are not yet arranged, and the site must not claim
measured learning benefits until such evidence exists.

Proposed initial performance budgets are engineering targets, not measured
results: initial app JS at most 150 KiB gzip excluding lazily loaded source data;
no render-blocking third-party fonts; no animation loop when idle; avoid eagerly
rendering the whole corpus or a graph larger than the active neighborhood.
Measure a production build under a documented mobile network/CPU profile and
review deviations explicitly. Do not trade content fidelity for a bundle target.
