# Quality Guidelines

## Automated Checks

The repository has no separate linter. TypeScript is the static quality gate:
[`tsconfig.json`](../../../tsconfig.json) enables `strict`,
`noUnusedLocals`, and `noUnusedParameters` and targets ES2021/CommonJS.

```bash
npm run compile
npm test
git diff --check
```

[`test/imagePath.test.js`](../../../test/imagePath.test.js) uses `node:test` and
imports `../out/imagePath.js`, so tests must compile first. `npm test` already
does this. Add tests there for pure path policy changes: disabled configuration,
normalization, invalid paths, and Remote-SSH `uri.path` versus local `fsPath`.
When another policy can be separated from VS Code APIs, prefer a pure module and
Node test over mocking the entire extension host.

Run `npm run package` when changing manifest/package contents or release
behavior. It creates `dist/claude-image-paste-remote-path-0.2.0.vsix`; do not
commit that artifact.

## Change-to-Evidence Matrix

| Change | Required evidence |
|---|---|
| Pure path logic | Compile plus `npm test`, including a focused regression |
| TypeScript runtime code | Compile plus relevant tests; manual flow if VS Code APIs are involved |
| Commands, settings, keybindings | Check `package.json`, implementation, README, and STRUCTURE together |
| Clipboard adapter | Compile and a manual image/no-image check on the affected OS |
| Terminal insertion | Manual active-terminal check; verify no automatic newline |
| Remote workspace writes | Manual Remote-SSH check of the resulting remote file and inserted POSIX path |
| Package/release workflow | Package locally or validate the affected CI path and version/tag contract |

## Manual Runtime Checks

For behavior that depends on VS Code or the host OS, use an Extension
Development Host (`F5`) or an installed local VSIX and record which environment
was actually tested.

1. With terminal focus and clipboard text, smart paste delegates to
   `workbench.action.terminal.paste` without invoking image handling.
2. With an image, forced paste writes a non-empty image and sends one path with
   bracketed-paste framing and no newline.
3. With no image or on a write failure, the command gives the existing warning
   or error; smart paste falls back to ordinary terminal paste.
4. In Remote-SSH, the extension remains local/UI-hosted, the file is written via
   the remote workspace provider, and the terminal receives the remote POSIX
   `uri.path`, not the local UI host's `fsPath`.
5. If cleanup behavior changes, verify `cleanupAfterDays = 0` disables deletion
   and only old files beginning with `clipboard-` are candidates.

## Review Rules and Anti-Patterns

- Preserve the fast text-paste path and the non-dead-key fallback in
  [`src/extension.ts`](../../../src/extension.ts).
- Preserve bracketed paste as the default. `plain` is a legacy A/B diagnostic,
  not an equivalent success path.
- Do not claim live VS Code, Remote-SSH, clipboard, terminal, registry, or
  consumer verification from compile/tests/package output alone.
- Do not add dependencies for OS tools already supplied by the host boundary.
  If npm dependencies change, update `package-lock.json` with `package.json`.
- Do not broaden cleanup beyond the selected image directory and the
  `clipboard-` filename prefix.
- Before finishing, compare changed public behavior with
  [`README.md`](../../../README.md) and
  [`STRUCTURE.md`](../../../STRUCTURE.md); keep documentation factual rather
  than aspirational.
