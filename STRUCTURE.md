# `vscode-claude-image-paste-ws` 结构与维护边界

> **范围**：本文描述当前 `local/remote-absolute-path` checkout 的目录、扩展
> 入口、Remote-SSH 绝对路径实现和维护边界。事实以当前 `package.json`、
> `src/`、`test/`、CI workflow、Git tracked tree 与当前分支差异为准。
>
> **Infra 角色**：Infra companion manifest 中的 ID 是 `cursor-image-paste`，
> workspace path 是 `Tools/vscode-claude-image-paste-ws`，组件标记为 `cursor`，
> 消费者是 `cursor-windows-image-paste`。这描述它在 Infra 中的归属和消费关系；
> 扩展自身的运行时职责仍由本仓库的 VS Code manifest 定义：在本地 UI extension
> host 中读取剪贴板，并把图片路径注入 VS Code 集成终端中的 Claude Code。

## 1. 来源、分支与同步边界

- 当前工作分支是 `local/remote-absolute-path`；具体提交和远端同步状态以 Git
  回读为准。
- fork 是 `whycantfindaname/vscode-claude-image-paste`，Git remote 名为
  `fork`；上游是 `benjaminwood/vscode-claude-image-paste`，Git remote 名为
  `origin`。
- 当前实现从上游提交
  `7e526b9a172447fc38e993d8af64c3a1f5ddd927`（本地 `main`/`fork/main`）
  分出。`package.json` 的 repository、bugs 和 homepage 指向 fork。
- 本分支的个人改动集中在可配置 Remote-SSH 绝对图片目录、远端 POSIX 路径
  选择、测试、锁定打包工具和相应文档/忽略规则；上游代码仍是剪贴板读取、
  bracketed-paste 注入和 VS Code `workspace.fs` 传输的基础。

本仓库不是 Infra engine，也不维护 `cursor-windows-image-paste` 消费者的
Windows 自动化脚本或宿主机配置。同步上游时应先比较上游变更与本分支
`src/`、manifest 和测试的语义，再在本分支验证；不得把上游同步误写成已经
发布或已经被消费者验收。上游/ fork remote 的 URL 与 branch 变化时，应同步
更新本文件和 Infra companion manifest；目录、入口、配置或维护边界变化时，
同步更新本文件。

## 2. 目录地图

当前所有 tracked 顶层目录和重要根文件如下：

```text
.
├── .github/workflows/
│   ├── build.yml                 # push/PR/手动触发的编译与 .vsix artifact
│   └── publish.yml               # Release/手动触发的发布与 release attachment
├── src/
│   ├── clipboard.ts              # 本机跨平台图片剪贴板读取、短随机 token
│   ├── extension.ts              # VS Code activate、命令和图片粘贴流程
│   ├── imagePath.ts              # 远端绝对目录校验与 URI 路径选择
│   ├── insert.ts                 # bracketed-paste/plain 终端注入
│   └── remoteFile.ts             # 工作区/远端写入、.gitignore 和清理
├── test/
│   └── imagePath.test.js         # 编译后 imagePath 模块的 Node test
├── .gitignore                    # node_modules/out/dist/.vsix/.cursor 忽略边界
├── .vscodeignore                 # VSIX 中排除 source/test/CI 等内容
├── LICENSE                       # MIT
├── README.md                     # 使用、设置、构建、安装和发布说明
├── THIRD_PARTY_NOTICES.md        # Claudeboard MIT 改编代码声明及 cmux 说明
├── icon.png / icon.svg           # 扩展图标资源
├── package.json                  # VS Code manifest、scripts、开发依赖
├── package-lock.json             # npm lockfile
└── tsconfig.json                 # TypeScript 编译边界
```

`out/` 是 `tsc` 生成的 JavaScript/source map 目录，`dist/` 用于本地
`npm run package` 的 VSIX 输出，`node_modules/` 是依赖安装目录；三者均未
跟踪。`.DS_Store` 当前是既有未跟踪本地文件，不属于项目源文件，维护时保留
且不要将它写进结构地图或提交。

## 3. 扩展入口、命令与设置

`package.json` 是唯一的 VS Code manifest：

- `main` 为 `./out/extension.js`；`activationEvents` 为空数组，激活由贡献点
  和 VS Code 机制触发；`engines.vscode` 为 `^1.85.0`。
- manifest 的 `publisher/name` 扩展标识为
  `wenjieliao-local.claude-image-paste-bracketed-remote-path`；它不同于 Infra
  companion registry 中的 `cursor-image-paste` ID，也不同于消费者 ID。
- `extensionKind` 为 `ui`。扩展应安装/运行在本地 VS Code extension host，
  即使 workspace 和 Claude Code 终端位于 Remote-SSH 主机上。
- 注册命令：
  - `claudeImagePaste.smartPaste`：智能文本/图片粘贴，`Cmd+V`（macOS）或
    `Ctrl+V`（Windows/Linux），条件为 `terminalFocus &&
    !accessibilityModeEnabled`；文本直接交给 VS Code 原生 terminal paste，
    无文本时才尝试图片。
  - `claudeImagePaste.pasteToTerminal`：强制图片粘贴，`Cmd+Alt+V` 或
    `Ctrl+Alt+V`，条件为 `terminalFocus`。
- 相关设置：
  - `claudeImagePaste.imageDirectory`，默认 `.claude-images`：本地 workspace
    的相对目录，也是未配置远端绝对目录时的 Remote-SSH fallback。
  - `claudeImagePaste.remoteImageDirectory`，默认空字符串：仅对
    `vscode-remote` workspace 作为远端 POSIX 绝对目录使用。
  - `claudeImagePaste.insertionMode`，默认 `bracketedPaste`，可选 `plain`：
    前者发送 bracketed-paste 序列，后者保留旧的 `terminal.sendText` 调试路径。
  - `claudeImagePaste.cleanupAfterDays`，默认 `7`：按文件修改时间尽力清理
    `clipboard-` 前缀图片，`0` 表示不清理。

扩展使用 `claudeImagePaste.*` 命名空间；新增命令、快捷键或设置必须同时修改
manifest、实现、README（面向使用者）和本文件（结构/边界）。

## 4. `src/` 关键结构与数据流

1. `clipboard.ts` 在本机读取系统剪贴板图片：macOS 使用 `osascript`，必要时
   用 `sips` 将 TIFF 转 PNG；Linux 依次尝试 `xclip`、`wl-paste`；Windows
   使用 PowerShell 的 `System.Windows.Forms`/`System.Drawing`。读取超时为
   10 秒，返回内存 `Buffer` 和扩展名；同时提供图片文件名用的短随机 token。
2. `extension.ts` 在激活时注册命令，检查活动 terminal，调用剪贴板读取、
   `remoteFile.ts` 写入和 `insert.ts` 注入。智能粘贴先用
   `vscode.env.clipboard.readText()` 保持普通文本粘贴路径，再进入图片流程。
3. `remoteFile.ts` 只使用第一项 `workspace.workspaceFolders[0]`。目录选择和
   写入规则是：
   - Remote-SSH（URI scheme 为 `vscode-remote`）且设置了
     `remoteImageDirectory`：调用 `configuredRemoteImageDirectory`，将规范化
     POSIX 路径放入 workspace URI；
   - 其他情况：把 `imageDirectory` 按 `/` 分段后作为 workspace-relative 路径；
   - 目录按需创建，文件名为
     `clipboard-YYYYMMDD-HHMMSS-<random>.<ext>`，并在目录中按需写入 `*` 的
     `.gitignore`；图片写入后异步执行旧文件清理。
4. `imagePath.ts` 要求远端设置去除首尾空白后必须是 POSIX absolute path，
   用 `path.posix.normalize` 处理 `..` 和尾部斜杠，并拒绝 `/` 根目录。
   `terminalImagePath` 在 `vscode-remote` 时返回 URI 的 POSIX `path`，本地
   workspace 返回 `fsPath`。因此 Windows 本地 UI host 不会把 Windows 本地
   映射路径发送给远端 Claude。
5. `insert.ts` 将清洁路径包在 `ESC[200~` / `ESC[201~` 中，通过
   `workbench.action.terminal.sendSequence` 原样写入活动 terminal pty；不附加
   换行。`plain` 模式才调用 `terminal.sendText`。路径包含 shell/规范化敏感
   字符时会单引号包裹。

`vscode.workspace.fs` 负责向当前 workspace 写入字节，所以本实现不包含 scp、
远程守护进程、远程服务发现或独立文件传输协议。绝对目录必须由 Remote-SSH
workspace 对应的远端文件系统可创建/写入；代码不会预先探测远程主机权限，失败
时由写入/创建目录错误反馈给用户。

## 5. 自定义能力的实际边界

本 fork 相对 `main` 的主要功能是 Remote-SSH 的持久绝对目录和对应终端路径：

- 只在 workspace URI scheme 为 `vscode-remote` 时读取
  `remoteImageDirectory`；本地 workspace 即使设置该项，也继续使用
  `imageDirectory` 相对目录。
- 空白/空值表示关闭绝对目录能力并回退到 workspace-relative 目录；相对路径
  和远端文件系统 `/` 会被拒绝；`/a/../b/` 会规范化为 `/b` 对应的目录。
- 写入仍受 workspace.fs 和当前 workspace 权限约束；绝对路径不会自动创建
  workspace 外的父级权限、挂载点或远端目录策略。
- 发送给远端 terminal 的是 `vscode-remote` URI POSIX path；本地 workspace
  发送的是 `fsPath`。这只解决路径表示和写入位置，不改变 Claude Code、VS Code
  Remote-SSH 或 Cursor consumer 的生命周期/权限模型。
- 扩展没有判断当前 terminal 是否真的运行 Claude Code 的能力；快捷键条件只
  检查 terminal focus。非 Claude terminal 中的图片粘贴也可能只留下文件路径。
- 目前只取第一个 workspace folder，不提供多根 workspace 的目录选择策略。

## 6. 源码、构建产物、依赖与运行时

### 源码与产物

- 手工维护的实现是 `src/**/*.ts`、`test/**/*.js`、manifest、文档、图标和 CI。
- `tsconfig.json` 以 `src/` 为 `rootDir`、以 `out/` 为 `outDir`，目标为 ES2021，
  CommonJS、strict、source map、未使用局部/参数检查均开启。
- VSIX 运行入口依赖编译后的 `out/extension.js`；`.vscodeignore` 排除
  `.github/`、`src/`、`test/`、`dist/`、TypeScript、map、`tsconfig.json` 和
  `.gitignore`，保留编译产物和 manifest 所需资源。
- `package.json` 的 `package` script 输出
  `dist/claude-image-paste-remote-path-0.2.0.vsix`；`.gitignore` 不跟踪该
  目录或任何 `.vsix`。

### 依赖与宿主

`package.json` 没有运行时 npm dependency，开发依赖为
`typescript`、`@types/node`、`@types/vscode` 和锁定版本 `@vscode/vsce` 3.9.2；
完整版本/传递依赖由 `package-lock.json` 决定。实际运行需要支持 `^1.85.0` 的
VS Code extension host、Node/TypeScript 编译环境和系统剪贴板工具链。不要把
`osascript`、`sips`、`xclip`、`wl-paste`、PowerShell 或 Windows .NET API 误写
成 npm 依赖；它们属于宿主平台边界。

## 7. 开发验证、打包与发布入口

本地 README 和 scripts 定义的入口：

```bash
npm ci                    # 按 package-lock 安装开发依赖
npm run compile           # tsc -p ./，输出 out/
npm test                  # compile 后运行 node --test test/*.test.js
npm run watch             # tsc watch
npm run package           # vsce package --no-dependencies，输出 dist/*.vsix
```

也可在 VS Code 中按 `F5` 启动 Extension Development Host。当前测试只覆盖
`imagePath.ts` 编译后模块：空配置、绝对目录、POSIX 规范化、相对路径/根目录
拒绝，以及 Remote-SSH POSIX path 与本地 `fsPath` 的选择；它不替代真实
剪贴板、Remote-SSH 连接、Claude Code 终端或 Windows Cursor consumer 验收。

CI 的 `build.yml` 在 push、pull request 和手动触发时执行 `npm ci`、
`npm run compile`，再以 `npx --yes @vscode/vsce package --no-dependencies`
打包并上传根目录 `*.vsix` artifact。`publish.yml` 在 latest Release 或手动
触发时编译、打包 `extension.vsix`，校验 Release tag 去掉 `v` 后等于
`package.json.version`，并在相应 secrets 存在时发布 VS Code Marketplace/Open VSX，
Release 事件还会附加 VSIX。CI workflow 的 `npx` 输出和本地 `npm run package`
的 `dist/` 输出是两个明确入口，不应混写为同一个产物路径。

## 8. 维护规则

- 修改扩展入口、命令、设置、目录选择、终端注入、生成产物边界或 CI 打包流程
  时，必须同时检查 `package.json`、对应 `src/`/`test/`、README、workflow 和
  本文件；依赖变更必须同步 `package-lock.json`。
- 上游同步只处理 `origin` 上游与 fork branch 的代码差异；保持
  `remoteImageDirectory` 的绝对 POSIX 校验、Remote-SSH URI path 选择和本地 UI
  extension 约束，并重新运行编译/测试门禁。
- 不把 `out/`、`dist/`、`node_modules/`、`.vsix`、剪贴板图片、宿主机凭据或
  Remote-SSH runtime 状态提交进仓库；图片目录内的 `.gitignore` 由扩展运行时
  生成，不是本仓库的 tracked source。
- 变更文档前后使用 `git ls-files`、`find`、manifest/scripts/source 和分支差异
  对照；完成后检查 `git diff --check`，确认只改变本文件并保留既有 `.DS_Store`。
