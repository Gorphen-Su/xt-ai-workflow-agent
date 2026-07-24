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

### 步骤 3：生成 archive.md

在变更目录下生成 archive.md，合并双源信息：

1. 读取 sdd-state.yaml 获取所有任务的最终状态和审查计数
2. 生成 archive.md：

```markdown
# 归档记录 - <change-name>

## 需求概要
（来自 proposal.md 的 Why 和 What Changes 部分）

## 技术方案
（来自 design.md 的 Decisions 部分）

## 实现详情
（来自 sdd-state.yaml 的任务执行记录：哪些任务走了 TDD，有哪些重构，审查次数）

## 规格变更
（来自 specs/：哪些场景是 ADDED 的，哪些是 MODIFIED 的）

## 测试覆盖
（来自验证报告：测试结果摘要）

## 文档同步记录
（来自 verify 阶段的文档同步检查结果）

## 级联回退记录
（来自 sdd-state.yaml 的 cascade 字段：如果有回退事件，记录回退原因、影响范围、保留的任务）

## 任务执行统计
- 总任务数：<N>
- 已完成：<M>
- 已失败：<F>
- 审查轮次：<R>
- 执行时间范围：<开始时间> - <结束时间>
```

更新 sdd-state.yaml checkpoint: consistency-verified

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

## 常见问题

- "delta specs 与主规范有冲突"：在步骤 4 处理，展示冲突详情，让用户决定如何合并
- "用户想修改 archive.md"：直接编辑后重新确认
- "Git 提交失败"：展示错误信息，让用户决定是否重试或手动提交
- "归档后 sdd-state.yaml 是否保留"：是的，随归档目录保留作为历史记录
