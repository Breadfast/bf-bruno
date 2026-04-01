# Current Task

> **FORCE RULES — MUST FOLLOW**
>
> 1. **Before starting any task**, read `docs/analysis.md` and `docs/sprint-plan.md` to understand the full context, feature gaps, priorities, and where the current task fits in the overall roadmap. Never work in isolation from these documents.
> 2. **After completing each task or sprint**, update ALL three documents:
>    - `docs/current_task.md` — Mark the task as completed, swap in the next task with full details.
>    - `docs/sprint-plan.md` — Mark the completed task(s) as `[x]`, update the sprint status, and update exit criteria checkboxes.
>    - `docs/analysis.md` — If the completed task resolves or partially addresses a feature gap, update the relevant section with implementation status and any deviations from the original recommendation.

---

**Sprint:** 0 — Setup & Pre-Migration
**Task:** 0.1 — Fork Bruno repo and set up CI pipeline
**Status:** In Progress
**Owner:** Dev 1
**Started:** ___________

---

## Objective

Set up the forked Bruno repository with a working CI pipeline that builds, lints, and tests the project on every push. This is the foundation for all subsequent work.

---

## Context

- Bruno is a monorepo with 15 packages managed via npm workspaces
- Key packages: `bruno-app` (React UI), `bruno-electron` (Electron shell), `bruno-cli`, `bruno-converters`, `bruno-js`, `bruno-lang`, `bruno-filestore`
- The Postman-to-Bruno converter lives at `packages/bruno-converters/src/postman/`
- Existing test infrastructure: Jest (unit), Playwright (e2e)
- Build tooling: Rollup, Webpack (via Electron)

---

## Subtasks

| # | Subtask | Status | Notes |
|---|---------|--------|-------|
| 1 | Verify the fork builds successfully locally (`npm install && npm run build`) | [ ] | |
| 2 | Verify existing test suites pass (`npm test`) | [ ] | |
| 3 | Verify the Electron app launches and loads a collection | [ ] | Manual check |
| 4 | Create CI workflow file (`.github/workflows/ci.yml`) | [ ] | GitHub Actions |
| 5 | CI job: Install dependencies | [ ] | |
| 6 | CI job: Run ESLint | [ ] | Uses `eslint.config.js` at root |
| 7 | CI job: Run Jest unit tests across all packages | [ ] | |
| 8 | CI job: Build all packages | [ ] | |
| 9 | CI job: Run Playwright e2e tests (optional — can be nightly) | [ ] | May need Electron in CI |
| 10 | CI triggers on: push to `main`, pull requests | [ ] | |
| 11 | Add branch protection rule: require CI pass before merge | [ ] | |
| 12 | Document build & CI setup in repo README or CONTRIBUTING | [ ] | |

---

## Key Files

| File / Path | Purpose |
|---|---|
| `package.json` (root) | Monorepo workspace definitions, root scripts |
| `eslint.config.js` | ESLint configuration |
| `playwright.config.ts` | Playwright e2e test config |
| `packages/bruno-app/` | React frontend (Next.js) |
| `packages/bruno-electron/` | Electron main process |
| `packages/bruno-cli/` | CLI tool for running collections |
| `packages/bruno-converters/` | Import/export converters (Postman, OpenAPI, etc.) |
| `scripts/` | Build and utility scripts |

---

## Commands Reference

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Run Playwright e2e
npx playwright test
```

---

## Acceptance Criteria

- [ ] `npm install` completes without errors
- [ ] `npm test` passes (or known failures documented)
- [ ] `npm run build` produces working artifacts
- [ ] CI pipeline runs on every push to `main` and on PRs
- [ ] CI pipeline passes green on current codebase
- [ ] At least one successful CI run visible in GitHub Actions

---

## Blockers

_None identified yet._

---

## Next Task

After completion, move to **Task 0.2** — Export all 40 Postman workspaces as JSON v2.1 collections.
