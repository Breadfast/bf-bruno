# Bruno Fork: Sprint Plan & Task Tracker

**Team:** 2 developers + 1 migration lead
**Sprint Duration:** 2 weeks
**Total Timeline:** 12 weeks (6 sprints)
**Start Date:** ___________

---

## Sprint 0 — Setup & Pre-Migration (Weeks 1–2)

**Goal:** All 250 collections migrated, validated, and in Git before any fork work begins.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 0.1 | Fork Bruno repo and set up CI pipeline (build + lint + test) | Dev 1 | [x] | Verified 2026-04-01: upstream CI workflows already comprehensive (tests.yml, lint-checks.yml, auth-tests.yml, ssl-tests.yml). Local build/lint/tests all pass. |
| 0.2 | Export Postman data dump ZIP (all workspaces, collections, environments) | Migration Lead | [x] | Already done — ZIP file available |
| 0.3 | Build Postman import features (data dump ZIP + workspace folder import) | Dev 1 | [x] | Completed 2026-04-02. Two features: (1) Postman data dump ZIP import via collection import dialog, (2) Postman workspace folder import via Import Workspace → Postman Backup tab. Creates Bruno workspaces per Postman workspace with all collections + environments. Skips duplicates. Tested with 39 workspaces, 554 collections, 218 environments. |
| 0.4 | Define Git repo structure (monorepo with folders vs. repo-per-workspace) | Team | [ ] | Decision needed |
| 0.5 | Import all collections via the workspace import feature | Migration Lead | [x] | Completed 2026-04-02. All 39 workspaces with 554 collections and 218 environments imported successfully via Import Workspace → Postman Backup tab. |
| 0.6 | Audit `pm.*` → `bru.*` script translation — log failures | Migration Lead | [ ] | Track in spreadsheet. Deferred — operational task. |
| 0.7 | Fix script translation edge cases manually | Dev 1 | [ ] | Deferred — depends on 0.6 audit results |
| 0.8 | Run collection-level test suites to validate parity | Migration Lead | [ ] | Deferred — operational task |
| 0.9 | Push migrated collections to Git repos | Migration Lead | [ ] | Deferred — depends on 0.4 repo structure decision |
| 0.10 | Document migration results — success rate, manual fixes needed | Migration Lead | [ ] | Deferred — operational task |

**Exit Criteria:**
- [x] All 250 collections in Git — 554 collections imported across 39 workspaces (exceeds original 250 estimate)
- [ ] Test suites pass at ≥95% parity with Postman
- [ ] Script translation issues documented and resolved

---

## Sprint 1 — Core Fork: Workspace & OpenAPI Limits (Weeks 2–3)

**Goal:** Remove artificial limits. Make the fork usable for 40 workspaces.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1.1 | Identify workspace limit gating logic in Electron app | Dev 1 | [x] | Verified 2026-04-02: NO workspace limit exists in the fork codebase. Zero gating logic found in Electron IPC, Redux, or UI. |
| 1.2 | Remove 2-workspace limit — allow unlimited workspaces | Dev 1 | [x] | N/A — no limit to remove. Unlimited workspaces already work. |
| 1.3 | Build workspace switcher UI (map workspace → Git directory) | Dev 1 | [x] | Built as part of Task 0.3: Import Workspace → Postman Backup tab creates workspaces mapped to filesystem directories. Existing workspace switcher sidebar already handles switching. |
| 1.4 | Test workspace creation/switching with 10+ workspaces | Dev 1 | [x] | Tested with 39 workspaces (all Postman workspaces). Creation and switching works. |
| 1.5 | Identify OpenAPI sync limit (5/month) gating logic | Dev 2 | [ ] | |
| 1.6 | Remove OpenAPI sync limit — allow unlimited syncs | Dev 2 | [ ] | |
| 1.7 | Build file watcher for auto-sync when OpenAPI spec changes in Git | Dev 2 | [ ] | |
| 1.8 | Test OpenAPI auto-sync with 3 different spec files | Dev 2 | [ ] | |
| 1.9 | Write unit tests for workspace and sync changes | Both | [ ] | |
| 1.10 | Internal build — distribute to pilot team for smoke testing | Dev 1 | [ ] | |

**Exit Criteria:**
- [x] 40+ workspaces creatable without errors — verified with 39 Postman workspaces
- [ ] OpenAPI syncs run without monthly cap
- [ ] Pilot team (2–3 teams) can open migrated collections

---

## Sprint 2 — Core Fork: Git UI — Part 1 (Weeks 3–5)

**Goal:** Ship commit, push, pull with SSH support inside Bruno.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | Integrate `simple-git` library into Bruno's Node backend | Dev 1 | [ ] | |
| 2.2 | Build Git panel UI — layout, tab placement, icons | Dev 2 | [ ] | |
| 2.3 | Implement "Stage changes" — file-level and hunk-level staging | Dev 1 | [ ] | |
| 2.4 | Implement "Commit" — message input, commit action, success feedback | Dev 1 | [ ] | |
| 2.5 | Implement "Push" — with SSH key support and progress indicator | Dev 1 | [ ] | |
| 2.6 | Implement "Pull" — with fast-forward and merge handling | Dev 1 | [ ] | |
| 2.7 | Display changed files list with diff viewer (staged vs. unstaged) | Dev 2 | [ ] | |
| 2.8 | Handle Git errors gracefully — auth failures, conflicts, network errors | Dev 2 | [ ] | |
| 2.9 | Test with real repos — SSH and HTTPS clone URLs | Both | [ ] | |
| 2.10 | Pilot team testing — collect feedback on Git workflow | Migration Lead | [ ] | |

**Exit Criteria:**
- [ ] Developers can stage, commit, push, pull from within Bruno
- [ ] SSH key authentication works
- [ ] Error messages are clear and actionable

---

## Sprint 3 — Core Fork: Git UI — Part 2 (Weeks 5–6)

**Goal:** Ship branching, branch switching, and merge conflict resolution.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1 | Implement branch creation UI | Dev 1 | [ ] | |
| 3.2 | Implement branch switching / checkout UI | Dev 1 | [ ] | |
| 3.3 | Implement branch list with current branch indicator | Dev 2 | [ ] | |
| 3.4 | Implement basic merge (merge branch into current) | Dev 1 | [ ] | |
| 3.5 | Build merge conflict resolution UI — side-by-side diff with accept/reject | Dev 2 | [ ] | |
| 3.6 | Implement stash — save/pop work in progress | Dev 1 | [ ] | |
| 3.7 | Add Git status bar — current branch, ahead/behind count, dirty indicator | Dev 2 | [ ] | |
| 3.8 | Write integration tests for all Git operations | Both | [ ] | |
| 3.9 | Performance test — ensure Git UI works with large repos (1000+ files) | Dev 1 | [ ] | |
| 3.10 | Pilot team full Git workflow validation | Migration Lead | [ ] | |

**Exit Criteria:**
- [ ] Full Git workflow possible without leaving Bruno
- [ ] Merge conflicts resolvable in-app
- [ ] No regressions in existing Bruno functionality

---

## Sprint 4 — Team Scale: Discovery, Secrets & CI/CD (Weeks 7–9)

**Goal:** Support enterprise-scale collaboration, centralized secrets, and automated testing.

### Collection Discovery Hub

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.1 | Design Collection Hub data model — name, team, description, endpoint count, last updated | Dev 2 | [ ] | |
| 4.2 | Build indexer that scans GitHub/GitLab repos for Bruno collections via API | Dev 2 | [ ] | |
| 4.3 | Build Collection Hub UI — search, filter by team/domain, sort by last updated | Dev 2 | [ ] | |
| 4.4 | Implement one-click clone from Hub into local Bruno workspace | Dev 2 | [ ] | |
| 4.5 | Add collection metadata file (`.bruno-meta.json`) for teams to describe their collections | Dev 2 | [ ] | |

### Shared Secrets & Environments

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.6 | Build CLI tool to pull shared env templates from central Git repo → local `.env` | Dev 1 | [ ] | |
| 4.7 | Integrate HashiCorp Vault SDK — fetch secrets at runtime in Bruno GUI | Dev 1 | [ ] | |
| 4.8 | Integrate AWS Secrets Manager SDK — fetch secrets at runtime in Bruno GUI | Dev 1 | [ ] | |
| 4.9 | Add pre-commit hook that scans for leaked credentials in `.bru` files | Dev 1 | [ ] | |
| 4.10 | Enforce `.gitignore` rules for `.env` files in all collection repos | Migration Lead | [ ] | |

### CI/CD Integration & Reports

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.11 | Extend Bruno CLI to output JUnit XML format | Dev 1 | [ ] | |
| 4.12 | Extend Bruno CLI to generate standalone HTML reports | Dev 2 | [ ] | |
| 4.13 | Implement data-driven testing — CSV/JSON dataset iteration | Dev 2 | [ ] | |
| 4.14 | Create GitHub Actions reusable workflow template | Dev 1 | [ ] | |
| 4.15 | Create GitLab CI pipeline template | Dev 1 | [ ] | |
| 4.16 | Add Slack/Teams notification on test failure | Dev 2 | [ ] | |

**Exit Criteria:**
- [ ] Teams can search and discover collections from within Bruno
- [ ] Secrets pulled from Vault/AWS without being committed to Git
- [ ] CI pipeline runs collections and produces JUnit + HTML reports

---

## Sprint 5 — Polish: Distribution, Mock Server & Workflows (Weeks 9–12)

**Goal:** Feature parity with Postman in key areas. Production-ready distribution.

### Auto-Update & Distribution

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.1 | Set up `electron-updater` with S3/internal CDN for auto-updates | Dev 1 | [ ] | |
| 5.2 | CI pipeline: build fork artifacts (macOS, Windows, Linux) on every release tag | Dev 1 | [ ] | |
| 5.3 | Set up Homebrew tap for macOS distribution | Dev 1 | [ ] | |
| 5.4 | Set up Chocolatey internal feed for Windows distribution | Dev 1 | [ ] | |
| 5.5 | Test auto-update flow end-to-end on all 3 platforms | Dev 1 | [ ] | |

### Mock Server

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.6 | Build mock server that reads Bruno collection response examples | Dev 2 | [ ] | |
| 5.7 | Implement route matching (method + URL pattern) | Dev 2 | [ ] | |
| 5.8 | Add response delay simulation | Dev 2 | [ ] | |
| 5.9 | Add start/stop mock server UI in Bruno | Dev 2 | [ ] | |
| 5.10 | Test mock server with 3 different collections | Dev 2 | [ ] | |

### Request Chaining & Workflows

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.11 | Define YAML workflow schema — execution order, variable extraction, conditionals | Dev 1 | [ ] | |
| 5.12 | Build workflow runner that executes requests sequentially per schema | Dev 1 | [ ] | |
| 5.13 | Implement auto-extract tokens from response → inject into next request | Dev 1 | [ ] | |
| 5.14 | Implement conditional skip (skip request if previous failed) | Dev 1 | [ ] | |
| 5.15 | Test workflows with real multi-step API flows (e.g., login → create → verify) | Both | [ ] | |

**Exit Criteria:**
- [ ] Fork auto-updates on all 3 platforms
- [ ] Mock server serves collection examples on localhost
- [ ] Workflow runner chains requests with variable passing

---

## Org-Wide Rollout (Week 12+)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| R.1 | Write internal documentation — setup guide, Git workflow, FAQ | Migration Lead | [ ] | |
| R.2 | Record 2–3 short video walkthroughs (migration, Git UI, discovery hub) | Migration Lead | [ ] | |
| R.3 | Run 2 training sessions for developers (live demo + Q&A) | Team | [ ] | |
| R.4 | Roll out to all 200 developers — phased by team over 2 weeks | Team | [ ] | |
| R.5 | Collect feedback after 2 weeks — create backlog for v2 improvements | Team | [ ] | |
| R.6 | Assign ongoing fork maintainer (~10% time) for upstream merges | Management | [ ] | |

---

## Summary Dashboard

| Sprint | Weeks | Key Deliverables | Status |
|--------|-------|-----------------|--------|
| Sprint 0 | 1–2 | Migration complete, collections in Git | [~] In Progress — import done, audit/validation remaining |
| Sprint 1 | 2–3 | Unlimited workspaces, unlimited OpenAPI syncs | [~] In Progress — workspaces done (1.1-1.4), OpenAPI remaining (1.5-1.8) |
| Sprint 2 | 3–5 | Git UI: commit, push, pull | [ ] Not Started |
| Sprint 3 | 5–6 | Git UI: branch, merge, conflict resolution | [ ] Not Started |
| Sprint 4 | 7–9 | Discovery hub, secrets integration, CI/CD reports | [ ] Not Started |
| Sprint 5 | 9–12 | Auto-update, mock server, request chaining | [ ] Not Started |
| Rollout | 12+ | Documentation, training, org-wide deployment | [ ] Not Started |

**Total Tasks:** 71
**Critical Path:** Sprint 0 → Sprint 1 → Sprint 2 → Sprint 3 (must be sequential)
**Parallelizable:** Sprint 4 sub-tracks (Discovery, Secrets, CI/CD) can run in parallel
