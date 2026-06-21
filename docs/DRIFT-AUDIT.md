# Drift Audit — the audit bot

A second pair of eyes on every PR that checks one thing: **does what we _logged_ match
what the diff actually _did_?** Ported from `Lost-secuirty/Codex-Speed-Test` and adapted
to lostsouls (JS, ESLint + Prettier, our Working Agreement). The name for the gap between
intent and reality is **drift**, and catching it is how we stop the two failure modes
Scott keeps flagging: **doing things over and over** (rework the audit would have caught
pre-push) and **claims that don't match the code** (phantom "done" reports).

## Two layers

1. **Deterministic (CI + local) — `scripts/audit-drift.mjs`.** No API key, no LLM. It
   diffs the branch against `main`, reads the "claims" (commit messages, PR body,
   `docs/WORKLOG.md`, `docs/LEARNINGS.md`), and runs a fixed set of checks. Pure,
   unit-tested logic lives in `scripts/audit-lib.mjs` (`tests/audit-lib.test.js`).
2. **Semantic (local, pre-push) — _deferred_.** A local `auditor` agent / `/audit` command
   would read the diff and the claims and _judge_ whether they match — phantom claims,
   scope creep, weakened gates, ADR/Working-Agreement violations (e.g. a feel-number
   hardcoded instead of in `config.js`). The part a regex can't do. **Not installed yet:**
   adding a `.claude/` agent is agent-self-config (a safety guard flagged it) — it needs
   Scott's explicit OK. Until then, run the deterministic script + do this review by hand.

## What the deterministic checks flag

| id                       | sev    | what                                                                                |
| ------------------------ | ------ | ----------------------------------------------------------------------------------- |
| `lint-suppress`          | high   | new `eslint-disable` / `prettier-ignore` in code (fix it, don't silence it)         |
| `test-skip`              | high   | `.skip` / `.only` / `xit` / `xdescribe` (tests gutted to pass)                      |
| `todo-marker`            | medium | new `TODO`/`FIXME`/`HACK`/`XXX` in code                                             |
| `debug-stmt`             | medium | stray `console.log` / `debugger` in `src/` (warn/error fallbacks are fine)          |
| `sensitive-paths`        | medium | gates/CI/`.claude`/deps/`tools` changed — confirm it was intentional+logged         |
| `deep-nesting`           | low    | added code nested past ~8 levels (complexity smell)                                 |
| `growth-no-tests`        | low    | `src/` grew >150 net lines with no `tests/` change (pure seams should stay covered) |
| `docs-stale`             | low    | source changed but neither `WORKLOG.md` nor `LEARNINGS.md` was touched              |
| `learnings-distill-due`  | low    | `docs/LEARNINGS.md` over 700 lines — time to archive/distill                        |
| `unlogged-files`         | low    | a changed file is named in no commit message or the PR body (heuristic)             |
| `deviations-section`     | medium | PR body missing/empty `## Deviations from plan` (WA #7)                             |
| `lint/format/build-fail` | high   | only with `--run-checks` (local) — CI's `ci.yml` already gates these                |

## Auto-fix is a tiny, fixed class

With `--fix` the auditor runs **only `prettier --write`** (formatting). It **never** edits
logic to make itself pass — debug statements, suppressions, skipped tests, and config
thresholds are **report-only**. This invariant is the whole point: an auditor that can
rewrite logic to go green is worse than no auditor.

## How it runs

- **CI (`.github/workflows/audit.yml`)** — on every PR: runs the script with `--fix`
  `--history`, commits safe formatting fixes + appends `docs/audit-history.ndjson`, and
  posts the report as a PR comment. Uses `GITHUB_TOKEN` only; fork-gated and guarded
  against its own bot pushes (no self-amplifying loop). It does **not** re-run lint/build
  — `ci.yml` already gates those (no doing it twice). **Informational** today (not a
  required merge-blocker); flip that in branch-protection settings if we ever want it to
  block on high-severity drift.
- **Local** — `npm run audit` (or `node scripts/audit-drift.mjs ... --run-checks`) before
  pushing; pre-push, **any high-severity finding = don't push.** (A `/audit` command + an
  `auditor` agent for the semantic layer are deferred pending Scott's OK — see "Two layers".)

```
node scripts/audit-drift.mjs --base origin/main --head HEAD --run-checks   # report
node scripts/audit-drift.mjs --base origin/main --head HEAD --fix           # + safe fixes
```

## History

`docs/audit-history.ndjson` — one line per audited head (`{ ts, base, head, pr, findings,
srcNet, autofixed }`), appended by CI and idempotent per head. A longitudinal record of
drift over time (and the raw material for a future retro pass).

## Adaptations from the codex original

biome → **prettier** (auto-fix class); TS/`typecheck` → **JS** (dropped the typecheck-fail
check); codex `src/lib` vs `src/prototypes` → lostsouls `src/` vs `tests/`; sensitive-paths
and Working-Agreement rule numbers re-pointed at lostsouls' `AGENTS.md`. The CI job is
leaner — no `--run-checks` in CI (ci.yml owns lint/build). **Deferred** (pending Scott's
OK on agent self-config): the `.claude/` `auditor` agent + `/audit` command. Not ported:
`preflight.mjs` and `/audit-retro` (can add later if wanted).
