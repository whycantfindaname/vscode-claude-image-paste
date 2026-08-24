# `vscode-claude-image-paste-ws` 结构与维护边界

本文是本仓库维护者和 Agent 的结构地图。修改 manifest、源码、测试、构建或
发布配置前，先用它确认三个问题：文件属于源码还是生成物，图片路径在哪个
运行时边界之间传递，以及 Infra、VS Code 和下游消费者的标识分别指什么。

本文只描述 `lwj_dev` checkout 的仓库结构、Remote-SSH
绝对路径实现和维护边界。仓库事实以 `package.json`、`src/`、`test/`、
`tsconfig.json`、`.gitignore`、`.vscodeignore`、CI workflow、Git tracked
tree 和当前分支差异为准；Infra 归属和消费者关系以 Infra companion
manifest 为准。

## 1. 标识、读者与组件边界

下列名称属于不同系统，不能互换：

| 名称 | 准确定义 |
|---|---|
| Infra companion ID | `cursor-image-paste`：Infra companion manifest 中的仓库键，用来登记本仓库；workspace path 是 `Tools/vscode-claude-image-paste-ws`；它不是 VS Code 扩展 ID。 |
| Infra component | `cursor`：上述 manifest 的组件标签；它不是 VS Code 扩展 ID，也不是 consumer ID。 |
| VS Code manifest ID | `wenjieliao-local.claude-image-paste-bracketed-remote-path`：`package.json` 的 `publisher.name` 组合，是 VS Code 扩展自身的标识。package name 是 `claude-image-paste-bracketed-remote-path`。 |
| consumer ID | `cursor-windows-image-paste`：Infra companion manifest 的 `consumers[]` 项，表示下游 Infra 消费关系；本仓库不实现或拥有该 consumer。 |

本扩展是一个 `ui` extension：扩展代码在本地 VS Code extension host 中读取本机
剪贴板；通过当前 workspace 的 `vscode.workspace.fs` provider 写入图片；随后把返回 URI 的
路径注入活动集成终端。在 Remote-SSH 场景，workspace 和终端对应远端，剪贴板
读取仍发生在本地；这不是 Infra engine、远程文件传输服务或 Windows consumer
脚本。

## 2. 来源、分支与同步边界

- 本 checkout 的维护分支是 `lwj_dev`；branch、remote 和同步
  状态属于 Git repository state，需要用 Git 回读，并与运行态 `live` 分开报告。
- fork 是 `whycantfindaname/vscode-claude-image-paste`，Git remote 名为
  `fork`；上游是 `benjaminwood/vscode-claude-image-paste`，Git remote 名为
  `origin`。
- 本分支从上游提交
  `7e526b9a172447fc38e993d8af64c3a1f5ddd927`（本地 `main`/`fork/main`）
  分出。`package.json` 的 repository、bugs 和 homepage 指向 fork。
- 本分支的个人改动集中在可配置 Remote-SSH 绝对图片目录、远端 POSIX 路径
  选择、测试、锁定打包工具和相应文档/忽略规则；上游代码仍是剪贴板读取、
  bracketed-paste 注入和 VS Code `workspace.fs` 传输的基础。

本仓库不维护 Infra engine、`cursor-windows-image-paste` consumer 的 Windows
自动化脚本或宿主机配置。同步上游时，应比较上游变更与本分支 `src/`、manifest
和测试的语义，再在本分支验证；上游同步不等于已经发布，也不等于 consumer
已经验收。上游或 fork 的 URL、remote、branch 变化时，同步检查本节和 Infra
companion manifest；目录、入口、配置或维护边界变化时，更新本文。

## 3. 目录地图

以下是仓库已跟踪的顶层目录和重要根文件：

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
├── STRUCTURE.md                  # 仓库结构与维护边界
├── THIRD_PARTY_NOTICES.md        # Claudeboard MIT 改编代码声明及 cmux 说明
├── icon.png / icon.svg           # 扩展图标资源
├── package.json                  # VS Code manifest、scripts、开发依赖
├── package-lock.json             # npm lockfile
└── tsconfig.json                 # TypeScript 编译边界
```

`out/` 是 `tsc` 生成的 JavaScript/source map 目录，`dist/` 是本地
`npm run package` 的 VSIX 输出，`node_modules/` 是依赖安装目录；三者均未
跟踪。CI 生成的根目录 `*.vsix` 也属于 build artifact，不是源码。`.DS_Store`
是既有未跟踪本地文件，不属于项目源文件；维护时保留，不把它写进结构地图或
提交。

## 4. VS Code manifest：入口、命令与设置

`package.json` 是唯一的 VS Code manifest：

- `main` 为 `./out/extension.js`；`activationEvents` 为空数组，激活入口由
  manifest contribution 和 VS Code 机制管理；`engines.vscode` 为 `^1.85.0`。
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
  - `claudeImagePaste.remoteImageDirectory`，默认空字符串：仅在 URI scheme 为
    `vscode-remote` 的 workspace 中作为远端 POSIX 绝对目录使用。
  - `claudeImagePaste.insertionMode`，默认 `bracketedPaste`，可选 `plain`：
    前者发送 bracketed-paste 序列，后者保留旧的 `terminal.sendText` 调试路径。
  - `claudeImagePaste.cleanupAfterDays`，默认 `7`：按文件修改时间尽力清理
    `clipboard-` 前缀图片，`0` 表示不清理。

命令、快捷键和设置均使用 `claudeImagePaste.*` 命名空间。新增或修改这些
contribution 时，同时核对 manifest、实现、测试、README 和本文。

## 5. 图片粘贴数据流与路径边界

### 本地剪贴板到 workspace 文件

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

### Remote-SSH 绝对 POSIX 路径

本文中的“远端绝对 POSIX 路径”只指 `remoteImageDirectory` 在
`vscode-remote` workspace 中的配置值及其规范化结果。它不是本地 UI host 的
Windows 路径，也不是 Infra consumer 的配置：

- `imagePath.ts` 会先去除首尾空白，要求值是 POSIX absolute path，用
  `path.posix.normalize` 处理 `..` 和尾部斜杠，并拒绝 `/` 根目录；空值关闭该
  能力并回退到 `imageDirectory`。例如 `/a/../b/` 规范化为 `/b`。
- `terminalImagePath` 在 `vscode-remote` 时返回 URI 的 POSIX `path`，本地
  workspace 返回 `fsPath`。因此 Windows 本地 UI host 不会把 Windows 映射路径
  发送给远端 Claude。

`vscode.workspace.fs` 负责向当前 workspace 写入字节，所以本实现不包含 scp、
远程守护进程、远程服务发现或独立文件传输协议。绝对目录必须由 Remote-SSH
workspace 对应的远端文件系统可创建和写入；代码不会预先探测远端权限，失败
时由写入或创建目录错误反馈给用户。绝对路径不会替远端环境配置 workspace 外
的父级权限、挂载点或目录策略。

### 终端注入与功能边界

`insert.ts` 将处理后的路径包在 `ESC[200~` / `ESC[201~` 中，通过
`workbench.action.terminal.sendSequence` 原样写入活动 terminal pty；不附加换行。
`plain` 模式才调用 `terminal.sendText`。路径包含 shell/规范化敏感字符时会单引号
包裹。

### 功能边界

扩展没有判断当前 terminal 是否真的运行 Claude Code 的能力；快捷键条件只检查
terminal focus。非 Claude terminal 中的图片粘贴也可能只留下文件路径。路径表示
和写入位置属于扩展能力，不改变 Claude Code、VS Code Remote-SSH 或 consumer
的生命周期和权限模型。

## 6. source、generated、build、runtime 与 live

这些词在本文中有固定范围：

| 术语 | 本文范围 |
|---|---|
| `source` | 已跟踪的项目输入：`src/**/*.ts`、`test/**/*.js`、manifest、lockfile、`tsconfig.json`、文档、图标、忽略规则和 CI 配置。 |
| `generated` | 工具产生或安装的 `out/`、本地 `dist/*.vsix`、CI 根目录 `*.vsix` 和 `node_modules/`；它们不是手工源码，也不应提交。 |
| `build` | `tsc` 编译、VSIX 打包及相应 CI job 的过程；build 产生的 artifact 与运行中的扩展是两个对象。 |
| `repository state` | 当前 branch、remote、tracking 与 push 状态；它们由 Git 回读，不能证明扩展已经安装、激活或被 consumer 验收。 |
| `runtime` | 本地 VS Code UI extension host、当前 workspace 的 `workspace.fs`、活动 terminal pty、远端文件系统和本机剪贴板工具链之间的实际执行边界。 |
| `live` | VS Code 是否安装或激活、Remote-SSH 是否连接、Claude Code 是否运行，以及 consumer 是否验收等会随环境变化的状态；本文不把 repository state、仓库文件或 CI 配置当作这些状态的成功证据。 |

### 编译边界与产物

- `tsconfig.json` 以 `src/` 为 `rootDir`、以 `out/` 为 `outDir`，目标为 ES2021，
  CommonJS、strict、source map、未使用局部/参数检查均开启。
- VSIX 运行入口依赖编译后的 `out/extension.js`；`.vscodeignore` 排除
  `.vscode/`、`.github/`、`src/`、`test/`、`dist/`、TypeScript、map、
  `tsconfig.json`、`.gitignore`、`icon.svg` 和 `node_modules/`，保留编译产物和
  manifest 所需资源。
- `package.json` 的 `package` script 输出
  `dist/claude-image-paste-remote-path-0.2.0.vsix`；`.gitignore` 不跟踪该
  目录或任何 `.vsix`。

### 依赖与宿主

`package.json` 没有运行时 npm dependency，开发依赖为
`typescript`、`@types/node`、`@types/vscode` 和锁定版本 `@vscode/vsce` 3.9.2；
完整版本/传递依赖由 `package-lock.json` 决定。运行需要支持 `^1.85.0` 的 VS Code
extension host 和系统剪贴板工具链；编译和打包需要 Node/TypeScript 环境。不要把
`osascript`、`sips`、`xclip`、`wl-paste`、PowerShell 或 Windows .NET API 误写
成 npm 依赖；它们属于宿主平台边界。

## 7. 开发验证、打包与发布入口

`README.md` 和 `package.json` scripts 定义的本地入口：

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

CI 的 `build.yml` 在 `main` push、pull request 和手动触发时执行 `npm ci`、
`npm run compile`，再以 `npx --yes @vscode/vsce package --no-dependencies`
打包并上传根目录 `*.vsix` artifact。`publish.yml` 在 `release` 的 `released`
事件或手动触发时编译、打包 `extension.vsix`；release 事件会校验 Release tag
去掉 `v` 后等于 `package.json.version`，并在相应 secrets 存在时发布 VS Code
Marketplace/Open VSX；Release 事件还会把 VSIX 附加到该 Release。CI workflow
的 `npx` 输出和本地 `npm run package`
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
