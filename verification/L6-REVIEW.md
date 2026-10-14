# L6 milestone review packet

Plan position L6/6, `verification-and-delivery`; branch `feat/interactive-reading`.
Starting commit and current HEAD: `b24956b82640bae9018abca6febe5f1e0b2461cb`.
The complete milestone diff is uncommitted and requests supervisor review;
acceptance is not implied by this packet. Both children are DONE.

Goal: complete tested website with contributor instructions and reproducible
static deployment. Local acceptance uses the plan's explicit accommodation for
externally blocked publication. Actual publication remains pending effective
Dyne authority and the later fresh whole-branch terminal review.

## Current gates

| Command/check | Exit | Passed | Failed/skipped |
| --- | --- | --- | --- |
| `npm run check` | 0 | 45 unit/content tests; typecheck, validation, build | 0/0 |
| `npm run source:check` | 0 | 245 paragraphs, 224 notes, 81 headings, deterministic | 0/0 |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/mh-l2-browsers RELEASE_EVIDENCE_DIR=output/playwright/l6/l62 BROWSER_EVIDENCE_DIR=output/playwright/l6/l62/hosting npm run test:browser:all` | 0 | 79 root + 79 subpath; both builds | 0/0, no flaky tests |
| Isolated `npm ci --cache /tmp/mh-l62-npm-cache` and `npm run check` | 0 | Fresh install, 45 tests, independent production build | 0/0 |
| Isolated source and root/subpath browser commands in L6.2 report | 0 | 245/224; 158 browser tests | 0/0 |
| Temporary sample title: `npm run content:check`, `npm test`, exact restoration and validation | 0 | 45 tests and both validations | 0/0 |
| `/tmp/mh-actionlint/actionlint .github/workflows/ci.yml .github/workflows/pages.yml` | 0 | Both workflows | 0/0 |
| `node --check scripts/check-published.mjs` | 0 | Release smoke script syntax | 0/0 |
| Actual release-dispatch guard | Expected 0/1 | Five accept/reject cases | 0/0 |
| Local `npm run test:published` fixture, command in L6.2 report | 0 | Three direct/refreshed routes, requested assets, five notices | 0/0 |
| Wrong expected SHA fixture | Expected 1 | Identity rejection | 0/0 |
| Documentation, licenses, scope | 0 | 18 local links; five upstream notices byte-identical; `git diff --check` | 0/0 |

Current production assets match the recorded final subpath hashes. Package
inputs, Vite config, all application files and all content files are byte-identical
to the independently installed copy. The final tests ran after all runtime
changes; later edits only documented results. No missing full-suite gate remains.

## Evidence and limitations

- `verification/L6.1.md`: bounded Impeccable audit/polish, source reachability,
  manual visual/semantics review, 416 screenshots and 52 clean axe scans.
- `verification/L6.2.md`: exact installation/edit/release checks and fresh
  external capability results.
- `output/playwright/l6/l62/hosting/browser-evidence.json`: commands, exit
  statuses and tested hashes; sibling `root-browser-results.json` and
  `subpath-browser-results.json`: final suite counts.
- `output/playwright/l6/l62/{root,subpath}/`: current matrix manifests, screenshots,
  semantics snapshots, accessibility.json and performance.json.
- `output/playwright/l6/l62-clean/`: preserved independent-copy evidence;
  original L6.1 artifacts remain at `output/playwright/l6/{root,subpath}/`.
- `output/playwright/l6/review/complete.diff` and `summary.json`: complete
  unstaged milestone patch and bounded review inventory, generated for review.

The source and editorial corpus remain unchanged. No unresolved P0/P1 was
found by the executor within the inspected scope. P2: brief long tasks under
4× CPU slowdown while rendering full reading content; limits and real samples
are recorded. No NVDA/VoiceOver, physical-device, efficacy study, actual remote
CI or published-origin check has been performed. Automated scans and local
preview do not constitute comprehensive accessibility or publication evidence.

Fresh capability checks authenticate `jaromil`, but target metadata/SSH access
is unavailable and Dyne explicitly rejects the CLI token's >366-day lifetime.
Repository creation and Pages-admin authority remain unverified. Required
external repair and subsequent release checks are precise in L6.2/DEPLOYMENT.
No external mutation or release attestation has occurred.

## Complete sorted intended file scope

```text
.github/workflows/ci.yml
.github/workflows/pages.yml
AGENTS.md
DESIGN.md
PRODUCT.md
README.md
docs/ATTRIBUTION.md
docs/CONTENT-SCHEMA.md
docs/DEPLOYMENT.md
docs/EDITORIAL.md
package-lock.json
package.json
public/NOTICE.txt
public/licenses/Inter-OFL.txt
public/licenses/JetBrains-Mono-OFL.txt
public/licenses/Syne-OFL.txt
public/licenses/dyne-vite-theme-MIT.txt
public/licenses/dyne-vite-theme-NOTICE.md
scripts/check-published.mjs
src/views/About.vue
tests/browser/verification.spec.ts
verification/L6-REVIEW.md
verification/L6.1.md
verification/L6.2.md
```

Staged scope is empty. No source originals, corpus/coverage records, credentials,
generated build/browser output or coordination files are Git deliverables.
The supervisor reviews this same diff. On REJECT the assigned executor corrects
it; only explicit ACCEPT authorizes one conventional milestone commit. A fresh
terminal review and accepted revision are still required before publication.
