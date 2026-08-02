import * as path from "path";

export function normalizeRemoteImageDirectory(directory: string): string {
  const trimmed = directory.trim();
  if (!path.posix.isAbsolute(trimmed)) {
    throw new Error(
      "remoteImageDirectory must be an absolute POSIX path, for example /home/user/workspace/.claude-images."
    );
  }
  const normalized = path.posix.normalize(trimmed);
  if (normalized === "/") {
    throw new Error("remoteImageDirectory cannot be the remote filesystem root.");
  }
  return normalized.replace(/\/+$/, "");
}

export function configuredRemoteImageDirectory(directory: string): string | undefined {
  return directory.trim() ? normalizeRemoteImageDirectory(directory) : undefined;
}

export function terminalImagePath(
  uriScheme: string,
  uriPath: string,
  fsPath: string
): string {
  return uriScheme === "vscode-remote" ? uriPath : fsPath;
}
