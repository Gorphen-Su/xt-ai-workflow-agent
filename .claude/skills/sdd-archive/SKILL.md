---
name: sdd-archive
description: SDD 归档阶段 — 合并双源归档信息，同步 specs，归档变更目录（sdd-state.yaml 随迁保留），提示 Git 提交，强制用户确认。当用户说"归档"、"完成需求"、使用 /sdd:archive 时触发。
---

# SDD 归档阶段

SDD 规格驱动开发的第五阶段：归档变更、合并信息、同步规范、提交 Git。

## 铁律

1. **归档前 MUST 确认所有任务已完成、验证已通过**
2. **归档信息 MUST 合并 OpenSpec + Superpowers 双源**
3. **归档后 MUST 提醒用户 Git 提交**
4. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**

## 执行步骤

### 步骤 1：确定当前变更

1. 读取变更目录下的 `sdd-state.yaml`，获取当前 change 名和 checkpoint
2. 如果 sdd-state.yaml 不存在，扫描 `openspec/changes/` 目录查找进行中的变更
3. 如果有多个 → 使用 AskUserQuestion 让用户选择

### 步骤 2：归档前验证

1. 读取 sdd-state.yaml，检查所有任务状态
2. 检查 verify 阶段是否已完成（sdd-state.yaml 中 phase_checkpoints.verify: done）
3. 如果存在未完成的任务或未通过的验证：
   - 使用 AskUserQuestion 警告用户："存在未完成的任务/未通过的验证，是否确认归档？"
   - 用户确认 → 继续归档
   - 用户取消 → 退出归档

更新 sdd-state.yaml checkpoint: entered

### 步骤 3：生成 archive.md

在变更目录下生成 archive.md，合并双源信息：

1. 读取 sdd-state.yaml 获取所有任务的最终状态和审查计数
2. 生成 archive.md，包含：

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

更新 sdd-state.yaml checkpoint: archived

### 步骤 6：阶段完成确认

使用 AskUserQuestion 展示归档摘要，提供三个选项：
- **A. 确认归档**：更新 sdd-state.yaml（phase_checkpoints.archive: done, phase: archive, checkpoint: done），提示 Git 提交
- **B. 取消归档**：不修改状态，退出
- **C. 暂停**：保存当前进度，退出

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 phase_checkpoints.archive：

| checkpoint | 恢复动作 |
|-----------|---------|
| `entered` | 从步骤 3（生成 archive.md）开始 |
| `consistency-verified` | 从步骤 4（同步 specs）继续 |
| `specs-synced` | 从步骤 5（归档变更）继续 |
| `archived` | 从步骤 6（阶段完成确认）继续 |
| `done` | 已完成 |

## 向后兼容

如果变更目录中存在 `task-status.md` 但没有 `sdd-state.yaml`：
1. 从 task-status.md 提取信息生成 archive.md
2. 归档后 task-status.md 随归档保留

## 常见问题

- "delta specs 与主规范有冲突"：在步骤 4 处理，展示冲突详情，让用户决定如何合并
- "用户想修改 archive.md"：直接编辑后重新确认
- "Git 提交失败"：展示错误信息，让用户决定是否重试或手动提交
- "归档后 sdd-state.yaml 是否保留"：是的，随归档目录保留作为历史记录
