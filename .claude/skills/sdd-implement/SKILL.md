---
name: sdd-implement
description: SDD 实现阶段 — 支持完整模式（subagent 驱动）和轻量模式（内联 TDD），基于 sdd-state.yaml checkpoint 精确断点恢复，审查循环限制 5 次，级联回退触发（执行归 sdd-plan），编译检查，每个任务完成后要求用户确认。当用户说"开始实现"、"执行任务"、使用 /sdd:implement 时触发。
---

# SDD 实现阶段

SDD 规格驱动开发的第三阶段：基于规范产物执行实现，支持完整模式（Superpowers subagent）和轻量模式（内联 TDD 循环）。

## 铁律

1. **新行为 MUST 先写失败测试，MUST NOT 在未写失败测试的情况下编写实现代码**
2. **每个任务完成后 MUST 要求用户确认，MUST NOT 自动跳过**
3. **发现规范偏离时 MUST 暂停，MUST NOT 默默偏离规范**
4. **单任务修改 MUST NOT 超过 5 次，全局审查 MUST NOT 超过 5 轮**

## 执行步骤

### 步骤 1：确定当前变更 + Superpowers 前置检查

1. 扫描 `openspec/changes/` 目录，查找进行中的变更（有 sdd-state.yaml 且 phase 为 implement 或 plan 已完成）
2. 如果只有一个 → 自动选择
3. 如果有多个 → 使用 AskUserQuestion 让用户选择
4. 如果没有 → 提示用户先运行 `/sdd:explore` 和 `/sdd:plan`

**Superpowers 前置检查**：
5. 读取 sdd-state.yaml 的 `superpowers_available` 字段
6. 如果为 true → 确认 Superpowers skill 仍可用（检查 `superpowers:subagent-driven-development`）
7. 如果 Superpowers 不可用（状态标记为 false 或运行时检测失败）→ 强制使用轻量模式

### 步骤 2：进度恢复

1. 读取变更目录下的 `sdd-state.yaml`
2. 读取 `openspec/sdd-project-profile.yaml`（如果存在），获取 compile_command 和 test_command
3. 根据 sdd-state.yaml 的 checkpoint 确定恢复位置：

| checkpoint | 恢复动作 |
|-----------|---------|
| `entered` | 从第一个 pending 任务开始 |
| `task-N-complete` | 从任务 N+1 继续 |
| `all-tasks-complete` | 进入步骤 7（所有任务完成） |

4. 对每个未完成任务，检查其任务级 checkpoint：

| 任务 checkpoint | 恢复动作 |
|----------------|---------|
| `null` | 从 RED 步骤开始 |
| `red` | 从 GREEN 步骤继续 |
| `green` | 从 REFACTOR 步骤继续 |
| `refactor` | 从测试验证步骤继续 |

5. 如果所有任务 status 为 completed → 提示用户运行 `/sdd:verify`

### 步骤 2.5：智能执行模式选择（需要 Superpowers）

如果 Superpowers 可用，根据任务特征选择执行模式：

#### 决策因素

| 因素 | 权重 | 检测方式 |
|------|------|---------|
| 任务数 | 高 | 读取 tasks.md 中任务数量 |
| 任务独立性 | 高 | 分析 tasks.md 中任务依赖关系 |
| 跨模块范围 | 中 | 计划文件 File Structure 中的模块数 |
| 项目结构 | 中 | sdd-project-profile.yaml 的 structure 字段 |
| 变更复杂度 | 低 | 预估修改文件数 |

#### 完整模式（`superpowers:subagent-driven-development`）

满足以下**任一**条件时触发：
- 任务数 >= 6
- 修改跨 >= 3 个不同模块/目录
- monorepo 且任务数 >= 3
- 任务高度独立（无依赖）且任务数 >= 4

#### 轻量模式（内联 TDD 循环）

满足以下**任一**条件时触发：
- 任务数 <= 5 且集中在 1-2 个模块
- 单模块小功能
- 任务有强编译时依赖（如接口+实现必须同 Task）
- **独立性否决**：即使任务数 >= 6 或跨 >= 3 模块，如果任务有强编译依赖，仍用轻量模式
- Superpowers 不可用时强制使用轻量模式

使用 AskUserQuestion 向用户展示推荐模式和理由，让用户确认或选择另一种模式。

将选择的模式记录到 sdd-state.yaml（新增字段 `execution_mode: full | lightweight`）。

### 步骤 3：加载规范上下文

在开始实现之前，MUST 读取变更目录下的所有规范文件：
1. `proposal.md`：了解需求范围和排除范围
2. `design.md`：了解技术方案和架构决策
3. `specs/` 下的所有 spec.md：了解行为场景
4. `tasks.md`：了解任务清单
5. `sdd-state.yaml`：了解当前进度和审查计数

### 步骤 4：执行实现

根据步骤 2.5 选择的模式执行：

#### 4a. 完整模式（`superpowers:subagent-driven-development`）

1. 读取 `superpowers/plans/` 下的计划文件
2. 使用 Skill 工具调用 `superpowers:subagent-driven-development`
3. 每个子代理完成任务后：
   - 运行 compile_command（如非 null）验证编译
   - 更新计划文件 checkbox：`- [ ]` → `- [x]`
   - 更新 sdd-state.yaml：对应任务 status → completed，checkpoint → complete
   - 运行测试验证
4. 如果子代理实现与规范偏离 → 暂停，执行步骤 6（规范偏离处理）
5. 全部任务完成后 → 进入步骤 7

#### 4b. 轻量模式（内联 TDD 循环）

对每个未完成的任务，执行以下 TDD 循环：

#### 4a. RED — 编写失败测试

1. 根据 specs 中的场景编写一个准确描述期望行为的失败测试
2. 运行测试确认它失败
3. 更新 sdd-state.yaml：任务 status → in_progress，checkpoint → red，updated → 当前时间

#### 4b. GREEN — 最小实现

1. 编写最少的代码让测试通过
2. MUST NOT 过度实现（不实现 specs 中未要求的功能）
3. 运行测试确认它通过
4. 更新 sdd-state.yaml：任务 checkpoint → green

#### 4c. REFACTOR — 重构

1. 在测试保护下清理代码，保持功能不变
2. 运行测试确认重构未破坏功能
3. 更新 sdd-state.yaml：任务 checkpoint → refactor

#### 4d. 测试验证

1. 运行完整的测试套件（不仅限于当前任务的测试）
2. 如果 compile_command 非 null（来自 sdd-project-profile.yaml），运行编译检查
3. 如果全部通过 → 更新 sdd-state.yaml：任务 status → completed，checkpoint → complete，记录 test_result
4. 如果有失败 → 更新 sdd-state.yaml：任务 status → failed，记录失败原因

### 步骤 5：单任务完成确认

每个任务完成后，使用 AskUserQuestion 展示任务产出摘要，提供三个选项：
- **A. 通过，继续下一个任务**：进入下一个未开始的任务
- **B. 不通过，需要修改**：
  1. 检查 task_retries 计数器（在 sdd-state.yaml 中）
  2. 如果 retries < 5 → 递增计数器，回到当前任务的 TDD 循环
  3. 如果 retries ≥ 5 → 暂停，使用 AskUserQuestion 提示："任务已修改 5 次仍未通过，可能需要回到 sdd:plan 重新审视任务拆分。"选项：A. 继续（额外 5 次）/ B. 回到 sdd:plan
- **C. 暂停，稍后继续**：保存当前进度到 sdd-state.yaml，退出

### 步骤 6：规范偏离处理

如果实现过程中发现规范需要调整：

1. **暂停当前实现**
2. 向用户说明偏离原因
3. 使用 AskUserQuestion 询问处理方式：
   - **回到 sdd:plan 修改规范**：在 sdd-state.yaml 的 cascade 字段写入回退意图（last_affected_phase: plan, invalidated_from: implement, reason: 偏离原因），更新 phase → plan，引导用户运行 `/sdd:plan`（级联重置由 sdd-plan 启动时统一处理）
   - **继续实现，记录偏离**：记录偏离说明，后续在 verify 阶段处理
4. MUST NOT 在用户未确认的情况下默默偏离规范

### 步骤 7：所有任务完成

1. 更新 sdd-state.yaml：phase_checkpoints.implement → all-tasks-complete，checkpoint → done
2. 展示实现摘要：完成的任务数、失败的测试数（如有）
3. 提示用户运行 `/sdd:verify`

## sdd-state.yaml 更新规则

每次状态变更时，更新 sdd-state.yaml 中的对应字段：

| 时机 | 更新内容 |
|------|---------|
| 开始执行任务 | status → in_progress, checkpoint → red, updated → 当前时间 |
| GREEN 完成 | checkpoint → green |
| REFACTOR 完成 | checkpoint → refactor |
| 测试通过 | status → completed, checkpoint → complete, test_result 记录结果 |
| 测试失败 | status → failed, 记录失败原因 |
| 全局审查超限 | review_counters.global_review_rounds 递增 |
| 单任务修改 | review_counters.task_retries[任务id] 递增 |

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 checkpoint 和任务级 checkpoint：

| 阶段 checkpoint | 任务 checkpoint | 恢复动作 |
|----------------|----------------|---------|
| `entered` | null | 从第一个 pending 任务的 RED 开始 |
| `task-N-complete` | null | 从任务 N+1 开始 |
| `task-N-complete` | red（任务 N） | 从任务 N 的 GREEN 继续 |
| `task-N-complete` | green（任务 N） | 从任务 N 的 REFACTOR 继续 |

**一致性验证**：如果 checkpoint 声称某个任务已完成但实际代码中未体现，回退到上一个确认一致的状态。

## 常见问题

- "AI 没读规范就实现了"：检查步骤 3 是否执行
- "测试和实现顺序反了"：检查 TDD 循环步骤
- "任务粒度太粗"：在 plan 阶段的 bridge 转换应已拆分；如仍过粗，可在此阶段进一步拆分
- "规范偏离但用户不知道"：步骤 6 的规范偏离处理确保不会默默偏离
- "修改超过 5 次仍不通过"：系统会提示回退 sdd:plan 重新审视任务拆分
