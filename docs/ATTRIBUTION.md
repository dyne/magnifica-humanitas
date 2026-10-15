# Source and asset attribution

The source is Leo XIV, *Magnifica Humanitas*, 15 May 2026, owner English edition
`mh-en-owner-2026`, with the notice © Dicastery for Communication – Libreria
Editrice Vaticana. The [source README](../content/source/README.md) records
corpus provenance, immutable inputs, extraction and edition differences. The
[full original](https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html)
is clearly distinguished from this independent editorial reading.
The additional Arabic, Belarusian, German, Spanish, French, Italian, Polish,
Portuguese and Russian readings use their official Vatican HTML editions,
frozen on 14 October 2026 with provenance and copyright in their local source
manifests. The same source copyright applies to those texts and snapshots;
their availability does not grant a source-text license or official endorsement.

Source text/snapshots, original code, editorial explanations and third-party
assets have separate rights. No license for original project code/commentary has
been selected; this repository does not grant a blanket open-source license.
Do not apply the theme's MIT license to the source or original commentary.
Choosing an original-work license requires a separate owner decision.

| Shipped material | Provenance and notice |
| --- | --- |
| Theme CSS and tokens | `@dyne/vite-theme`, immutable revision `c485943e103fc1e7a50c6f45853d190f16f57583`, MIT |
| Syne Latin font files | `@fontsource/syne` 5.3.0, SIL OFL 1.1 |
| Inter Latin variable font files | `@fontsource-variable/inter` 5.3.0, SIL OFL 1.1 |
| JetBrains Mono Latin font files | `@fontsource/jetbrains-mono` 5.3.0, SIL OFL 1.1 |
| Noto Sans Arabic variable | Google Fonts revision `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`, `ofl/notosansarabic/NotoSansArabic[wdth,wght].ttf`, SIL OFL 1.1 |
| Relationship SVG | Original geometry derived from authored relation endpoints; no stock illustration |

Latin and Cyrillic faces come through the locked theme dependency; Arabic has
the separately pinned source below. All are served locally. The
theme's Dyne logo assets are not used by this site; its upstream NOTICE describes
them without granting trademark rights or implying endorsement. No raster
illustration or user photograph is shipped.

`public/NOTICE.txt` and `public/licenses/` retain the theme MIT notice, upstream
NOTICE and all four font OFL texts in the static artifact. When dependency
revisions change, review provenance and update these copies from the pinned
packages. Do not remove notices while packaging `dist/`; serving only the
HTML/JS and fonts without notices is an incomplete artifact.

Arabic uses the locally served `public/fonts/NotoSansArabic-variable.ttf`,
downloaded unchanged from the pinned Google Fonts revision above, with copyright
and OFL terms in `public/licenses/Noto-Sans-Arabic-OFL.txt`. Latin/Cyrillic fallback
continues through the pinned theme's Inter and Syne faces. The Cyrillic editions
use the bundled Inter extensions; Arabic does not depend on an installed OS font.
Production Arabic review records cmap coverage and Chromium's actual painted
fonts separately from the historical nonshipping RTL fixture. This is bounded
browser evidence, not a universal glyph guarantee.
