---
name: xt-sdd-archive
description: xt-sdd 归档阶段 — 归档前验证、双源信息合并归档、specs 同步、变更目录归档、Git 提交提示，强制用户确认。当用户说"归档"、"完成需求"、"收尾"、使用 /xt-sdd:archive 时触发。
---

# xt-sdd 归档阶段

xt-sdd 规格驱动开发的第五阶段：归档变更、合并信息、同步规范、提交 Git。

## 铁律

1. **归档前 MUST 确认所有任务已完成、验证已通过**
2. **归档信息 MUST 合并 OpenSpec + Superpowers 双源**
3. **归档后 MUST 提醒用户 Git 提交**
4. **此阶段 MUST NOT 修改代码和规格文档**
5. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**

## 执行步骤

### 步骤 1：确定当前变更

1. 读取变更目录下的 `sdd-state.yaml`，获取当前 change 名和 checkpoint
2. 如果 sdd-state.yaml 不存在，扫描 `openspec/changes/` **顶层目录**（排除 `openspec/changes/archive/` 归档子目录），查找进行中的变更
3. 如果有多个 → 使用 AskUserQuestion 让用户选择

### 步骤 2：归档前验证

1. 读取 sdd-state.yaml，检查所有任务状态
2. 检查 verify 阶段是否已完成（sdd-state.yaml 中 phase_checkpoints.verify: done）
3. 如果存在未完成的任务或未通过的验证：
   - 使用 AskUserQuestion 警告用户："存在未完成的任务/未通过的验证，是否确认归档？"
   - 用户确认 → 继续归档
   - 用户取消 → 退出归档

更新 sdd-state.yaml checkpoint: entered

### 步骤 2.5：归档前置提交与基线记录

本步骤只做归档准确性所需的两件轻量事：保证工作区干净、记录归档基线 SHA/时间。

1. **Git 脏状态检查（含归档前置 commit 约束）**：执行 `git status --porcelain`
   - 如果有未提交更改 → 提醒用户："**当前有未提交更改，必须先提交后再归档。** 归档阶段的 tasks.md checkbox 勾选、sdd-state.yaml 状态更新等均需纳入本次变更范围。是否协助提交？"
     - 使用 AskUserQuestion 推荐 "立即提交"
     - 用户选择提交 → 协助生成中文 commit message，`git add` 相关文件后 commit；commit 完成后**重新执行 `git status --porcelain` 验证工作区干净**
     - 用户选择继续（不提交）→ 标记 `git_baseline.dirty: true`，继续
2. **记录归档基线**：
   - 执行 `git rev-parse HEAD` → 写入 `git_baseline.end_sha`
   - 写入当前 ISO 8601 时间戳 → `git_baseline.end_time`
   - 使用 Edit 工具更新 sdd-state.yaml 对应字段

### 步骤 3：生成 archive.md（状态优先，避免读全文）

**优化策略**：archive.md 大部分内容从 sdd-state.yaml 已有字段直接生成，**无需读取源文件全文**。

#### 3a. 状态优先生成（80% 内容）

读取 sdd-state.yaml（一次），从已有字段填充模板：

| archive.md 章节 | 来源字段 |
|---------------|---------|
| 实现详情 | `tasks`（status/test_result 列表） |
| 级联回退记录 | `cascade` |
| 任务执行统计 | `tasks` + `review_counters` + `git_baseline`（时间范围） |
| 技术方案 | `context_summary.key_decisions` |
| 需求概要 | `context_summary.current_objective` + `key_decisions` |
| 测试覆盖 | `verify_status.test_result_summary`（如已增强） |
| 文档同步记录 | `verify_status.doc_sync_completed`（如已增强） |
| 规格变更 | `artifacts_status`（ADDED/MODIFIED） |

#### 3b. 摘要式补读（缺失字段，只读关键章节）

对 sdd-state.yaml 未覆盖的字段，**只读源文件的关键章节**（禁止全文读取）：

```bash
# 用 grep 提取章节（替代全文 Read）
grep -A 20 "## Why" openspec/changes/<name>/proposal.md
grep -A 30 "## Decisions" openspec/changes/<name>/design.md
grep -A 5 "ADDED\|MODIFIED" openspec/changes/<name>/specs/**/*.md
```

#### 3c. 填充模板生成

→ 完整模板见 [references/archive-template.md](references/archive-template.md)

更新 sdd-state.yaml checkpoint: consistency-verified

**上下文归档**：archive.md 已从状态文件生成，可忽略源文件读取过程。

→ 优化策略详见 [references/optimization.md](references/optimization.md)

### 步骤 4：同步 specs

1. 运行 `openspec status --change "<name>" --json` 检查 delta specs 状态
2. 如果有未同步的 delta specs → 运行 `openspec sync --change "<name>"`
3. 确认 specs 同步成功

更新 sdd-state.yaml checkpoint: specs-synced

### 步骤 5：归档变更

1. 运行 `openspec archive --change "<name>"`
2. 确认归档成功（变更目录移至 `openspec/changes/archive/` 下）
3. sdd-state.yaml 随变更目录一起保留在归档中（用于历史追溯）

**降级方案**：如果 openspec archive 命令不可用：
1. 运行 `mkdir -p openspec/changes/archive` 确保归档目录存在
2. 运行 `mv openspec/changes/<name> openspec/changes/archive/$(date +%Y-%m-%d)-<name>` 执行归档
3. 确认归档成功

更新 sdd-state.yaml checkpoint: archived

### 步骤 6：Git 提交提示

1. 整理本次变更涉及的所有文件清单（代码 + 文档 + 配置）
2. 向用户展示变更清单
3. 使用 AskUserQuestion 提示用户是否需要提交 Git
4. 用户确认提交 → 执行 `git add`（添加具体文件）和 `git commit`
   - commit message 格式：`feat(<范围>): <变更描述> — 归档完成`
   - 包含归档记录和所有相关文件的变更
5. 用户选择稍后提交 → 提示可以手动提交

更新 sdd-state.yaml checkpoint: done

### 步骤 7：阶段完成确认

使用 AskUserQuestion 展示归档摘要，提供三个选项：
- **A. 确认归档完成**：更新 sdd-state.yaml（phase_checkpoints.archive: done, phase: archive, checkpoint: done），展示变更摘要
- **B. 取消归档**：不修改状态，退出
- **C. 暂停**：保存当前进度，退出

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 phase_checkpoints.archive：

| checkpoint | 恢复动作 |
|-----------|---------|
| `entered` | 从步骤 3（生成 archive.md）开始 |
| `consistency-verified` | 从步骤 4（同步 specs）继续 |
| `specs-synced` | 从步骤 5（归档变更）继续 |
| `archived` | 从步骤 6（Git 提交提示）继续 |
| `done` | 已完成 |

**异常状态检测**：
- 活跃变更目录已删除但 archive 目录不存在 → 归档过程中断，提示用户检查
- sdd-state.yaml 存在但活跃变更目录不存在且未归档 → 可能是手动删除，提示用户确认状态

## 参考文档

**阶段专属**：
- [archive-template.md](references/archive-template.md) — archive.md 完整模板 + 字段映射 + 生成策略
- [optimization.md](references/optimization.md) — archive 阶段优化说明（状态优先生成、摘要式补读）

**共享优化规则**：
- [xt-sdd-shared/references/context-management.md](../xt-sdd-shared/references/context-management.md) — 通用上下文管理（输出精简）
- [xt-sdd-shared/references/cli-optimization.md](../xt-sdd-shared/references/cli-optimization.md) — CLI 调用优化

## 常见问题

- "delta specs 与主规范有冲突"：在步骤 4 处理，展示冲突详情，让用户决定如何合并
- "用户想修改 archive.md"：直接编辑后重新确认
- "Git 提交失败"：展示错误信息，让用户决定是否重试或手动提交
- "归档后 sdd-state.yaml 是否保留"：是的，随归档目录保留作为历史记录
