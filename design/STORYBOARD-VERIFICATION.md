# Development storyboard verification

Owner-selected composition: Question regions. Evidence generated 2026-10-14
using Node 24.21.0, Playwright 1.64.0 and Chromium build 1248 on Linux.
Theme checkout HEAD verified as `c485943e103fc1e7a50c6f45853d190f16f57583`.
The prototype reuses that checkout's tokens, components and local licensed fonts
through its development server. This is a development prerequisite, not a
release dependency or a substitute for the clean-clone L3 gate.

## Reproduce

Install the pinned theme's development dependencies and Playwright browser.
Set `MH_THEME_DIR` if that checkout is not the workspace sibling `vite-theme`.
Start the server, then run the checker in another terminal:

```sh
node design/storyboards/serve.mjs
MH_CHROMIUM_PATH=/tmp/dyne-browsers/chromium-1248/chrome-linux64/chrome node design/storyboards/check-browser.mjs
node --test tests/reading-contract.test.mjs
```

`MH_CHROMIUM_PATH` is the actual browser path in this environment; omit it if
Playwright's normal executable is installed. `MH_STORYBOARD_EVIDENCE` changes
the output directory. Browse `http://127.0.0.1:4285/` and use the visible links
or `?view=entry|concept|trail|source|saved`. `?view=trail&id=rights` exercises
the second step and its attributed normative qualification.

## Current matrix

| Dimension | Values | Result |
| --- | --- | --- |
| Viewports | 360×800, 1440×1000 | Both |
| Text | 100%, 200% root font size | Both; body measured at 16px/32px |
| Appearance | Light, dark | Both; semantic root selection checked |
| Motion preference | Default, reduced | Both; reduced duration 0ms |
| Views | Entry, dignity concept, trail step, §52 context, saved return | All five |
| Combined cases | 2 × 2 × 2 × 2 × 5 | **80 passed** |
| Captures | All default-motion cases, full document | 40 PNGs |
| Content references | Accepted edition, real endpoints and exact model prose/quote | 3 focused tests passed |

Every case checks no horizontal document overflow, one main landmark, visible
44px navigation/control targets, no page/resource errors, correct appearance,
SVG semantics hidden and native skip-link focus into main. Trail Reveal changes
expanded state and feedback visibility without moving focus. Saved Remove moves
focus to Undo; Undo restores Remove and the known saved-state demonstration.
The captured heading order is recorded in `output/storyboards/matrix.json`.

Manual render inspection covered all 40 captures through grouped previews in a
bounded inspection and confirmation pass. Screenshots initially exposed a
Chromium full-page capture artifact after the skip-link hash. The checker now
removes that test-only fragment before capture, settles scroll and asserts
document-top position; the captures were regenerated. Prose and controls reflow
without clipping in both appearances. Long headings may wrap within a word at
200% on phones; this preserves content. SVG labels remain scaled geometry, with
their complete text alternative below the figure. No animation or delayed reveal
hides the content. Captures and matrix remain generated evidence under ignored
`output/storyboards/`; they are not release assets.

## Semantics and evidence limits

DOM review follows the order documented in `INTERACTION-SPEC.md`: skip/global
navigation/settings, breadcrumb, H1, idea/distinction or contextual explanation,
source and connection links, finite actions and attribution. Native button/link
semantics, labels, expanded state and live status are inspected and partly
keyboard-tested. No real screen-reader session or user study was performed.
CSS text enlargement is not browser zoom. Production must independently verify
200% browser text/zoom, 320px reflow, all corpus content, screen-reader behavior,
caller focus/scroll restoration, local storage, root/subpath routes and no-JS.

The prototype uses an explicit fixed saved place and offers no real persistence.
§52 is the fully worked context; other paragraph links honestly state that their
context is outside the bounded demonstration. Notes show the return composition,
not their full text. These do not stand in for later complete authoring.

One mechanical Impeccable detector run reported the pinned Inter face as an
overused-font warning; the confirmed brand takes precedence. Exit 2 also warned
that server-mapped `/theme/` stylesheet URLs cannot be resolved as local files,
so its color/custom-property checks are incomplete. It is not a clean detector
pass or an accessibility certificate. The actual browser loaded both stylesheets
and fonts successfully; the production finish review remains a separate L6 gate.
