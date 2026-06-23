# Plans — durable design docs for upcoming / just-shipped work

Finalized implementation plans live here, numbered ADR-style (`NNNN-kebab-name.md`), so a plan is never
lost to a closed chat and never needs re-researching. Distinct from its neighbours:

- [`adr/`](../adr/) — the _decision_ + rationale (often the durable outcome of a plan).
- [`WORKLOG.md`](../WORKLOG.md) — _what shipped_, dated, per PR.
- [`BACKLOG.md`](../BACKLOG.md) / [`ROADMAP.md`](../ROADMAP.md) — _what's next_.

**Convention:** raw external research (e.g. ChatGPT deep-research dumps) is **not** committed — it stays
local with the owner; only the distilled plan lands here. Number sequentially; record anything that
changed during the build in the plan's **As-built** note (and the PR body's `## Deviations`).

| #    | Plan                                                                 | Status            |
| ---- | -------------------------------------------------------------------- | ----------------- |
| 0001 | [FPS instrumentation + safe dial-backs](0001-fps-instrumentation.md) | Shipped — v0.8.16 |
