# Magnifica Humanitas

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite, Vue 3, TypeScript and Dyne vite-theme, confirmed by the owner. Publish to
`dyne/magnifica-humanitas` on GitHub and GitHub Pages. Do not substitute
VitePress's documentation layout for the bespoke reading experience.

## Users

People interested in the encyclical's concepts who are not accustomed to long
texts, especially those reading on a phone. No theological knowledge is assumed.
Readers may understand an argument without agreeing with its premises.

## Product Purpose

Help readers navigate Magnifica Humanitas and understand its core concepts,
their connections, reasons and qualifications. Reduce the friction of entering
and returning to the text without reducing the complexity of its thought.

## Positioning

An interactive concept atlas of this specific encyclical, with source-linked
depth layers. The main reading paths are secular; theological foundations
remain available in optional, clearly attributed context. Religious prayers
and liturgical formulas are removed from the adapted experience.

## Operating Context

The atlas is the primary entrance. Readers choose a concept, read its reasoning,
and follow named, source-backed relationships. Search, question-led trails and
continuous adapted reading provide other entrances. A saved place lets a reader
stop and return without completing a task. The navigation and state contract is
in `design/READING-CONTRACT.md`. The owner selected Question regions: editorial
human questions organize the atlas, with direct concept links in each region.

English is the first release. For each future language, use its official
encyclical translation as the source, rather than merely translating the English
adaptation. Maintain stable concept and paragraph identities across languages;
verify their alignment instead of assuming it.

## Capabilities and Constraints

- Independent repository named `magnifica-humanitas`.
- Modern interactive website using the shared Dyne Vite theme.
- Preserve the source's depth, conditions, tensions and argumentative structure.
- Keep secular explanations distinct from the source's theological justification.
- Provide explanatory layers and purposeful interactions.
- Follow a durable Org plan and quiz the owner on consequential choices.
- Vue 3 + TypeScript, Dyne GitHub and GitHub Pages are confirmed.
- Build directly in code and review the running mobile pages, as confirmed.
- Use anonymously, with no accounts, profiling, engagement tracking or live
  generative chatbot. Explanations and search use reviewed, authored content.
- Bookmarks, reading position and preferences stay on the reader's device.
  Reading works when local storage fails; show when a place could not be saved.
- Use Vue Router hash history and a configurable Vite base. Project Pages URLs
  begin `/magnifica-humanitas/#/en/`; root hosting also works with base `/`.
- Keep concepts, relations, paragraphs and reading blocks addressable by stable
  IDs. A translated title never changes a saved identity.

## Brand Commitments

Use the existing Dyne theme and its licensed assets, typography and semantic
colors. The site's composition must serve conceptual exploration and reading;
the theme showcase is not a mandated template. Use Humanizer for source-faithful
adaptation and Impeccable for product and interface design.

## Evidence on Hand

- Owner-supplied English PDF at workspace root, 47 pages, 245 paragraphs.
- Owner-supplied saved English text and official source URL.
- `research/ANALYSIS.md` maps the whole argument. The accepted editorial model
  accounts for all 245 paragraphs, 18 exact mixed-passage exclusions, 27
  concepts and 44 typed relationships. Public explanations and trail prose
  remain to be authored and reviewed; the ledger is not the public library.
- `../vite-theme` and https://github.com/dyne/vite-theme, current revision
  `c485943e103fc1e7a50c6f45853d190f16f57583`.
- No real reader-usability study has yet been conducted for this site.

## Product Principles

1. Make connections intelligible, with explicit reasons for each relationship.
2. Preserve complexity; make the way into it manageable.
3. Make every substantive interpretation traceable to source paragraphs.
4. Respect attention and autonomy, including the choice to stop or disagree.
5. Distinguish the secular reading path from the text's theological premises.

## Accessibility & Inclusion

Mobile reading is a confirmed priority. Keyboard and screen-reader access,
reflow at 200% text, appearance settings and reduced motion are required.
Concept exploration must not depend exclusively on visual spatial reasoning,
color, dragging or pinch gestures. Every atlas relationship has the same
label, explanation, source references and destination in HTML navigation.

## Learning Contract

Necessary distinctions and qualifications stay visible with the opening idea
and connected reasoning. Sources, notes and optional theological foundations
are one navigation step away, with a return to the same reading block. The
adaptation identifies the encyclical's premises rather than supplying an
unattributed secular proof in their place.

Trails have a named question, a finite sequence and an explicit ending. Readers
can skip a step, leave for a concept, or stop at any point. Reflections are
optional and explain distinctions with source links; they never score belief
or agreement. Visited and saved places are not evidence of understanding.

These are implementation requirements derived from the confirmed product
choices and repository constraints. Question regions is the confirmed composition.
No reader testing or learning efficacy is claimed.
