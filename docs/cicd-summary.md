# CI/CD Overview

How globe.expert gets from a branch to production. The step-by-step setup —
Vercel tokens, GitHub secrets — lives in [cicd-setup.md](./cicd-setup.md).

## Workflows

### `.github/workflows/pr-checks.yml`

Runs on every pull request into `main`:

1. Lint, type check, tests, build
2. Vercel **preview** deployment
3. Comments the preview URL on the PR

### `.github/workflows/production-deploy.yml`

Runs on every push to `main`:

1. Reads commits since the last tag and calculates the next version
2. Lint, type check, tests
3. Builds with the version injected as `NEXT_PUBLIC_APP_VERSION`
4. Deploys to Vercel production
5. Creates the git tag
6. Generates a changelog and publishes a GitHub release

### `.github/workflows/manual-release.yml`

Triggered by hand from the Actions tab when you need to force a specific
version. Validates the version is semver and unused, runs the same checks,
then deploys and releases. Supports pre-release marking and custom notes.

Vercel's own git integration is **off** (`vercel.json` sets
`git.deploymentEnabled: false`) — every deploy goes through these workflows
using the Vercel CLI and `VERCEL_TOKEN`.

## Versioning

The bump is inferred from commit subjects since the last tag, highest
precedence wins:

| Commit prefix | Bump | Example |
|---|---|---|
| `BREAKING CHANGE`, `major:` | Major | 0.6.0 to 1.0.0 |
| `feat:`, `feature:` | Minor | 0.6.0 to 0.7.0 |
| anything else | Patch | 0.6.0 to 0.6.1 |

The changelog groups the same subjects by prefix (`feat:`, `fix:`, `docs:`,
`style:`, `refactor:`, `perf:`, `test:`, `chore:`); anything unprefixed is
listed under "Other Changes".

**Squash merges collapse this.** A squash produces one commit whose subject is
the PR title, so the PR title alone decides the bump and the changelog. Use a
merge commit to keep individual subjects.

## Files involved

```
globe-game/
├── .github/
│   ├── workflows/
│   │   ├── pr-checks.yml            PR checks + preview deploy
│   │   ├── production-deploy.yml    Version, deploy, tag, release
│   │   └── manual-release.yml       Manual version override
│   └── PULL_REQUEST_TEMPLATE.md     Conventional-commit type checklist
├── docs/
│   ├── cicd-setup.md                One-time setup instructions
│   └── cicd-summary.md              This file
├── lib/
│   └── version.ts                   Reads NEXT_PUBLIC_APP_VERSION
├── components/game/start/
│   └── SettingsView.tsx             Renders the version in the panel footer
├── package.json                     Scripts the workflows call
├── pnpm-lock.yaml                   Installed with --frozen-lockfile in CI
└── vercel.json                      Disables Vercel's git integration
```

`lib/version.ts` returns `"dev"` when `NEXT_PUBLIC_APP_VERSION` is unset, which
is why local builds show `dev` in the settings footer and deployed ones show
the tag.

## Toolchain

The workflows use **pnpm** (pinned by the `packageManager` field, which
`pnpm/action-setup` reads) and run tests with **Vitest**:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Running those four locally reproduces CI exactly. The Vercel CLI is invoked
through `pnpm dlx vercel@latest` rather than a global install, so the runner
needs no global bin setup.

## Common operations

**Current version**

```bash
git describe --tags --abbrev=0
```

**Roll back** — branch from the good tag and merge it, so the pipeline
redeploys and re-tags rather than leaving the tag history inconsistent:

```bash
git checkout -b rollback/to-v0.6.0 v0.6.0
git push origin rollback/to-v0.6.0
```

**Force a version** — Actions tab, "Manual Release", "Run workflow", enter the
version.

## Where to look when something fails

- **GitHub Actions tab** — workflow logs, including which version was computed
- **Vercel dashboard** — deployment history and build output
- **Releases page** — the generated changelog for each tag
