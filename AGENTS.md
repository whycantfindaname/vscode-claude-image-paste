<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## Managed Repository Context

- Registry ID: `cursor-image-paste` (Agent Infra companion manifest `manifests/companion-repositories.json`)
- Managed branch: `lwj_dev` (upstream mirror baseline: `main`)
- Repository convergence authority: Agent Infra registry and sync contract (fetch, classify, safe fast-forward)
- Owner workflow + product/runtime authority: this repository's own source, `README.md` and `STRUCTURE.md`
- Delivery status: `delivery_pending`; editor integration is platform-specific and a shared artifact handoff is not yet modeled.
- Read order: `AGENTS.md` -> `README.md` (usage / build and install from source / releasing) -> `STRUCTURE.md` (structure and maintenance boundaries)
- Update triggers: managed branch or remote change; build/release chain change; platform activation change; service/config/secret ownership change; new stable error class; a completed reusable major update flow
- No project-local delivery contract is active. Add a v2 contract only after its shared handoff is modeled and the Agent Infra registry is changed to `delivery_contract`.
- Do not invent workflow: follow only the docs above; do not guess build, release, or activation steps.
