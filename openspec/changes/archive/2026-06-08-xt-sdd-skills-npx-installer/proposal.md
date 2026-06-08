# Proposal: xt-sdd-skills npx 安装/升级 CLI

**变更名**：xt-sdd-skills-npx-installer
**创建日期**：2026-06-08
**模块**：xt-sdd-skills
**功能**：npx 安装/升级 CLI

## Why

xt-sdd 工作流的 6 个核心 skill（propose/plan/apply/verify/archive/fix）目前只存在于本仓库 `xt-ai-workflow-agent`。其他项目要使用这套工作流，必须手动 clone 仓库并复制 `.claude/skills/xt-sdd-*` 目录，存在以下痛点：

1. **安装繁琐**：每个新项目都要 clone → 复制 → 粘贴，门槛高，容易漏文件
2. **升级困难**：本仓 skill 持续迭代（近期已归档 5 个变更），但用户无法感知更新，旧版 bug 长期残留
3. **版本割裂**：不同项目的 skill 版本不一致，无法保证工作流一致性
4. **缺少脚手架**：新项目还需要手动准备 `openspec/sdd-project-profile.yaml` 等模板，启动成本高

需要一个标准化的分发工具，让用户在任意项目里通过 `npx xt-sdd-skills update` 一键升级到本仓最新版本，从 GitHub 实时拉取，免登录、免本地依赖。

## What Changes

### CLI 工具（新增）

- 在仓库顶层新增 `packages/cli/` 目录，存放 npm 包 `xt-sdd-skills` 的代㑾
- 提供 3 个子命令：
  - `npx xt-sdd-skills install` —— 首次安装，目标项目无 `.claude/skills/xt-sdd-*` 时使用，会初始化目录结构和必要的脚手架文件
  - `npx xt-sdd-skills update` —— 升级现有安装，将本仓最新版 skill 覆盖到目标项目，覆盖前自动备份旧版到 `.claude/skills/.backup/<timestamp>/`
  - `npx xt-sdd-skills list` —— 列出可分发的 skill 清单及其当前版本/源 commit
- 默认从 GitHub `main` 分支拉取最新内容，支持 `--tag v1.0.0` 参数指定具体 git tag

### 分发清单（明确范围）

仅分发以下内容（不含 xt-superpowers-openspec-workflow，该 skill 已删除）：

| 类型 | 路径 | 说明 |
|------|------|------|
| Skill | `.claude/skills/xt-sdd-propose/` | xt-sdd 6 命令之一 |
| Skill | `.claude/skills/xt-sdd-plan/` | |
| Skill | `.claude/skills/xt-sdd-apply/` | |
| Skill | `.claude/skills/xt-sdd-verify/` | |
| Skill | `.claude/skills/xt-sdd-archive/` | |
| Skill | `.claude/skills/xt-sdd-fix/` | |
| 模板 | `openspec/sdd-project-profile.yaml` | 项目技术栈 profile 模板 |
| 模板 | `openspec/openspec.yaml`（可选） | OpenSpec 项目配置示例 |
| 命令文件 | `.claude/commands/xt-sdd/*.md`（如果存在） | 与 6 个 skill 对应的 slash command 入口 |

### 升级策略（已确认）

- **直接覆盖 + 自动备份**：升级时把本仓最新版本覆盖到目标项目，覆盖前将旧版完整复制到 `.claude/skills/.backup/<YYYY-MM-DD-HHmmss>/`
- 备份目录保留 N 天（建议 30 天）后用户可手动清理；CLI 不自动清理
- 不基于版本号比较，每次 update 都执行覆盖（保证最终一致）

### 数据源（已确认）

- 运行时从 GitHub 拉取（不打包进 npm tarball）
- 默认拉 `main` 分支最新 commit
- 支持 `--tag <git-tag>` 拉取指定 tag
- 拉取方式：使用 GitHub raw URL 或 tarball 下载（避免依赖 `git` 命令）

### 包结构（已确认）

- npm 包名：`xt-sdd-skills`（无 scope）
- CLI 代码位置：本仓 `packages/cli/`（同仓多目录，不引入 workspaces）
- CLI 自身体积小，不打包 skill 源文件 —— 包只含 `bin` 脚本和最小依赖

## Capabilities

### New Capabilities

- `xt-sdd-skills-cli`: 命令行工具入口 —— 提供 install/update/list 三个子命令，解析参数、调度核心逻辑、输出结果
- `skill-fetcher`: GitHub 拉取器 —— 从 `xt-ai-workflow-agent` 仓库（main 或指定 tag）拉取分发清单内的文件
- `skill-installer`: 本地写入器 —— 把拉取的文件写入目标项目，处理 install/update 两种模式（install 校验环境干净，update 自动备份）
- `skill-backup`: 备份管理 —— 在 update 模式下把目标项目已有 skill 复制到 `.claude/skills/.backup/<timestamp>/`

### Modified Capabilities

（无已有规格需要修改）

## Impact

### 仓库结构变化

- 新增 `packages/cli/` 目录及子结构：
  ```
  packages/cli/
  ├── package.json          # npm 包定义，bin 字段指向 bin/xt-sdd-skills.js
  ├── bin/
  │   └── xt-sdd-skills.js  # CLI 入口
  ├── src/
  │   ├── commands/         # install/update/list 子命令实现
  │   ├── fetcher.js        # GitHub 拉取
  │   ├── installer.js      # 本地文件写入
  │   ├── backup.js         # 备份逻辑
  │   └── manifest.js       # 分发清单定义
  ├── README.md             # 面向最终用户的使用文档
  └── .gitignore
  ```
- 仓库根目录可能需要新增 `package.json`（用于 npm publish 流程，仅作为 monorepo root，不发布）

### 依赖

- CLI 自身：Node.js >= 18（用 fetch 内置 API 拉 GitHub）、`tar`（解压 tarball）、`fs-extra`（文件操作）
- 用户侧：只需要 `node` 和 `npx`，无需 git、无需登录
- 不依赖本仓现有的 OpenSpec/Superpowers，CLI 是独立工具

### 发布流程

- 首次发布：`cd packages/cli && npm publish`（需要 npm 账号）
- 后续 skill 更新：因为 CLI 运行时拉 GitHub，**只要本仓 main 分支更新，用户 `npx xt-sdd-skills update` 就能获取**，CLI 本身无需重新发布
- CLI 自身需要更新时（如新增子命令、修复 bug）才重新 `npm publish`

### 兼容性与风险

- **风险 1**：用户网络无法访问 GitHub → CLI 需要清晰的错误提示，建议用户配置代理
- **风险 2**：npm 上 `xt-sdd-skills` 包名被占用 → 发布前需先 `npm search` 确认，若已占用则改用 `@xt-ai/sdd-skills` scoped 包
- **风险 3**：本仓 main 分支处于不稳定中间状态 → 用户可用 `--tag v1.0.0` 锁定稳定版，需要本仓维护 git tag 习惯
- **风险 4**：用户项目已有定制化 skill → 备份机制兜底，但需要在 README 中强调"覆盖前请提交未保存改动"

### 后续工作（不在本次变更范围）

- CLI 发布到 npm 后的版本管理与 changelog
- 给本仓 main 分支打 git tag 的发布流程文档
- 长期可考虑加 `doctor`（环境体检）、`restore`（从备份恢复）子命令
