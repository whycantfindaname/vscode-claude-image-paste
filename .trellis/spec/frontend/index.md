# VS Code Extension Development Guidelines

This is a single-package TypeScript VS Code UI extension, not a React web
frontend. The Trellis `frontend` layer covers the extension host code in
`src/`, its manifest contract, and its Node tests.

## Pre-Development Checklist

- Read [`STRUCTURE.md`](../../../STRUCTURE.md) for the source/generated boundary,
  runtime data flow, and repository-versus-live terminology.
- Identify whether the change affects the local clipboard host, the workspace
  filesystem, the active terminal, or a public manifest contribution.
- Read the matching guide below and inspect the cited implementation and tests.
- Search `package.json`, `README.md`, `STRUCTURE.md`, `src/`, and `test/` before
  changing a command ID, setting key, path rule, or generated-artifact boundary.

## Guidelines Index

| Guide | Owns |
|---|---|
| [Directory Structure](./directory-structure.md) | Source ownership, generated files, and change routing |
| [Extension Runtime](./extension-runtime.md) | Activation, command flow, clipboard handling, and terminal insertion |
| [Remote Path Boundaries](./remote-path-boundaries.md) | UI-host/workspace separation, URI paths, writes, and cleanup |
| [Type and Error Conventions](./type-and-error-conventions.md) | Strict TypeScript, boundary types, fallbacks, and user-facing errors |
| [Quality Guidelines](./quality-guidelines.md) | Tests, documentation synchronization, build checks, and manual QA |

## Quality Check

Run from the repository root:

```bash
npm run compile
npm test
git diff --check
```

`npm test` compiles before running `node:test`; running both commands is useful
when reporting compile and test evidence separately. Run `npm run package` only
when packaging or manifest contents changed. Clipboard, integrated-terminal,
and Remote-SSH behavior require the focused manual checks described in
[Quality Guidelines](./quality-guidelines.md); unit tests alone do not prove a
live VS Code or Claude Code session works.
