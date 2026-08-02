import * as vscode from "vscode";
import { shortToken } from "./clipboard";
import { configuredRemoteImageDirectory } from "./imagePath";

const FILENAME_PREFIX = "clipboard-";

function timestamp(): string {
  // YYYYMMDD-HHMMSS in local time, sortable and human-readable.
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function imageDirUri(): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error("Open a folder/workspace first — images are written inside the workspace.");
  }
  const config = vscode.workspace.getConfiguration("claudeImagePaste");
  if (folder.uri.scheme === "vscode-remote") {
    const configuredRemotePath = configuredRemoteImageDirectory(
      config.get<string>("remoteImageDirectory", "")
    );
    if (configuredRemotePath) {
      return folder.uri.with({ path: configuredRemotePath });
    }
  }

  const rel = config.get<string>("imageDirectory", ".claude-images");
  return vscode.Uri.joinPath(folder.uri, ...rel.split("/").filter(Boolean));
}

/**
 * Write the image into the workspace's image directory and return its URI.
 *
 * Because this runs in the UI (local) extension host but `workspace.fs` targets
 * the active workspace, the bytes are transparently shipped to the remote over
 * VS Code's own connection when using Remote-SSH — no scp, no daemon.
 */
export async function writeImageToWorkspace(buffer: Buffer, ext: string): Promise<vscode.Uri> {
  const dir = imageDirUri();
  await vscode.workspace.fs.createDirectory(dir);
  await ensureGitignore(dir);

  const name = `${FILENAME_PREFIX}${timestamp()}-${shortToken()}.${ext}`;
  const uri = vscode.Uri.joinPath(dir, name);
  await vscode.workspace.fs.writeFile(uri, buffer);
  return uri;
}

async function ensureGitignore(dir: vscode.Uri): Promise<void> {
  const gitignore = vscode.Uri.joinPath(dir, ".gitignore");
  try {
    await vscode.workspace.fs.stat(gitignore);
  } catch {
    await vscode.workspace.fs.writeFile(gitignore, new TextEncoder().encode("*\n"));
  }
}

/** Best-effort removal of previously pasted images older than `days`. */
export async function cleanupOldImages(days: number): Promise<void> {
  if (!days || days <= 0) {
    return;
  }
  let dir: vscode.Uri;
  try {
    dir = imageDirUri();
  } catch {
    return;
  }
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  try {
    const entries = await vscode.workspace.fs.readDirectory(dir);
    await Promise.allSettled(
      entries
        .filter(([name, type]) => type === vscode.FileType.File && name.startsWith(FILENAME_PREFIX))
        .map(async ([name]) => {
          const uri = vscode.Uri.joinPath(dir, name);
          const stat = await vscode.workspace.fs.stat(uri);
          if (stat.mtime < cutoff) {
            await vscode.workspace.fs.delete(uri);
          }
        })
    );
  } catch {
    // directory may not exist yet — nothing to clean
  }
}
