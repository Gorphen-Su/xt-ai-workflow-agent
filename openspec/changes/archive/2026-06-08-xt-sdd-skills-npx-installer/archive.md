# 归档记录 - xt-sdd-skills-npx-installer

**归档时间**：2026-06-08T16:30:00+08:00
**起始 SHA**：`ca10ae0`
**结束 SHA**：`44857898` (含 7 个 feat commit + 1 个 fix commit + 1 个 verify docs commit + 1 个 archive state commit)
**变更目录**：`openspec/changes/xt-sdd-skills-npx-installer/`
**最终评估**：✅ 通过验证，归档完成

---

## 需求概要

### Why（来自 [proposal.md](proposal.md)）

xt-sdd 工作流的 6 个核心 skill（propose/plan/apply/verify/archive/fix）目前只存在于本仓库 `xt-ai-workflow-agent`。其他项目要使用这套工作流必须手动 clone + 复制，存在 4 大痛点：

1. **安装繁琐**：每个新项目都要 clone → 复制 → 粘贴，门槛高
2. **升级困难**：本仓 skill 持续迭代，用户无法感知更新，旧版 bug 长期残留
3. **版本割裂**：不同项目的 skill 版本不一致
4. **缺少脚手架**：新项目还要手动准备 `openspec/sdd-project-profile.yaml` 等模板

### What Changes

新增 npm 包 `xt-sdd-skills`，提供 3 个 npx 子命令：
- `npx xt-sdd-skills install` — 首次安装到目标项目
- `npx xt-sdd-skills update` — 升级到本仓最新版本，覆盖前自动备份
- `npx xt-sdd-skills list` — 列出可分发清单

数据源：运行时从 GitHub 拉取（默认 `main`，支持 `--tag <git-tag>` 锁版）。
分发范围：6 个 xt-sdd-* skill + 2 个 openspec 模板（skip-if-exists） + 6 个 commands。
升级策略：直接覆盖 + 自动备份到 `.claude/skills/.backup/<timestamp>/`。

---

## 技术方案

来自 [design.md](design.md) 的 7 个关键 Decision：

| # | Decision | 取舍 |
|---|---|---|
| D1 | GitHub tarball 拉取（而非 raw URL 逐文件） | 简单、无需 API token、单请求原子 |
| D2 | 单 package.json，无 workspaces | 仅 1 个发布包，无需 monorepo 复杂度 |
| D3 | 硬编码 manifest.js（而非动态扫描源仓） | 可控、可审计 |
| D4 | 项目根 4 种标识：`.git`/`package.json`/`openspec/`/`.claude/` | 覆盖三种典型场景 |
| D5 | 备份格式：完整目录复制 + 时间戳目录 + `_backup-meta.json` | 简单可读、便于手工恢复 |
| D6 | 退出码 0/1/2/3/4：成功/用户错/网络/数据/文件系统 | 符合 POSIX 惯例 |
| D7 | 参数：`--tag`/`--source`/`--dry-run`/`--no-backup` | 覆盖核心使用场景 |

### Non-Goals

- 不做 skill 版本号管理
- 不做 diff merge
- 不做 restore/doctor/init 扩展子命令
- 不依赖 git 命令、不需要 npm login

---

## 实现详情

### 模块分解

```
packages/cli/
├── bin/xt-sdd-skills.js        # 入口（Node 版本检查 + argv 解析 + 调度 + 错误处理）
├── src/
│   ├── manifest.js             # 分发清单（Object.freeze）
│   ├── errors.js               # CliError 体系（FetcherError/InstallerError/BackupError）
│   ├── logger.js               # kleur 彩色输出
│   ├── fetcher.js              # fetchTarball/extractTarball/cleanup
│   ├── backup.js               # createBackup/checkBackupCount
│   ├── installer.js            # findProjectRoot/installFiles（install/update/dryRun 三种模式）
│   ├── argv.js                 # 手写参数解析（不依赖 commander/yargs）
│   ├── help.js                 # usage 输出
│   └── commands/{install,update,list}.js
└── README.md, PUBLISH_CHECKLIST.md, package.json, vitest.config.js
```

### TDD 执行节奏（7 个分组、34 个任务）

- **Group 1**（任务 1.1-1.4）— 基础设施：仓库根 package.json、cli 包初始化、vitest、客户端 README
- **Group 2**（2.1-2.4）— manifest + errors + logger（20 个测试）
- **Group 3**（3.1-3.4）— fetcher 模块（31 个测试，含 mock fetch + 真实 tar 打包）
- **Group 4**（4.1-4.4）— backup 模块（40 个测试）
- **Group 5**（5.1-5.6）— installer 模块（53 个测试，含 install/update/dryRun/退化场景）
- **Group 6**（6.1-6.7）— CLI 入口与子命令（72 个测试，含 execFile 真实 bin 集成）
- **Group 7**（7.1-7.5）— e2e + 发布准备（74 个测试，新增 e2e install→update 升级周期）

每分组 1 commit，共 7 个 feat commit。

### Verify 阶段修复

verify 阶段调用 `superpowers:code-reviewer` 独立审查，识别并修复 5 项：

1. fetcher.js 删除 3 个未使用 import（createWriteStream/Readable/pipeline）
2. argv `--tag/--source` 后跟另一 flag 时报错（防止把 `--dry-run` 当 tag 值）
3. install/update `cleanup` 用 optional chaining 防 ReferenceError
4. fetcher cleanup 改 `Promise.allSettled`，ENOENT 静默其他打 warning
5. installer 删除 `op.action === 'backup'` 死分支

接受未修复 3 项（理由见 verify-report.md）：
- `pickAvailableDir` TOCTOU（单用户 CLI 无并发）
- install/update 重复（抽象成本 > 收益）
- formatStamp 本地时间（对用户更易读）

### 审查计数

- 全局审查轮次：1（一次 superpowers code-reviewer 调用即覆盖）
- 任务级修改：0（每个任务首次实现即通过测试）

---

## 规格变更

新增 4 个 ADDED capability（位于 [specs/](specs/)）：

| Capability | Requirements | Scenarios |
|---|---|---|
| `xt-sdd-skills-cli` | 4 | 12（含 verify 阶段补充的 --help/--version 3 个 Scenario） |
| `skill-fetcher` | 3 | 8 |
| `skill-installer` | 5 | 11 |
| `skill-backup` | 3 | 9 |
| **合计** | **15** | **40** |

无 MODIFIED capability（项目原本无主规范）。

### 与实现的对应

40 个 Scenario 全部有实现 + 大部分有显式测试覆盖，4 个边缘场景接受为隐式覆盖（Node 16 行为、fetcher 下载 tag、Windows 路径、backup 写入失败 mock）。详见 [verify-report.md](verify-report.md)。

---

## 测试覆盖

```
Test Files  9 passed (9)
     Tests  75 passed (75)
  Duration  3.66s
```

- manifest(7) + errors(6) + logger(7) = 工具模块
- fetcher(11) + backup(9) + installer(13) = 业务模块
- argv(13) + cli(7) = CLI 入口
- e2e(2) = install → update 升级周期

测试策略：
- 单元测试 mock 外部依赖（fetch、fs）
- fetcher 用真实 tar 包打包验证解压
- backup 用临时目录验证完整复制
- cli 用 `execFile` 真实跑 bin 验证 stdout/stderr/退出码
- e2e 走 fetcher → installer → backup 全链路（不联网）

包发布检查：
- npm pack: **11.9 KB / 14 files**（远低于 200KB 目标）
- npm audit: 0 生产依赖漏洞

---

## 文档同步记录

verify 阶段步骤 3 文档同步检查发现：

| 影响级别 | 文件 | 改动 |
|---|---|---|
| specs（小幅） | `specs/xt-sdd-skills-cli/spec.md` | 新增 1 个 Requirement + 3 个 Scenario，覆盖 `--help`/`--version`（实现有但 spec 之前没写） |

design.md 中所有 7 个 Decision 全部被代码遵循，无需更新。

---

## 级联回退记录

无。本变更从 propose 到 archive 全程串行推进，未发生回退。

`cascade.invalidated_from`: null
`cascade.preserved_tasks`: []

---

## 任务执行统计

- **总任务数**：34
- **已完成**：34 (100%)
- **已失败**：0
- **审查轮次**：1（superpowers code-reviewer 一次审查覆盖全部代码）
- **任务级修改重试**：0
- **执行时间范围**：2026-06-08T15:18:00+08:00 → 2026-06-08T16:30:00+08:00（约 1h12m）

### Metrics（详见 [metrics-report.md](metrics-report.md)）

- 文件变更：48 个新增 / 0 编辑 / 0 删除
- 代码行数：+5645 / -0
- Token 消费：925,882 总（763,098 输入 + 162,784 输出）
- 预估费用：$17.28 USD

---

## 后续工作（不在本次范围）

留给未来变更：

1. **真正 npm publish**：按 [packages/cli/PUBLISH_CHECKLIST.md](../../../packages/cli/PUBLISH_CHECKLIST.md) 走流程（首次发布需先 push 仓库到 GitHub + 删除 package.json 的 `private: true`）
2. **本仓 git tag 维护**：建立 `vX.Y.Z` 打 tag 习惯，让用户 `--tag` 锁版
3. **可选扩展子命令**：`doctor`（环境体检）/ `restore`（从备份恢复）/ `init`（初始化 openspec 脚手架）
4. **多 source 镜像支持**：当前只支持 GitHub codeload，未来可考虑 GitLab/Gitea/私服

---

## 关键 commits

```
4485789 chore(metrics): 更新 sdd-state.yaml — archive 阶段开始
de00e91 docs(verify): 归档 xt-sdd-skills-npx-installer 验证报告
350e38c fix(cli): 修复 verify 阶段代码审查发现的问题
f71c0fd feat(cli): e2e 测试 + 发布准备 (Group 7)
fd00c8f feat(cli): 实现 CLI 入口与三个子命令 (Group 6)
6b418a2 feat(cli): 实现 installer 模块 — install/update 双模式 (Group 5)
b37bc1c feat(cli): 实现 backup 模块 — 升级前备份管理 (Group 4)
116c84b feat(cli): 实现 fetcher 模块 — GitHub tarball 拉取/解压/清理 (Group 3)
bfcfddc feat(cli): 实现 manifest/errors/logger 工具模块 + 单元测试 (Group 2)
56d1cce feat(cli): 搭建 xt-sdd-skills npx CLI 基础设施 (Group 1)
```
