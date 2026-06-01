import { exec } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

export interface ClipboardImage {
  buffer: Buffer;
  /** File extension to use, without the dot (e.g. "png", "jpeg"). */
  ext: string;
}

const EXEC_TIMEOUT_MS = 10_000;

function run(command: string, binary: boolean): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { timeout: EXEC_TIMEOUT_MS, encoding: binary ? "buffer" : "utf8", maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(binary ? (stdout as Buffer) : Buffer.from(String(stdout)));
      }
    );
  });
}

/**
 * macOS: ask AppleScript for the clipboard as PNG and write it to a temp file.
 * Falls back to TIFF + `sips` conversion when the clipboard only carries TIFF.
 * No third-party binaries required (no pngpaste).
 */
async function readMacImage(): Promise<ClipboardImage | null> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-img-"));
  const tmpFile = path.join(tmpDir, "clipboard.png");
  const script = [
    `set outFile to (POSIX file ${JSON.stringify(tmpFile)})`,
    `try`,
    `  set imgData to (the clipboard as «class PNGf»)`,
    `  set fh to open for access outFile with write permission`,
    `  set eof fh to 0`,
    `  write imgData to fh`,
    `  close access fh`,
    `  return "png"`,
    `on error`,
    `  try`,
    `    close access outFile`,
    `  end try`,
    `  try`,
    `    set imgData to (the clipboard as «class TIFF»)`,
    `    set fh to open for access outFile with write permission`,
    `    set eof fh to 0`,
    `    write imgData to fh`,
    `    close access fh`,
    `    do shell script "sips -s format png " & quoted form of (POSIX path of outFile) & " --out " & quoted form of (POSIX path of outFile)`,
    `    return "png"`,
    `  on error`,
    `    return "none"`,
    `  end try`,
    `end try`,
  ].join("\n");

  try {
    const result = (await run(`osascript -e ${shellArg(script)}`, false)).toString().trim();
    if (result !== "png" || !fs.existsSync(tmpFile)) {
      return null;
    }
    const buffer = await fs.promises.readFile(tmpFile);
    if (buffer.length === 0) {
      return null;
    }
    return { buffer, ext: "png" };
  } finally {
    fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Linux: xclip (X11) then wl-paste (Wayland). */
async function readLinuxImage(): Promise<ClipboardImage | null> {
  const attempts: Array<{ cmd: string; ext: string }> = [
    { cmd: "xclip -selection clipboard -t image/png -o", ext: "png" },
    { cmd: "wl-paste -t image/png", ext: "png" },
  ];
  for (const { cmd, ext } of attempts) {
    try {
      const buffer = await run(cmd, true);
      if (buffer && buffer.length > 0) {
        return { buffer, ext };
      }
    } catch {
      // try next
    }
  }
  return null;
}

/** Windows: PowerShell + System.Windows.Forms.Clipboard. */
async function readWindowsImage(): Promise<ClipboardImage | null> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-img-"));
  const tmpFile = path.join(tmpDir, "clipboard.png");
  const escaped = tmpFile.replace(/'/g, "''");
  const ps = [
    "Add-Type -AssemblyName System.Windows.Forms;",
    "Add-Type -AssemblyName System.Drawing;",
    "if ([System.Windows.Forms.Clipboard]::ContainsImage()) {",
    "  $img = [System.Windows.Forms.Clipboard]::GetImage();",
    `  $img.Save('${escaped}', [System.Drawing.Imaging.ImageFormat]::Png);`,
    "  Write-Host 'ok'",
    "} else { Write-Host 'none' }",
  ].join(" ");
  try {
    const out = (await run(`powershell -NoProfile -Command "${ps}"`, false)).toString().trim();
    if (!out.startsWith("ok") || !fs.existsSync(tmpFile)) {
      return null;
    }
    const buffer = await fs.promises.readFile(tmpFile);
    return buffer.length > 0 ? { buffer, ext: "png" } : null;
  } finally {
    fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Read an image off the LOCAL system clipboard. Because this extension runs as
 * a UI (local) extension, `process.platform` is the user's own machine even when
 * the workspace is remote over SSH.
 */
export async function readClipboardImage(): Promise<ClipboardImage | null> {
  switch (process.platform) {
    case "darwin":
      return readMacImage();
    case "linux":
      return readLinuxImage();
    case "win32":
      return readWindowsImage();
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

/** Single-quote a string for safe embedding in a POSIX shell command. */
function shellArg(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Random short token for filenames. */
export function shortToken(): string {
  return crypto.randomBytes(4).toString("hex");
}
