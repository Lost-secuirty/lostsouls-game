# CLAUDE.md

The filename is historical. This is a universal instruction source for every human,
agent, and automation system working in this repository. Read it together with
`AGENTS.md` and `SECURITY.md`; all rules below apply regardless of the tool in use.

## This repo's vibe

A co-designed game project. It's a **hybrid**: move fast and have fun, but the
Boundaries + Working Agreement in `AGENTS.md` still apply, and **significant
decisions get an ADR** (`docs/adr/`, scaffold one with `/adr <title>`). Don't
over-document — code + ADRs + a light `docs/LEARNINGS.md` is enough.

## Subagent directive

When you spawn a subagent (Agent tool) for this repo, tell it to **read `AGENTS.md`
and `docs/LEARNINGS.md` first, follow the Working Agreement, and append anything it
learns to `docs/LEARNINGS.md`.**

## Environment notes

- Ephemeral remote container — commit & push to persist.
- A SessionStart hook (`.claude/hooks/session-start.sh`, registered in
  `.claude/settings.json`) runs `npm install` on web sessions so the dev server,
  build, lint, and tests work out of the box.
- `/adr <title>` scaffolds an Architecture Decision Record.
