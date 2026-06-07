---
description: Scaffold a new Architecture Decision Record. Usage: /adr <short title>
argument-hint: <short title>
allowed-tools: Bash(ls:*), Read
---

Create a new ADR for: **$ARGUMENTS**

1. Look at `docs/adr/` to find the next number (zero-padded, e.g. `0006`).
2. Copy `docs/adr/0000-template.md` to `docs/adr/<NNNN>-<kebab-title>.md`.
3. Fill in the title, set **Status: Proposed** and today's date, and draft the
   Context / Decision / Consequences / Alternatives from what we just discussed.
4. Add the new row to the table in `docs/adr/README.md`.

Keep it concise — one decision, the why, and the trade-offs.
