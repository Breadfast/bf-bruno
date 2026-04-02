# Bruno Fork: Feature Gap Analysis & Migration Plan

**For a 200-developer team migrating from Postman**
**40 workspaces · 250 collections · Git-first collaboration**

---

## Executive Summary

Bruno is an open-source, offline-first, Git-friendly API client licensed under MIT. Your team can legally fork it, extend it, and deploy it internally. However, the open-source edition has significant gaps that block a team of your scale — particularly around Git collaboration, workspace limits, and bulk migration.

This document identifies 12 feature gaps, ranks them by impact, provides build recommendations, and lays out a phased 12-week implementation roadmap. A cost comparison shows the fork breaks even against Bruno Pro/Ultimate licensing in approximately 6–8 months.

---

## Overview: What's Free vs. Paid

| Capability | Open Source | Pro ($6/user/mo) | Ultimate ($11/user/mo) |
|---|---|---|---|
| HTTP, REST, GraphQL, gRPC | ✅ | ✅ | ✅ |
| Testing & Scripting | ✅ | ✅ | ✅ |
| Collection Runner | Unlimited | Unlimited | Unlimited |
| Workspaces | **2** | Unlimited | Unlimited |
| Git UI (clone, pull, view diffs) | ✅ | ✅ | ✅ |
| Git UI (commit, push, branch, merge) | ❌ | ✅ | ✅ |
| OpenAPI Syncs | **5/month** | Unlimited | Unlimited |
| Report Generation | ❌ | ✅ | ✅ |
| Data-Driven Testing | ❌ | ✅ | ✅ |
| Secret Manager Integration (GUI) | ❌ | ❌ | ✅ |
| SSO / SCIM | ❌ | ❌ | ✅ |
| Bulk Postman Data Dump Import | ❌ | ❌ | ✅ |
| Mock Server | ❌ | ❌ | ❌ |
| Collection Discovery / Search | ❌ | ❌ | ❌ |

---

## Feature Gap Analysis

### Critical Priority — Must Have Before Migration

#### 1. Git UI: Commit, Push, Branch & Merge

- **Impact:** 10/10
- **Current Status:** Paid Only (Pro/Ultimate)
- **Build Complexity:** ~3–4 weeks

**The Problem:**
The open-source edition only supports clone, view diffs, check for updates, and pull. Commit, push, branching, branch checkout, stash, and merge conflict resolution all require Pro or Ultimate. For 200 developers syncing 250 collections, this is the single biggest blocker. Without it, every developer must drop to the terminal for every Git operation — which breaks the workflow for less Git-savvy team members and dramatically increases friction.

**Recommendation:**
Build a full Git UI panel inside Bruno using `simple-git` (Node.js library). Cover the following operations:

- Stage and commit changes
- Push and pull with SSH key support
- Branch creation and switching
- Basic merge conflict resolution UI

This alone eliminates the #1 friction point for your team and is the highest-value feature to implement.

---

#### 2. Workspace Management (Beyond 2)

- **Impact:** 9/10
- **Current Status:** Limited to 2 in open-source
- **Build Complexity:** ~1 week

**The Problem:**
Open-source Bruno limits you to 2 workspaces. You currently have 40 Postman workspaces. Without expanding this, you cannot organize collections by team, domain, or project — which is critical for a 200-person team.

**Recommendation:**
Remove the workspace limit in your fork. The limit is a license check in the Electron app — identify and remove the gating logic. Then build a workspace switcher UI that maps each workspace to a Git repository or directory. This is a quick win that immediately unblocks your organizational structure.

**Implementation Status:** Completed (2026-04-02). No workspace limit exists in the fork — the codebase has zero gating logic. Unlimited workspaces confirmed with 39+ workspaces. Additionally, a Postman Workspace Folder Import feature was built (Import Workspace → Postman Backup tab) that scans a Postman backup directory, creates a Bruno workspace per subfolder, and imports all collections + environments. Duplicate workspaces are automatically skipped. Feature gap #2 is fully closed.

---

#### 3. Bulk Postman Import & Migration Tooling

- **Impact:** 9/10
- **Current Status:** Basic import in OSS; Data Dump import requires Ultimate
- **Build Complexity:** ~1–2 weeks

**The Problem:**
You can import Postman collections one by one in the open-source edition. But bulk importing a Postman Data Dump (all 40 workspaces at once) requires Ultimate. Script translation from Postman's `pm.*` API to Bruno's `bru.*` API works but isn't 100% accurate — complex or older scripts may need manual fixes.

**Recommendation (UPDATED):**
~~Write a batch migration script~~ → Build the Postman Data Dump import feature directly into the fork, mirroring Bruno Ultimate's "Postman Data Export" import (see https://docs.usebruno.com/get-started/import-export-data/postman-migration).

The approach: modify `FileTab.js` to detect Postman dump ZIPs (containing `collections/*.postman_collection.json` + `environments/*.postman_environment.json`), add an IPC handler to extract/convert the ZIP contents using the existing `postmanToBruno()` and `postmanEnvToBrunoEnv()` converters, and wire the result into the existing `BulkImportCollectionLocation` UI which already supports multi-collection + environment selection, progress tracking, and duplicate renaming.

This is superior to a standalone script because:
1. It's a permanent feature in the fork, usable by any developer (not a one-time script)
2. It reuses 90% of existing infrastructure (converters, bulk UI, ZIP libraries)
3. It mirrors the official Bruno Ultimate feature, reducing the feature gap to zero for this capability

**Implementation Status:** Completed (Task 0.3, 2026-04-02). Added Postman data dump ZIP import to the fork. User drops a Postman data export ZIP → Bruno detects it, extracts all collections and environments, converts them via existing converters, and shows the bulk import UI for selection. Tested with a real 554-collection / 218-environment dump. Feature gap #3 is now fully closed.

---

### High Priority — Needed Within 3 Months

#### 4. Centralized Collection Registry / Discovery

- **Impact:** 9/10
- **Current Status:** Not available in any tier
- **Build Complexity:** ~2–3 weeks

**The Problem:**
With 250 collections across 200 developers, discoverability is a real problem. Postman has search-across-workspaces functionality. Bruno has nothing — each developer must know which repository to clone, which collection lives where, and who owns what.

**Recommendation:**
Build a lightweight internal "Collection Hub" — either as a simple web application or an in-app panel. It should:

- Index all your Bruno collection repositories via GitHub/GitLab API
- Display metadata: name, owning team, last updated timestamp, description, endpoint count
- Provide search and filtering by team, API domain, or keyword
- Support one-click clone directly into Bruno

This feature doesn't exist in Bruno at any price tier, so it's a competitive advantage for your fork.

---

#### 5. Shared Environment & Secrets Distribution

- **Impact:** 8/10
- **Current Status:** Basic `.env` support in OSS; Secret manager GUI integration is Ultimate-only
- **Build Complexity:** ~2 weeks

**The Problem:**
Bruno OSS supports local `.env` files and marking variables as secrets (encrypted locally). But there's no centralized way to distribute shared environment configurations across 200 developers. GUI integration with HashiCorp Vault and AWS Secrets Manager requires the Ultimate edition.

**Recommendation:**
Two-pronged approach:

1. **CLI/Script:** Build a tool that pulls shared environment templates from a central Git repository or Vault instance and populates each developer's local `.env` file. Include a `.env.example` pattern for safe sharing.
2. **GUI Integration:** Add Vault and AWS Secrets Manager support into the open-source Bruno GUI using their Node.js SDKs. This is the same approach Bruno Ultimate uses, but you build it yourself.

Ensure that secrets never hit Git by enforcing `.gitignore` rules and providing pre-commit hooks that scan for leaked credentials.

---

#### 6. Collection Runner: Reports & Data-Driven Testing

- **Impact:** 8/10
- **Current Status:** Runner is free (unlimited); reports and data-driven testing are paid
- **Build Complexity:** ~2 weeks

**The Problem:**
The collection runner itself is free with unlimited runs, which is great. However, HTML report generation and data-driven testing (running requests against CSV/JSON datasets) are paid features. For CI/CD pipelines, your QA team and stakeholders need visible test reports.

**Recommendation:**
Extend the Bruno CLI (`@usebruno/cli`) to:

- Output JUnit XML format (for Jenkins, GitHub Actions, GitLab CI integration)
- Generate HTML reports (standalone, shareable)
- Support a data-driven mode that iterates over CSV or JSON rows per request
- Include timing, pass/fail counts, and failure details

Many teams have accomplished this with custom wrappers around the Bruno CLI.

---

#### 7. CI/CD Pipeline Integration (Enhanced CLI)

- **Impact:** 7/10
- **Current Status:** Basic CLI available and free
- **Build Complexity:** ~2 weeks

**The Problem:**
The Bruno CLI exists and is free, but it lacks rich reporting output formats, parallel execution, and out-of-the-box integration with CI tools like Jenkins, GitHub Actions, or GitLab CI.

**Recommendation:**
Create reusable CI/CD templates:

- **GitHub Actions workflow** that runs Bruno collections, outputs JUnit XML for test result integration, and posts summaries to Slack or Teams
- **GitLab CI pipeline template** with similar capabilities
- **Parallel runner wrapper** that executes multiple collections simultaneously for speed
- **Failure notification** integration with your team's communication tools

**Implementation Status (partial — Task 0.1):**
The upstream fork already includes comprehensive GitHub Actions CI:
- `tests.yml` — unit tests (11 packages), CLI tests (with JUnit XML output), Playwright E2E
- `lint-checks.yml` — ESLint with PR-scoped diff linting
- `auth-tests.yml` / `ssl-tests.yml` — specialized test suites on Linux/macOS/Windows matrix
- Reusable actions for setup, unit tests, CLI tests, and E2E tests
- JUnit XML reporting already implemented in CLI tests via `--format junit`

Remaining work: Slack/Teams notifications, GitLab CI template, parallel runner, HTML report generation.

---

### Medium Priority — Nice to Have (Months 2–3)

#### 8. Mock Server

- **Impact:** 7/10
- **Current Status:** Not available in any tier
- **Build Complexity:** ~3 weeks

**The Problem:**
Bruno has no built-in mock server at all — not even in the paid editions. Postman includes one. For frontend teams waiting on backend APIs, or for integration testing with external dependencies, this is a meaningful gap.

**Recommendation:**
Build a lightweight mock server plugin that:

- Reads Bruno collection response examples and serves them on `localhost`
- Supports route matching based on request method and URL pattern
- Allows response delay simulation for realistic testing

Alternatively, integrate with existing tools like Prism (Stoplight) or `json-server` using a Bruno collection-to-OpenAPI converter.

---

#### 9. OpenAPI Sync (Beyond 5/month)

- **Impact:** 7/10
- **Current Status:** Limited to 5 syncs/month in OSS
- **Build Complexity:** ~1 week

**The Problem:**
OSS Bruno limits OpenAPI syncs to 5 per month. With 250 collections and evolving APIs, you'll exceed that limit almost immediately.

**Recommendation:**
Remove the sync limit in your fork and build a file watcher that auto-syncs when your OpenAPI spec files change in Git. This keeps collections always up to date with your API contracts without manual intervention.

---

#### 10. Auto-Update & Version Management

- **Impact:** 6/10
- **Current Status:** Auto-updater exists in OSS, but your fork needs its own distribution
- **Build Complexity:** ~1–2 weeks

**The Problem:**
Bruno has an auto-updater, but with a custom fork you can't use Bruno's official update channel. Rolling updates to 200 developers needs a distribution strategy.

**Recommendation:**
Set up an internal Electron auto-update server using `electron-updater` with S3 or an internal CDN. Your CI pipeline builds the fork, publishes artifacts, and developers get automatic updates. Alternatively, distribute via internal package managers:

- Homebrew tap (macOS)
- Chocolatey internal feed (Windows)
- Snap/Flatpak (Linux)

---

#### 11. Request Chaining & Workflow Orchestration

- **Impact:** 6/10
- **Current Status:** Not available (Postman has Flows)
- **Build Complexity:** ~3 weeks

**The Problem:**
Postman has Flows for visual API chaining. Bruno has pre/post-request scripts that can pass variables between requests, but no visual workflow builder or automatic token refresh mechanism across sequential requests.

**Recommendation:**
Start with a YAML or JSON-based workflow definition file that the runner executes sequentially:

- Define execution order of requests
- Auto-extract tokens/values from one response and inject into the next request's headers or body
- Support conditional logic (skip request if previous failed)

A full visual flow editor is expensive to build — defer it to a later phase unless there's strong demand from your team.

---

### Low Priority — Skip

#### 12. SSO / SCIM Integration

- **Impact:** 3/10
- **Current Status:** Ultimate Only
- **Build Complexity:** N/A

**The Problem:**
SSO and SCIM are Ultimate features for license management. Since Bruno is offline-first and doesn't have user accounts, SSO mainly applies to license activation, not application access.

**Recommendation:**
Skip this entirely. Since your fork won't need license activation, SSO/SCIM is irrelevant. Your Git provider (GitHub/GitLab) already handles authentication and access control for the collections. Your existing RBAC flows cascade naturally to Bruno.

---

## Implementation Roadmap

### Phase 1 — Pre-Migration (Weeks 1–2)

| Task | Timeline | Impact |
|---|---|---|
| Write batch migration script using `@usebruno/converters` | Week 1–2 | 9/10 |
| Migrate all 40 workspaces and 250 collections | Week 1–2 | 9/10 |
| Validate script translation (pm.* → bru.*) | Week 2 | — |
| Organize into Git repo structure | Week 2 | — |

**Goal:** All collections migrated, validated, and version-controlled before any developer touches the fork.

### Phase 2 — Core Fork (Weeks 2–5)

| Task | Timeline | Impact |
|---|---|---|
| Remove workspace limit (2 → unlimited) | Week 2 | 9/10 |
| Build full Git UI (commit, push, branch, merge) | Weeks 2–5 | 10/10 |
| Remove OpenAPI sync limit (5/month → unlimited) | Week 3 | 7/10 |

**Goal:** The fork is usable for daily work by all 200 developers. This is the minimum viable fork.

### Phase 3 — Team Scale (Weeks 5–8)

| Task | Timeline | Impact |
|---|---|---|
| Build Collection Discovery Hub | Weeks 5–7 | 9/10 |
| Shared secrets & environment distribution | Weeks 6–7 | 8/10 |
| CI/CD integration & report generation | Weeks 7–8 | 8/10 |

**Goal:** The fork supports enterprise-scale collaboration, automated testing, and centralized secrets.

### Phase 4 — Nice to Have (Weeks 8–12)

| Task | Timeline | Impact |
|---|---|---|
| Fork distribution & auto-update server | Weeks 8–9 | 6/10 |
| Mock server | Weeks 9–11 | 7/10 |
| Request chaining & workflow orchestration | Weeks 10–12 | 6/10 |

**Goal:** Feature parity with Postman in key areas, plus capabilities Bruno doesn't offer at any price tier.

---

## Cost Comparison

### Option A: Bruno Pro (200 developers)

- **Annual Cost:** $14,400/year (200 × $6/user/month × 12 months)
- **Includes:** Full Git UI, unlimited workspaces, unlimited OpenAPI syncs, 48-hour support SLA
- **Does NOT include:** SSO/SCIM, secret manager integration, collection discovery, mock server

### Option B: Bruno Ultimate (200 developers)

- **Annual Cost:** $26,400/year (200 × $11/user/month × 12 months)
- **Includes:** Everything in Pro, plus SSO/SCIM, secret manager integration, bulk Postman data dump import, 24-hour support SLA, custom terms
- **Does NOT include:** Collection discovery, mock server

### Option C: Custom Fork (your team)

- **Annual Cost:** $0/year in licensing
- **One-Time Cost:** ~10–12 weeks of engineering effort (1–2 developers)
- **Includes:** Everything you build — full Git UI, unlimited workspaces, secret manager integration, collection discovery hub, mock server, custom CI/CD, full control
- **Ongoing Cost:** Maintenance effort to merge upstream Bruno updates (estimate: ~2–4 hours per Bruno release)

### Break-Even Analysis

| Metric | Pro License | Ultimate License | Custom Fork |
|---|---|---|---|
| Year 1 Cost | $14,400 | $26,400 | Engineering time only |
| Year 2 Cost | $28,800 cumulative | $52,800 cumulative | Maintenance only |
| Year 3 Cost | $43,200 cumulative | $79,200 cumulative | Maintenance only |
| Collection Discovery | ❌ | ❌ | ✅ |
| Mock Server | ❌ | ❌ | ✅ |
| Custom CI/CD Templates | ❌ | ❌ | ✅ |
| Full Control | ❌ | ❌ | ✅ |

The fork breaks even in approximately **6–8 months** compared to Pro licensing and **3–4 months** compared to Ultimate. After that, you save $14K–$26K every year while having features that Bruno doesn't offer at any price.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Upstream Bruno makes breaking architectural changes | Medium | Keep fork changes modular — use separate files/folders. Avoid modifying core Bruno files where possible. Use plugin/extension patterns. |
| Merge conflicts on upstream updates | Medium | Assign one developer as "fork maintainer" who merges upstream releases monthly. Automate merge testing in CI. |
| Migration script misses edge cases in Postman → Bruno conversion | High | Run collection-level test suites post-migration. Have each team validate their own collections during a 2-week parallel-run period. |
| Developer adoption resistance | Medium | Run a pilot with 1–2 teams first (Weeks 1–5). Gather feedback. Address pain points before org-wide rollout. |
| Features you build become available in Bruno OSS | Low | This is actually a good outcome — you can drop your implementation and adopt theirs, reducing maintenance. |

---

## Recommended Team Structure

- **Fork Maintainer (1 developer):** Owns the fork, merges upstream updates, manages distribution. Ongoing role (~10% time after initial build).
- **Feature Developer (1–2 developers):** Builds the features listed above during the 12-week implementation period. Returns to normal duties after.
- **Migration Lead (1 developer or QA):** Runs the Postman export, executes batch migration, validates script translation, coordinates team-by-team validation.
- **Pilot Teams (2–3 teams, ~20 developers):** First adopters during Phase 2. Provide feedback, surface issues, and validate the fork before org-wide rollout.

---

## Conclusion

Forking Bruno is a viable and cost-effective path for your 200-developer team. The MIT license permits it, the codebase (JavaScript/React/Electron) is approachable, and the feature gaps are well-defined and buildable. The critical path is: migrate collections first, build the Git UI and remove workspace limits second, then layer on team-scale features like discovery, secrets, and CI/CD.

The fork also gives you capabilities that Bruno doesn't offer at any price — collection discovery, mock server, and custom CI/CD integration — which become a long-term competitive advantage for your engineering organization.
