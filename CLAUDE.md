# CLAUDE.md

> **Read this even if you are not Claude.** This file is auto-loaded by Claude Code, but
> the rules here are not Claude-specific. The canonical, tool-agnostic contract for every
> AI agent (and human) in this repo is **[`AGENTS.md`](AGENTS.md)** — read it first,
> whoever you are. Below are only Claude-Code-specific notes.

Auto-loaded for Claude Code. **Read [`AGENTS.md`](AGENTS.md) first — it is the
canonical contract** (commands, structure, code style, boundaries, agent safety,
git workflow, and the Working Agreement). This file only adds the Claude-specific
bits.

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
