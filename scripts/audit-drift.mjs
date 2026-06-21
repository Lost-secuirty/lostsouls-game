#!/usr/bin/env node
// =====================================================================
// scripts/audit-drift.mjs — deterministic PR "drift" auditor.
//
// Ported from Lost-secuirty/Codex-Speed-Test and adapted for this repo (JS
// sources, ESLint + Prettier, the lostsouls Working Agreement). NO external deps,
// NO API key. Compares the LOGGED INTENT (commit messages, PR body,
// docs/LEARNINGS.md + docs/WORKLOG.md — the externalized "world state") against the
// ACTUAL diff, and flags drift. With --fix it applies only safe, reversible fixes
// (`prettier --write`, formatting only). Logic-affecting smells (console.log,
// suppressions, skipped tests, TODO) are report-only so the auditor never drifts the
// code itself. See docs/DRIFT-AUDIT.md.
//
// Usage:
//   node scripts/audit-drift.mjs [--base <ref>] [--head <ref>]
//                                [--fix] [--run-checks] [--strict]
//                                [--history <ndjson>] [--pr-body-file <md>]
// Defaults: base=origin/main head=HEAD. Writes audit-report.md + stdout.
// Exit 0 always, unless --strict and a high-severity finding exists (exit 1), or an
// unresolvable ref (exit 2). Pure logic lives in scripts/audit-lib.mjs (unit-tested).
// =====================================================================

import { execSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { checkDeviationSection, hasHead, historyLine, learningsDistillDue } from './audit-lib.mjs';

const argv = process.argv.slice(2);
const opt = {
  base: val('--base') || process.env.AUDIT_BASE || 'origin/main',
  head: val('--head') || process.env.AUDIT_HEAD || 'HEAD',
  fix: argv.includes('--fix'),
  runChecks: argv.includes('--run-checks'),
  strict: argv.includes('--strict'),
  history: val('--history'), // CI: append one ndjson line per audited head
  prBodyFile: val('--pr-body-file'), // local runs: PR body markdown file
};

function val(flag) {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}
function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

const findings = [];
const add = (id, severity, confidence, title, detail, evidence = []) =>
  findings.push({ id, severity, confidence, title, detail, evidence });

// ---- resolve the commit range -------------------------------------------
// Refuse to audit an unresolvable range: sh() swallows git errors, so a bad ref
// would yield an empty diff and a vacuous "no drift detected ✅" — the textbook
// silent failure.
function ensureRef(ref) {
  if (!sh(`git rev-parse --verify --quiet ${ref}^{commit}`).trim()) {
    console.error(
      `audit: cannot resolve ref '${ref}' — refusing to report on an empty range. Fetch it (git fetch origin main) or pass a valid --base/--head.`,
    );
    process.exit(2);
  }
}
ensureRef(opt.base);
ensureRef(opt.head);
const mergeBase = sh(`git merge-base ${opt.base} ${opt.head}`).trim() || opt.base;
const range = `${mergeBase}..${opt.head}`;

const nameStatus = sh(`git diff --name-status ${range}`)
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [status, ...rest] = l.split('\t');
    return { status, path: rest.join('\t') };
  });
const changedPaths = nameStatus.map((f) => f.path);

const commitText = sh(`git log --format=%s%x00%b ${range}`).toLowerCase();
const prBodySource = opt.prBodyFile || '.audit/pr-body.md';
const prBody = (process.env.GITHUB_PR_BODY || readIf(prBodySource) || '').toLowerCase();
// the deviation check only runs when a body was actually provided — in Actions
// GITHUB_PR_BODY is SET even when empty (check fires, correct); a bodyless local run
// skips silently instead of nagging.
const bodyProvided = 'GITHUB_PR_BODY' in process.env || existsSync(prBodySource);
const claims = `${commitText}\n${prBody}`;

function readIf(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

// ---- parse ADDED lines (unified=0, lockfile excluded) -------------------
const rawDiff = sh(`git diff --unified=0 ${range} -- . ":(exclude)package-lock.json"`);
const added = [];
{
  let file = null;
  let newLine = 0;
  for (const line of rawDiff.split('\n')) {
    if (line.startsWith('diff --git')) {
      file = null;
    } else if (line.startsWith('+++ b/')) {
      file = line.slice(6);
    } else if (line.startsWith('+++ ')) {
      file = null;
    } else {
      const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        newLine = parseInt(m[1], 10);
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        if (file) added.push({ file, line: newLine, text: line.slice(1) });
        newLine++;
      }
    }
  }
}

const isSrc = (p) => p?.startsWith('src/');
const isCode = (p) => p && /\.(js|mjs)$/.test(p);
// Files allowed to contain the trigger strings (they implement the checks).
const inAudit = (p) => p === 'scripts/audit-drift.mjs' || p === 'scripts/audit-lib.mjs';

// ---- checks --------------------------------------------------------------
function scan(id, re, predicate, sev, conf, title, detail) {
  const hits = added.filter((a) => predicate(a) && re.test(a.text));
  if (hits.length) {
    add(
      id,
      sev,
      conf,
      title,
      detail,
      hits.slice(0, 12).map((h) => `${h.file}:${h.line}  ${h.text.trim().slice(0, 100)}`),
    );
  }
}

// rule violations (Working Agreement). Suppression/TODO scans cover CODE files only —
// docs legitimately *mention* these strings (the ADRs and DRIFT-AUDIT.md describe the
// checks; a suppression in markdown isn't one).
scan(
  'lint-suppress',
  /eslint-disable|prettier-ignore/,
  (a) => isCode(a.file) && !inAudit(a.file),
  'high',
  'high',
  'Lint/format suppression added',
  'New `eslint-disable`/`prettier-ignore` — rules should be fixed, not silenced (no silent shortcuts, WA #3).',
);
scan(
  'test-skip',
  /\b(xit|xdescribe)\s*\(|\.(skip|only)\s*\(/,
  () => true,
  'high',
  'medium',
  'Test skipped / focused',
  'A test was skipped or `.only`-focused — tests must not be gutted to pass (no silent shortcuts, WA #3).',
);
scan(
  'todo-marker',
  /\b(TODO|FIXME|HACK|XXX)\b/,
  (a) => isCode(a.file) && !inAudit(a.file),
  'medium',
  'medium',
  'TODO/HACK marker added',
  'Unfinished-work marker introduced — confirm it is intended, not a shortcut.',
);
scan(
  'debug-stmt',
  /console\.log\(|^\s*debugger\s*;?\s*$/,
  (a) => isSrc(a.file),
  'medium',
  'high',
  'Debug statement in src/',
  'Stray `console.log`/`debugger` left in shipped code (console.warn/error for real fallbacks is fine).',
);

// sensitive paths — gates, agent config, deps, build config, controls.
const SENSITIVE_RE =
  /^\.github\/|^\.githooks\/|^\.claude\/|^server\.js$|^scripts\/audit-(drift|lib)\.mjs$|(^|\/)package(-lock)?\.json$|^vite\.config\.js$|^vitest\.config\.js$|^eslint\.config\.js$|^AGENTS\.md$|^CLAUDE\.md$|^SECURITY\.md$|^tools\//;
const sensitive = changedPaths.filter((p) => SENSITIVE_RE.test(p));
if (sensitive.length) {
  add(
    'sensitive-paths',
    'medium',
    'high',
    'Sensitive files changed',
    'Gates/CI/agent-config/deps/controls changed — review intentionality and that it was logged.',
    sensitive,
  );
}

// code bloat / complexity — AI-generated code tends to bloat and over-nest even when
// it passes. Deterministic diff heuristics, a language-agnostic complexity proxy.
scan(
  'deep-nesting',
  /^ {16,}\S/,
  (a) => isSrc(a.file) && isCode(a.file),
  'low',
  'low',
  'Deep nesting added (complexity smell)',
  'Added code nested past ~8 levels — a cognitive-complexity smell; consider extracting helpers.',
);

// net src growth without accompanying tests (the pure-logic core should stay tested).
const numstat = sh(`git diff --numstat ${range} -- src`)
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => l.split('\t'))
  .filter(([, , p]) => isCode(p));
let srcAdded = 0;
let srcRemoved = 0;
for (const [a, d] of numstat) {
  srcAdded += parseInt(a, 10) || 0;
  srcRemoved += parseInt(d, 10) || 0;
}
const srcNet = srcAdded - srcRemoved;
const testChanged = changedPaths.some((p) => p.startsWith('tests/'));
if (srcNet > 150 && !testChanged) {
  add(
    'growth-no-tests',
    'low',
    'medium',
    'src/ grew without tests',
    `src/ grew by net ${srcNet} lines with no test changes — pure-logic seams (core/*) should stay covered (WA #1). Render/system code is exercised by the smokes.`,
    [],
  );
}

// documentation drift — source changed but neither the build diary nor learnings.
const srcChanged = changedPaths.some(isSrc);
const docsTouched =
  changedPaths.includes('docs/LEARNINGS.md') || changedPaths.includes('docs/WORKLOG.md');
if (srcChanged && !docsTouched) {
  add(
    'docs-stale',
    'low',
    'medium',
    'WORKLOG/LEARNINGS not updated',
    'Source changed but neither `docs/WORKLOG.md` nor `docs/LEARNINGS.md` was touched — log the work/decision (WA #5).',
    [],
  );
}

// memory hygiene: repo-state check, not a diff check — nags while LEARNINGS.md stays
// over the limit (the distillation/archive pass itself is Scott-gated). Limit 700:
// headroom over the current ~591 so it's a future trigger, not per-PR noise.
const distill = learningsDistillDue(readIf('docs/LEARNINGS.md'), 700);
if (distill) {
  add(
    'learnings-distill-due',
    'low',
    'high',
    'LEARNINGS.md due for distillation',
    `docs/LEARNINGS.md is ${distill.lines} lines (>700) — archive superseded entries (e.g. docs/LEARNINGS-archive.md) and promote evergreen rules into AGENTS.md/ADRs.`,
    [],
  );
}

// unlogged files (heuristic): changed file never named in commits/PR body. Exempt the
// audit's own bookkeeping (history file).
const unlogged = changedPaths.filter((p) => {
  if (p === 'docs/audit-history.ndjson') return false;
  const stem = p
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '')
    .toLowerCase();
  return stem.length > 2 && !claims.includes(stem) && !claims.includes(p.toLowerCase());
});
if (unlogged.length) {
  add(
    'unlogged-files',
    'low',
    'low',
    'Possibly unlogged changes',
    'These files are not referenced in any commit message or PR body (heuristic).',
    unlogged.slice(0, 20),
  );
}

// deviation surfacing (WA #7): the PR body must carry a "## Deviations from plan"
// section with explicit content ("None." is fine; an untouched template comment is
// not). Medium on purpose — --strict stays a logic gate, not a paperwork gate.
if (bodyProvided) {
  const dev = checkDeviationSection(prBody);
  if (dev) {
    add(
      'deviations-section',
      'medium',
      'high',
      'Deviations section missing/empty',
      dev.reason === 'missing'
        ? 'PR body has no "## Deviations from plan" section — required even if "None." (AGENTS.md WA #7).'
        : 'The "## Deviations from plan" section is empty — write "None." explicitly or list the deviations.',
      [],
    );
  }
}

// ---- optional: build/lint/format health ----------------------------------
let checks = '';
if (opt.runChecks) {
  const lint = trySh('npm run lint');
  const fmt = trySh('npm run format:check');
  const build = trySh('npm run build');
  checks =
    '\n## Build, lint & format\n' +
    `- lint (eslint): ${lint.ok ? '✅ pass' : '‼️ FAIL'}\n` +
    `- format (prettier --check): ${fmt.ok ? '✅ pass' : '‼️ FAIL'}\n` +
    `- build (vite): ${build.ok ? '✅ pass' : '‼️ FAIL'}\n`;
  if (!lint.ok)
    add('lint-fail', 'high', 'high', 'Lint failing', '`npm run lint` failed on this PR.', []);
  if (!fmt.ok)
    add(
      'format-fail',
      'high',
      'high',
      'Format check failing',
      '`npm run format:check` failed on this PR (run `npm run format`).',
      [],
    );
  if (!build.ok)
    add('build-fail', 'high', 'high', 'Build failing', '`npm run build` failed on this PR.', []);
}
function trySh(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ---- optional: safe auto-fixes -------------------------------------------
// The auto-fix class is `prettier --write` (formatting only) and NOTHING else; it
// never expands autonomously (the auditor must not drift the code to pass).
let fixNote = '';
let autofixDirty = false; // computed BEFORE the history append dirties the tree
if (opt.fix) {
  sh('npx prettier --write . > /dev/null 2>&1');
  const dirty = sh('git status --porcelain').trim();
  autofixDirty = Boolean(dirty);
  fixNote = dirty
    ? `\n## Auto-fixes applied\nSafe formatting fixes (prettier --write) were applied:\n\n\`\`\`\n${dirty}\n\`\`\`\n`
    : '\n## Auto-fixes applied\nNone needed — formatting was already clean.\n';
}

// ---- optional: longitudinal history (CI only) -----------------------------
if (opt.history) {
  const headSha = sh(`git rev-parse ${opt.head}`).trim();
  if (headSha && !hasHead(readIf(opt.history), headSha)) {
    appendFileSync(
      opt.history,
      historyLine({
        ts: new Date().toISOString(),
        base: mergeBase,
        head: headSha,
        pr: Number(process.env.GITHUB_PR_NUMBER) || null,
        findings,
        srcNet,
        autofixed: opt.fix && autofixDirty,
      }),
    );
  }
}

// ---- report --------------------------------------------------------------
const order = { high: 0, medium: 1, low: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);
const emoji = { high: '🔴', medium: '🟠', low: '🟡' };
const highCount = findings.filter((f) => f.severity === 'high').length;

let md = '## 🔍 Drift Audit\n\n';
md += `Range \`${range}\` · ${changedPaths.length} file(s) changed · `;
md += findings.length
  ? `**${findings.length} finding(s)** (${highCount} high)\n`
  : '**no drift detected** ✅\n';

if (findings.length) {
  md += '\n| | Finding | Severity | Confidence | Evidence |\n|---|---|---|---|---|\n';
  for (const f of findings) {
    const ev = f.evidence.length ? f.evidence.map((e) => `\`${e}\``).join('<br>') : f.detail;
    md += `| ${emoji[f.severity]} | **${f.title}** | ${f.severity} | ${f.confidence} | ${ev} |\n`;
  }
  md += '\n_Details:_\n';
  for (const f of findings) md += `- **${f.title}** (\`${f.id}\`) — ${f.detail}\n`;
}
md += checks + fixNote;
md += `\n## Code size\n- \`src/\` net change this range: **${srcNet >= 0 ? '+' : ''}${srcNet}** lines (+${srcAdded}/-${srcRemoved})\n`;
md +=
  '\n<sub>Generated by `scripts/audit-drift.mjs` — deterministic, no API key. Semantic claim-vs-code review is a local pre-push pass; see docs/DRIFT-AUDIT.md.</sub>\n';

writeFileSync('audit-report.md', md);
process.stdout.write(`${md}\n`);

if (opt.strict && highCount > 0) process.exit(1);
