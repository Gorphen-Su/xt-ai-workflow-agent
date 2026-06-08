# 归档记录 - fix-ccusage-timeout-and-archive-timing

## Bug 描述

上一轮 metrics 功能测试发现两个真实问题：

1. **Token 数据从未真实记录**：xt-sdd 工作流在 7 处调用 `npx ccusage` 的指令里，都没有明确告诉调用方需要设置较大的 Bash timeout。Claude 默认 Bash timeout 是 120s，但 ccusage 在 npx 冷启动 / session 数据规模大时实测耗时 45-60s，叠加边界容易超时；已归档的 `xt-sdd-metrics-tracking` 变更 verify 阶段就真实出现过 `error: "ccusage session --json 执行超时"`。两次自举执行 token 数据均为 null。

2. **archive 文件计数少 1**：`xt-sdd-fix-metrics-init` 变更归档时 sdd-state.yaml 记录 `files_added: 8`，但用其自身记录的 start_sha..end_sha 实际跑出 9A。原因是 archive 步骤 2.5 在 tasks.md 的 checkbox 更新 commit 之前就抓 `git diff HEAD`，漏算了最后一次 commit 的 1 个文件。

## 修复内容

### 修复 1：ccusage 调用点 timeout 提示（7 处 SKILL.md）

在所有 `npx ccusage` / `npm install -g ccusage` 调用点的指令后追加显式的 Bash timeout 下限提示：

- `npx ccusage --version`: **timeout ≥ 60000ms**（npx 冷启动可能较慢）
- `npx ccusage session --json`: **timeout ≥ 120000ms**（实测可达 45-60s）
- `npm install -g ccusage`: **timeout ≥ 180000ms**（含依赖下载）

涉及的 6 个 SKILL.md（共 10 处提示，含 verify SKILL.md 的"曾在本项目自举 verify 阶段真实超时"提醒）：

- [.claude/skills/xt-sdd-propose/SKILL.md](.claude/skills/xt-sdd-propose/SKILL.md) — 2 处（步骤 0 ccusage 检测 + 步骤 5 token 快照）
- [.claude/skills/xt-sdd-plan/SKILL.md](.claude/skills/xt-sdd-plan/SKILL.md) — 1 处
- [.claude/skills/xt-sdd-apply/SKILL.md](.claude/skills/xt-sdd-apply/SKILL.md) — 1 处
- [.claude/skills/xt-sdd-verify/SKILL.md](.claude/skills/xt-sdd-verify/SKILL.md) — 1 处（含真实超时案例注释）
- [.claude/skills/xt-sdd-archive/SKILL.md](.claude/skills/xt-sdd-archive/SKILL.md) — 1 处
- [.claude/skills/xt-sdd-fix/SKILL.md](.claude/skills/xt-sdd-fix/SKILL.md) — 3 处（步骤 1 token 快照 + 步骤 2.3 ccusage 检测 + 步骤 2.5 fix-init 快照）

### 修复 2：archive 步骤 2.5 增加 commit 前置约束

[.claude/skills/xt-sdd-archive/SKILL.md:59-63](.claude/skills/xt-sdd-archive/SKILL.md#L59-L63) — Git 脏状态检查从"用户可选继续"升级为"**强烈建议立即提交**"：

- 提醒文案明确指出 "归档阶段的 tasks.md checkbox 勾选、sdd-state.yaml 状态更新等均需纳入本次变更范围"
- 引用真实案例 "xt-sdd-fix-metrics-init 因此少算 1 个文件"
- 用户选择提交后，**强制重新执行 `git status --porcelain` 验证工作区干净**再进入第 4 步

[.claude/skills/xt-sdd-archive/SKILL.md:77](.claude/skills/xt-sdd-archive/SKILL.md#L77) — end_sha 行追加注释，澄清"归档元数据本身不应计入变更统计"是预期行为。

## 文档同步

- **影响级别**：无文档影响
- **理由**：修改不改变外部可观察行为，只是给 SKILL 指令追加 timeout 提示和时序约束；不涉及 specs / design / 行为变更
- **更新的文档**：无（specs/ 目录无变化）

## 验证结果

### 聚焦测试（端到端自证）

| 测试项 | 结果 | 数据 |
|--------|------|------|
| ccusage --version (timeout=30000) | ✅ 通过 | `ccusage 20.0.6` |
| ccusage session --json (timeout=120000) | ✅ **首次成功** | 真实拿到 input/output/cost，**实测耗时 45s** |
| fix-init 快照写入 sdd-state.yaml | ✅ 通过 | input=591642, output=30805 |
| archive 快照写入 sdd-state.yaml | ✅ 通过 | input=975603, output=43612 |
| 修改前先提交（archive 新约束） | ✅ 通过 | commit 8d67c34（含 8 个文件） |
| 最终 metrics 统计 | ✅ 准确 | 2A/6M, +74/-16，与实际完全匹配 |

### 影响范围验证

- ✅ 所有 SKILL.md 文件 markdown 格式仍合法（无破坏性 Edit）
- ✅ 9 处 timeout 提示语法一致（用 grep 校验全部命中）
- ✅ archive 步骤 2.5 第 3/8 步约束新增后，编号未断裂
- ✅ 本次 fix 流程自身就是新指令的端到端实测，**fix-init Token 快照首次成功记录真实数据**

### 自证价值

本次修复**首次让 metrics 功能的核心目的（Token 追踪）真正生效**——之前两次自举都因 timeout 边界问题降级到 unavailable，本次主动设置 timeout=120000 后立即成功拿到 token 数据。这是对 [docs/explores/](docs/explores/) 中 metrics 设计 "ccusage 集成（含自动安装）" 决策的最终验证闭环。

## 关联变更

- 修复对象 1：[2026-06-05-xt-sdd-metrics-tracking](openspec/changes/archive/2026-06-05-xt-sdd-metrics-tracking/) — verify 阶段 ccusage 超时未被 timeout 设置预防
- 修复对象 2：[2026-06-05-xt-sdd-fix-metrics-init](openspec/changes/archive/2026-06-05-xt-sdd-fix-metrics-init/) — 8A vs 9A 文件计数偏差
