# Magnifica Humanitas

An independent interactive reading project about human dignity in the age of
artificial intelligence, based on the encyclical supplied by the project owner.
The website uses Vue 3, TypeScript, Vite and [Dyne vite-theme](https://github.com/dyne/vite-theme).

Explore 27 concepts and 44 named relationships, six finite trails, local search,
and a continuous adaptation covering all 245 source paragraphs. Source contexts
and 224 notes remain traceable; quotations, paraphrases, interpretations and four
fictional scenarios have distinct labels. Saved places and recent positions stay
on the reader's device. Visits do not measure understanding.

The owner selected English first, secular main paths and an interactive concept
atlas. Optional theological premises remain attributed; prayers and liturgical
formulas are excluded from adapted prose. Future languages start from their
official encyclical translations with verified paragraph alignment.

- [Argument analysis](research/ANALYSIS.md): conceptual structure, tensions,
  source references and proposed learning journeys.
- [Interaction research](research/EXPERIENCE.md): mobile reading mechanisms,
  evidence, limits and an example journey.
- [Decisions](research/DECISIONS.md): confirmed constraints and open choices.
- [Agent instructions](AGENTS.md): source fidelity and implementation rules.

This is an editorial exploration, not an official Vatican publication. Source
claims, editorial explanations and illustrative scenarios must remain distinct.

## Install and run

Requires Node 22.12 or newer, npm and Python 3 for source verification. CI uses
Node 24. Installation fetches locked dependencies; subsequent builds need neither
a sibling checkout nor the owner's PDF.

```sh
npm ci
npm run dev
npm run check
npm run source:check
npx playwright install chromium
npm run test:browser:all
```

`npm run check` runs type checking, content validation, unit/content tests and
the production build. Browser checks serve production output and rebuild for
both `/` and `/magnifica-humanitas/`. Hash routes work without server rewrites.
Default production base is `/magnifica-humanitas/`; use `VITE_BASE=/ npm run
build` for root hosting. `npm run preview` serves the current production build.

The theme archive is pinned to Dyne revision
`c485943e103fc1e7a50c6f45853d190f16f57583`, with lockfile integrity. `.npmrc`
allows only remote archives explicitly declared by this project for npm 12.
Theme CSS, locally served fonts and their license notices come from that package;
installation needs neither a sibling theme checkout nor the owner's PDF.
Source re-ingestion is a separate authoring operation, not a build requirement.

## Edit and release

- [Editorial workflow](docs/EDITORIAL.md): source comparison, semantic preservation,
  quotations, optional context, review and translation.
- [Content schema](docs/CONTENT-SCHEMA.md): stable IDs, file responsibilities and validators.
- [Attribution](docs/ATTRIBUTION.md): original source, theme, fonts and licensing boundaries.
- [Deployment](docs/DEPLOYMENT.md): portable static output, root/subpath hosting,
  automatic GitHub Pages release and rollback.
- [Production verification](verification/L6.1.md): measured checks, screenshot matrix,
  accessibility and performance limits.

CI validates content, deterministic source reconstruction, types, unit tests,
production builds and Chromium journeys at both bases. Pages automatically
deploys pushes to `main` after its checks pass; it can also be run manually
on `main`. The intended destination is
`dyne/magnifica-humanitas`; local production verification is not evidence of a
published site. Current capability and local setup results are recorded in
[release preparation](verification/L6.2.md).
