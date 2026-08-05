---
name: xt-sdd-plan
description: xt-sdd 方案设计阶段 — 基于 proposal 生成 design/specs/tasks（tasks 内联规格→TDD 转换约束），调用 writing-plans 生成实现计划，计划文件保存在变更目录内，强制用户确认。当用户说"制定计划"、"拆分任务"、"方案设计"、使用 /xt-sdd:plan 时触发。
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
2. 如果 sdd-state.yaml 不存在，扫描 `openspec/changes/` **顶层目录**（排除 `openspec/changes/archive/` 归档子目录），查找包含 proposal.md 且尚未完成的变更
3. 如果有多个 → 使用 AskUserQuestion 让用户选择
4. 如果没有 → 提示用户先运行 `/xt-sdd:propose`

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

### 步骤 3：生成规范产物（缓存优先 + 文件检查）

**缓存优化**：复用 propose 阶段的 instructions 缓存（同一 change），避免重复调用 `openspec instructions`。propose 和 plan 操作同一变更目录，instructions 完全可复用。

#### 3.0：获取 instructions（缓存优先）

```bash
# 检查 propose 阶段的缓存是否有效
if bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh check; then
  echo "✓ 复用 propose 阶段的 instructions 缓存"
else
  echo "→ 缓存无效，重新获取..."
  bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh fetch "<name>"
fi
```

按依赖顺序依次生成：

#### 3a. 生成 design.md

1. 获取指令（从缓存读取，替代 `openspec instructions`）：
   ```bash
   bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get design
   ```
2. 读取 proposal.md 作为上下文
3. 按 template 结构创建 design.md，包含：Context、Goals/Non-Goals、Decisions、Risks/Trade-offs

更新 sdd-state.yaml checkpoint: design-generated

#### 3b. 生成 specs/

1. 获取指令（从缓存读取）：
   ```bash
   bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get specs
   ```
2. 为 proposal 中的每个 Capability 创建 `specs/<capability>/spec.md`
3. 每个 spec 包含 ADDED Requirements，每个 Requirement 有至少一个 Scenario
4. Scenario 使用 WHEN/THEN 格式（必须使用 `####` 四级标题）

更新 sdd-state.yaml checkpoint: specs-generated

#### 3c. 生成 tasks.md

1. 获取指令（从缓存读取）：
   ```bash
   bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get tasks
   ```
2. 读取 design.md 和 specs/ 作为上下文
3. 按 template 创建 tasks.md，使用 `- [ ] X.Y 任务描述` 格式
4. **规格→TDD 转换约束（生成 tasks 时同步执行，内联，无独立步骤）**：
   - **场景→测试任务**：对每个 spec 的 Scenario，确保 tasks.md 有对应的测试任务（正常路径：WHEN→setup/action、THEN→assertion；错误路径：异常条件验证；边界值：数值/时间等边界）
   - **compile_constraints 注入**：若 `sdd-project-profile.yaml` 有 compile_constraints，任务拆分遵循"编译独立性"——一个任务完成后必须能编译通过，接口层与实现层必须在同一 Task（避免 apply 阶段单独编译失败）
   - design 决策落地与 TDD 微步骤展开交由步骤 4 的 writing-plans 负责，tasks.md 保持 openspec 粗粒度即可

更新 sdd-state.yaml checkpoint: tasks-generated

**状态验证优化**：用文件检查替代 `openspec status` 调用（每生成一个产物后无需重新查询状态）：
```bash
# 文件存在性检查（替代 openspec status --json）
[ -f "openspec/changes/<name>/design.md" ] && echo "✓ design.md"
[ -d "openspec/changes/<name>/specs" ] && echo "✓ specs/"
[ -f "openspec/changes/<name>/tasks.md" ] && echo "✓ tasks.md"
```

### 步骤 4：调用 writing-plans 生成实现计划（需要 Superpowers）

如果 sdd-state.yaml 的 `superpowers_available` 为 true，调用 Superpowers 的 writing-plans 生成实现计划。输出为 `plans/` 目录下的多文件结构 + `plan.md` 索引文件。

#### 4.1 从 tasks.md 提取分组信息

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

#### 4.2 准备 API 验证上下文

> 若 CodeGraph 可用，优先用 `codegraph explore` / `codegraph_node` 取实际 API 签名（import 路径、方法重载、泛型），用 `codegraph impact` / `codegraph callers` 评估改动影响面，替代逐文件扫描。详见 [CodeGraph × xt-sdd 提效指南 · plan](.claude/skills/xt-codegraph-init/references/codegraph-xt-sdd.md#plan方案设计)。

1. 定位本次变更同层的已有代码（如同模块的 Controller、Service、Handler 等）
2. 提取关键框架 API 的实际签名（import 路径、方法重载、泛型参数等）
3. 用 `codegraph impact` 列出受影响节点，整理为"框架 API 注意事项"+"影响范围"列表（直接喂给 design.md 与 tasks.md）

#### 4.3 按分组调用 writing-plans

对每个分组，分别调用 `superpowers:writing-plans`。**省 token 纪律：proposal.md / design.md / sdd-project-profile.yaml 已在步骤 2、3a、3c 加载到本次对话上下文，调用 writing-plans 时直接引用，MUST NOT 在 args 中重复粘贴这些全文**——args 只传分组特有的内容 + 短元数据。N 个分组的 args 体积因此从 O(N·全局) 降到 O(N·分组)。

**Subagent 隔离执行（推荐，防挤爆）**：分组数 > 2 时，每个分组的 writing-plans 调用用 **Agent 工具启动独立 subagent** 执行，subagent 有独立上下文，主对话只接收子计划文件生成结果。分组多时主对话上下文几乎不增长。

→ 隔离策略详见 [xt-sdd-shared/references/context-isolation-strategy.md](../xt-sdd-shared/references/context-isolation-strategy.md)

1. **准备分组上下文**：
   - 全局上下文（已在对话中，仅引用，不重传）：proposal.md、design.md、sdd-project-profile.yaml
   - 分组上下文（本次调用独有，需传入）：该分组对应的 specs 文件 + 该分组在 tasks.md 中的任务列表
2. **调用 `superpowers:writing-plans`**：
   - 使用 Skill 工具调用 `superpowers:writing-plans`
   - args 仅传入分组特有内容 + 短元数据：
     - 变更名
     - 当前分组编号和名称
     - 当前分组任务列表
     - 分组 openspec artifacts：**仅该分组涉及的** specs + tasks（非全量）
     - 项目技术栈：{languages} + {frameworks}
     - 构建工具：{build_tool}、测试框架：{test_command}、项目结构：{structure}
     - 编译命令：{compile_command}、编译约束：{compile_constraints}
     - checkbox 唯一性约束：每个 Step 的 checkbox 描述必须全局唯一
     - 框架 API 注意事项：{API 验证结果}
     - 计划保存路径：`openspec/changes/<变更名>/plans/<filename>`
     - 注明："全局上下文（proposal/design/profile）参见本次对话已加载内容，无需重复提供"
   - **指定该分组的任务为权威任务分解**，writing-plans 应基于此展开
3. **跳过执行移交**：writing-plans 完成后会 offer 执行选择，在 xt-sdd 上下文中跳过
4. **确认子计划文件**：
   - 检查 `openspec/changes/<变更名>/plans/<filename>` 是否存在且包含至少 1 个 checkbox
   - 如果没有 checkbox，重新调用并更明确指定"按该分组中的每个 Task 展开为 TDD 微步骤"
5. **添加绑定注释**：在子计划文件顶部添加 `<!-- sdd change: <变更名> -->`

#### 4.4 计划质量审查（高风险优先，避免逐文件全审）

所有子计划文件生成完成后，按风险优先级审查，**不必逐条逐文件全审**（大变更下 O(N) 审查很贵）：

1. **必审（高风险，每个子计划文件都查）**：
   - 编译约束遵守：接口+实现是否在同一 Task 中（如仍拆分，手动合并）
   - import 正确性：计划中 import 路径是否与项目实际结构一致
2. **抽样审（低风险，抽查即可）**：无效代码检查（引用的类/方法是否存在）、类型一致性（方法签名是否与实际 API 匹配）——仅对涉及外部框架 API 的分组抽查
3. 如发现问题，直接在对应子计划文件中修复

#### 4.5 生成 plan.md 索引文件

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

  **阶段切换 /clear 提示**（上下文隔离）：
  ```
  ✓ plan 阶段完成

  所有进度已保存到 sdd-state.yaml（phase: plan, checkpoint: done）。

  【建议】运行 /clear 清除上下文，然后运行 /xt-sdd:apply 进入实现阶段。
  （断点恢复机制确保从正确位置继续）
  ```
  → 详见 [xt-sdd-shared/references/context-isolation-strategy.md](../xt-sdd-shared/references/context-isolation-strategy.md#策略-2阶段切换时建议-clear)

- **B. 不通过，需要修改**：回到步骤 3 修改对应产物
- **C. 暂停，稍后继续**：保存进度到 sdd-state.yaml，退出

## 参考文档

- [optimization.md](references/optimization.md) — plan 阶段优化说明（instructions 缓存复用 + 状态检查合并）
- [xt-sdd-shared/references/context-management.md](../xt-sdd-shared/references/context-management.md) — 通用上下文管理规则
- [xt-sdd-shared/references/small-window-adaptation.md](../xt-sdd-shared/references/small-window-adaptation.md) — 小窗口模型适配
- [xt-sdd-shared/references/cli-optimization.md](../xt-sdd-shared/references/cli-optimization.md) — CLI 调用优化

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 phase_checkpoints.plan，然后检查实际文件状态：

| checkpoint | 实际文件状态 | 恢复到 |
|-----------|-------------|--------|
| `entered` | 无 design.md | 步骤 3a（生成 design.md） |
| `design-generated` | 有 design.md 但 specs/ 不完整 | 步骤 3b（生成 specs） |
| `specs-generated` | specs/ 完整但无 tasks.md | 步骤 3c（生成 tasks.md） |
| `tasks-generated` | 有 tasks.md 但未生成实现计划 | 步骤 4（调用 writing-plans） |
| `plan-generated` | 实现计划已生成但未更新 state | 步骤 5（更新 sdd-state.yaml） |
| `quality-reviewed` | state 已更新 | 步骤 6（阶段完成确认） |
| `done` | 所有产物完整 | 出口到 apply 阶段 |

## 常见问题

- "proposal 中有歧义"：回到 propose 阶段澄清
- "specs 场景太多"：建议按优先级分批，先实现核心场景
- "tasks 粒度不一致"：按步骤 3c 的规格→TDD 转换约束拆分或合并；TDD 微步骤展开由步骤 4 的 writing-plans 负责
- "sdd-project-profile.yaml 不存在"：提示用户先运行 `/xt-sdd:propose` 生成项目 profile
