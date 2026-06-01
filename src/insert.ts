import * as vscode from "vscode";

const ESC = String.fromCharCode(27); // \x1b
const PASTE_START = `${ESC}[200~`;
const PASTE_END = `${ESC}[201~`;

/**
 * Claude Code only converts a pasted path into an inline [Image N] when the
 * payload arrives as a *bracketed paste* whose entire (trimmed) content is a
 * path ending in an image extension. Its detector is `/\.(png|jpe?g|gif|webp)$/i`.
 *
 * VS Code's `terminal.sendText()` does NOT frame text as a bracketed paste, so
 * the path is seen as typed input and the detector never runs — which is why
 * every existing extension only leaves a dead path. We frame it ourselves.
 */
function formatPath(absolutePath: string): string {
  // The bracketed-paste payload is taken literally by the receiving program;
  // Claude trims and regex-tests it. A clean path with no shell-special chars
  // matches the `$`-anchored detector directly, so prefer sending it raw.
  // Only when the path contains characters a shell/normaliser would choke on do
  // we single-quote it (cmux does the same, and Claude un-quotes before testing).
  const safe = /^[A-Za-z0-9_@%+=:,.\/-]+$/.test(absolutePath);
  return safe ? absolutePath : `'${absolutePath.replace(/'/g, `'\\''`)}'`;
}

/**
 * Deliver the remote/local absolute image path to the active terminal so that
 * Claude Code attaches it as an image. No trailing newline: the path lands in
 * the prompt buffer and the user keeps typing, exactly like a native paste.
 */
export async function insertImagePath(
  absolutePath: string,
  mode: "bracketedPaste" | "plain"
): Promise<void> {
  const terminal = vscode.window.activeTerminal;
  if (!terminal) {
    throw new Error("No active terminal — focus the terminal running Claude Code, then try again.");
  }
  terminal.show(false);

  const payload = formatPath(absolutePath);

  if (mode === "plain") {
    // Legacy behaviour, kept only for A/B debugging.
    terminal.sendText(payload, false);
    return;
  }

  const sequence = `${PASTE_START}${payload}${PASTE_END}`;
  // `workbench.action.terminal.sendSequence` writes the bytes verbatim to the
  // active terminal's pty (no line-ending normalisation, no auto-newline).
  // Over Remote-SSH that pty's stdin is the remote Claude process.
  await vscode.commands.executeCommand("workbench.action.terminal.sendSequence", {
    text: sequence,
  });
}
