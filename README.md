# Magnifica Humanitas

An independent interactive reading project about human dignity in the age of
artificial intelligence, based on the encyclical supplied by the project owner.
The website uses Vue 3, TypeScript, Vite and [Dyne vite-theme](https://github.com/dyne/vite-theme).

The repository contains the source and editorial contract and an installable
reading foundation with four source-linked concepts and one finite trail. The
complete concept library, search and saved-place journeys are in development. The owner selected English first, secular
main reading paths and an interactive concept atlas. Future languages will use
their official encyclical translations as the starting point.

- [Argument analysis](research/ANALYSIS.md): conceptual structure, tensions,
  source references and proposed learning journeys.
- [Interaction research](research/EXPERIENCE.md): mobile reading mechanisms,
  evidence, limits and an example journey.
- [Decisions](research/DECISIONS.md): confirmed constraints and open choices.
- [Agent instructions](AGENTS.md): source fidelity and implementation rules.

This is an editorial exploration, not an official Vatican publication. Source
claims, editorial explanations and illustrative scenarios must remain distinct.

## Run the reading shell

Requires Node 22.12 or newer.

```sh
npm ci
npm run dev
npm run check
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
