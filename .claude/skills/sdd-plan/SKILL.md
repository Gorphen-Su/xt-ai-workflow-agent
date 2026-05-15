---
name: sdd-plan
description: SDD 计划阶段 — 基于 proposal 生成 design/specs/tasks，内置 bridge 转换，创建 task-status.md，强制用户确认。当用户说"制定计划"、"拆分任务"、使用 /sdd:plan 时触发。
---

# SDD 计划阶段

SDD 规格驱动开发的第二阶段：基于 proposal 生成完整的规范产物，内置 bridge 转换逻辑。

## 铁律

1. **此阶段 MUST NOT 编写任何生产代码**
2. **产物 MUST 按依赖顺序生成：proposal → design → specs → tasks**
3. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**

## 执行步骤

### 步骤 1：确定当前变更

1. 扫描 `openspec/changes/` 目录，查找包含 proposal.md 且尚未完成的变更
2. 如果只有一个 → 自动选择
3. 如果有多个 → 使用 AskUserQuestion 让用户选择
4. 如果没有 → 提示用户先运行 `/sdd:explore`

### 步骤 2：读取 proposal.md

1. 读取变更目录下的 proposal.md
2. 提取 Capabilities 列表，确认需要创建哪些 spec 文件

### 步骤 3：生成规范产物

按依赖顺序依次生成：

#### 3a. 生成 design.md

1. 获取指令：`openspec instructions design --change "<name>" --json`
2. 读取 proposal.md 作为上下文
3. 按 template 结构创建 design.md，包含：
   - **Context**：背景和现状
   - **Goals / Non-Goals**：目标与非目标
   - **Decisions**：关键设计决策及理由
   - **Risks / Trade-offs**：风险和权衡

#### 3b. 生成 specs/

1. 获取指令：`openspec instructions specs --change "<name>" --json`
2. 为 proposal 中的每个 Capability 创建 `specs/<capability>/spec.md`
3. 每个 spec 包含 ADDED Requirements，每个 Requirement 有至少一个 Scenario
4. Scenario 使用 WHEN/THEN 格式

#### 3c. 生成 tasks.md

1. 获取指令：`openspec instructions tasks --change "<name>" --json`
2. 读取 design.md 和 specs/ 作为上下文
3. 按 template 创建 tasks.md，使用 `- [ ] X.Y 任务描述` 格式

每生成一个产物后，运行 `openspec status --change "<name>" --json` 确认状态。

### 步骤 4：Bridge 转换（内置，对用户透明）

在生成 specs 和 tasks 时，自动执行以下转换：

#### specs 场景 → TDD 测试用例映射

对每个 spec 中的 Scenario，在 tasks.md 中确保有对应的测试任务：
- 正常路径测试：WHEN 对应 setup/action，THEN 对应 assertion
- 错误路径测试：异常条件下的行为验证
- 边界值测试：涉及数值、时间等边界的场景

#### design.md → 实现计划输入

将 design.md 中的技术方案作为实现计划的核心上下文，确保每个 Decision 在 tasks.md 中有对应的实现任务。

#### tasks → TDD 步骤拆分

如果 tasks.md 中的任务粒度过粗，自动拆分为：
1. 编写失败测试
2. 编写最小实现
3. 重构清理

### 步骤 5：创建 task-status.md

在变更目录下创建 task-status.md，内容格式：

```markdown
# 任务状态 - <change-name>

## 阶段进度
explore:✓ plan:✓ implement:☐ verify:☐ archive:☐

## 任务明细
| # | 任务 | 状态 | 更新时间 | 测试结果 |
|---|------|------|---------|---------|
| 1 | <任务1描述> | 未开始 | - | - |
| 2 | <任务2描述> | 未开始 | - | - |
| ... | ... | ... | ... | ... |
```

所有任务初始状态为"未开始"。

### 步骤 6：阶段完成确认

使用 AskUserQuestion 展示所有 plan 产物摘要，提供三个选项：
- **A. 通过，进入下一阶段**：提示用户可以运行 `/sdd:implement`
- **B. 不通过，需要修改**：回到步骤 3 修改对应产物
- **C. 暂停，稍后继续**：保存当前进度到 task-status.md，退出

## 常见问题

- "proposal 中有歧义"：回到 explore 阶段澄清
- "specs 场景太多"：建议按优先级分批，先实现核心场景
- "tasks 粒度不一致"：自动按 bridge 转换规则拆分或合并
