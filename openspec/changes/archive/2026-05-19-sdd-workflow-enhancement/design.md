## Context

SDD（规格驱动开发）工作流是本项目的核心开发流程，统一封装 OpenSpec（规格管理）和 Superpowers（TDD 代码执行），通过 5 个阶段（explore → plan → implement → verify → archive）强制执行"先探索、再锁规范、最后严谨执行"的纪律。

当前 SDD 存在三个核心缺陷：

1. **无项目感知**：各阶段不了解项目技术栈，sdd-verify 临时推导测试命令、sdd-implement 无编译检查、plan 阶段缺少编译约束上下文
2. **状态管理粗粒度**：task-status.md 使用 Markdown 表格，无 checkpoint 机制，断点恢复只能到任务级别（不能到任务内 RED/GREEN/REFACTOR 步骤），无级联回退控制
3. **无循环限制**：任务确认和规范偏离处理理论上可无限循环

本次增强参考 HyperSpec 的设计，采纳其项目分析器、结构化状态管理、审查循环限制三项机制，适配 SDD 的五阶段架构。

### 现有产物结构

```
openspec/
  openspec.yaml                    ← OpenSpec CLI 配置（不修改）
  changes/<name>/
    .openspec.yaml                 ← OpenSpec 变更元数据
    proposal.md / design.md / specs/ / tasks.md
    task-status.md                 ← 待移除
```

## Goals / Non-Goals

**Goals:**

- 为 SDD 工作流增加项目技术栈自动感知能力，让后续阶段自适应
- 用结构化 YAML 状态文件替代 Markdown 表格，实现 checkpoint 精确断点恢复
- 实现级联回退控制，当规范变更时系统性地标记失效的后续产物和任务
- 为审查和修复循环设置上限，防止无限循环
- 全局信息独立存放，不污染 OpenSpec 配置文件

**Non-Goals:**

- 不引入子代理并行执行模式（与 SDD 串行推进原则冲突）
- 不改变 SDD 的五阶段划分（不合并为三阶段）
- 不修改 openspec.yaml（OpenSpec CLI 拥有的文件 SDD 不碰）
- 不支持多变更并行状态管理（SDD 每个需求独立运行）
- 不引入自主模式（保持每阶段强制用户确认）
- 不增加 Commit 纪律机制（本次增强范围不含自动 commit）

## Decisions

### 决策 1：全局项目信息独立文件存放

**选择**：创建 `openspec/sdd-project-profile.yaml`，不修改 `openspec.yaml`

**理由**：openspec.yaml 是 OpenSpec CLI 拥有的配置文件，SDD 不应向其添加未知字段。未来 CLI 升级可能校验更严格，未知字段可能报 warning 甚至 error。独立文件职责清晰——OpenSpec 管规格，SDD 管工作流状态。

**备选方案**：
- 扩展 openspec.yaml 的 project 字段：风险高，CLI 可能不兼容
- 每个变更目录各存一份 profile：冗余，且全局信息不应重复

### 决策 2：状态文件跟变更走

**选择**：`openspec/changes/<name>/sdd-state.yaml`，每变更一个

**理由**：SDD 每个需求独立运行，状态自然跟变更走。归档时整个目录 mv，状态文件自然随迁保留作为历史记录。与 `.openspec.yaml` 同目录但职责不同——后者是 OpenSpec 元数据，前者是 SDD 运行时状态。

**备选方案**：
- 全局单文件 `openspec/sdd-state.yaml`：不符合"每个需求独立"的设计，归档时需额外清理
- 项目根目录 `.sdd-state.yaml`：HyperSpec 的做法，但 SDD 所有配置都在 openspec/ 下，保持一致性

### 决策 3：完全替代 task-status.md

**选择**：删除 task-status.md，功能完全并入 sdd-state.yaml

**理由**：避免双写导致的不一致。YAML 格式更适合机器解析和精确状态管理（checkpoint、级联标记、计数器）。用户如需查看可读的进度摘要，可从 YAML 生成。

**备选方案**：
- 双写（YAML + MD 共存）：增加复杂度，两个文件可能不一致
- YAML 为主、MD 按需生成视图：增加生成逻辑，且实际使用中 MD 视图价值有限

### 决策 4：Checkpoint 体系设计

**选择**：阶段级 + 任务级两级检查点

**阶段级检查点**：
- explore: entered → git-checked → requirements-confirmed → proposal-created → done
- plan: entered → design-generated → specs-generated → tasks-generated → bridge-converted → quality-reviewed → done
- implement: entered → task-N-complete → ... → all-tasks-complete → done
- verify: entered → code-quality-done → compliance-done → done
- archive: entered → consistency-verified → specs-synced → archived → done

**任务级检查点**：
- red → green → refactor → complete

**理由**：5 个阶段已比 HyperSpec 的 3 阶段更细分，阶段内检查点提供精确断点恢复。任务级检查点实现 RED/GREEN/REFACTOR 步骤级恢复，避免中断后重复已完成步骤。

### 决策 5：级联回退策略

**选择**：用户选择，默认全量重置

**处理流程**：
1. 暂停当前阶段
2. 展示规范变更差异 + 受影响任务列表
3. AskUserQuestion：全量重置（默认）/ 选择性保留
4. 全量重置：后续阶段 checkpoint 清零，所有任务 → pending
5. 选择性保留：用户勾选保留的任务，其余 → pending
6. 回退到目标阶段重新执行

**级联规则**：
- explore 被修改 → plan + implement + verify 全部失效
- plan 被修改 → implement + verify 失效（已完成且不受影响的任务可选择性保留）
- implement 被修改 → verify 失效
- verify 被修改 → 无级联，仅 verify 内部重做

**理由**：全量重置安全优先——避免"看似不受影响但实际有隐式依赖"的任务遗漏。让用户选择是给予灵活性，默认全量重置是兜底安全。

### 决策 6：审查循环限制为 5 次

**选择**：全局审查 5 轮上限，单任务修改 5 次上限

**理由**：3 次偏少——复杂任务可能需要多次迭代才能达到质量标准。5 次是合理的平衡点，既防止无限循环，又给复杂场景足够的迭代空间。超限后提示用户回退到 sdd:plan 重新审视设计。

### 决策 7：归档时保留状态文件

**选择**：sdd-state.yaml 随变更目录归档，保留作为历史记录

**理由**：状态文件记录了完整的执行过程（每个任务的检查点、审查次数、级联历史），是变更的可追溯记录。归档后作为历史参考，不做清理。

## Risks / Trade-offs

- **[风险] YAML 格式不如 Markdown 可读** → 用户如需查看进度，skill 可从 YAML 生成可读摘要。实际使用中用户主要通过 skill 交互查看状态，很少直接打开文件
- **[风险] 向后兼容** → 已存在变更目录中的 task-status.md 需要 sdd-implement 等阶段能识别并提示迁移，或在状态检测时优先检查 sdd-state.yaml
- **[风险] 项目分析器检测结果不准确** → compile_command 做运行时验证，环境问题立即阻塞，代码问题标记后留到 implement 处理
- **[权衡] 级联全量重置可能重复已完成工作** → 默认全量重置确保安全，用户可选择保留特定任务作为灵活性出口
- **[权衡] Checkpoint 粒度增加状态文件复杂度** → 但换来精确断点恢复，对跨会话开发的价值远大于复杂度成本
