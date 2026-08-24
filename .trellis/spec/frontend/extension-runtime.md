# Extension Runtime

## Runtime Flow

The extension runs in the local VS Code UI extension host even when the
workspace and terminal are remote. The production flow is:

```text
command in extension.ts
  -> local clipboard adapter in clipboard.ts
  -> workspace URI/write in remoteFile.ts
  -> terminal path projection in imagePath.ts
  -> bracketed-paste delivery in insert.ts
```

[`src/extension.ts`](../../../src/extension.ts) owns orchestration and user
feedback. Keep the lower modules focused on their boundary so clipboard,
filesystem, path, and terminal failures remain distinguishable.

## Commands and Activation

`activate()` registers both manifest commands through
`context.subscriptions.push`:

- `claudeImagePaste.smartPaste` preserves ordinary terminal text paste. It
  checks for an active terminal, reads text in-process, and delegates to
  `workbench.action.terminal.paste` whenever text is present.
- `claudeImagePaste.pasteToTerminal` explicitly attempts image paste and may
  announce that no image is available.

The shared `performImagePaste()` function returns the closed union
`"pasted" | "no-image" | "error"`. Smart paste uses this result to fall back to
ordinary paste for every non-success result, so `Cmd+V`/`Ctrl+V` is not a dead
key. Preserve this user-facing behavior when adding branches.

Command IDs, keybindings, configuration defaults, and `extensionKind: ["ui"]`
are public contracts in [`package.json`](../../../package.json). Any change must
update the matching implementation and documentation.

## Clipboard Boundary

[`src/clipboard.ts`](../../../src/clipboard.ts) selects one adapter from
`process.platform` because the code runs on the local UI host:

- macOS uses AppleScript PNG data, then TIFF plus `sips` as fallback.
- Linux tries `xclip` and then `wl-paste`.
- Windows uses PowerShell with `System.Windows.Forms` and `System.Drawing`.

Adapters return `ClipboardImage | null`: `null` means the clipboard has no
usable image; unsupported platforms throw. Temporary directories are created
under `os.tmpdir()` and removed best-effort in `finally`. The subprocess helper
uses a 10-second timeout and a 64 MiB maximum buffer.

Keep platform commands and temporary-file handling here. Do not read the image
clipboard during the smart-paste text fast path, and do not turn a normal
"no image" result into a user-facing error.

## Terminal Insertion Contract

[`src/insert.ts`](../../../src/insert.ts) formats the complete image path and
sends it without a newline. The default `bracketedPaste` mode wraps the payload
in `ESC[200~` and `ESC[201~` and calls
`workbench.action.terminal.sendSequence`; Claude Code's paste handler depends on
that framing. `plain` mode uses `terminal.sendText(payload, false)` only as a
legacy diagnostic.

Paths containing only the allowed safe characters are sent raw. Other paths
are single-quoted with embedded quote escaping. If this formatter changes,
preserve the requirement that the receiver sees one path ending in a supported
image extension and no trailing newline.

## User Feedback and Failure Handling

Clipboard read, workspace write, and terminal insertion are separate `try`
blocks in `performImagePaste()`. Report failures through the existing
`Claude Image Paste: ...` messages and convert `unknown` errors with the local
`message()` helper. Cleanup is intentionally best-effort and must not turn a
successful paste into a failure.

## Anti-Patterns

- Do not use `terminal.sendText()` for the default success path; typed input
  does not trigger Claude Code's image attachment handling.
- Do not append a newline or extra explanatory text to the inserted path.
- Do not run clipboard-image subprocesses when clipboard text is already
  available.
- Do not make lower-level modules show VS Code notifications; orchestration
  owns user-facing feedback.
- Do not claim the active terminal is running Claude Code. The extension can
  observe terminal focus, not the terminal process identity.

## Verification

Run `npm run compile` for every runtime change. Run `npm test` when pure path
logic is affected. For command/clipboard/terminal changes, also perform the
focused manual checks in [Quality Guidelines](./quality-guidelines.md).
