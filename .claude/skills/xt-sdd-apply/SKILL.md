---
name: xt-sdd-apply
description: xt-sdd 实现阶段 — 支持完整模式（subagent 驱动）和轻量模式（内联 TDD），基于 sdd-state.yaml checkpoint 精确断点恢复，审查循环限制 5 次，级联回退触发（执行归 xt-sdd-plan），并发变更冲突检测，编译检查，默认连续执行（异常才停）、按分组批量提交。当用户说"开始实现"、"执行任务"、"TDD 实现"、使用 /xt-sdd:apply 时触发。
---

# xt-sdd 实现阶段

xt-sdd 规格驱动开发的第三阶段：基于规范产物执行实现，支持完整模式（Superpowers subagent）和轻量模式（内联 TDD 循环）。

## 铁律

1. **新行为 MUST 先写失败测试，MUST NOT 在未写失败测试的情况下编写实现代码**
2. **默认连续执行所有任务，仅在异常（测试失败 / 编译失败 / 规范偏离）时暂停；分组或全部任务完成后统一汇报。用户可在步骤 2.5 选择更细的确认节奏（按分组 / 每任务）**
3. **发现规范偏离时 MUST 暂停，MUST NOT 默默偏离规范**
4. **单任务修改 MUST NOT 超过 5 次，全局审查 MUST NOT 超过 5 轮**
5. **此阶段 MUST NOT 修改规格文档**（proposal.md、design.md、specs/、tasks.md 的内容）

## 执行步骤

### 步骤 1：确定当前变更 + Superpowers 前置检查

1. 扫描 `openspec/changes/` **顶层目录**（排除 `openspec/changes/archive/` 归档子目录），查找进行中的变更（有 sdd-state.yaml 且 phase 为 apply 或 plan 已完成）
2. 如果只有一个 → 自动选择
3. 如果有多个 → 使用 AskUserQuestion 让用户选择
4. 如果没有 → 提示用户先运行 `/xt-sdd:propose` 和 `/xt-sdd:plan`

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

### 步骤 2.5：智能执行模式选择

根据任务特征选择执行模式：

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

使用 AskUserQuestion 向用户展示推荐模式、理由，并一并确认**确认节奏**：

- **执行模式**（完整 / 轻量）：如上决策因素推荐
- **确认节奏**：
  - **连续执行（默认）**：连续跑完所有任务，仅在测试失败 / 编译失败 / 规范偏离时暂停，每个分组完成时简要汇报
  - **按分组确认**：每完成一个分组（`plans/NN-*.md`）确认一次
  - **每任务确认**：每个任务完成后确认（最细粒度，适合高风险变更）

将执行模式与确认节奏一并记录到 sdd-state.yaml：`execution_mode: full | lightweight`、`confirm_cadence: continuous | group | task`。

### 步骤 3：加载规范上下文（分层按需，非全量）

在开始实现之前，按当前任务所需加载规范上下文，**MUST NOT 一上来全量读取所有规范文件**（大变更下极费 token）。分层规则：

**必读（每次都读，轻量）**：
1. `sdd-state.yaml`：当前进度、审查计数、任务级 checkpoint（断点恢复依据）
2. `tasks.md`：任务清单全貌
3. `plan.md`（如存在）：实现计划索引，用于定位当前任务所在分组
4. 当前任务所在分组的 `plans/NN-<分组>.md`：该分组的 TDD 微步骤与 checkbox

**按需读（仅当当前任务需要时）**：
5. `specs/<capability>/spec.md`：仅读**当前任务对应 capability** 的那份 spec，MUST NOT 读 specs/ 全目录
6. `proposal.md` / `design.md`：仅在跨阶段断点恢复、或当前任务涉及全局范围/架构决策时读取对应章节，无需通读

**定位代码遵循 CLAUDE.md 的 codegraph 纪律**：理解或定位实现涉及的函数/类/调用链时，MUST 先用 `codegraph_explore`（MCP）或 `codegraph explore`（CLI），禁止 grep + read 整文件；仅查 `specs/` 下规格内容时可用 Read。详见 [CodeGraph × xt-sdd 提效指南 · apply](.claude/skills/xt-codegraph-init/references/codegraph-xt-sdd.md#applytdd-实现)。

> 完整模式下，`superpowers:subagent-driven-development` 会在步骤 4a 自行加载所需的全部分组计划来调度 subagent；本步骤的按需规则主要约束主对话与轻量模式。

**计划文件兼容读取**：
- 如果 `plans/` 目录存在 → 从 `plan.md` 读取索引定位分组，仅深读当前分组对应的 `plans/NN-*.md`
- 如果 `plans/` 目录不存在 → 从单一 `plan.md` 读取当前任务的实现步骤（兼容旧变更目录）

### 步骤 3.5：并发变更冲突检测

1. 扫描 `openspec/changes/` 顶层目录下其他活跃变更（排除 `openspec/changes/archive/` 归档子目录）
2. 对于每个其他活跃变更，检查其 plan.md 或 tasks.md 中涉及修改的文件
3. 如果与当前变更有文件重叠 → 使用 AskUserQuestion 警告用户：
   - 列出重叠的文件
   - 说明后者覆盖前者的策略
   - 提供选项：继续（后者覆盖）/ 暂停处理冲突

### 步骤 4：执行实现

根据步骤 2.5 选择的模式执行：

#### 4a. 完整模式（`superpowers:subagent-driven-development`）

1. 读取计划文件：优先扫描 `plans/` 目录，按编号排序读取所有子计划；如无 `plans/` 则回退到单一 `plan.md`
2. 使用 Skill 工具调用 `superpowers:subagent-driven-development`
3. 每个子代理完成任务后：
   - 运行 compile_command（如非 null）验证编译
   - 更新对应子计划文件中的 checkbox：`- [ ]` → `- [x]`（如有 `plans/` 目录）；否则更新 `plan.md` 中的 checkbox
   - 更新 sdd-state.yaml：对应任务 status → completed，checkpoint → complete
   - 运行测试验证
4. 如果子代理实现与规范偏离 → 暂停，执行步骤 6（规范偏离处理）
5. 全部任务完成后 → 进入步骤 7

**降级**：如果 subagent-driven-development 调用失败，回退到轻量模式执行。

#### 4b. 轻量模式（内联 TDD 循环）

对每个未完成的任务，执行以下 TDD 循环：

##### RED — 编写失败测试

1. 根据 specs 中的场景编写一个准确描述期望行为的失败测试
2. 运行测试确认它失败
3. 更新 sdd-state.yaml：任务 status → in_progress，checkpoint → red，updated → 当前时间

##### GREEN — 最小实现

1. 编写最少的代码让测试通过
2. MUST NOT 过度实现（不实现 specs 中未要求的功能）
3. 运行测试确认它通过
4. 更新 sdd-state.yaml：任务 checkpoint → green

##### REFACTOR — 重构

1. 在测试保护下清理代码，保持功能不变
2. 运行测试确认重构未破坏功能
3. 更新 sdd-state.yaml：任务 checkpoint → refactor

##### 测试验证

1. 运行完整的测试套件（不仅限于当前任务的测试）
2. 如果 compile_command 非 null（来自 sdd-project-profile.yaml），运行编译检查
3. 如果全部通过 → 更新 sdd-state.yaml：任务 status → completed，checkpoint → complete，记录 test_result
4. 如果有失败 → 更新 sdd-state.yaml：任务 status → failed，记录失败原因；**暂停连续执行**，向用户报告失败任务与原因，MUST NOT 自动跳到下一任务（按步骤 6 规范偏离或失败重试流程处理）

### 步骤 5：分组提交与状态同步

按**分组边界**提交，而非每个任务一次提交（减少大变更下的 git 操作频率）。提交节奏：每个分组（`plans/NN-<分组>.md`）的全部任务完成后 commit 一次；无 `plans/` 的单一 `plan.md` 变更，全部任务完成后 commit 一次。

**每个任务完成后（不 commit，仅同步状态）**：

1. **编译检查**：运行 `compile_command`（如非 null），必须通过
2. **更新 checkbox**：在对应 `plans/NN-<分组名>.md`（或 `plan.md`）中将该任务的 checkbox `- [ ]` → `- [x]`（含 Verify、Commit 等非实现步骤，不能遗漏）
3. **更新状态文件**：sdd-state.yaml 对应任务 status → completed，checkpoint → task-N-complete

**分组边界触发 commit**（当前任务是其所在分组的最后一个任务时）：

4. **批量 commit**：将该分组累计的代码改动 + 子计划文件变更 + sdd-state.yaml 变更一起提交到本地仓库
   - commit message 格式：`<类型>(<分组名>): <分组描述> — 含 N 个任务`
   - **全程不做 push 操作**

**单一 plan.md 变更（无 plans/ 目录）**：所有任务全部完成后（步骤 8 之前）执行一次 commit。

**异常不提交**：测试 / 编译失败时停止连续执行，**不提交未通过的改动**（见步骤 4b 测试验证与步骤 6 规范偏离）。

**原子性保证**：先更新 checkbox 和状态文件再 commit，确保三者一致。

> commit 边界在分组层，但**断点恢复仍由任务级 checkpoint（red/green/refactor/complete + task-N-complete）支持**——恢复粒度比 commit 粒度更细，不因批量 commit 而降级（见"断点恢复"表）。

### 步骤 6：规范偏离处理

如果实现过程中发现规范需要调整：

1. **暂停当前实现**
2. 向用户说明偏离原因
3. 使用 AskUserQuestion 询问处理方式：
   - **回到 xt-sdd:plan 修改规范**：在 sdd-state.yaml 的 cascade 字段写入回退意图（last_affected_phase: plan, invalidated_from: apply, reason: 偏离原因），更新 phase → plan，引导用户运行 `/xt-sdd:plan`（级联重置由 xt-sdd-plan 启动时统一处理）
   - **继续实现，记录偏离**：记录偏离说明，后续在 verify 阶段处理
4. MUST NOT 在用户未确认的情况下默默偏离规范

### 步骤 7：审查循环限制

- **单任务修改**：同一任务修改次数 >= 5 仍未通过 → 提示用户"任务已修改 5 次仍未通过，可能需要回到 plan 重新审视任务拆分"，选项：继续（额外 5 次）/ 回到 plan
- **全局审查**：全局审查循环 >= 5 轮仍有 Critical 问题 → 提示用户"审查已循环 5 次仍有 Critical 问题，可能需要回到 plan 重新审视设计方案"，选项：继续（额外 5 轮）/ 回到 plan

### 步骤 8：所有任务完成

1. 更新 sdd-state.yaml：phase_checkpoints.apply → all-tasks-complete，checkpoint → done
2. 展示实现摘要：**按分组汇报**各分组完成任务数、失败的测试数（如有）
3. 提示用户运行 `/xt-sdd:verify`

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
- "任务粒度太粗"：在 plan 阶段（步骤 3c 转换约束 + 步骤 4 writing-plans）应已拆分；如仍过粗，可在此阶段进一步拆分
- "规范偏离但用户不知道"：步骤 6 的规范偏离处理确保不会默默偏离
- "修改超过 5 次仍不通过"：系统会提示回退 plan 重新审视任务拆分
