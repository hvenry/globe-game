# CI/CD

GitHub Actions gates every change and deploys the site to Vercel and the race server to Cloudflare, independently.

## Why

Nothing reaches production without passing lint, type-check, and tests.
The site and the race server have separate lifecycles, so a UI change never redeploys the game server and a server fix never re-tags the site.

## How it works

| Workflow | Trigger | Deploys to |
|---|---|---|
| `pr-checks.yml` | PR into `main` | Vercel preview |
| `production-deploy.yml` | Push to `main` | Vercel production |
| `manual-release.yml` | Manual (Actions tab) | Vercel production |
| `race-server-deploy.yml` | Push to `main` touching Worker paths, or manual | Cloudflare Workers |

All four gate on `pnpm lint`, `pnpm type-check`, and `pnpm test`.
`type-check` and `test` cover both the site and the Worker.

**`pr-checks.yml`**
1. Lint, type-check, tests, build (`NEXT_PUBLIC_APP_VERSION=pr-<number>`)
2. Vercel preview deploy
3. Comments the preview URL on the PR

**`production-deploy.yml`**
1. Computes the next version from commit subjects since the last tag (see [versioning](versioning.md))
2. Lint, type-check, tests
3. Builds with the version as `NEXT_PUBLIC_APP_VERSION`
4. Deploys to Vercel production
5. Pushes the git tag and publishes a GitHub release with a grouped changelog

**`manual-release.yml`**: forces a specific version; same checks, deploy, tag, and release.

**`race-server-deploy.yml`**
- Triggers on pushes to `main` touching `server/**`, `lib/engine/**`, `lib/race/**`, `lib/constants.ts`, `lib/geo/country-sets.ts`, `pnpm-lock.yaml`, or the workflow file.
- Runs are serialized (`concurrency: race-server-deploy`) and never cancelled mid-deploy.
- Steps:
  1. Lint, type-check, tests
  2. `wrangler deploy --dry-run` to prove the Worker bundles and its bindings resolve
  3. `cloudflare/wrangler-action@v3` deploys from `server/`
  4. Smoke test polls `$RACE_SERVER_URL/health` up to 5 times, 5s apart; skipped if the variable is unset

**Reproduce CI locally**
- `pnpm install --frozen-lockfile`, then `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`.

## Tech

- GitHub Actions, pnpm (pinned by `packageManager`), Node 22, Vitest
- Vercel CLI via `pnpm dlx vercel@latest` (no global install)
- Wrangler (devDependency of `server/`) and `cloudflare/wrangler-action@v3`

## Key files

- `.github/workflows/pr-checks.yml` - PR gates and preview deploy
- `.github/workflows/production-deploy.yml` - version, deploy, tag, release
- `.github/workflows/manual-release.yml` - manual version override
- `.github/workflows/race-server-deploy.yml` - Worker gates, deploy, smoke test
- `.github/PULL_REQUEST_TEMPLATE.md` - conventional-commit type checklist
- `vercel.json` - disables Vercel's git integration
- `server/wrangler.jsonc` - Worker name, Durable Object, rate limit, `ALLOWED_ORIGINS`
- `pnpm-workspace.yaml` - root app + `server/`

## Decisions and gotchas

- Vercel's git integration is off (`git.deploymentEnabled: false`), so every site deploy goes through these workflows with `VERCEL_TOKEN`.
- The Worker is not versioned or tagged; it ships whatever is on `main`.
- The path filter misses modules the Worker already bundles: `lib/geo/draws.ts`, `lib/geo/country-stats.ts`, and `lib/geo/country-names.ts`.
  A change to only those files does not redeploy the Worker; extend the filter (and keep it in sync when the server imports a new shared module).
- Redeploy the Worker without a code change: Actions, "Race Server Deploy", "Run workflow".
- Deploy the Worker from a laptop: `pnpm race:deploy` (needs `wrangler login`).
- When something fails: Actions logs (computed version, smoke test), Vercel dashboard, Cloudflare dashboard (`observability` is enabled), Releases page.

## Related

- [Versioning](versioning.md)
- [Deploy setup](deploy-setup.md)
- [Race server](race-server.md)
