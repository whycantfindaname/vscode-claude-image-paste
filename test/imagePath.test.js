const assert = require("node:assert/strict");
const test = require("node:test");

const {
  configuredRemoteImageDirectory,
  normalizeRemoteImageDirectory,
  terminalImagePath,
} = require("../out/imagePath.js");

test("leaves the remote absolute directory disabled when unset", () => {
  assert.equal(configuredRemoteImageDirectory("  "), undefined);
});

test("accepts a workspace-level persistent directory when configured", () => {
  assert.equal(
    normalizeRemoteImageDirectory("/home/notebook/code/personal/S9063923/.claude-images"),
    "/home/notebook/code/personal/S9063923/.claude-images"
  );
});

test("normalizes an absolute remote POSIX path", () => {
  assert.equal(
    normalizeRemoteImageDirectory("/home/notebook/project/../.claude-images/"),
    "/home/notebook/.claude-images"
  );
});

test("rejects a relative remote path", () => {
  assert.throws(
    () => normalizeRemoteImageDirectory("../../.claude-images"),
    /must be an absolute POSIX path/
  );
});

test("rejects the remote filesystem root", () => {
  assert.throws(
    () => normalizeRemoteImageDirectory("/"),
    /cannot be the remote filesystem root/
  );
});

test("uses the POSIX URI path for a Remote-SSH terminal", () => {
  assert.equal(
    terminalImagePath(
      "vscode-remote",
      "/home/notebook/code/personal/S9063923/.claude-images/clipboard.png",
      "\\\\ssh-remote+host\\home\\notebook\\code\\personal\\S9063923\\.claude-images\\clipboard.png"
    ),
    "/home/notebook/code/personal/S9063923/.claude-images/clipboard.png"
  );
});

test("uses fsPath for a local workspace", () => {
  assert.equal(
    terminalImagePath("file", "/C:/work/.claude-images/clipboard.png", "C:\\work\\.claude-images\\clipboard.png"),
    "C:\\work\\.claude-images\\clipboard.png"
  );
});
