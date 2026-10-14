# Asset and source notices

The implementation and documentation are new work. Source repositories were
studied for visual conventions; their application components were not copied.

## Dyne logos

`assets/dyne-mark.svg` and `assets/dyne-logotype.svg` are unmodified copies from
`dyne-vitepress/template/public/` at commit `2ba10f1`.

Attribution: **Dyne.org foundation**, https://dyne.org/branding/.
The branding page identifies its downloadable brand content as **CC BY-SA 4.0**,
with a Netherlands jurisdiction description. It links to:
https://creativecommons.org/licenses/by-sa/4.0/deed.nl.

Keep attribution, a license link, and a statement of changes when redistributing
or adapting these assets. Brand derivatives remain subject to that license.
The general website footer has a different content license; it is not used to
relicense the downloadable brand assets. This package does not grant trademark
rights or imply that an adopting website is endorsed by Dyne.

## Fonts

Fonts are distributed through pinned Fontsource dependencies and bundled locally
by Vite. Their upstream license files are included in the respective packages:

- Syne: `@fontsource/syne/LICENSE`, SIL Open Font License 1.1.
- Inter: `@fontsource-variable/inter/LICENSE`, SIL Open Font License 1.1.
- JetBrains Mono: `@fontsource/jetbrains-mono/LICENSE`, SIL Open Font License 1.1.

Retain those licenses when redistributing font files separately. The default
stylesheet loads Latin subsets. Sites in other scripts must import the matching
Fontsource subsets or override the font stacks (see the adoption guide).

## References

- `dyne-org` at `561b1f8`: `src/styles/global.css`.
- `dyne-vitepress` at `2ba10f1`: `template/.vitepress/theme/`.
- https://dyne.org/branding/ and https://delta.dyne.org/899, inspected 2026-10-13.
