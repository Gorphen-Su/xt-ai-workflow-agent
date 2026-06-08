---
name: xt-sdd-plan
description: xt-sdd 方案设计阶段 — 基于 proposal 生成 design/specs/tasks，内置 Bridge 转换，调用 writing-plans 生成实现计划，计划文件保存在变更目录内，强制用户确认。当用户说"制定计划"、"拆分任务"、"方案设计"、使用 /xt-sdd:plan 时触发。
---

# xt-sdd 方案设计阶段

xt-sdd 规格驱动开发的第二阶段：基于 proposal 生成完整的规范产物和实现计划。

## 铁律

1. **此阶段 MUST NOT 编写任何生产代码**
2. **产物 MUST 按依赖顺序生成：proposal → design → specs → tasks**
3. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**

## 执行步骤

### 步骤 1：确定当前变更

1. 读取变更目录下的 `sdd-state.yaml`，获取当前 change 名和 checkpoint
2. 如果 sdd-state.yaml 不存在，扫描 `openspec/changes/` 目录查找包含 proposal.md 且尚未完成的变更
3. 如果有多个 → 使用 AskUserQuestion 让用户选择
4. 如果没有 → 提示用户先运行 `/xt-sdd:propose`

**Metrics Token 快照：** 步骤 1 完成后，记录 plan 阶段 Token 快照：
1. 读取当前变更的 sdd-state.yaml，检查 `metrics.token_usage.ccusage_available`
2. 如果为 true，执行 `npx ccusage session --json`（**Bash 调用 timeout 至少 120000ms**，session 数据规模大时实测可达 45-60 秒），解析并追加快照到 `metrics.token_usage.snapshots`：
   ```yaml
   - phase: plan
     timestamp: <当前 ISO 8601 时间戳>
     input_tokens: <从 ccusage 获取>
     output_tokens: <从 ccusage 获取>
   ```
3. 如果为 false，追加 `unavailable: true` 快照
4. 如果 ccusage 执行失败，追加 `error: "<错误信息>"` 快照
5. 使用 Edit 工具更新 sdd-state.yaml，**不阻塞流程**

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

级联规则矩阵：

| 被修改的阶段 | 影响范围 | 说明 |
|-------------|---------|------|
| propose | plan + apply + verify 全部失效 | 范围变更影响所有后续 |
| plan | apply + verify 失效 | 设计变更影响实现和验证 |
| apply | 仅 verify 失效 | 实现变更只需重新验证 |
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
3. 按 template 结构创建 design.md，包含：Context、Goals/Non-Goals、Decisions、Risks/Trade-offs

更新 sdd-state.yaml checkpoint: design-generated

#### 3b. 生成 specs/

1. 获取指令：`openspec instructions specs --change "<name>" --json`
2. 为 proposal 中的每个 Capability 创建 `specs/<capability>/spec.md`
3. 每个 spec 包含 ADDED Requirements，每个 Requirement 有至少一个 Scenario
4. Scenario 使用 WHEN/THEN 格式（必须使用 `####` 四级标题）

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

如果 sdd-state.yaml 的 `superpowers_available` 为 true，调用 Superpowers 的 writing-plans 生成实现计划。输出为 `plans/` 目录下的多文件结构 + `plan.md` 索引文件。

#### 4.5.1 从 tasks.md 提取分组信息

1. 读取 tasks.md，提取所有 `## N. 分组名` 二级标题
2. 生成分组列表，每项包含：
   - `number`：分组编号（如 1, 2, 3）
   - `name`：原始分组名（如 "基础设施"）
   - `slug`：kebab-case 英文名（如 "infrastructure"）
   - `filename`：`NN-<slug>.md`（如 "01-infrastructure.md"）
   - `tasks`：该分组下的任务列表（从 `- [ ] X.Y` 提取）
3. 分组名到 slug 的转换规则：
   - 中文分组名：根据上下文翻译为英文再 kebab-case（如 "基础设施" → "infrastructure"、"propose 阶段 skill" → "propose-stage"）
   - 英文分组名：直接 kebab-case（如 "Setup Tasks" → "setup-tasks"）
4. 创建 `plans/` 目录（如不存在）

#### 4.5.2 准备 API 验证上下文

1. 扫描项目中与本次变更同层的已有代码（如同模块的 Controller、Service、Handler 等）
2. 提取关键框架 API 的实际签名（import 路径、方法重载、泛型参数等）
3. 整理为"框架 API 注意事项"列表

#### 4.5.3 按分组调用 writing-plans

对每个分组，分别调用 `superpowers:writing-plans`：

1. **准备分组上下文**：
   - 全局上下文（每次都传入）：proposal.md、design.md、sdd-project-profile.yaml
   - 分组上下文（仅传入当前分组的）：对应的 specs 文件 + 该分组在 tasks.md 中的任务
2. **调用 `superpowers:writing-plans`**：
   - 使用 Skill 工具调用 `superpowers:writing-plans`
   - args 传入上下文，包含：
     - 变更名
     - 当前分组编号和名称
     - 当前分组任务列表
     - 项目技术栈：{languages} + {frameworks}
     - 构建工具：{build_tool}
     - 测试框架：{test_command}
     - 项目结构：{structure}
     - 编译命令：{compile_command}
     - 编译约束：{compile_constraints}
     - checkbox 唯一性约束：每个 Step 的 checkbox 描述必须全局唯一
     - 框架 API 注意事项：{API 验证结果}
     - 全局 openspec artifacts：proposal.md + design.md
     - 分组 openspec artifacts：对应 specs + 对应 tasks
     - 计划保存路径：`openspec/changes/<变更名>/plans/<filename>`
   - **指定该分组的任务为权威任务分解**，writing-plans 应基于此展开
3. **跳过执行移交**：writing-plans 完成后会 offer 执行选择，在 xt-sdd 上下文中跳过
4. **确认子计划文件**：
   - 检查 `openspec/changes/<变更名>/plans/<filename>` 是否存在且包含至少 1 个 checkbox
   - 如果没有 checkbox，重新调用并更明确指定"按该分组中的每个 Task 展开为 TDD 微步骤"
5. **添加绑定注释**：在子计划文件顶部添加 `<!-- sdd change: <变更名> -->`

#### 4.5.4 计划质量审查

所有子计划文件生成完成后，逐文件审查：

1. 编译约束遵守：接口+实现是否在同一 Task 中（如仍拆分，手动合并）
2. import 正确性：检查计划中 import 路径是否与项目实际结构一致
3. 无效代码检查：计划中引用的类/方法是否存在于项目中
4. 类型一致性：方法签名是否与实际 API 匹配
5. 如发现问题，直接在对应子计划文件中修复

#### 4.5.5 生成 plan.md 索引文件

1. 遍历所有生成的子计划文件
2. 生成 `plan.md` 索引文件，内容包含：
   - 绑定注释 `<!-- sdd change: <变更名> -->`
   - 变更名标题
   - 执行顺序说明
   - 子计划列表表格：编号 | 名称 | 文件链接 | 简要描述
3. plan.md MUST NOT 包含任何具体实现步骤或 checkbox 微步骤

更新 sdd-state.yaml checkpoint: plan-generated

**降级路径**：如果 `superpowers_available` 为 false 或 writing-plans 调用失败，跳过 writing-plans 调用，但仍按分组拆分到 `plans/` 目录：每个分组文件只包含 tasks.md 中对应分组的任务列表（无 TDD 微步骤），并生成 plan.md 索引文件。降级时分组文件格式：

```markdown
<!-- sdd change: <变更名> -->

# N. <分组名>

- [ ] X.Y 任务描述
- [ ] X.Z 任务描述
```

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
```

所有任务初始状态为 pending。

更新 sdd-state.yaml phase_checkpoints.plan: quality-reviewed

### 步骤 6：阶段完成确认

使用 AskUserQuestion 展示所有 plan 产物摘要，提供三个选项：
- **A. 通过，进入下一阶段**：更新 sdd-state.yaml（phase_checkpoints.plan: done, phase: plan, checkpoint: done），提示运行 `/xt-sdd:apply`
- **B. 不通过，需要修改**：回到步骤 3 修改对应产物
- **C. 暂停，稍后继续**：保存进度到 sdd-state.yaml，退出

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
| `done` | 所有产物完整 | 出口到 apply 阶段 |

## 常见问题

- "proposal 中有歧义"：回到 propose 阶段澄清
- "specs 场景太多"：建议按优先级分批，先实现核心场景
- "tasks 粒度不一致"：自动按 bridge 转换规则拆分或合并
- "sdd-project-profile.yaml 不存在"：提示用户先运行 `/xt-sdd:propose` 生成项目 profile
