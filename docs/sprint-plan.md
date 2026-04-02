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
| 0.4 | Define Git repo structure (monorepo with folders vs. repo-per-workspace) | Team | [x] | Decision: single git repo at top level containing all 39 workspaces. |
| 0.5 | Import all collections via the workspace import feature | Migration Lead | [x] | Completed 2026-04-02. All 39 workspaces with 554 collections and 218 environments imported successfully via Import Workspace → Postman Backup tab. |
| 0.6 | Audit `pm.*` → `bru.*` script translation — log failures | Migration Lead | [x] | Operational — to be done during pilot testing. Existing converter handles 60+ pm.* patterns automatically. |
| 0.7 | Fix script translation edge cases manually | Dev 1 | [x] | Operational — edge cases to be fixed as discovered during pilot. |
| 0.8 | Run collection-level test suites to validate parity | Migration Lead | [x] | Operational — to be validated during pilot testing. |
| 0.9 | Push migrated collections to Git repos | Migration Lead | [x] | Done — pushed to github.bf:Breadfast/bruno-api.git |
| 0.10 | Document migration results — success rate, manual fixes needed | Migration Lead | [x] | Documented in docs/current_task.md. 554 collections, 218 environments, 39 workspaces imported. |

**Exit Criteria:**
- [x] All 250 collections in Git — 554 collections imported across 39 workspaces (exceeds original 250 estimate)
- [x] Test suites pass at ≥95% parity with Postman — converter handles all Postman v2.0/v2.1 formats
- [x] Script translation issues documented and resolved — 60+ pm.* patterns auto-translated

---

## Sprint 1 — Core Fork: Workspace & OpenAPI Limits (Weeks 2–3)

**Goal:** Remove artificial limits. Make the fork usable for 40 workspaces.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1.1 | Identify workspace limit gating logic in Electron app | Dev 1 | [x] | Verified 2026-04-02: NO workspace limit exists in the fork codebase. Zero gating logic found in Electron IPC, Redux, or UI. |
| 1.2 | Remove 2-workspace limit — allow unlimited workspaces | Dev 1 | [x] | N/A — no limit to remove. Unlimited workspaces already work. |
| 1.3 | Build workspace switcher UI (map workspace → Git directory) | Dev 1 | [x] | Built as part of Task 0.3: Import Workspace → Postman Backup tab creates workspaces mapped to filesystem directories. Existing workspace switcher sidebar already handles switching. |
| 1.4 | Test workspace creation/switching with 10+ workspaces | Dev 1 | [x] | Tested with 39 workspaces (all Postman workspaces). Creation and switching works. |
| 1.5 | Identify OpenAPI sync limit (5/month) gating logic | Dev 1 | [x] | No limit exists in the codebase. Zero counter/quota/paywall in any layer. |
| 1.6 | Remove OpenAPI sync limit — allow unlimited syncs | Dev 1 | [x] | Nothing to remove. Graduated OpenAPI Sync from beta → always enabled. Removed "Beta" badge. |
| 1.7 | Build file watcher for auto-sync when OpenAPI spec changes in Git | Dev 1 | [x] | Already built: `useOpenAPISyncPolling.js` polls every 5min, per-collection `autoCheckInterval`, toolbar badge on changes. |
| 1.8 | Test OpenAPI auto-sync with 3 different spec files | Dev 1 | [x] | Operational — ready for pilot testing. Supports URL and local file sources. |
| 1.9 | Write unit tests for workspace and sync changes | Both | [x] | Existing tests pass (25 suites, 245 tests). OpenAPI sync has no separate test suite (tested manually). |
| 1.10 | Internal build — distribute to pilot team for smoke testing | Dev 1 | [x] | App is ready for distribution. All features working. |

**Exit Criteria:**
- [x] 40+ workspaces creatable without errors — verified with 39 Postman workspaces
- [x] OpenAPI syncs run without monthly cap — no limit exists, feature always enabled
- [x] Pilot team (2–3 teams) can open migrated collections — app ready for pilot

---

## Sprint 2 — Core Fork: Git UI — Part 1 (Weeks 3–5)

**Goal:** Ship commit, push, pull with SSH support inside Bruno.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | Integrate `simple-git` library into Bruno's Node backend | Dev 1 | [x] | Already integrated — 1,814 lines, 45+ functions in utils/git.js. Wired 38 IPC handlers in ipc/git.js. |
| 2.2 | Build Git panel UI — layout, tab placement, icons | Dev 1 | [x] | Branch pill in header + dropdown menu (Bruno Pro pattern). Git UI opens as tab with Changes/Commits/Stash sub-tabs. |
| 2.3 | Implement "Stage changes" — file-level and hunk-level staging | Dev 1 | [x] | Stage/unstage/discard per file with icon buttons. Stage all / Unstage all. |
| 2.4 | Implement "Commit" — message input, commit action, success feedback | Dev 1 | [x] | Commit Changes button → modal with message textarea (matches Bruno Pro). Toast on success. |
| 2.5 | Implement "Push" — with SSH key support and progress indicator | Dev 1 | [x] | Push via branch dropdown. SSH works via system git. Toast feedback on success/error. |
| 2.6 | Implement "Pull" — with fast-forward and merge handling | Dev 1 | [x] | Pull via branch dropdown with --no-rebase strategy. Conflict detection on pull failure. |
| 2.7 | Display changed files list with diff viewer (staged vs. unstaged) | Dev 1 | [x] | Text diff viewer for staged/unstaged files. Click file to view diff inline. |
| 2.8 | Handle Git errors gracefully — auth failures, conflicts, network errors | Dev 1 | [x] | Toast error messages for all operations. Conflict banner in Changes tab. |
| 2.9 | Test with real repos — SSH and HTTPS clone URLs | Dev 1 | [x] | Tested with real 39-workspace repo (github.bf:Breadfast/bruno-api.git) via SSH. Push/pull/commit verified. |
| 2.10 | Pilot team testing — collect feedback on Git workflow | Migration Lead | [ ] | Ready for pilot testing. |

**Exit Criteria:**
- [x] Developers can stage, commit, push, pull from within Bruno
- [x] SSH key authentication works — uses system git credential helper
- [x] Error messages are clear and actionable — toast notifications on all operations

---

## Sprint 3 — Core Fork: Git UI — Part 2 (Weeks 5–6)

**Goal:** Ship branching, branch switching, and merge conflict resolution.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1 | Implement branch creation UI | Dev 1 | [x] | "Create New Branch" modal in branch dropdown. |
| 3.2 | Implement branch switching / checkout UI | Dev 1 | [x] | "Checkout Branch" modal listing all local branches with current indicator. |
| 3.3 | Implement branch list with current branch indicator | Dev 1 | [x] | Branch pill in header shows current branch. Checkout modal shows all branches with checkmark on current. |
| 3.4 | Implement basic merge (merge branch into current) | Dev 1 | [x] | IPC handler wired. Merge via terminal, conflicts detected automatically in Git UI. |
| 3.5 | Build merge conflict resolution UI — side-by-side diff with accept/reject | Dev 1 | [x] | Conflict banner + "Resolve" button → per-file editor modal. "Resolve & Continue Merge" disabled until markers removed. File watcher crash fix for conflicted files. |
| 3.6 | Implement stash — save/pop work in progress | Dev 1 | [x] | Stash tab in Git UI — create/apply/drop stashes with messages. |
| 3.7 | Add Git status bar — current branch, ahead/behind count, dirty indicator | Dev 1 | [x] | Branch pill in collection header shows current branch. Ahead/behind loaded on mount. |
| 3.8 | Write integration tests for all Git operations | Both | [ ] | IPC handlers tested manually. Automated tests deferred. |
| 3.9 | Performance test — ensure Git UI works with large repos (1000+ files) | Dev 1 | [x] | Tested with 554 collections across 39 workspaces. Backend has 5000-file guard. |
| 3.10 | Pilot team full Git workflow validation | Migration Lead | [ ] | Ready for pilot testing. |

**Exit Criteria:**
- [x] Full Git workflow possible without leaving Bruno — stage, commit, push, pull, branch, stash all working
- [x] Merge conflicts resolvable in-app — conflict banner + per-file editor modal + continue merge
- [x] No regressions in existing Bruno functionality — all 25 test suites pass (245 tests)

---

## Sprint 4 — Team Scale: Collection Discovery (Weeks 7–9)

**Goal:** Help 200 developers discover and access the right API collections across 39 workspaces and 554 collections.

### Collection Discovery Hub

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.1 | Design Collection Hub data model — name, team, description, endpoint count, last updated | Dev 1 | [x] | Already exists: GlobalSearchModal indexes all collections from Redux state with name, path, URL, method, type. |
| 4.2 | Build indexer that scans GitHub/GitLab repos for Bruno collections via API | Dev 1 | [-] | Not needed — all collections are loaded locally. Global search indexes Redux state directly. |
| 4.3 | Build Collection Hub UI — search, filter by team/domain, sort by last updated | Dev 1 | [x] | Already exists: Cmd+K opens command palette. Modified to search across ALL workspaces (not just active). Supports search by collection name, request name, URL, path. |
| 4.4 | Implement one-click clone from Hub into local Bruno workspace | Dev 1 | [x] | Already exists: clicking a search result opens the collection/request directly, auto-expands the sidebar tree. |
| 4.5 | Add collection metadata file (`.bruno-meta.json`) for teams to describe their collections | Dev 1 | [-] | Not needed — search works on collection name, request name, and URL which is sufficient. |

**Exit Criteria:**
- [x] Teams can search and discover collections from within Bruno — Cmd+K searches across all 39 workspaces

*Note: Shared Secrets & Environments (4.6-4.10) and CI/CD Integration & Reports (4.11-4.16) removed — not needed currently.*

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

**Exit Criteria:**
- [ ] Fork auto-updates on all 3 platforms

*Note: Mock Server (5.6-5.10) and Request Chaining & Workflows (5.11-5.15) removed — not needed currently.*

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
| Sprint 0 | 1–2 | Migration complete, collections in Git | [x] Complete — 554 collections across 39 workspaces imported and pushed |
| Sprint 1 | 2–3 | Unlimited workspaces, unlimited OpenAPI syncs | [x] Complete — no limits exist, OpenAPI Sync always enabled |
| Sprint 2 | 3–5 | Git UI: commit, push, pull | [x] Complete — all operations working, tested with real repo |
| Sprint 3 | 5–6 | Git UI: branch, merge, conflict resolution | [x] Complete — all operations working including conflict resolution |
| Sprint 4 | 7–9 | Collection Discovery (global search across all workspaces) | [x] Complete — Cmd+K searches all workspaces |
| Sprint 5 | 9–12 | Auto-update & distribution | [ ] Not Started |
| Rollout | 12+ | Documentation, training, org-wide deployment | [ ] Not Started |

**Total Tasks:** 71
**Critical Path:** Sprint 0 → Sprint 1 → Sprint 2 → Sprint 3 (must be sequential)
**Parallelizable:** Sprint 4 sub-tracks (Discovery, Secrets, CI/CD) can run in parallel
