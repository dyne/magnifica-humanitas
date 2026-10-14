# Magnifica Humanitas reading design

Reading design, established through the L2 storyboard and implemented in the
Vue production application. The owner chose Question regions within the existing
Dyne world and a code-led build. `design/INTERACTION-SPEC.md` is the behavior
specification; `design/QUESTION-REGIONS-BRIEF.md` records the surface direction.
`verification/L6.1.md` records current production review and its limits.

## Visual authority

Inherit `dyne/vite-theme` at `c485943e103fc1e7a50c6f45853d190f16f57583`.
Use Syne headings, Inter body text, warm semantic light/dark surfaces, pill
actions and visible purple focus. Import the package's exported CSS and local
licensed fonts; the demo and VitePress composition are not inherited.
`design/INHERITANCE.md` records the semantic roles and package boundary.

## Question regions and reading

The atlas starts with human questions, labelled editorial groupings. Each
question exposes direct concept links; choosing a group is never a mandatory
intermediate action. Regions ask what makes a person worthy and how people live
well together, among other human questions. All 27 concepts are available.

At desktop width, question regions share a wrapping grid. At phone width and
large text, they stack in the same DOM order. Articles use ordinary page scroll,
1rem phone gutters, 76rem outer width and prose capped at 68ch. Reading H1 uses
`clamp(2rem, 4vw, 3.5rem)`; H2 uses `clamp(1.5rem, 2.5vw, 2.25rem)`;
body is 1rem/1.65 and the opening idea 1.25rem/1.6. Necessary distinctions
remain in the initial reading sequence. The design favors text and named
connections over decorative images or nested panels.

## Relationship grammar

The still diagram draws actual directed relationships and captions their
editorial status. It assigns no statistical meaning to position or line length.
An adjacent complete HTML list supplies endpoints, relation verbs, explanation,
source paragraphs and identical relationship destinations. The SVG is hidden
from assistive technology and its pointer links add no duplicate tab stops.
At enlarged text the HTML list is the full readable alternative to scaled SVG
labels; production must preserve that parity for every neighborhood.

## Depth, motion and return

Breadcrumbs, paragraph context and named return links expose location. Exact
quotation, paraphrase, editorial interpretation and theological premises have
separate visible labels. Context uses a full destination, not a nested modal.
Trails are finite, with optional reflection, visible Skip and a real ending.
Saved places name local-only state, Resume and reversible Remove/Undo.

Appearance follows the system with visible override controls. Content is visible
without entrance animation. The prototype has no spatial animation; production
may use one orientation transition, at most the inherited 160ms, with immediate
state change under reduced motion. No idle loops, mandatory quizzes, agreement
scores, autoplay or infinite reading feed.

## Verified scope and remaining gates

`design/STORYBOARD-VERIFICATION.md` retains the historical 80-case storyboard
matrix. Production verification in `verification/L6.1.md` covers 13 surfaces at
four sizes, both appearances and 100%/200% text, plus 320px reflow, source
reachability, history, local persistence, automated accessibility and throttled
loading. Bounded Impeccable audit/polish found no unresolved P0/P1 in that scope.
Physical-device/screen-reader testing and reader efficacy remain unmeasured.
Local verification does not establish publication; `docs/DEPLOYMENT.md` requires
a terminally reviewed revision and checks on the actual published origin.
