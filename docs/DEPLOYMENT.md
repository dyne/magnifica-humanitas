# Static hosting and GitHub Pages

`npm ci && npm run check` produces portable `dist/` output. Copy the entire
directory, including fonts, NOTICE.txt and licenses, to a static HTTPS host.
No server API, database, accounts or URL-rewrite rule is required. Hash routes
retain direct links and refresh behavior.

```sh
# Repository/project Pages path (default)
npm run build
npm run preview

# A host serving this site at its domain root
VITE_BASE=/ npm run build
VITE_BASE=/ npm run preview

# Verify both production bases, sequentially
npm run test:browser:all
```

For another subpath, set an absolute `VITE_BASE` beginning and ending in `/`.
Build and preview must use the same base. For project Pages the destination is
`https://dyne.github.io/magnifica-humanitas/#/en/atlas`. This is an intended URL,
not a claim that it has been published. Do not commit `dist/` or browser output.

## Automatic deployment

CI has read-only repository permissions and runs on pushes/PRs. Pages deploys
every push to `main`, and supports manual runs on `main`. Build runs with
`contents: read` and `pages: read`. Only the deployment job receives
`pages: write` and `id-token: write`, using the `github-pages` environment.
Actions are pinned to immutable revisions. The workflow follows GitHub's
[custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
and [deploy-pages](https://github.com/actions/deploy-pages) requirements.

1. Configure repository Settings → Pages → GitHub Actions as the build source.
2. Push the changes to `main`. The workflow installs dependencies and runs
   source reconstruction, types, content tests, builds and browser tests at
   both hosting bases before deploying. Feature branches do not deploy.
3. Watch **Deploy GitHub Pages** through completion. No personal token,
   repository attestation variable or SHA input is needed by the workflow.
   The artifact records the triggering commit in `release.json`.
4. Verify the actual returned page URL:

```sh
EXPECTED_RELEASE_SHA=<full-deployed-sha> \
PUBLISHED_URL=https://dyne.github.io/magnifica-humanitas/ npm run test:published
```

The smoke script checks release identity, three direct/refreshed routes, runtime
and requested-resource failures, phone reflow and static license notices. Also
walk atlas → concept → source → Back, search, optional reflection and save/resume
on the actual published origin. Check fonts and network failures. A local
production suite or prepared workflow does not establish remote deployment.

For rollback, revert the faulty changes on `main` and push the revert commit.
The same verification and deployment workflow runs for that commit.

## Publication history

Early read-only checks on 14 October 2026 found authenticated CLI/SSH identity
`jaromil`, but neither API nor SSH could resolve `dyne/magnifica-humanitas`.
The CLI API token is explicitly rejected by Dyne's policy because its lifetime
exceeds 366 days. The connector returned target 404 and no organization
memberships; that does not prove the user's actual organization membership.
No effective repository-creation or Pages-admin authority was established.

Later on the same date, the GitHub connector confirmed the new public repository
and admin/push access. The reviewed history was pushed over SSH, and initial
GitHub CI passed. The owner then requested automatic deployment on push.
Use current Actions results to determine deployment status; earlier verification
reports retain their historical capability observations.
