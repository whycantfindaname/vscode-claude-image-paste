# Remote Path and Filesystem Boundaries

## Local Host Versus Workspace Provider

The extension is UI-hosted locally, but `vscode.workspace.fs` operates through
the active workspace provider. In Remote-SSH, the clipboard is local while the
image directory and terminal are remote. Do not replace this provider boundary
with `scp`, a daemon, local filesystem writes, or host-path mapping.

[`src/remoteFile.ts`](../../../src/remoteFile.ts) uses only
`workspace.workspaceFolders[0]`. It rejects a missing workspace, creates the
chosen directory, ensures that directory contains a `*` `.gitignore`, writes a
`clipboard-YYYYMMDD-HHMMSS-<token>.<ext>` file, and returns its `vscode.Uri`.

## Directory Selection

The selection rule is intentionally small:

1. For a `vscode-remote` workspace with a non-empty
   `claudeImagePaste.remoteImageDirectory`, normalize and use that absolute
   POSIX path in the workspace URI.
2. Otherwise, split `claudeImagePaste.imageDirectory` on `/` and join the
   non-empty segments beneath the first workspace folder.

[`src/imagePath.ts`](../../../src/imagePath.ts) owns the pure remote-directory
policy. `normalizeRemoteImageDirectory()` trims whitespace, requires a POSIX
absolute path, applies `path.posix.normalize`, rejects `/`, and strips trailing
slashes. `configuredRemoteImageDirectory()` maps blank input to `undefined`,
which is the explicit fallback signal.

Keep these configuration keys and defaults synchronized with
[`package.json`](../../../package.json), [`README.md`](../../../README.md), and
[`STRUCTURE.md`](../../../STRUCTURE.md).

## Terminal Path Projection

`terminalImagePath(uriScheme, uriPath, fsPath)` returns `uriPath` for
`vscode-remote` and `fsPath` otherwise. This is critical when a Windows local UI
host controls a POSIX Remote-SSH workspace: the terminal must receive the
remote `/home/...` path, not a Windows representation of `fsPath`.

The existing cases in
[`test/imagePath.test.js`](../../../test/imagePath.test.js) are the reference
examples for blank configuration, normalized absolute paths, relative/root
rejection, Remote-SSH URI paths, and local Windows filesystem paths.

## Cleanup Contract

`cleanupOldImages(days)` is best-effort. A non-positive value disables cleanup.
It resolves the same image directory, ignores lookup/read failures, and only
deletes files whose names start with `clipboard-` and whose `mtime` is older
than the cutoff. Keep deletion scoped to both the selected directory and this
prefix.

## Anti-Patterns

- Do not evaluate `remoteImageDirectory` for local `file` workspaces.
- Do not use `path.resolve` or platform-default `path` semantics for remote
  POSIX configuration; use `path.posix`.
- Do not allow the remote filesystem root as an image directory.
- Do not insert `fsPath` into a Remote-SSH terminal.
- Do not preflight remote permissions with a second transport. Let the workspace
  provider's create/write operation return the real error.
- Do not widen cleanup to arbitrary files, parent directories, or filenames
  without the `clipboard-` prefix.

## Verification

For path-policy changes:

```bash
npm test
```

Add a focused case to `test/imagePath.test.js` for every new normalization or
projection rule. For workspace-provider changes, compile and manually verify a
Remote-SSH workspace: confirm the image exists at the configured remote path
and that the terminal receives the same POSIX path.
