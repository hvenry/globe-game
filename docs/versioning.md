# Versioning

The site's semantic version is computed from commit subjects on every push to `main`, then tagged, released, and shown in the settings panel.

## Why

Releases need no manual bookkeeping: merging is releasing.
The version in the UI tells you exactly which build a player is on.

## How it works

`production-deploy.yml` reads commit subjects since the last tag (case-insensitive, matched at the start of the subject).
Highest bump wins.
A repo with no tags counts as `v0.0.0`.

| Subject starts with | Bump | Example |
|---|---|---|
| `BREAKING CHANGE`, `major:` | Major | 0.6.0 to 1.0.0 |
| `feat:`, `feature:` | Minor | 0.6.0 to 0.7.0 |
| anything else | Patch | 0.6.0 to 0.6.1 |

The release changelog groups the same subjects by prefix:

| Prefix | Section |
|---|---|
| `feat:`, `feature:` | Features |
| `fix:`, `bugfix:` | Bug Fixes |
| `docs:` | Documentation |
| `style:` | Style |
| `refactor:` | Refactoring |
| `perf:` | Performance |
| `test:` | Tests |
| `chore:` | Chores |
| anything else | Other Changes |

The version is injected at build time as `NEXT_PUBLIC_APP_VERSION`.
`lib/version.ts` reads it and falls back to `"dev"`; PR previews show `pr-<number>`.

**Operations**
- Current version: `git describe --tags --abbrev=0`.
- Force a version: Actions, "Manual Release", "Run workflow".
  - Inputs: `version` (`1.2.3` or `v1.2.3`), `prerelease`, optional `release_notes`.
  - Fails if the version is not `X.Y.Z` or the tag exists.
  - Without notes, the changelog is a flat list of subjects (no grouping).
- Roll back: branch from the good tag (`git checkout -b rollback/to-v0.6.0 v0.6.0`), push, and merge.
  The pipeline then redeploys and re-tags, keeping tag history consistent.

## Key files

- `.github/workflows/production-deploy.yml` - bump calculation, tag, grouped changelog
- `.github/workflows/manual-release.yml` - forced version, flat changelog
- `lib/version.ts` - reads `NEXT_PUBLIC_APP_VERSION`
- `components/game/start/SettingsView.tsx` - renders the version in the panel footer

## Decisions and gotchas

- **Scoped prefixes don't match (bug).**
  `feat(hud): ...` bumps patch, not minor, because the pattern requires the colon directly after `feat`.
  Changelog grouping has the same bug: `perf(globe): ...` lands under "Other Changes".
  Most commits in this repo are scoped, so most releases under-bump.
- **`BREAKING CHANGE` only counts in the subject (bug).**
  A `BREAKING CHANGE:` footer in the commit body is ignored.
- **Squash merges collapse subjects.**
  The PR title alone then decides the bump and the changelog.
  Use a merge commit to keep individual subjects.
- `NEXT_PUBLIC_APP_VERSION` is set by the workflows; never set it in Vercel.
- The race server is not versioned (see [CI/CD](ci-cd.md)).

## Related

- [CI/CD](ci-cd.md)
- [Deploy setup](deploy-setup.md)
