---
name: sdd-archive
description: SDD 归档阶段 — 合并双源归档信息，同步 specs，归档变更目录，提示 Git 提交，强制用户确认。当用户说"归档"、"完成需求"、使用 /sdd:archive 时触发。
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

1. 扫描 `openspec/changes/` 目录，查找进行中的变更
2. 如果只有一个 → 自动选择
3. 如果有多个 → 使用 AskUserQuestion 让用户选择

### 步骤 2：归档前验证

1. 读取 task-status.md，检查所有任务状态
2. 检查 verify 阶段是否已完成（task-status.md 中 verify:✓）
3. 如果存在未完成的任务或未通过的验证：
   - 使用 AskUserQuestion 警告用户："存在未完成的任务/未通过的验证，是否确认归档？"
   - 用户确认 → 继续归档
   - 用户取消 → 退出归档

### 步骤 3：生成 archive.md

在变更目录下生成 archive.md，合并 OpenSpec 和 Superpowers 双源信息：

```markdown
# 归档记录 - <change-name>

## 需求概要
（来自 proposal.md 的 Why 和 What Changes 部分）

## 技术方案
（来自 design.md 的 Decisions 部分）

## 实现详情
（来自 task-status.md 的任务执行记录：哪些任务走了 TDD，有哪些重构）

## 规格变更
（来自 specs/：哪些场景是 ADDED 的，哪些是 MODIFIED 的）

## 测试覆盖
（来自验证报告：测试结果摘要）

## 任务执行统计
- 总任务数：<N>
- 已完成：<M>
- 已失败：<F>
- 执行时间范围：<开始时间> - <结束时间>
```

### 步骤 4：同步 delta specs

1. 运行 `openspec status --change "<name>" --json` 检查 delta specs 状态
2. 如果有未同步的 delta specs → 运行 `openspec sync --change "<name>"`
3. 确认 specs 同步成功

### 步骤 5：执行归档

1. 运行 `openspec archive --change "<name>"`
2. 确认归档成功（变更目录移至 `openspec/changes/archive/` 下）

### 步骤 6：Git 提交提醒

1. 使用 AskUserQuestion 提示用户："归档完成，是否需要立即提交 Git？"
2. 用户确认提交：
   a. 运行 `git status` 查看所有变更文件
   b. 从变更目录名提取模块名，生成中文 commit message
   c. commit message 格式：`feat(<模块>): <功能描述>`
   d. 执行 `git add`（添加具体文件）和 `git commit`
   e. 确认提交成功
3. 用户选择不提交 → 仅完成归档，不执行 git 操作

### 步骤 7：阶段完成确认

使用 AskUserQuestion 展示归档摘要，提供确认：
- 归档位置
- archive.md 概览
- Git 提交状态
- 提示工作流结束

## 常见问题

- "delta specs 与主规范有冲突"：在步骤 4 处理，展示冲突详情，让用户决定如何合并
- "用户想修改 archive.md"：直接编辑后重新确认
- "Git 提交失败"：展示错误信息，让用户决定是否重试或手动提交
