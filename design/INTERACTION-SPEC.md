# Reading interaction and composition specification

L2 design contract, within the inherited Dyne world. This describes required
behavior; the prototype is a development storyboard, not the released reader.
`READING-CONTRACT.md` governs routes, storage, failures and content identity.
`STORYBOARD-CONTENT.md` supplies the source-faithful demonstration material.

## Shared reading composition

At 360×800, use a single document column with 1rem side gutters. Navigation
wraps, rather than shrinking its labels; no fixed bottom bar covers prose.
The first reading sequence contains the location breadcrumb, H1, the complete
idea and necessary distinction. Source labels sit beside the explanation they
support. The source's theological grounding remains named in the distinction;
its extended explanation is optional, not a replacement secular proof.
Reasoning follows normally, with connections and the session ending below it.

At 1440×1000, cap the outer width at the theme's 76rem and prose at 68ch.
The selected atlas composition determines the neighborhood's placement; context,
trails and saved places use the same heading and article grid. No reading pane
has its own scroll trap. At 200% text, competing columns collapse before they
become narrower than readable prose. Controls wrap into document flow.
Break long source URLs safely. Nothing depends on clipping or truncated labels.

Use Syne 700 for titles and headings, Inter for prose and controls. Reading H1:
`clamp(2rem, 4vw, 3.5rem)`, line-height 1.15, tracking -0.025em. H2:
`clamp(1.5rem, 2.5vw, 2.25rem)`, line-height 1.2. Body: 1rem/1.65; opening
idea: 1.25rem/1.6; metadata: at least 0.875rem/1.5. All sizes use rem and
respect reader text settings; metadata never carries a hidden qualification.
Sections have more space above their heading than between related sentences.
Controls have at least a 44px target and expand vertically with text.

## One-hop context and orientation

Every paragraph link opens a full context page in one navigation step. Keep
the caller's stable block, offset and focus target in history. The return link
names the caller; browser Back restores the same location. A direct link offers
Atlas/Read instead of inventing a caller. Notes add one history entry with
their referring-paragraph backlink. Foundations are clearly labelled optional.
Source, note and foundation content never nests inside another disclosure.

Breadcrumbs describe location, such as Atlas / Human dignity / Source §52.
Only ancestors are links; the current page uses `aria-current="page"`.
Recent path is a separate, bounded list and never pretends to be a breadcrumb.
New route navigation updates the title and focuses its H1 (`tabindex="-1"`).
On Back, focus returns to the invoking link without jumping the restored scroll.
Resume names and focuses the restored reading block. A polite status announces
save/remove/failure; do not announce the whole article through a live region.

## Relationships and full text alternatives

Each edge has the actual endpoint titles, verb, direction, explanation and
paragraph evidence from the editorial model. For example: Human dignity
**grounds** Human rights (`rel-002`, §§51, 54–55). Its meaning is an editorial
interpretation, not a quoted source taxonomy or measured distance.
“Qualifies” is different from “grounds”; optional-foundation edges stay labelled
and separate. No visual size, distance or hue asserts importance or certainty.

The HTML relationship list is always reachable and contains every edge in the
shown neighborhood, with identical destinations to the diagram. HTML navigation
also reaches every concept outside the active neighborhood. With the complete
list present, duplicate SVG semantics are hidden from assistive technology;
SVG pointer links do not add a second keyboard traversal. Ordinary text links
are the keyboard path. Diagram labels cannot be the sole explanation.
Continuous adapted reading remains independently reachable from global navigation.

## Bounded sessions and reflection

Trails name the question and finite step count before entry. Show Step x of y
as text, Previous/Next/Skip as links, and Open full concept with a named return.
Skipping or disagreeing never locks content. End with the concepts explored,
Save place and Return to atlas; never infer mastery from a visit.
The prototype's two-step dignity/rights sequence is a demonstration, not one
of the six authored release trails. No reading-time estimate is displayed until
it can be calculated from authored word counts and labelled as an estimate.

Reflection follows the explanation. Reveal explanation and Skip are visible;
the feedback states the distinction and its evidence. A reader can reveal
without answering. It neither scores agreement nor stores answers. When
feedback appears, keep focus on Reveal and associate the feedback using
`aria-controls`/`aria-expanded`; its heading is next in reading order.

## Theme and motion contract

L3 imports `@dyne/vite-theme/style.css` from immutable revision
`c485943e103fc1e7a50c6f45853d190f16f57583`, with `.dyne-site` opt-in.
Public exports also provide tokens, fonts and components separately. Use
semantic background, text, muted, accent/on-accent, border, focus and selection
roles; retain supplied asset notices and locally bundled licensed fonts.
Never import the demo layout or depend on `../vite-theme` in release builds.
The development storyboard may serve those exact local assets through its
verification server; that convenience is explicitly excluded from release setup.

Default appearance follows the system, with visible System/Light/Dark settings.
Set `data-dyne-theme` on the document root; remove the override for System and
respond to system preference changes. Words accompany every status and group.
One optional refocus transition may explain a changed neighborhood, at most
160ms with the inherited easing. All content is visible before motion starts.
No idle animation, autoplay, inertia, smooth scroll requirement or entrance
sequence. Reduced motion removes movement and presents the new state immediately.

## Focus and screen-reader order

Shared order: skip link → site identity → global navigation → appearance settings
→ breadcrumb → main H1 → content in source-reasoning order → source/connection
links → ending actions → source/editorial attribution. Use one main landmark.
Entry then adds concept links and the complete relationship list; concept detail
adds idea, necessary distinction, reasoning, connections and optional foundations.
Trail adds step position, idea/distinction, optional feedback and finite navigation.
Context adds edition/page, contextual explanation, exact quote, notes, original
source and named return. Saved adds local-only explanation, Resume, saved places,
Remove/Undo and empty-state recovery. Repeated navigation retains the same order.

Use native links for destinations and buttons for local changes. No positive
tabindex, gesture-only action, custom reading keyboard mode or mandatory modal.
The skip target and programmatic headings have visible focus; outlines are not
clipped. Production verification must check real history restoration, menu
Escape/focus, settings, blocked storage and a screen reader. Static DOM order
and keyboard checks on this prototype establish only the storyboard's behavior.
