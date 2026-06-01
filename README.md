# Claude Code: Image Paste (bracketed)

Paste a clipboard image into a **Claude Code terminal running over Remote-SSH** and have Claude render it inline as `[Image N]` — the same end result as [cmux](https://cmux.com), but inside VS Code.

Every other VS-Code image-paste extension stops one step short: they save the image and insert the file path with `terminal.sendText()`. Claude then shows nothing, because `sendText` delivers the path as *typed* input. This extension delivers it as a **bracketed paste**, which is the trigger Claude Code actually keys off.

## Why this works (and the others don't)

Claude Code's input layer only converts a pasted path into an image attachment when **all** of these hold:

1. The bytes arrive framed as a *bracketed paste* — wrapped in `ESC[200~ … ESC[201~`. The image-path detector lives inside Claude's paste handler; typed input never reaches it.
2. The entire (trimmed) payload is a path matching `/\.(png|jpe?g|gif|webp)$/i` — `$`-anchored, so no trailing newline, no quotes, no markdown.
3. The path resolves to a readable file **on the machine Claude runs on** (the remote).

`terminal.sendText()` fails (1) — VS Code does not bracketed-paste it ([microsoft/vscode#159153](https://github.com/microsoft/vscode/issues/159153), [#187480](https://github.com/microsoft/vscode/issues/187480)). This extension uses `workbench.action.terminal.sendSequence` to write `ESC[200~<path>ESC[201~` verbatim into the terminal's pty, satisfying (1) and (2), and writes the file into the remote workspace via `vscode.workspace.fs` to satisfy (3).

## How it works

1. Runs as a **UI (local) extension** (`"extensionKind": ["ui"]`), so it can read your real clipboard even when the workspace is remote.
2. Reads the clipboard image with native OS tools — macOS AppleScript (`«class PNGf»`, TIFF→`sips` fallback), Linux `xclip`/`wl-paste`, Windows PowerShell. No `pngpaste` or other dependencies.
3. Writes it to `<workspace>/.claude-images/clipboard-<timestamp>-<rand>.png`. Over Remote-SSH, `workspace.fs` ships the bytes to the remote on VS Code's own connection — no scp, no daemon.
4. Injects the file's absolute remote path into the active terminal as a bracketed paste.

## Usage

1. Connect to your remote host with **Remote-SSH** and start `claude` in the integrated terminal.
2. Copy an image to your clipboard.
3. Focus the terminal and press **`Cmd+V`** (macOS) / **`Ctrl+V`** (Windows/Linux).
4. Claude shows `[Image N]` in its prompt. Type your message and hit Enter.

`Cmd+V` is a smart dispatcher: when the clipboard holds **text** it hands straight
to the built-in terminal paste (in-process check, no lag); only when there's **no
text but an image** does it run the image flow. So normal text pasting is
unchanged. `Cmd+Alt+V` (`Ctrl+Alt+V`) always forces image mode, and
**“Claude: …”** commands are in the Command Palette.

> The `Cmd+V` binding is scoped to `terminalFocus`, so it applies to every
> integrated terminal (VS Code has no reliable "is Claude running here" signal).
> Text paste behaves normally everywhere; pasting an image into a non-Claude
> shell just drops the file path. To opt out, remove the `claudeImagePaste.smartPaste`
> keybinding in your `keybindings.json`.

## Settings

| Setting | Default | Description |
|---|---|---|
| `claudeImagePaste.imageDirectory` | `.claude-images` | Workspace-relative dir for pasted images. |
| `claudeImagePaste.insertionMode` | `bracketedPaste` | `bracketedPaste` (recommended) or `plain` (legacy `sendText`, for A/B debugging). |
| `claudeImagePaste.cleanupAfterDays` | `7` | Best-effort delete of older pasted images (0 = never). |

## Build / install from source

```bash
npm install
npm run compile          # tsc -> out/
npm run package          # produces a .vsix via @vscode/vsce
code --install-extension claude-image-paste-bracketed-0.1.0.vsix
```

Or press `F5` in VS Code to launch an Extension Development Host.

> ⚠️ **Install on the LOCAL VS Code**, not "Install in SSH". Because it's a `ui` extension it must run on your machine to reach your clipboard; VS Code enforces this automatically, but if you have a "remote extensions" workflow, make sure it lands locally.

## Credits & prior art

This extension stands on other people's work:

- **[cmux](https://github.com/manaflow-ai/cmux)** (manaflow-ai) pioneered the whole approach: detect the SSH session, move the image to the remote, and insert the path **as a bracketed paste** so the AI CLI attaches it. Reading cmux's terminal source is what revealed that the bracketed-paste framing — not the file transfer — is the part everyone else was missing. cmux is a native terminal; this is the equivalent trick inside VS Code.
- **[Claudeboard](https://github.com/dkodr/claudeboard)** (dkodr) is the closest VS Code prior art and the proof that a `ui`-kind extension can read the local clipboard and write to a remote workspace via `vscode.workspace.fs`. The cross-platform clipboard-read approach here (macOS AppleScript `«class PNGf»` with a TIFF→`sips` fallback, Linux `xclip`/`wl-paste`, Windows PowerShell) is adapted from Claudeboard's implementation. Claudeboard inserts the path with `sendText`; this extension's one substantive difference is delivering it as a bracketed paste instead.
- The detection details (Claude Code's `/\.(png|jpe?g|gif|webp)$/i` paste-path matcher) come from inspecting the Claude Code CLI, and the `sendSequence` bracketed-paste technique was demonstrated for Claude Code by [PabloLION's Shift+Enter gist](https://gist.github.com/PabloLION/f8e81d474b39d500d31307d3195e9ba3).
- Relevant VS Code limitation: `terminal.sendText` does not bracketed-paste ([microsoft/vscode#159153](https://github.com/microsoft/vscode/issues/159153), [#187480](https://github.com/microsoft/vscode/issues/187480)).

Not affiliated with Anthropic, cmux, or the above projects.

## License

MIT
