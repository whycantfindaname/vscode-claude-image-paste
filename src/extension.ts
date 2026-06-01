import * as vscode from "vscode";
import { readClipboardImage } from "./clipboard";
import { insertImagePath } from "./insert";
import { writeImageToWorkspace, cleanupOldImages } from "./remoteFile";

const TERMINAL_PASTE = "workbench.action.terminal.paste";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    // Explicit "always treat the clipboard as an image" command.
    vscode.commands.registerCommand("claudeImagePaste.pasteToTerminal", () =>
      performImagePaste({ announceNoImage: true })
    ),
    // Smart Cmd+V / Ctrl+V replacement: text pastes normally, images go to Claude.
    vscode.commands.registerCommand("claudeImagePaste.smartPaste", smartPaste)
  );
}

/**
 * Bound to Cmd+V / Ctrl+V when the terminal is focused. A keybinding can't see
 * the clipboard, so we branch here:
 *   - clipboard has text  -> hand straight to the built-in terminal paste (fast,
 *                            no subprocess, indistinguishable from normal paste)
 *   - no text, has image  -> run the bracketed-paste image flow
 *   - neither             -> fall back to the built-in paste (harmless)
 */
async function smartPaste(): Promise<void> {
  if (!vscode.window.activeTerminal) {
    await vscode.commands.executeCommand(TERMINAL_PASTE);
    return;
  }

  // Fast path: text on the clipboard is the overwhelmingly common case. Reading
  // text is an in-process call, so normal pasting keeps its instant feel and we
  // never spawn the (slower) native image reader unless there's no text.
  let text = "";
  try {
    text = await vscode.env.clipboard.readText();
  } catch {
    // ignore — treat as "no text"
  }
  if (text.length > 0) {
    await vscode.commands.executeCommand(TERMINAL_PASTE);
    return;
  }

  const result = await performImagePaste({ announceNoImage: false });
  if (result !== "pasted") {
    // No usable image (or it failed) — behave like an ordinary paste so Cmd+V is
    // never a dead key.
    await vscode.commands.executeCommand(TERMINAL_PASTE);
  }
}

type ImagePasteResult = "pasted" | "no-image" | "error";

async function performImagePaste(opts: { announceNoImage: boolean }): Promise<ImagePasteResult> {
  const config = vscode.workspace.getConfiguration("claudeImagePaste");
  const mode = config.get<"bracketedPaste" | "plain">("insertionMode", "bracketedPaste");

  if (!vscode.window.activeTerminal) {
    if (opts.announceNoImage) {
      vscode.window.showWarningMessage(
        "Claude Image Paste: focus the terminal running Claude Code, then press the paste shortcut."
      );
    }
    return "error";
  }

  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: "Pasting image to Claude…" },
    async (): Promise<ImagePasteResult> => {
      let image;
      try {
        image = await readClipboardImage();
      } catch (err) {
        vscode.window.showErrorMessage(`Claude Image Paste: clipboard read failed — ${message(err)}`);
        return "error";
      }
      if (!image) {
        if (opts.announceNoImage) {
          vscode.window.showWarningMessage("Claude Image Paste: no image found on the clipboard.");
        }
        return "no-image";
      }

      let uri: vscode.Uri;
      try {
        uri = await writeImageToWorkspace(image.buffer, image.ext);
      } catch (err) {
        vscode.window.showErrorMessage(`Claude Image Paste: could not write image — ${message(err)}`);
        return "error";
      }

      try {
        await insertImagePath(uri.fsPath, mode);
      } catch (err) {
        vscode.window.showErrorMessage(`Claude Image Paste: ${message(err)}`);
        return "error";
      }

      cleanupOldImages(config.get<number>("cleanupAfterDays", 7)).catch(() => undefined);
      return "pasted";
    }
  );
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function deactivate(): void {
  /* nothing to clean up */
}
