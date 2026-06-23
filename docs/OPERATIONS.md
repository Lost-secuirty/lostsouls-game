# Operations — checks, toolchain, and tooling backlog

The single in-repo home for **what must pass before merge**, **what's installed locally to make that
pass**, and **deferred tooling**. Companion to [`STATUS.md`](../STATUS.md) (where the project stands),
[`docs/ROADMAP.md`](ROADMAP.md) / [`docs/BACKLOG.md`](BACKLOG.md) (what's next), and
[`AGENTS.md`](../AGENTS.md) (the Working Agreement). Numbers/commands here are the source of truth for
_process_; gameplay tunables still live in [`src/config.js`](../src/config.js).

> Keep this current when a workflow, script, or pinned tool version changes — it's the thing a new
> contributor (human or agent) reads to reproduce CI locally.

## Required CI checks (must be green before merge)

PR-triggered, from [`.github/workflows/`](../.github/workflows). All run on Node **24**.

| Check (PR status name)           | Workflow                | What it does / fails on                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CI / check**                   | `ci.yml`                | One job, sequential: `format:check` → `lint` → `test` → `test:proof` → `test:coverage` (gate: lines/funcs/statements ≥40%, branches ≥30%, scoped to `src/core/**`, `src/systems/input.js`, `src/entities/pickups.js`) → `npm audit --audit-level=high` → `build` → `smoke:prod` → Playwright browser smoke (preview on 127.0.0.1:4173). Any step fails ⇒ check fails. |
| **CodeQL / analyze**             | `codeql.yml`            | Static security analysis (javascript-typescript).                                                                                                                                                                                                                                                                                                                     |
| **Dependency Review / review**   | `dependency-review.yml` | Fails on a newly introduced/changed dependency with a known vuln or disallowed license.                                                                                                                                                                                                                                                                               |
| **secret-pii-scan / scan**       | `scan.yml`              | `tools/scan_staged.py` self-test, then scans the PR diff for secrets/PII. Fails on any hit.                                                                                                                                                                                                                                                                           |
| **repository-controls** (4 jobs) | `controls.yml`          | `control-audit` (`tools/control_audit.py` vs `.github/control-policy.json`); `pre-commit` (`pre-commit run --all-files`); `workflow-lint` (actionlint + zizmor ≥medium + shellcheck + shfmt); `security-scan` (gitleaks + osv-scanner).                                                                                                                               |
| **Drift Audit / audit**          | `audit.yml`             | `scripts/audit-drift.mjs` compares what was logged (commits, PR body, WORKLOG/LEARNINGS) against the actual diff; posts a PR comment. Fails on drift per the script's policy.                                                                                                                                                                                         |

Plus `scorecard.yml`, `artifacts.yml`, `release.yml`.

### External GitHub-App gates (no workflow file — run server-side on the PR)

- **SonarCloud** — Automatic Analysis (GitHub App). The quality gate fails the PR on: **duplicated lines
  on new code > 3%**, low new-code coverage, new bugs/vulnerabilities/code-smells above the gate, or
  unreviewed security hotspots on new code. **Scope is configured in
  [`.sonarcloud.properties`](../.sonarcloud.properties), NOT `sonar-project.properties`** — Automatic
  Analysis ignores the latter and reads the former **only from the default branch** (so an exclusion
  change must be merged to `main` before it affects a PR). Current CPD exclusions:
  `src/entities/bosses/**`, `src/config.js`, `tests/**`; coverage excluded for `tests/**`, `scripts/**`,
  `src/config.js`, `**/*.config.*`. **No local command reproduces the new-code duplication metric** — it
  is PR-only. To see exactly which file/lines it flags, query the API:
  `curl "https://sonarcloud.io/api/measures/component_tree?component=Lost-secuirty_lostsouls-game&pullRequest=<N>&metricKeys=new_duplicated_lines_density&qualifiers=FIL"`
  (new-code values live under each measure's `period`/`periods` field, not `value`).
- **CodeRabbit** — AI review; all threads must resolve before merge. No local equivalent.

> Which of these are _branch-protection-required_ vs. advisory isn't encoded in the repo files. Confirm
> with `gh api repos/Lost-secuirty/lostsouls-game/branches/main/protection` when it matters.

## Reproduce CI locally before pushing

The full gauntlet (mirrors **CI / check**):

```sh
npm ci \
  && npm run format:check \
  && npm run lint \
  && npm test \
  && npm run test:proof \
  && npm run test:coverage \
  && npm audit --audit-level=high \
  && npm run build \
  && npm run smoke:prod \
  && npm run smoke:browser   # needs `npm run preview` on 127.0.0.1:4173 in another shell
```

The control/security jobs run via their own tools (not npm scripts):

```sh
node scripts/audit-drift.mjs --base origin/main --head HEAD   # Drift Audit (= npm run audit)
python tools/scan_staged.py --self-test && python tools/scan_staged.py --ci --base origin/main  # secret/PII
python tools/control_audit.py                                  # control audit
pre-commit run --all-files                                     # pre-commit gates
# workflow/shell lint + secret/dep scan: actionlint, zizmor, shellcheck, shfmt, gitleaks, osv-scanner
```

`CodeQL` and `Dependency Review` are GitHub-side only — no local command.

## Local toolchain

**Runtime:** Node **24** (`.nvmrc` and `.node-version` both pin 24; `engines.node` declares `>=24`). npm
is unpinned.

**Runtime dependencies** (`package.json`): `three` ^0.184, `postprocessing` ^6.39, `n8ao` ^1.10,
`howler` ^2.2 (music — ADR-0024), `lil-gui` ^0.21 (debug panel), `express` ^5.2 + `express-rate-limit`
^8.5 (the static server).

**Dev dependencies:** `vite` ^8.0, `vitest` ^4.1 + `@vitest/coverage-v8`, `eslint` ^10.5 (+ `@eslint/js`,
`eslint-config-prettier`, `eslint-plugin-security`, `globals`), `prettier` ^3.4, `playwright` ^1.61
(used as a raw automation library from `scripts/browser-smoke.mjs`, **not** `@playwright/test` — there is
no `playwright.config`), `pngjs` ^7 (image diffing in smoke/render scripts).

**External tools the workflows pin** (match these locally to reproduce the control jobs): actionlint
1.7.12, shellcheck 0.11.0, shfmt 3.13.1, gitleaks 8.30.1, osv-scanner 2.3.8, zizmor 1.25.2, pre-commit
4.6.0, PyYAML 6.0.3; Python 3.12; `uv` for `uv tool install`.

**Git hooks:** in [`.githooks/`](../.githooks) (not husky). Arm once per clone:
`git config core.hooksPath .githooks` (the SessionStart hook does this automatically on remote/web). The
`pre-commit` hook **auto-formats staged files with Prettier**, then runs the secret/PII scanner
(`tools/scan_staged.py`). Bypass a single commit with `git commit --no-verify` (use sparingly).

## Tooling backlog (deferred)

Promoted to [`docs/ROADMAP.md`](ROADMAP.md) when picked up; each becomes an ADR if significant.

- **CI visual regression** — wire the `render-studio` pixelmatch diff into CI. Deferred: SwiftShader
  cross-machine pixel variance makes a shared baseline flaky; stays a local check for now.
- **Audio audition page** — Audio studio Phase 2 (browse/preview the audio set).
- **`.claude/` auditor agent + `/audit` command** — a pre-push _semantic_ drift layer. **Held pending
  Scott's explicit sign-off.** (The CI drift bot — `scripts/audit-drift.mjs` + `audit.yml` — is shipped.)
- **Dedicated org-wide logging repo** — Scott's idea to keep per-project repos clean;
  [`docs/WORKLOG.md`](WORKLOG.md) is the interim home. (See `BACKLOG.md` → Cross-repo/org.)
