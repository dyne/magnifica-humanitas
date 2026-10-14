# Reading and navigation contract

Development specification for L2.1, not a running interface or public adaptation.
Owner choices are recorded in PRODUCT.md and research/DECISIONS.md. The detailed
route, state and failure rules below resolve implementation within those choices.
The surface composition is the separate L2.2 decision. Existing editorial JSON
is a model for authoring; it must not be shipped as a substitute for L4 prose.

## Entry and destinations

Root redirects, with history replacement, to `/en/atlas`. English is the only
shipped locale initially; do not display an empty language selector. The atlas
offers named concepts immediately, plus a visible relationship-list alternative.
There is no introductory gate, forced tutorial or randomly selected starting node.
The default overview has no selected concept. Concept selection is a real link.

Global navigation: Atlas, Search, Trails, Read continuously, Saved, About.
Appearance controls follow the navigation. On phones a labelled Menu button
may disclose those links once, with expanded state and Escape/focus return;
the page's concept links remain available without opening it. Desktop can expose
the same links. The final composition does not change their destinations.

| Route inside the hash | Purpose and primary action | Failure/empty state |
| --- | --- | --- |
| `/en/atlas` | Select a concept; switch between map and equivalent list | No matches to a filter: clear filter and show all concepts |
| `/en/concepts/:conceptId` | Read idea, reasoning, necessary distinction and labelled connections; save or follow a relationship | Unknown ID: unavailable-link view, Atlas/Search links; no arbitrary substitution |
| `/en/relations/:relationId` | Read the direction, explanation and evidence; open either named endpoint | Unknown ID: unavailable-link view |
| `/en/search?q=…` | Submit a term and open a concept, trail or adapted reading block | Empty query: instructions and all-concepts link; no matches: edit query/clear/search atlas |
| `/en/trails` | Choose a finite question-led trail | No published trails: explanation and Atlas link, no placeholder task |
| `/en/trails/:trailId/steps/:stepId` | Read step, previous/next/skip, inspect sources or leave for full concept | Invalid trail or step: unavailable-link view; never jump to unrelated step |
| `/en/trails/:trailId/end` | See places explored; save current place, restart or return to atlas | No progress: describe trail rather than imply completion |
| `/en/read?at=:blockId` | Scroll through the complete adapted sequence, including labelled context links; save place | Unknown block: explain and offer start, do not pretend restoration succeeded |
| `/en/source/:paragraphId` | Verify source-linked context, edition, paragraph/page and notes; return to invoking block | Invalid paragraph: unavailable-link view |
| `/en/notes/:noteId` | Read exact source note with attribution and referring-paragraph links | Invalid note: unavailable-link view |
| `/en/foundations/:conceptId` | Read optional, attributed theological reasoning; return to concept | No foundation: say so with concept link, not invented content |
| `/en/saved` | Resume last place; open/remove bookmarks; clear local data | Empty: “No saved places yet” with Atlas/Read links |
| `/en/about` | Source, adaptation method, coverage, exclusions, edition differences and local-data policy | Official source unavailable: local provenance remains accessible |

No localized slug is an identity. Concept `dignity`, relation `rel-002`, source
`p052` and note `n001` are current corpus IDs. Trails, steps, reflections and
adapted blocks receive stable IDs during L4 authoring; do not derive them from
array indexes, translated titles or presentational headings. The first release
may use English-looking opaque IDs, but a rename must preserve them or publish
an explicit alias. Unknown routes and unsupported locales show a useful error
with a link to English; do not silently mix editions. Query strings belong
inside the hash. Refreshing any route must work on static Pages.

## Reading depth and one-hop context

A concept's H1 precedes its idea, reasoning and necessary distinction in normal
document order. Critical qualifications do not require a disclosure. Connections
state both endpoints and the direction: for example “Human dignity grounds Human
rights”, not merely “related”. `rel-002` is an editorial interpretation backed
by §§51, 54–55; its HTML link and SVG edge open the same relationship route.
Foundation edges (`optional-foundations`) are separate and explicitly labelled.
No visual distance or line weight asserts evidential strength or importance.

Source links name the paragraph. Source context is a full navigable page, rather
than a nested accordion or mandatory modal. It has a return link whose label
names the invoking concept/step/block. The invoking history entry retains block
ID, focus target and offset; browser Back returns to that entry. A direct source
link has no invented caller: show Atlas and Read links instead. Following a note
adds one history entry; Back returns to the source paragraph and its note link.
Breadcrumbs express location (Atlas → Human dignity → Source §52), not invented
chronology. Recent path is separate and bounded to the last ten reader locations.

Exact source quotations are contiguous, attributed and visually distinct from
paraphrase and editorial interpretation. The default source-context page provides
reviewed context/paraphrase and approved exact spans, paragraph/page provenance,
source note links, and the ledger's exclusion/placement explanation. It never
automatically injects raw paragraph bodies or mechanically splices fragments.
Devotional exclusions apply here and in optional foundations, as in main reading.
The full unchanged original remains accessible through a labelled external link
“Read the full original at the Holy See”; warn in the adjacent method text that
the original includes material excluded from the adaptation. Raw originals stay
frozen as source evidence. No toggle silently turns the main UI into a devotional
edition. L4 reviews every displayed excerpt and paraphrase against the ledger.

## Search, trails and continuous depth

Search indexes the published locale's authored titles, questions, explanations,
relationship labels, trails and adapted reading blocks. It does not index raw
excluded forms or mix languages. Trim/collapse query whitespace; match
case-insensitively; rank exact title, title terms, then body matches with stable
ID as final tie-breaker. Results show type, title, an attributed preview and
destination. A changed query replaces the query entry until submission; opening
a result pushes history. Back restores query, results and the clicked result.
Escape clears no reader content; there is no hidden search gesture requirement.

Trails are secondary entrances organized by a real question, not a compulsory
syllabus. L4 authors six trails with explicit source-backed transitions and
endings. A trail overview names its steps before entry. The end records visited
places only: “You explored …”, never “You mastered …”. Previous and Next are
ordinary links; Skip proceeds without a completion badge. Leaving for a full
concept preserves the trail step in history and offers a named return link.
Optional reflection feedback explains why a distinction applies, allows disagreement
and links to evidence. No answer, score or reflection text is persisted.

Continuous reading follows source argument order through authored blocks, with
headings and paragraph references. Each of the 245 dispositions maps to a main
block, optional context or explicit exclusion explanation. Context-only material
has a labelled link at the corresponding source position; it is not silently
lost. The full adapted route is reachable without traversing the graph or trails.
Block anchors support deep links, return and resume. No infinite feed, automatic
advance, reading timer or locked content. A finite section ends with Save place,
next section, or Return to atlas; the entire sequence has a final ending.

## Local return state

Use a versioned local record `mh-reading-v1`, with schema version, content
revision, locale, source edition, last reader location, up to 50 explicit saved
places, recent path (ten), and appearance preference (system/light/dark).
A location stores route kind, stable entity ID, optional stable block ID, and
bounded offset within that block. Trail locations also store trail and step IDs.
Browser history may additionally hold the invoking route and focus target.
Do not store full content, search queries, reflection answers, inferred interests,
belief, identity or mastery. Locale and edition are explicit; English currently
uses `mh-en-owner-2026`. Future editions supply verified alignment to their official
translation, including differences. Missing alignment makes that destination
unavailable rather than fabricating translated text or positional equivalence.

Update last place on entry to a reading location and on a debounced settled
scroll/pagehide; no background heartbeat. Save is an explicit toggle with
“Saved on this device” state and an accessible status message. Resume never
redirects the landing page automatically: offer a visible Resume link.
Remove is reversible by an immediate Undo; Clear local data requires a clearly
labelled confirm/cancel inline step because it removes all saved places.

Parse and validate stored data before use, reject prototype/extra fields,
enforce limits, and validate IDs against published content. Malformed/unsupported
state is discarded with a calm notice; reading remains possible. On content
revision changes, retain valid stable IDs, reset missing block offsets and explain
the reset. Unknown IDs are shown as unavailable saved places with Remove; no
wrong-content substitution. Storage unavailable/full: keep temporary state for
this tab and announce “This place could not be saved on this device.” Offer
retry without blocking reading. Clearing data clears temporary state too.
Restoring a position prefers its stable block; stale offsets clamp inside it.
Back restores prior scroll and focus; new navigation focuses the main heading.
Resume focuses the restored block heading and tells the reader where it returned.

## Actual-content walkthroughs and evidence limits

`journeys.json` binds the following walkthroughs to accepted corpus IDs, exact
quotation coordinates and existing relation endpoints. Focused tests catch stale
or invented references. The result is a contract walkthrough, not a browser test
or a claim that a person understood the material.

| Case | Action and specified result |
| --- | --- |
| First visit | `/` → `/en/atlas`; choose Human dignity → `dignity`; complete idea/distinction visible, no agreement or tutorial gate |
| Source verification | Dignity → §52 → reviewed exact span; show paragraph 52 and PDF page provenance, note backlinks and original link; no spliced quotation |
| Deep dive | Dignity → `rel-002` → Human rights; show “grounds”, editorial explanation and §§51, 54–55; preserve attributed life-position qualification |
| Back | Rights → browser Back to relation → Back to dignity; restore original invoking link and block position, not the atlas top |
| Interruption/return | Save dignity at idea block; close/reopen; Saved → Resume restores dignity/idea, visibly local; failed persistence gives the stated notice |
| No results | Search “zz-unmatched-term-zz”; no-results message, retained editable query, Clear and Atlas links |
| Invalid link | `/en/concepts/unknown-concept`; unavailable view, Search/Atlas, no substituted concept; same rule for `p246` |
| Empty saved state | Fresh/cleared Saved page; no invented progress; Atlas and Read entrances remain usable |

L3/L5 implement route and persistence tests from these cases; L6 verifies a
production build with history, refresh, keyboard, screen-reader order and storage
failure. L2.2 supplies the visual storyboard matrix. No engineering check alone
proves learning efficacy or full accessibility.
