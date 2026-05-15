---
name: sdd-explore
description: SDD 探索阶段 — 需求澄清与方案讨论，产出 proposal.md，前置 Git 状态检查，强制用户确认。当用户说"探索需求"、"需求澄清"、使用 /sdd:explore 时触发。
---

# SDD 探索阶段

SDD 规格驱动开发的第一阶段：探索需求、澄清歧义、确认方案、产出 proposal.md。

## 铁律

1. **此阶段 MUST NOT 编写任何生产代码**
2. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**
3. **必须先检查 Git 状态，不能跳过**

## 执行步骤

### 步骤 1：Git 状态前置检查

1. 运行 `git status --porcelain` 检查是否有未提交的更改
2. 运行 `git diff --stat` 查看更改概况
3. **如果仓库是干净的**：直接进入步骤 2
4. **如果仓库有脏状态**：
   a. 向用户展示当前未提交的更改摘要
   b. 使用 AskUserQuestion 询问："当前仓库有未提交的更改（列出文件）。是否要先提交？"
   c. 用户确认提交 → 运行 `git diff` 查看完整更改，自动生成简洁的中文 commit message，执行 `git add`（添加具体文件，不使用 `git add -A`）和 `git commit`
   d. 用户选择不提交 → 记录当前状态，在脏状态下继续

### 步骤 2：确定变更名称

1. 检查用户是否提供了模块名参数（如 `/sdd:explore user-auth 登录功能`）
2. 如果提供了模块名：按 `YYYY-MM-DD-<模块>-<子模块(可选)>-<功能>` 格式生成目录名
3. 如果未提供：从需求描述中推导模块名和功能名，生成目录名
4. 命名规则：
   - 使用当天日期作为前缀
   - 模块名从用户参数或需求描述中提取，转为 kebab-case
   - 功能名从需求描述中推导，转为 kebab-case
   - 示例：`2026-05-15-user-auth-login`

### 步骤 3：创建变更目录

1. 运行 `openspec new change "<change-name>"` 创建变更目录
2. 确认目录创建成功

### 步骤 4：探索与需求澄清

1. 与用户讨论需求，每次只问一个关键问题
2. 提出 2-3 个可行方案，每个方案列出优缺点，给出推荐方案及理由
3. 使用 AskUserQuestion 确认方案选择
4. 将确认的方案写入 proposal.md

### 步骤 5：产出 proposal.md

在变更目录下创建 proposal.md，包含：
- **Why**：为什么需要这个变更
- **What Changes**：具体变更内容列表
- **Capabilities**：新增的能力（每个能力对应一个 specs/ 文件）
- **Impact**：影响的代码、API、依赖、系统

### 步骤 6：初始化 task-status.md

在变更目录下创建 task-status.md，内容：
```
# 任务状态 - <change-name>

## 阶段进度
explore:✓ plan:☐ implement:☐ verify:☐ archive:☐

## 任务明细
（任务明细将在 plan 阶段填充）
```

### 步骤 7：阶段完成确认

使用 AskUserQuestion 展示 proposal.md 摘要，提供三个选项：
- **A. 通过，进入下一阶段**：更新 task-status.md，提示用户可以运行 `/sdd:plan`
- **B. 不通过，需要修改**：回到步骤 4，根据用户反馈修改 proposal.md
- **C. 暂停，稍后继续**：保存当前进度到 task-status.md，退出

## 常见问题

- "用户没有明确的功能描述"：主动询问，每次只问一个关键问题
- "多个方案难以选择"：列出优缺点对比表，给出推荐及理由
- "需求范围过大"：建议拆分为多个独立需求
