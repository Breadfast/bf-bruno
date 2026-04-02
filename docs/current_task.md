# Current Task

> **FORCE RULES — MUST FOLLOW**
>
> 1. **Before starting any task**, read `docs/analysis.md` and `docs/sprint-plan.md` to understand the full context, feature gaps, priorities, and where the current task fits in the overall roadmap. Never work in isolation from these documents.
> 2. **After completing each task or sprint**, update ALL three documents:
>    - `docs/current_task.md` — Mark the task as completed, swap in the next task with full details.
>    - `docs/sprint-plan.md` — Mark the completed task(s) as `[x]`, update the sprint status, and update exit criteria checkboxes.
>    - `docs/analysis.md` — If the completed task resolves or partially addresses a feature gap, update the relevant section with implementation status and any deviations from the original recommendation.

---

**Sprint:** 2 + 3 — Git UI
**Status:** Completed
**Owner:** Dev 1
**Started:** 2026-04-02
**Completed:** 2026-04-02

---

## What Was Built

### Full Git UI — matching Bruno Pro pattern

A complete Git integration built into the fork, equivalent to the Bruno Pro/Ultimate Git features. The entire Git backend (1,814 lines, 45+ functions) was already implemented in `utils/git.js` by the upstream Bruno codebase — our work was wiring it to IPC handlers and building the UI.

---

### Architecture

**Backend (Electron main process):**
- 38 IPC handlers in `packages/bruno-electron/src/ipc/git.js` — all wired to existing `utils/git.js` functions
- Covers: status, stage/unstage/discard, commit, push/pull/fetch, branches, logs, stash, diffs, conflict resolution, remotes, init
- `resolveGitRoot()` helper — translates collection paths to git root paths
- New handler: `renderer:git-read-conflicted-file` for reading conflict marker content

**State (Redux):**
- New `slices/git.js` — per-collection git state (branch, status, staged/unstaged files, logs, stashes, ahead/behind, active diff, commit message)
- 15 reducers + 20 async thunks wrapping IPC calls
- Registered in Redux store

**UI (React):**

| Component | Description |
|---|---|
| **Branch pill** in CollectionHeader | Shows current branch name, clickable dropdown with: Create New Branch, Checkout Branch, Push, Pull, Git UI |
| **Git UI tab** | Opens as a tab (like request tabs) with orange Git icon — matches Bruno Pro pattern |
| **Changes sub-tab** | Staged/unstaged/conflicted file lists with stage (+), unstage (−), discard (↩) buttons per file. "Commit Changes" button opens commit modal |
| **Commits sub-tab** | Commit history with author, hash, date, insertions/deletions |
| **Stash sub-tab** | Create stash (with optional message), apply/drop stashes |
| **Commit modal** | "COMMIT COLLECTION CHANGES" modal with commit message textarea — matches Bruno Pro |
| **Checkout Branch modal** | Lists all local branches, click to switch. Current branch shown with checkmark |
| **Create New Branch modal** | Branch name input + Create button |
| **Git Init modal** | "Initialize Git Repository" prompt for collections not in a git repo — matches Bruno free version |
| **Conflict resolution modal** | Per-file editor to resolve merge conflicts. Disabled "Resolve & Continue Merge" until all conflict markers removed |
| **Loading indicator** | "Processing..." bar during git operations |
| **Auto-refresh** | Git status refreshes every 5 seconds and on collection tree updates |

**Bug fix:**
- `collection-watcher.js` — skip files with git conflict markers (`<<<<<<<`, `>>>>>>>`) to prevent YAML parser crash when merge conflicts exist on disk

---

### Files Created

| File | Description |
|---|---|
| `packages/bruno-app/src/providers/ReduxStore/slices/git.js` | Redux slice — per-collection git state, 15 reducers, 20 async thunks |
| `packages/bruno-app/src/components/Git/GitUITab/index.js` | Git UI tab content — Changes/Commits/Stash sub-tabs, commit modal, conflict resolver |
| `packages/bruno-app/src/components/Git/GitUITab/StyledWrapper.js` | Styled components for Git UI tab |
| `packages/bruno-app/src/components/Git/GitPanel/index.js` | (Legacy side-panel — replaced by tab approach but kept for reference) |
| `packages/bruno-app/src/components/Git/GitPanel/StyledWrapper.js` | (Legacy) |
| `packages/bruno-app/src/components/Git/GitInitModal/index.js` | Git init modal for non-git collections |

### Files Modified

| File | Change |
|---|---|
| `packages/bruno-electron/src/ipc/git.js` | Expanded from 22 → 300+ lines. 38 IPC handlers wired to existing utils/git.js functions |
| `packages/bruno-app/src/components/RequestTabs/CollectionHeader/index.js` | Added branch pill, dropdown menu (Push/Pull/Checkout/Create Branch/Git UI), git root detection on mount, Git Init modal, Checkout/Create branch modals |
| `packages/bruno-app/src/components/RequestTabs/RequestTab/SpecialTab.js` | Added `git-ui` tab type with orange GitBranch icon |
| `packages/bruno-app/src/components/RequestTabs/RequestTab/index.js` | Added `git-ui` to specialTabs array |
| `packages/bruno-app/src/components/RequestTabPanel/index.js` | Added `git-ui` tab type rendering to GitUITab |
| `packages/bruno-app/src/providers/ReduxStore/slices/tabs.js` | Added `git-ui` to nonReplaceableTabTypes |
| `packages/bruno-app/src/providers/ReduxStore/index.js` | Registered git reducer |
| `packages/bruno-electron/src/app/collection-watcher.js` | Added conflict marker guards in `add` and `change` handlers to prevent parser crash |

---

### Verification

- **Tested with real repo** — 39 workspaces, 554 collections via SSH (github.bf:Breadfast/bruno-api.git)
- **Stage/commit/push/pull** — all working
- **Branch create/switch** — working
- **Stash create/apply/drop** — working
- **Conflict resolution** — merge conflict detected, resolver modal works, continue merge works
- **All 25 test suites pass** (245 tests, 0 failures)

---

## Completed Sprints Summary

| Sprint | Status | Key Deliverables |
|---|---|---|
| Sprint 0 | ~80% done | CI verified, Postman import (ZIP + workspace folder), 554 collections imported. Audit/validation deferred. |
| Sprint 1 | ~40% done | Workspace limits done (no limit exists). OpenAPI sync limit remaining. |
| Sprint 2 | Complete | Full Git UI: stage, commit, push, pull, fetch, text diff, error handling |
| Sprint 3 | Complete | Branch create/switch, stash, conflict resolution, auto-refresh, git init |

---

## Next Steps

Remaining work from the roadmap:

- **Sprint 1.5-1.8** — Remove OpenAPI sync limit (5/month → unlimited)
- **Sprint 4** — Collection Discovery Hub, Shared Secrets, CI/CD reports
- **Sprint 5** — Auto-update & distribution, Mock Server, Request chaining
- **Operational** — Tasks 0.6-0.10 (script translation audit, validation, documentation)
