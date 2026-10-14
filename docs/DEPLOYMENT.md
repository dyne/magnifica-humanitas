# Static hosting and reviewed release

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

## Release gate

CI has read-only repository permissions and runs on pushes/PRs. Pages has only
`workflow_dispatch`; an ordinary push never deploys. Build runs with
`contents: read` and `pages: read`. Only the deployment job receives
`pages: write` and `id-token: write`, using the `github-pages` environment.
Actions are pinned to immutable revisions. The workflow follows GitHub's
[custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
and [deploy-pages](https://github.com/actions/deploy-pages) requirements.

1. Complete milestone reviews and conventional commits, then obtain the fresh
   whole-branch terminal review. Repair every P0/P1 and rerun the final gates.
2. Record the exact accepted full commit SHA. Inspect intended/staged scope:
   exclude credentials, generated output and workspace coordination files.
   Confirm source/asset notices and separate rights are retained.
3. Verify credentials and the actual `dyne/magnifica-humanitas` target. If it
   needs creation, an authorized Dyne administrator must create it or provide
   effective repository-creation authority. Do not infer absence from a 404
   alone; it can also mean inaccessible private state.
4. Only after terminal acceptance, push the reviewed history to the authorized
   repository and make the accepted revision reachable from its default branch.
   Configure Settings → Pages → GitHub Actions. Configure the `github-pages`
   environment with default-branch deployment restrictions and required release
   reviewers where the account supports them.
5. Set repository variable `TERMINALLY_REVIEWED_SHA` to the full accepted SHA.
   Dispatch `pages.yml` on the default branch with matching `reviewed_sha`.
   Empty, abbreviated or mismatched input fails before checkout/build; the
   selected SHA must also be an ancestor of the default branch. The variable
   is a release-owner attestation, not an automated semantic-review verdict.
6. Watch that workflow through completion. The artifact records its SHA in
   `release.json`. Verify the actual returned page URL:

```sh
EXPECTED_RELEASE_SHA=<full-accepted-sha> \
PUBLISHED_URL=https://dyne.github.io/magnifica-humanitas/ npm run test:published
```

The smoke script checks release identity, three direct/refreshed routes, runtime
and requested-resource failures, phone reflow and static license notices. Also
walk atlas → concept → source → Back, search, optional reflection and save/resume
on the actual published origin. Check fonts and network failures. A local
production suite or prepared workflow does not establish remote deployment.

For rollback, choose a previously terminally accepted revision reachable from
the default branch, update the attestation variable and dispatch that exact SHA.
Retain environment review and published smoke checks. Never substitute an
unreviewed branch tip because a workflow is failing.

## Publication capability

Read-only checks on 14 October 2026 found authenticated CLI/SSH identity
`jaromil`, but neither API nor SSH could resolve `dyne/magnifica-humanitas`.
The CLI API token is explicitly rejected by Dyne's policy because its lifetime
exceeds 366 days. The connector returned target 404 and no organization
memberships; that does not prove the user's actual organization membership.
No effective repository-creation or Pages-admin authority was established.

Required external repair: provide a Dyne-approved credential with an allowed
expiry and appropriate repository/Pages permissions, or have an authorized
administrator create/configure the target and grant the release account access.
After repair, recheck actual target and authority; do not treat this dated check
as a permanent failure. SSH authentication itself works when bypassing the
host's invalid system SSH configuration with `ssh -F /dev/null`; SSH alone does
not grant repository creation or Pages configuration. No remote mutation,
workflow run, push or publication occurred during release preparation.
