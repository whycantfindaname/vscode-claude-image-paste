# Bootstrap Task: Project Development Guidelines

## Goal

Replace the generated frontend scaffolding with concrete guidance for this
single-package TypeScript VS Code UI extension. The specs must reflect the
local-clipboard, workspace-filesystem, Remote-SSH path, and terminal-insertion
boundaries implemented by the repository.

## Scope

- Analyze `package.json`, `tsconfig.json`, `src/`, `test/`, `README.md`,
  `STRUCTURE.md`, ignore rules, and CI workflows.
- Write project-specific guidance under `.trellis/spec/frontend/`.
- Remove React-oriented template pages and generic guides that do not describe
  this repository.
- Do not modify product source, tests, manifests, root rules, generated runtime
  files, dependencies, or existing user work.

## Status

- [x] Fill frontend guidelines
- [x] Add code examples

## Acceptance Criteria

- [x] The spec index matches the final file set.
- [x] Every major rule cites real source, test, manifest, or project docs.
- [x] Specs include concrete anti-patterns and reliable verification commands.
- [x] No placeholder, template instruction, empty section, or React-only guide
  remains.
- [x] Developer identity resolves to `jasonliao`.
- [x] Trellis package context resolves successfully.
- [x] This task is archived with `task.json.status` set to `completed`.

## Completion Evidence

The final verification records the exact commands and results in the task
handoff. Archiving is the lifecycle transition that writes `completedAt`, sets
the status to `completed`, and moves this directory under
`.trellis/tasks/archive/2026-08/`.
