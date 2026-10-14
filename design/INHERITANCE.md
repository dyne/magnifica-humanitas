# Inherited design authority

The established Dyne world is authoritative; this document specifies inheritance,
not a production implementation. DESIGN.md documents the verified development
storyboard and required production contract. The selected surface brief governs
composition, while L3 pins reproducible assets and L6 refreshes the implemented
design at production finish.

Authority: `dyne/vite-theme`, revision
`c485943e103fc1e7a50c6f45853d190f16f57583`, `DESIGN.md`, `src/tokens.css`,
`src/components.css`, `src/fonts.css`, `src/style.css`. Its theme-demo and
VitePress showcase composition is not inherited.

## Roles to import

| Role | Inheritance and reading use |
| --- | --- |
| Type | `--dyne-font-display` (Syne) for headings; `--dyne-font-body` (Inter) for prose/controls; mono only for code/data, not reading labels |
| Surfaces | `--dyne-bg`, `--dyne-surface`, `--dyne-soft`; no new decorative gradients, grain or glass |
| Ink | `--dyne-text`, `--dyne-muted`; `--dyne-accent`/`--dyne-on-accent` pair for actions, never raw primitive orange for small text |
| Boundaries | `--dyne-border` for structure; `--dyne-control-border` for controls; `--dyne-focus` for keyboard focus |
| Status | Success, warning and danger foreground/soft pairs with words; a relationship type is never a success/danger status |
| Measure/space | `--dyne-measure` (68ch), container 76rem, inherited spacing scale; prose remains full-width when narrow |
| Controls | Shared pill button, field, tag and notice conventions; native links, buttons and input semantics stay intact |
| Motion | `--dyne-duration` (160ms) and easing for a single orientation/refocus; reduced motion sets duration to zero |

Use self-hosted licensed fonts, with normal fallback text visible immediately.
Theme `src/style.css` imports tokens, fonts, components and baseline. `.dyne-site`
opts into typography and colors; `.dyne-scope` supplies shared selection/focus
without baseline. Follow the package's actual exported paths at the pinned
revision, rather than relying on a sibling checkout in the production build.

Readers may open the site outdoors on a phone or return in a dim room. Default
appearance follows the operating system; visible System/Light/Dark controls
override it locally. Apply `data-dyne-theme` to the document root; semantic roles
change together. Both appearances must work at 100% and 200% text. Keep orange
as the default action accent; named concept groups may use other semantic accents
only with written labels, never as meaning by color alone.

## Reading and map constraints

At 360×800, gutters consume at most the inherited 2rem total and the reader owns
the remaining width. At 1440×1000, the selected composition can share the map and
reader; prose stays at 68ch, not stretched to fill the screen. At 200% text collapse
competing columns before prose or controls overflow. Normal page scrolling carries
the article; no scroll trap in a reading pane and no sticky header covering a
focus target. Controls wrap, source words break safely, and labels never clip.

The data-driven SVG is geometry, not a decorative illustration. It draws authored
typed edges and stable node positions; no force simulation, continuous idle loop
or invented distance. A concise caption identifies the map's editorial status.
The equivalent HTML list exposes all labels, explanations, paragraph links and
endpoints in logical order. Hide duplicated SVG semantics from assistive technology
when the HTML alternative is present; mouse SVG links and HTML keyboard links
have identical destinations. Selection may refocus once, then remains still.
Reduced motion removes spatial transitions and preserves immediate orientation.

The prototype/storyboard is evidence for proposed composition only. L3/L5 must
verify the actual shared-theme imports and L6 must verify the production surface;
a static storyboard does not establish deployed accessibility or route behavior.
