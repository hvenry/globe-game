# CI/CD for globe.expert

CI/CD pipeline setup with GitHub Actions, automated versioning, and Vercel deployments.

## Overview

CI/CD workflow includes:

- **Feature branches** → PR checks + preview deployments
- **Main branch** → Automatic production deployment with semantic versioning
- **GitHub Releases** → Automated changelog generation and release creation
- **Version display** → App version shown in game settings

## Prerequisites

- GitHub repository with admin access
- Vercel account with the project already connected
- Node.js 20+ installed locally

## Step 1: Configure Vercel

### 1.1 Disable Automatic Deployments

### 1.2 Get Your Vercel Project Information

```bash
# Install Vercel CLI
npm install -g vercel@latest

# Login to Vercel
vercel login

# Link project (run in project directory)
vercel link

# Get Org ID and Project ID
cat .vercel/project.json
```

### 1.3 Create Vercel Access Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: `GitHub Actions - globe.expert`
4. Set expiration as needed (recommend: No Expiration for production)
5. Click "Create"
6. **Copy the token immediately** (you won't see it again)

## Step 2: Configure GitHub Secrets

1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

| Secret Name         | Value                           | Description            |
| ------------------- | ------------------------------- | ---------------------- |
| `VERCEL_TOKEN`      | `your-token-from-step-1.3`      | Vercel API token       |
| `VERCEL_ORG_ID`     | `your-org-id-from-step-1.2`     | Vercel organization ID |
| `VERCEL_PROJECT_ID` | `your-project-id-from-step-1.2` | Vercel project ID      |

## Step 3: Add Vercel Configuration File

Create a `.vercel/project.json` file in your repository if it doesn't exist:

```json
{
  "orgId": "your-org-id",
  "projectId": "your-project-id",
  "settings": {
    "framework": "nextjs"
  }
}
```

## Step 4: Create Initial Version Tag

```bash
# Create initial tag
git tag v0.1.0

# Push the tag
git push origin v0.1.0
```

## Step 5: Test the Workflow

### Test PR Workflow

1. Create a new branch:

   ```bash
   git checkout -b feature/test-ci-cd
   ```

2. Make a small change (e.g., update a comment)

3. Commit and push:

   ```bash
   git add .
   git commit -m "feat: test CI/CD pipeline"
   git push origin feature/test-ci-cd
   ```

4. Create a Pull Request on GitHub

5. Watch the **PR Checks** workflow run:
   - Linting
   - Type checking
   - Build
   - Preview deployment
   - PR comment with preview URL

### Test Production Deployment

1. Merge your PR to `main`

2. Watch two workflows run:
   - **Determine Version**: Analyzes commits and creates version
   - **Deploy to Production**: Builds, deploys, tags, and creates release

3. Check:
   - Vercel deployment
   - New git tag (e.g., `v0.2.0`)
   - GitHub Release with changelog
   - Version displayed in game settings

## Semantic Versioning Rules

The pipeline automatically determines version bumps based on commit messages:

| Commit Prefix                        | Version Bump              | Example                        |
| ------------------------------------ | ------------------------- | ------------------------------ |
| `BREAKING CHANGE:` or `major:`       | **Major** (1.0.0 → 2.0.0) | `major: redesign game logic`   |
| `feat:` or `feature:`                | **Minor** (1.0.0 → 1.1.0) | `feat: add multiplayer mode`   |
| `fix:`, `bugfix:`, `patch:` or other | **Patch** (1.0.0 → 1.0.1) | `fix: correct country borders` |

### Commit Message Examples

```bash
# Minor version bump (new feature)
git commit -m "feat: add dark mode toggle"

# Patch version bump (bug fix)
git commit -m "fix: resolve timer accuracy issue"

# Major version bump (breaking change)
git commit -m "major: rewrite game engine with breaking API changes"

# Multiple commits - highest bump wins
git commit -m "fix: typo in menu"
git commit -m "feat: add new game mode"
# Result: Minor bump (0.1.0 → 0.2.0)
```

## Manual Releases

For special releases (e.g., v1.0.0), use the manual release workflow:

1. Go to **Actions** tab in GitHub
2. Select **Manual Release** workflow
3. Click **Run workflow**
4. Fill in:
   - **Version**: `1.0.0` (without 'v' prefix)
   - **Pre-release**: Check if this is a beta/RC
   - **Release notes**: Optional custom notes
5. Click **Run workflow**

## Workflow Files Explained

### `.github/workflows/pr-checks.yml`

- Runs on every PR to `main`
- Performs linting, type checking, and build
- Creates Vercel preview deployment
- Comments on PR with preview URL

### `.github/workflows/production-deploy.yml`

- Runs on every push to `main`
- Automatically determines version bump
- Deploys to Vercel production
- Creates git tag
- Generates changelog and GitHub release

### `.github/workflows/manual-release.yml`

- Manually triggered from GitHub UI
- Allows custom version and release notes
- Useful for major releases or hotfixes

## Version Display

The app version is now displayed in:

- Game settings menu (bottom)
- Main menu (bottom)

The version comes from the `NEXT_PUBLIC_APP_VERSION` environment variable, which is set during build by GitHub Actions.

## Troubleshooting

### "Vercel token is invalid"

- Regenerate your Vercel token
- Update the `VERCEL_TOKEN` secret in GitHub

### "Tag already exists"

- This means the version was already released
- Check your git tags: `git tag -l`
- Either use manual release with a new version, or delete the tag if it was a mistake

### Preview deployment not working

- Check that Vercel preview deployments are enabled in project settings
- Verify `VERCEL_TOKEN` has correct permissions
- Check GitHub Actions logs for detailed errors

### Version showing as "dev"

- This is normal in local development
- In production, ensure `NEXT_PUBLIC_APP_VERSION` is set in the build step

### Workflow not triggering

- Ensure workflows are enabled: **Settings** → **Actions** → **General** → **Allow all actions**
- Check branch protection rules aren't blocking pushes

## Best Practices

1. **Use conventional commits**: Follow the commit message format for automatic versioning
2. **Feature branches**: Always work in feature branches, never commit directly to main
3. **Small PRs**: Keep pull requests focused and reviewable
4. **Test previews**: Always check the preview deployment before merging
5. **Release notes**: For major releases, use manual release with custom notes

## Branch Protection (Recommended)

Set up branch protection for `main`:

1. Go to **Settings** → **Branches**
2. Add rule for `main` branch
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass (select "Lint, Type Check & Build")
   - ✅ Require branches to be up to date
   - ✅ Do not allow bypassing the above settings

This ensures all code is reviewed and passes checks before deployment.

## Next Steps

1. ✅ Complete Steps 1-5 above
2. ✅ Test with a feature branch PR
3. ✅ Set up branch protection rules
4. ✅ Update your team on the new workflow
5. 🚀 Start shipping with confidence!

---

## Quick Reference

### Create Feature Branch

```bash
git checkout -b feature/my-feature
git commit -m "feat: add amazing feature"
git push origin feature/my-feature
# Create PR on GitHub
```

### Deploy to Production

```bash
# Merge PR to main (via GitHub UI with approvals)
# Deployment happens automatically!
```

### Check Current Version

```bash
git describe --tags --abbrev=0
```

### View All Releases

Visit: `https://github.com/YOUR_USERNAME/globe-game/releases`
