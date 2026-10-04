# Deploy setup

One-time configuration that lets the workflows deploy the site to Vercel and the race server to Cloudflare.

## Why

The workflows hold no credentials of their own.
Without these secrets and variables, deploys fail, and without `NEXT_PUBLIC_RACE_SERVER_URL` race mode silently dials `localhost` in production.

## How it works

**1. Vercel**
- Git deploys are already off in `vercel.json`.
- Link the project locally: `pnpm dlx vercel@latest login`, then `pnpm dlx vercel@latest link` (`.vercel/` is gitignored).
- Create an access token at vercel.com/account/tokens; it is shown once.
- In the Vercel project env (Production and Preview), set `NEXT_PUBLIC_RACE_SERVER_URL` to the deployed Worker URL.
  The workflows `vercel pull` this env before building.

**2. Cloudflare**
- Create an API token from the **Edit Cloudflare Workers** template (covers Worker scripts and Durable Objects), scoped to the hosting account.
- Find the account ID on the Workers & Pages overview, or run `pnpm --filter @globe/race-server exec wrangler whoami`.
- All Worker config is committed in `server/wrangler.jsonc`; nothing is set in the dashboard.

**3. GitHub (Settings, Secrets and variables, Actions)**

| Kind | Name | Used by | Value |
|---|---|---|---|
| Secret | `VERCEL_TOKEN` | site workflows | Vercel token |
| Secret | `CLOUDFLARE_API_TOKEN` | `race-server-deploy.yml` | Cloudflare token |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | `race-server-deploy.yml` | Account ID |
| Variable | `RACE_SERVER_URL` | Worker smoke test | Worker URL, no trailing slash |

**4. Optional**
- Start versioning somewhere other than `v0.0.0`: push a tag such as `v0.1.0`.
- Protect `main`: require a PR and the **Lint, Type Check & Build** status check.

**5. Verify**
- Open a PR: "PR Checks" deploys a preview and comments its URL.
- Merge it: "Production Deploy" tags, releases, and the settings footer shows the version.
- Touch `server/` (or run "Race Server Deploy"): the smoke test logs `Healthy.` and `curl $RACE_SERVER_URL/health` returns 200.

## Tech

- Vercel CLI, Cloudflare Workers + Durable Objects, Wrangler, GitHub Actions secrets and variables

## Key files

- `vercel.json` - Vercel git integration off
- `server/wrangler.jsonc` - Worker name `globe-race`, `RaceRoom` Durable Object, `ROOM_LIMITER`, `ALLOWED_ORIGINS`
- `server/src/origin.ts` - origin allowlist check
- `lib/race/config.ts` - reads `NEXT_PUBLIC_RACE_SERVER_URL`, defaults to `http://localhost:8787`

## Decisions and gotchas

- `ALLOWED_ORIGINS` gates room creation and socket upgrades by `Origin`.
  Loopback and private-network origins are always allowed, so local dev needs no entry.
  Add an origin by editing `wrangler.jsonc` and merging.
- **Vercel previews can't race.**
  `*.vercel.app` is not in `ALLOWED_ORIGINS`, so room creation from a preview returns 403.
- Without `RACE_SERVER_URL`, the smoke test is skipped, not failed.
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` exist on the repo, but no workflow uses them.

| Symptom | Fix |
|---|---|
| "Tag already exists" | That version shipped; manual-release a new version or delete a mistaken tag |
| Version shows `dev` | Expected locally; CI sets `NEXT_PUBLIC_APP_VERSION` on the build step |
| Worker didn't deploy | Check the change touched a trigger path ([CI/CD](ci-cd.md)) |
| Wrangler auth error | Check `CLOUDFLARE_API_TOKEN` scope and `CLOUDFLARE_ACCOUNT_ID` |
| Race: "origin not allowed" (403) | Add the origin to `ALLOWED_ORIGINS` |
| Race can't connect in production | `NEXT_PUBLIC_RACE_SERVER_URL` unset in Vercel |

## Related

- [CI/CD](ci-cd.md)
- [Versioning](versioning.md)
- [Race server](race-server.md)
