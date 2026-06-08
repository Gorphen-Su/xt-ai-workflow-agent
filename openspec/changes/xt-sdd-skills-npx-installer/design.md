# Design: xt-sdd-skills npx 安装/升级 CLI

**变更**：xt-sdd-skills-npx-installer
**关联 Proposal**：[proposal.md](proposal.md)

## Context

xt-ai-workflow-agent 仓库是 xt-sdd 工作流的源仓库，包含 6 个核心 skill 和 openspec 模板。当前用户接入该工作流必须手动 clone 和复制，存在分发和升级痛点（详见 proposal.md）。

本设计聚焦于：**如何用最小的工程量构建一个稳定、可发布、运行时无副作用的 npx CLI 工具**，分发清单内容到用户项目，且保证升级安全可回滚。

### 关键约束

- **本仓为 skill 源仓库**（纯 markdown/yaml），首次引入 Node.js 代码
- **CLI 体积要小**：用户每次 `npx` 都会下载，体积大影响体验
- **零配置**：用户在任意目录执行 `npx xt-sdd-skills update` 应自动识别项目根目录
- **运行时拉 GitHub**（已确认）：CLI 包不内嵌 skill，避免每次 skill 更新都要重新发包
- **Windows/macOS/Linux 三平台兼容**：本仓维护者用 Windows，目标用户跨平台

## Goals

1. 用户在任意项目根目录运行 `npx xt-sdd-skills <subcommand>` 即可完成 install/update/list 操作
2. 升级时绝不丢用户已有 skill 数据：覆盖前自动备份
3. CLI 包体积 < 200KB（不含依赖），冷启动 < 3 秒
4. 默认拉 GitHub `main`，支持 `--tag <git-tag>` 锁定版本
5. 网络/GitHub 故障时有清晰的错误提示和重试建议
6. 跨平台稳定：路径分隔符、文件权限、tarball 解压不出问题

## Non-Goals

- 不做 skill 版本号管理（用户每次 update 都是覆盖式）
- 不做差异 merge / 三方合并（用户定制化需求由备份兜底）
- 不做 `restore` / `doctor` / `init` 等扩展子命令（留给后续迭代）
- 不发布到 GitHub Packages、不做企业私服镜像
- 不在 CLI 里做 `npm login` / GitHub auth（用公共 raw URL）
- 不实现自动升级提醒、不收集遥测

## Decisions

### Decision 1: GitHub 拉取方式 — 用 tarball 而非 raw URL 逐文件下

**选项**：
- A. 用 `https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>` 逐文件 fetch
- B. 用 `https://codeload.github.com/<owner>/<repo>/tar.gz/<ref>` 拉整个仓库 tarball，本地解压后挑选清单文件

**选择 B**。理由：
- 分发清单有 6 个 skill 目录 + 多个模板，每个 skill 目录又含 `SKILL.md` + 子文件（如 plans/、scripts/），逐文件 fetch 需要先列目录、易出错
- GitHub raw URL 没有"列目录"API，只能靠硬编码清单或额外调用 GitHub API（有速率限制、需 token）
- tarball 一次下载，所有文件都到手，本地用 `tar` 包解压，纯文件系统操作
- 主仓总体积估算 < 5MB，下载几秒钟，用户可接受
- 失败重试只需重新下一次 tarball，不存在"部分文件成功"的中间状态

实现：用 Node.js 内置 `fetch`（Node 18+ 默认支持）下载 tarball 到临时目录，用 `tar` npm 包（轻量、纯 JS）解压，按 manifest.js 定义的清单从解压目录复制到目标项目。

### Decision 2: 包结构 — 单 package.json，无 workspaces

**选择**：仓库根目录新增 `package.json` 仅作为开发态依赖管理（如果以后需要），CLI 完整 `package.json` 在 `packages/cli/`，与本仓现有 skill 文件完全解耦。

理由：
- 本仓只有这一个 npm 包要发布，引入 workspaces 是过度工程
- `packages/cli/` 自带完整的 `package.json` + `node_modules`（开发期），独立 publish
- 仓库根目录的 `package.json` 可以只有几个 npm scripts（如 `npm run cli:test`），不发布

`packages/cli/package.json` 关键字段：
```json
{
  "name": "xt-sdd-skills",
  "version": "0.1.0",
  "description": "Install and update xt-sdd workflow skills from xt-ai-workflow-agent repo",
  "bin": { "xt-sdd-skills": "./bin/xt-sdd-skills.js" },
  "files": ["bin", "src", "README.md"],
  "engines": { "node": ">=18" },
  "dependencies": {
    "tar": "^7.0.0",
    "kleur": "^4.1.5"
  }
}
```

依赖说明：
- `tar`：解压 GitHub tarball，~50KB，纯 JS 无 native binding
- `kleur`：彩色终端输出，~10KB，无依赖
- 故意不用 `commander` / `yargs`：命令只有 3 个，手写 argv 解析更小
- 故意不用 `fs-extra`：Node 18 原生 fs/promises 已够用

### Decision 3: 分发清单 — 硬编码 manifest.js，不动态扫描

**选择**：在 `packages/cli/src/manifest.js` 硬编码分发清单：

```js
export const MANIFEST = {
  skills: [
    'xt-sdd-propose', 'xt-sdd-plan', 'xt-sdd-apply',
    'xt-sdd-verify', 'xt-sdd-archive', 'xt-sdd-fix',
  ],
  templates: [
    { src: 'openspec/sdd-project-profile.yaml', dst: 'openspec/sdd-project-profile.yaml', mode: 'skip-if-exists' },
    { src: 'openspec/openspec.yaml',            dst: 'openspec/openspec.yaml',           mode: 'skip-if-exists' },
  ],
  commands: [
    // 仅在源仓 .claude/commands/ 存在对应文件时才分发，否则 list 时显示 "not found in source"
    'xt-sdd-propose.md', 'xt-sdd-plan.md', 'xt-sdd-apply.md',
    'xt-sdd-verify.md', 'xt-sdd-archive.md', 'xt-sdd-fix.md',
  ],
};
```

理由：
- 分发什么是工具维护者的责任，必须显式声明，避免"不小心"分发了实验性 skill
- 硬编码比"扫描源仓所有 xt-* 目录"更可控、可审计
- skill 数量稳定（6 个），未来新增/删除时改 manifest 即可
- `mode` 字段区分覆盖语义：skill 是 `overwrite-with-backup`，模板是 `skip-if-exists`（不破坏用户已定制的 profile）

### Decision 4: 项目根识别 — 向上找标识文件，否则用 cwd

**算法**：从 `process.cwd()` 开始向上找，遇到以下任一标识即认为是项目根：
1. `.git/` 目录
2. `package.json`
3. `openspec/` 目录
4. `.claude/` 目录

找到则用该目录；未找到 → 警告用户并询问是否用 `cwd`。

理由：覆盖三种场景：
- 已经在 git/node 项目里：自然命中 `.git` 或 `package.json`
- 已经有 xt-sdd 安装的项目：命中 `openspec/` 或 `.claude/`
- 完全空白目录：fallback 到 cwd，加交互确认避免误操作

### Decision 5: 备份格式 — 完整目录复制，带时间戳

**选择**：每次 update 前，将目标项目所有受影响的 skill 目录完整复制到 `.claude/skills/.backup/<YYYY-MM-DD-HHmmss>/`。

格式举例：
```
.claude/skills/.backup/
└── 2026-06-08-152330/
    ├── xt-sdd-propose/      ← 完整目录复制
    ├── xt-sdd-plan/
    ├── ...
    └── _backup-meta.json    ← 记录源 commit SHA、备份时间、被备份的清单
```

`_backup-meta.json` 内容：
```json
{
  "backedUpAt": "2026-06-08T15:23:30+08:00",
  "fromVersion": "<目标项目升级前的版本，若有>",
  "toVersion": "<本次升级到的 source commit SHA / tag>",
  "items": ["xt-sdd-propose", "xt-sdd-plan", ...]
}
```

理由：
- 完整目录复制比 tarball 简单（用户能直接 ls 看到、直接拷回去恢复）
- 时间戳目录天然支持多次备份并存
- meta 文件为未来的 `restore` 子命令铺路（本次不实现）
- 备份只针对将要被覆盖的 skill；模板因为是 skip-if-exists 不备份
- **不自动清理旧备份**：用户自行管理（CLI 退出时可以提示"已有 N 个旧备份"）

### Decision 6: 错误处理与退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 用户错误（参数错误、目标目录不可写） |
| 2 | 网络错误（GitHub 不可达、tarball 下载失败、超时） |
| 3 | 数据错误（tarball 损坏、解压失败、清单文件缺失） |
| 4 | 文件系统错误（备份失败、写入失败） |

网络错误自动重试一次（间隔 1 秒），仍失败则退出。所有错误用 `kleur.red` 突出，给出可执行的下一步建议（"检查网络"、"用 --tag 指定稳定版"、"手动从 GitHub 下载"等）。

### Decision 7: 命令参数约定

```
npx xt-sdd-skills install [--tag <git-tag>] [--source <owner/repo>] [--dry-run]
npx xt-sdd-skills update  [--tag <git-tag>] [--source <owner/repo>] [--dry-run] [--no-backup]
npx xt-sdd-skills list    [--tag <git-tag>] [--source <owner/repo>]
```

- `--tag`：默认 `main`，可指定 git tag 或 branch
- `--source`：默认 `<owner>/xt-ai-workflow-agent`（owner 在发布时确定，硬编码在 manifest），允许 fork 用户改源
- `--dry-run`：仅打印将要做的操作，不实际改文件
- `--no-backup`：跳过备份（不推荐，仅给 CI 等明确知道在做什么的场景）
- `install` 在目标已存在 skill 时拒绝执行并提示用 `update`
- `update` 在目标无任何 skill 时退化为 `install`

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| npm 包名 `xt-sdd-skills` 被占用 | 无法发布 | 发布前 `npm search` 确认，必要时改 `@xt-ai/sdd-skills` |
| GitHub 限流（未登录用户 60 req/小时） | tarball 下载失败 | 每次升级只 1 个 tarball 请求，远低于限制；失败时清晰提示 |
| 本仓 `main` 不稳定 | 用户拉到坏版本 | 给本仓建立 git tag 习惯，README 推荐 `--tag` 用法 |
| Windows 下 `tar` 解压路径过长 | 部分文件解压失败 | 用 `tar` npm 包的 strip 参数减层级；测试时验证 Windows |
| 用户在 dirty 状态下 update | 备份机制兜底，但仍有混乱风险 | update 前检测 `.git` 是否 dirty，警告但不阻塞 |
| 用户没装 Node 18+ | `fetch` 不可用 | `engines.node` 声明 + 启动时检查版本，给出明确错误 |
| tarball 包含的源仓 commit 哈希在 GitHub 上随时间被 GC | 老 `--tag` 仍可用，但浮动 ref 偶尔失效 | 推荐用 tag，避免直接传 commit SHA |
| 备份目录长期累积占空间 | 用户磁盘膨胀 | CLI 退出时检测 `.backup/` 子目录数 > 5 时提示用户清理 |

### 取舍记录

- **选 tarball 而非 raw URL**：放弃细粒度增量更新（任何小改动都要下整个 tarball），换取简单、可靠、无需 GitHub API token
- **选硬编码 manifest 而非动态扫描**：放弃"自动发现新 skill"的便利，换取可控性和明确性
- **选 skip-if-exists 处理模板**：放弃"模板也能升级"，避免覆盖用户定制的 profile；用户要更新模板需手动 diff
- **不打包 skill 进 npm**：放弃版本锁定的简单性，换取 skill 迭代不需要重新发包；用户用 `--tag` 实现版本锁

## Open Questions

- **CLI 应不应该写日志文件**？当前设计只输出到 stdout/stderr。建议：不写文件，让用户自行 `> log.txt`
- **要不要在 list 子命令显示 skill 文件大小/最后修改时间**？当前设计只显示名字。建议：v0.1.0 只显示清单，后续可加 verbose 模式
- **GitHub 仓库 owner 在 CLI 里怎么配**？硬编码 `xt-ai/xt-ai-workflow-agent`（需要本仓维护者确认实际 GitHub URL），允许 `--source` 覆盖
