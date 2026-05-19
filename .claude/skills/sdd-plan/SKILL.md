---
name: sdd-plan
description: SDD 计划阶段 — 基于 proposal 生成 design/specs/tasks，内置 bridge 转换，读取 sdd-project-profile.yaml 注入编译约束，创建 sdd-state.yaml 任务状态，强制用户确认。当用户说"制定计划"、"拆分任务"、使用 /sdd:plan 时触发。
---

# SDD 计划阶段

SDD 规格驱动开发的第二阶段：基于 proposal 生成完整的规范产物，内置 bridge 转换逻辑。

## 铁律

1. **此阶段 MUST NOT 编写任何生产代码**
2. **产物 MUST 按依赖顺序生成：proposal → design → specs → tasks**
3. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**

## 执行步骤

### 步骤 1：确定当前变更

1. 读取变更目录下的 `sdd-state.yaml`，获取当前 change 名和 checkpoint
2. 如果 sdd-state.yaml 不存在，扫描 `openspec/changes/` 目录查找包含 proposal.md 且尚未完成的变更
3. 如果有多个 → 使用 AskUserQuestion 让用户选择
4. 如果没有 → 提示用户先运行 `/sdd:explore`

### 步骤 1.5：级联重置检查

如果 sdd-state.yaml 的 `cascade.invalidated_from` 不为 null，说明是从后续阶段回退进来的，需要执行级联重置：

1. 读取 cascade 字段：last_affected_phase、invalidated_from、reason、preserved_tasks
2. 向用户展示回退原因和影响范围
3. 使用 AskUserQuestion 询问重置范围：
   - **全量重置（默认）**：将 invalidated_from 及后续阶段的 phase_checkpoints 清零，所有任务 → pending
   - **选择性保留**：展示已完成任务列表供用户勾选，保留的任务状态不变，其余 → pending
4. 执行重置：
   - 清零失效阶段的 phase_checkpoints 为 null
   - 重置受影响任务 status → pending，checkpoint → null
   - 重置 review_counters（task_retries 清零，global_review_rounds 清零）
   - 更新 preserved_tasks
5. 清除 cascade 字段（last_affected_phase: null, invalidated_from: null, reason: null）
6. 继续正常的 plan 流程

级联规则矩阵：

| 被修改的阶段 | 影响范围 | 说明 |
|-------------|---------|------|
| explore | plan + implement + verify 全部失效 | 范围变更影响所有后续 |
| plan | implement + verify 失效 | 设计变更影响实现和验证 |
| implement | 仅 verify 失效 | 实现变更只需重新验证 |
| verify | 无级联 | 仅 verify 内部重做 |

### 步骤 2：读取 proposal.md 和 sdd-project-profile.yaml

1. 读取变更目录下的 proposal.md
2. 提取 Capabilities 列表，确认需要创建哪些 spec 文件
3. 读取 `openspec/sdd-project-profile.yaml`（如果存在），获取 compile_constraints 和技术栈信息

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

更新 sdd-state.yaml checkpoint: design-generated

#### 3b. 生成 specs/

1. 获取指令：`openspec instructions specs --change "<name>" --json`
2. 为 proposal 中的每个 Capability 创建 `specs/<capability>/spec.md`
3. 每个 spec 包含 ADDED Requirements，每个 Requirement 有至少一个 Scenario
4. Scenario 使用 WHEN/THEN 格式

更新 sdd-state.yaml checkpoint: specs-generated

#### 3c. 生成 tasks.md

1. 获取指令：`openspec instructions tasks --change "<name>" --json`
2. 读取 design.md 和 specs/ 作为上下文
3. 按 template 创建 tasks.md，使用 `- [ ] X.Y 任务描述` 格式

更新 sdd-state.yaml checkpoint: tasks-generated

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

#### compile_constraints 注入

如果 `sdd-project-profile.yaml` 存在且有 compile_constraints，在 Bridge 转换时注入：
- 任务拆分时遵循"编译独立性"原则：一个任务完成后必须能编译通过
- 接口层和实现层必须在同一 Task 中同时修改
- 将 compile_constraints 作为额外约束传入任务拆分逻辑

更新 sdd-state.yaml checkpoint: bridge-converted

### 步骤 4.5：调用 writing-plans 生成实现计划（需要 Superpowers）

如果 sdd-state.yaml 的 `superpowers_available` 为 true，调用 Superpowers 的 writing-plans 生成实现计划：

1. **准备上下文**：
   - 拼接所有 openspec artifacts：proposal.md + design.md + specs/*.md + tasks.md
   - 读取 `openspec/sdd-project-profile.yaml`，提取项目 profile 上下文

2. **准备 API 验证上下文**：
   - 扫描项目中与本次变更同层的已有代码（如同模块的 Controller、Service、Handler 等）
   - 提取关键框架 API 的实际签名（import 路径、方法重载、泛型参数等）
   - 整理为"框架 API 注意事项"列表

3. **调用 `superpowers:writing-plans`**：
   - 使用 Skill 工具调用 `superpowers:writing-plans`
   - args 传入上下文，包含：
     - 变更名
     - 项目技术栈：{languages} + {frameworks}
     - 构建工具：{build_tool}
     - 测试框架：{test_command}
     - 项目结构：{structure}
     - 编译命令：{compile_command}
     - 编译约束：{compile_constraints}
     - checkbox 唯一性约束：每个 Step 的 checkbox 描述必须全局唯一
     - 框架 API 注意事项：{API 验证结果}
     - openspec artifacts：{拼接的所有产物内容}
   - **指定 tasks.md 为权威任务分解**，writing-plans 应基于此展开

4. **跳过执行移交**：writing-plans 完成后会 offer 执行选择（Subagent-Driven / Inline），在 SDD 上下文中跳过此 offer

5. **确认计划文件**：
   - 检查 `superpowers/plans/YYYY-MM-DD-<变更名>.md` 是否存在且包含至少 1 个 checkbox
   - 如果没有 checkbox，重新调用并更明确指定"按 tasks.md 中的每个 Task 展开为 TDD 微步骤"

6. **计划质量审查（必须完成）**：
   - 编译约束遵守：接口+实现是否在同一 Task 中（如 writing-plans 仍拆分，手动合并）
   - import 正确性：检查计划中 import 路径是否与项目实际结构一致
   - 死代码检查：计划中引用的类/方法是否存在于项目中
   - 类型一致性：方法签名是否与实际 API 匹配

7. **添加绑定注释**：在计划文件顶部添加 `<!-- sdd change: <变更名> -->`

更新 sdd-state.yaml checkpoint: plan-generated

**降级路径**：如果 `superpowers_available` 为 false 或 writing-plans 调用失败，跳过此步骤，使用 Bridge 转换产出的 tasks.md 作为实现指导（无 checkbox 微步骤）。

### 步骤 5：更新 sdd-state.yaml 任务状态

从 tasks.md 中提取所有任务，更新 sdd-state.yaml 的 tasks 列表：

```yaml
tasks:
  - id: 1
    description: <任务1描述>
    status: pending
    updated: "-"
    test_result: "-"
    checkpoint: null
  - id: 2
    description: <任务2描述>
    status: pending
    updated: "-"
    test_result: "-"
    checkpoint: null
```

所有任务初始状态为 pending。

更新 sdd-state.yaml phase_checkpoints.plan: quality-reviewed

### 步骤 6：阶段完成确认

使用 AskUserQuestion 展示所有 plan 产物摘要，提供三个选项：
- **A. 通过，进入下一阶段**：更新 sdd-state.yaml（phase_checkpoints.plan: done, phase: plan, checkpoint: done），提示用户可以运行 `/sdd:implement`
- **B. 不通过，需要修改**：回到步骤 3 修改对应产物
- **C. 暂停，稍后继续**：保存当前进度到 sdd-state.yaml，退出

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 phase_checkpoints.plan，然后检查实际文件状态：

| checkpoint | 实际文件状态 | 恢复到 |
|-----------|-------------|--------|
| `entered` | 无 design.md | 步骤 3a（生成 design.md） |
| `design-generated` | 有 design.md 但 specs/ 不完整 | 步骤 3b（生成 specs） |
| `specs-generated` | specs/ 完整但无 tasks.md | 步骤 3c（生成 tasks.md） |
| `tasks-generated` | 有 tasks.md 但未做 Bridge 转换 | 步骤 4（Bridge 转换） |
| `bridge-converted` | Bridge 转换完成但未生成实现计划 | 步骤 4.5（调用 writing-plans） |
| `plan-generated` | 实现计划已生成但未更新 state | 步骤 5（更新 sdd-state.yaml） |
| `quality-reviewed` | state 已更新 | 步骤 6（阶段完成确认） |
| `done` | 所有产物完整 | 出口到 implement 阶段 |

## 向后兼容

如果变更目录中存在 `task-status.md` 但没有 `sdd-state.yaml`：
1. 提示用户迁移
2. 从 task-status.md 提取阶段进度和任务状态，生成 sdd-state.yaml
3. 迁移后删除 task-status.md

## 常见问题

- "proposal 中有歧义"：回到 explore 阶段澄清
- "specs 场景太多"：建议按优先级分批，先实现核心场景
- "tasks 粒度不一致"：自动按 bridge 转换规则拆分或合并
- "sdd-project-profile.yaml 不存在"：提示用户先运行 `/sdd:explore` 生成项目 profile
