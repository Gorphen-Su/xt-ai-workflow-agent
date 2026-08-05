---
name: xt-sdd-quick
description: xt-sdd 小功能快速变更入口 — 针对范围聚焦、需求明确的小变更（如给组件加属性/参数），分诊后走轻量通道：简化规格（proposal+tasks）→ 直接 TDD → codegraph affected 精准回归 → 简化归档。当用户说"快速变更"、"quick"、"小功能"、"加属性"、"轻量变更"、使用 /xt-sdd:quick 时触发。
---

# xt-sdd 小功能快速变更入口

针对"范围聚焦 + 需求明确"的小功能/增强（如给组件加一个属性、加一个参数、小调整），跳过完整 5 阶段，走轻量通道。**用 codegraph 自动界定改动范围与回归测试范围**，天然实现"聚焦代码变更有限 → 测试策略有限"。

## 核心原则

- **快速通道**：不是所有功能都需要走完整 propose→plan→apply→verify→archive
- **范围自动界定**：用 `codegraph impact` 判断改动是否聚焦，用 `codegraph affected` 判断该跑哪些测试（不靠人工估计）
- **轻量规格**：只写简化 proposal.md + tasks.md，跳过 design.md / specs/
- **聚焦验证**：只跑受影响测试，非全量回归
- **自动升级**：实现中发现范围超预期，自动升级到 plan 或 propose

## 三入口边界（避免与 fix / propose 混淆）

| 入口 | 场景 | 分诊维度 |
|------|------|---------|
| `/xt-sdd:propose` | 大需求、新模块、架构变更 | — |
| `/xt-sdd:fix` | bug 修复 | 根因明确？修法明确？ |
| `/xt-sdd:quick` | **小功能/增强**（加属性/参数/小调整） | **范围聚焦？需求明确？** |

## 执行步骤

### 步骤 0：前置检查（codegraph 可用性）

quick 强依赖 codegraph 自动界定范围，必须先确认可用：

1. 检查项目根是否有 `.codegraph/` 目录，或 `codegraph` CLI 是否可调用
   - 可用 → 继续
   - 不可用 → 提示用户："quick 依赖 codegraph 自动界定改动与回归范围，建议先运行 `/xt-codegraph-init`。是否现在初始化？"
     - 用户选择初始化 → 调用 `xt-codegraph-init`，完成后继续
     - 用户选择跳过 → 提示"无 codegraph 时范围与回归需人工判断，建议改用 /xt-sdd:fix 或 /xt-sdd:propose"，退出

### 步骤 1：分诊判断

在两个维度上评估，决定走快速通道还是升级：

```
范围聚焦？
  否 → 升级 propose（范围大，需完整规格）
  是 → 需求明确？
         否 → 升级 propose（需求模糊，需探索澄清）
         是 → 走 quick 快速通道
```

#### 分诊判断逻辑

| 维度 | 判断方式 | 示例 |
|------|---------|------|
| **范围聚焦？** | 用 `codegraph impact <待改符号>` 看受影响符号/文件数：≤ ~5 个符号且不跨模块 → 聚焦 | "给 Input 组件加 placeholder" → 影响仅 Input + 其测试 → 聚焦 / "改造鉴权流程" → 跨多模块 → 不聚焦 |
| **需求明确？** | 用户能否清楚说出"改什么、加在哪、期望行为" | "给 X 加 placeholder 属性，透传到原生 input" → 明确 / "让表单更好用" → 不明确 |

#### 分诊结果确认

向用户展示分诊结果与范围依据（codegraph impact 输出的受影响符号/文件清单），使用 AskUserQuestion 让用户确认走 quick 或升级。

### 步骤 2：创建 quick 变更目录

1. 命名：`quick-<简述>`（如 `quick-input-placeholder`）
2. 运行 `openspec new change "quick-<简述>"` 创建变更目录
3. 初始化 `sdd-state.yaml`（结构见下文，`phase: apply`）
4. **记录 git baseline**：`git rev-parse HEAD` → `git_baseline.start_sha`，当前时间 → `start_time`，`git status --porcelain` → `dirty`

### 步骤 3：轻量规格（proposal + tasks，跳过 design/specs）

在变更目录下生成两个简化文件（**不生成 design.md / specs/**）：

#### proposal.md（快速变更提案）

```markdown
# 快速变更提案 - quick-<简述>

## 功能描述
<要加什么，如"给 Input 组件加 placeholder 属性，透传到原生 input">

## 改动范围
<来自 codegraph impact 的受影响符号/文件清单>

## 验收点
- [ ] <可验证的行为点1，如"placeholder 属性能透传到原生 input">
- [ ] <可验证的行为点2>
```

#### tasks.md（快速实现任务）

```markdown
# 快速实现任务 - quick-<简述>

- [ ] 1.1 先写测试覆盖 <新属性/功能>（RED）
- [ ] 1.2 实现 <改动>（GREEN）
- [ ] 1.3 验证 + 重构（REFACTOR）
```

（轻量规格是 apply 阶段内的准备动作，sdd-state.yaml 的 `phase: apply`、`checkpoint: entered` 保持不变，进入步骤 4 开始首个任务时才推进到 task 级 checkpoint）

### 步骤 4：TDD 实现（连续执行，异常才停）

复用 xt-sdd-apply 的轻量 TDD 模式与连续执行节奏：

1. **定位修改点**：用 `codegraph query <符号名>` / `codegraph explore <组件>` 精准定位（禁止 grep + read 整文件）
2. **连续执行 TDD 循环**（RED → GREEN → REFACTOR），仅在测试失败 / 编译失败 / 规范偏离时暂停
3. 每个任务完成后：编译检查 + 更新 tasks.md checkbox + 更新 sdd-state.yaml
4. **提交节奏**：本变更通常单分组，全部任务完成后一次性 commit（commit message：`feat(<简述>): <功能描述>`）

> 若任务数较多（不太常见于 quick 场景），按分组 commit，复用 [xt-sdd-apply 步骤5](.claude/skills/xt-sdd-apply/SKILL.md) 的分组提交规则。

### 步骤 5：聚焦验证

quick 的 verify 用**聚焦验证**，非全量回归，且范围由 codegraph 自动界定：

1. **文档同步检查**（前置）：检查主规范 `openspec/specs/` 是否有描述受影响组件行为的规格；若新属性改变了外部可观察行为 → 更新对应主规范 spec。多数小功能（如纯透传属性）无文档影响 → 跳过
2. **codegraph affected 精准回归**：运行 `codegraph affected <本次变更文件...>`，只跑受本次改动影响的测试（**不跑全量套件**）——这是 quick 的核心提效点，回归范围由图谱自动算出
3. **影响范围验证**：对照步骤1的 `codegraph impact` 清单，验证每个受影响符号的行为未被破坏
4. **编译检查**：运行 `compile_command`（如非 null）
5. **代码审查**：Superpowers 可用时调用，不可用则跳过（quick 场景通常可跳过深度审查）

### 步骤 6：简化归档（需用户确认）

在执行归档前，必须先向用户展示归档摘要并确认，避免自动归档后发现需要补充修改。

#### 6.1 归档前确认

向用户展示归档摘要，使用 AskUserQuestion 提供选项：

**展示内容**：
```markdown
## quick 变更归档摘要

变更名称：quick-<简述>
功能描述：<简要>
改动范围：<来自 codegraph impact>

验证结果：
- 聚焦测试（codegraph affected）：<通过数>/<总数>
- 影响范围验证：通过/未通过
- 编译检查：通过/未通过

文档同步：
- 影响级别：无/specs/design
- 更新的文档：<文件列表或无>
```

**用户选项**：
- **A. 确认归档**：执行完整归档流程（步骤 6.2）
- **B. 需要补充**：暂停归档，允许用户继续修改或补充
  - 提示："您可以继续修改代码、补充测试或调整文档。完成后重新运行 /xt-sdd:quick，将从断点恢复"
- **C. 取消变更**：放弃此次变更，清理变更目录

#### 6.2 执行归档（用户选择 A 后）

用户确认后，执行以下归档步骤：

1. 生成简化 archive.md：

```markdown
# 归档记录 - quick-<简述>

## 功能描述
<简要>

## 改动内容
<改了什么>

## 文档同步
- 影响级别：无/specs/design
- 更新的文档：<文件列表>

## 验证结果
- 聚焦测试（codegraph affected）：<通过数>/<总数>
- 影响范围验证：通过/未通过
- 用户确认：是
```

2. 同步 specs（`openspec sync --change`，如有主规范更新）
3. 归档变更目录（`openspec archive --change`）
4. 更新 sdd-state.yaml（phase: archive, checkpoint: done）
5. **Git 提交**：提示用户提交，commit message：`feat(<范围>): <功能描述> — quick 归档完成`

#### 6.3 用户选择 B 的处理

如果用户选择"需要补充"：

1. 保持当前变更目录不变
2. 更新 sdd-state.yaml：
   - 添加 `pending_fixes: true` 标记
   - 在 `context_summary.user_feedback` 记录"用户归档前确认需要补充"
3. 提示用户：
   ```
   ✓ 已暂停归档，您可以：
   - 继续修改代码
   - 补充测试用例
   - 调整文档内容
   
   完成后重新运行 /xt-sdd:quick，将从断点恢复并重新进入归档确认。
   ```

### 步骤 7：自动升级机制

在分诊或实现过程中，发现范围超预期：

1. **触发条件**（满足任一）：
   - `codegraph impact` 显示受影响符号 > ~5 个或跨模块
   - 实现中发现需要改架构 / 引入新行为（不仅是加属性）
   - 需要修改其他变更的代码

2. **升级处理**：暂停，向用户说明升级原因，使用 AskUserQuestion 提供选项：
   - **继续 quick**：接受额外复杂度，按当前方向继续
   - **升级到 plan**：回到 `/xt-sdd:plan` 产出完整方案
   - **升级到 propose**：回到 `/xt-sdd:propose` 重新探索（需求本身比想象的大）

## sdd-state.yaml 结构

复用 xt-sdd 精简模板（无 file_stats/line_stats），quick 初始 `phase: apply`：

```yaml
version: 1
change: <quick-简述>

phase: apply
checkpoint: entered

phase_checkpoints:
  propose: null
  plan: null
  apply: null
  verify: null
  archive: null

superpowers_available: <true 或 false>

tasks: []

review_counters:
  global_review_rounds: 0
  task_retries: {}

cascade:
  last_affected_phase: null
  invalidated_from: null
  reason: null
  preserved_tasks: []

git_baseline:
  start_sha: null
  start_time: null
  end_sha: null
  end_time: null
  dirty: false
```

## 断点恢复

quick 流程的断点恢复由 sdd-state.yaml 的 phase + checkpoint 驱动，与对应阶段的恢复逻辑一致（apply → verify → archive）。

### 归档前补充恢复

当 sdd-state.yaml 包含 `pending_fixes: true` 时，说明用户在归档前确认时选择了"需要补充"：

1. 读取 `context_summary.user_feedback` 中的用户反馈
2. 向用户展示："您之前选择了需要补充，是否已完成修改并准备重新归档？"
3. 使用 AskUserQuestion 提供选项：
   - **A. 已完成，重新归档**：直接进入步骤 6.1 重新归档确认
   - **B. 继续修改**：保持当前状态，退出
   - **C. 放弃变更**：清理变更目录，退出

### 断点恢复映射表

| phase | checkpoint | 恢复动作 |
|-------|-----------|---------|
| apply | `entered`/`task-N-complete` | 从对应任务继续执行 |
| verify | `null` | 进入步骤 5 聚焦验证 |
| verify | `doc-sync-done` | 从步骤 5.2 继续验证 |
| archive | `null` | 进入步骤 6.1 归档确认 |
| archive | `pending-fixes` | 进入归档前补充恢复逻辑 |
| archive | `done` | 变更已完成，提示新建变更 |

## 与完整流程的关系

`/xt-sdd:quick` 不是独立新流程，而是**完整流程的轻量入口**：

- 走同样的 sdd-state.yaml 状态管理
- 走同样的 apply 阶段 TDD（只是连续执行、轻量模式）
- 走同样的 archive 阶段（只是文档格式简化）
- 复杂度超预期时自动升级回完整流程

```
完整流程：propose → plan → apply → verify → archive
quick 流程：分诊 → 简化规格 → apply(TDD) → verify(聚焦) → archive(简化)
```

## 常见问题

- "分诊判断错误"：自动升级机制会在实现中发现范围超预期时暂停并询问用户
- "实际是大需求被当成 quick"：`codegraph impact` 会暴露真实范围，触发升级到 propose
- "无 codegraph 能用 quick 吗"：不建议——quick 的核心价值就是自动界定范围与回归；无 codegraph 时改用 fix（bug）或 propose（功能）
- "quick 和 fix 区别"：fix 修 bug（分诊根因/修法），quick 加小功能（分诊范围/明确度）；两者都是轻量入口，场景不重叠
