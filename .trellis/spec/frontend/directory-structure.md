# Directory Structure

## Repository Shape

The hand-written runtime is deliberately flat because the extension has one
activation entry and a small set of boundary-focused modules:

```text
src/
├── extension.ts    # activation, commands, orchestration, user messages
├── clipboard.ts    # local OS clipboard adapters and filename token
├── remoteFile.ts   # workspace URI selection, writes, ignore file, cleanup
├── imagePath.ts    # pure remote-path validation and terminal path selection
└── insert.ts       # terminal payload formatting and delivery
test/
└── imagePath.test.js
```

The authoritative map and maintenance boundaries are in
[`STRUCTURE.md`](../../../STRUCTURE.md). The VS Code contribution surface and
scripts are in [`package.json`](../../../package.json).

## Ownership Rules

- Keep command registration and the full paste orchestration in
  [`src/extension.ts`](../../../src/extension.ts). It is the only activation
  entry (`main` compiles to `out/extension.js`).
- Keep OS-specific clipboard subprocesses in
  [`src/clipboard.ts`](../../../src/clipboard.ts). Do not leak platform commands
  into activation or workspace-file code.
- Keep pure path decisions in [`src/imagePath.ts`](../../../src/imagePath.ts) so
  they remain testable without the VS Code runtime.
- Keep `vscode.workspace.fs` operations in
  [`src/remoteFile.ts`](../../../src/remoteFile.ts) and active-terminal delivery
  in [`src/insert.ts`](../../../src/insert.ts).
- Add a new module only for a distinct runtime boundary or independently
  testable policy. The current size does not justify feature folders, component
  directories, hooks, stores, or generic utility buckets.

## Source and Generated Files

`src/`, `test/`, `package.json`, `package-lock.json`, `tsconfig.json`, docs,
icons, ignore rules, and workflows are source inputs. `out/`, `dist/`, root
`*.vsix`, and `node_modules/` are generated or installed artifacts. TypeScript
compiles from `src/` to `out/` according to
[`tsconfig.json`](../../../tsconfig.json); tests intentionally import the
compiled module from `out/`.

Do not hand-edit or commit generated artifacts. A successful compile or VSIX
build also does not prove that the extension is installed, activated, or
working in a live Remote-SSH terminal.

## Naming and Change Routing

- Use camelCase for functions and local values, PascalCase for interfaces and
  type aliases, and descriptive module names matching the owned boundary.
- Keep public commands and settings under the `claudeImagePaste.*` namespace in
  `package.json`; implementation reads the same namespace with
  `vscode.workspace.getConfiguration("claudeImagePaste")`.
- A public command, keybinding, setting, path behavior, build output, or release
  change must be checked against `package.json`, the owning source/test files,
  [`README.md`](../../../README.md), and `STRUCTURE.md`.

## Anti-Patterns

- Do not create React-style component, hook, page, or global-state directories;
  no such runtime exists here.
- Do not move path normalization into `remoteFile.ts` merely because it is one
  caller. Its current pure-module boundary enables the Node tests.
- Do not treat `out/`, `dist/`, or a packaged VSIX as source of truth.
- Do not describe Infra consumer scripts or host configuration as code owned by
  this repository; `STRUCTURE.md` explicitly keeps them outside this extension.
