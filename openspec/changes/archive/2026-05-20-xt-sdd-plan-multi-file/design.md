## Context

xt-sdd plan 阶段当前将所有实现计划输出到变更目录下的单一 `plan.md` 文件。这个设计在任务量少时可以工作，但当变更涉及多个模块或功能时，单一文件存在以下问题：

1. **可维护性差**：数百行的计划文件难以定位和修改特定模块的计划
2. **查阅困难**：开发者需要滚动大量无关内容才能找到自己负责的模块
3. **与 tasks.md 结构脱节**：tasks.md 已按二级分组组织，但计划文件是扁平的

当前 writing-plans 调用逻辑将所有上下文一次性传入，生成单一 plan.md。apply 阶段则从单一 plan.md 读取执行步骤。

## Goals / Non-Goals

**Goals:**

- 将计划输出从单一 `plan.md` 改为 `plans/` 目录下的多文件结构
- 每个子计划文件与 tasks.md 的二级分组一一对应
- `plan.md` 保留为索引文件，提供全局视图
- 始终使用 `plans/` 目录，保持结构一致性
- apply 阶段能够按分组读取对应的子计划文件

**Non-Goals:**

- 不改变 writing-plans skill 本身的逻辑（仅改变调用方式和输出路径）
- 不改变 plan 阶段的整体流程（design → specs → tasks → bridge → plan 顺序不变）
- 不引入子计划间的依赖关系管理（按顺序执行即可）
- 不改变 tasks.md 的组织方式

## Decisions

### 决策 1：按 tasks.md 二级分组拆分 plans/

**选择**：以 tasks.md 的 `## N. 分组名` 作为拆分依据

**替代方案**：
- 按 specs/ capability 拆分 → 拒绝，因为 capability 与实现分组可能不对齐
- 由 writing-plans 自行决定拆分 → 拒绝，因为会导致命名和结构不可预测

**理由**：tasks.md 的二级分组是 Bridge 转换的产物，已经按功能模块组织好，且与 spec capability 有清晰的映射关系。使用它作为拆分依据既保持了与现有产物的一致性，又让开发者能快速定位。

### 决策 2：文件命名采用 `NN-<分组名>.md` 格式

**选择**：`plans/01-infrastructure.md`、`plans/02-propose-stage.md` 格式

**替代方案**：
- 纯分组名（无编号）→ 拒绝，因为文件系统排序可能与 tasks.md 顺序不一致
- 使用 tasks.md 编号（如 `plans/2.1.md`）→ 拒绝，因为编号对应的是三级任务而非二级分组

**理由**：编号保证文件排序与 tasks.md 中的分组顺序一致，kebab-case 分组名提供可读性。

### 决策 3：plan.md 作为索引文件

**选择**：保留 plan.md，但内容改为索引/目录

**替代方案**：
- 完全取消 plan.md → 拒绝，因为丢失了全局视图
- plan.md 仍包含完整内容 + plans/ 作为拆分 → 拒绝，因为这导致信息重复

**理由**：索引文件提供快速概览，包含每个子计划的简要描述、链接和执行顺序。具体实现步骤只存在于 plans/ 子文件中，避免信息重复。

### 决策 4：writing-plans 按分组多次调用

**选择**：按 tasks.md 分组，为每个分组单独调用一次 writing-plans（或等效逻辑）

**替代方案**：
- 一次性传入所有上下文，由 writing-plans 自行拆分 → 拒绝，因为 writing-plans 不支持多文件输出
- 只调用一次 writing-plans，之后手动拆分 → 可作为降级方案

**理由**：按分组调用可以控制每次的上下文范围，减少无关信息干扰，生成的计划更聚焦。

## Risks / Trade-offs

- **Risk**: writing-plans 不支持指定输出路径 → **Mitigation**: 在调用后手动将输出写入对应子文件，或降级为单次调用后手动拆分
- **Risk**: 分组间存在跨组依赖 → **Mitigation**: 在 plan.md 索引中标注执行顺序，子计划中引用前置分组的文件路径
- **Risk**: tasks.md 分组粒度过粗导致子计划文件仍然很大 → **Mitigation**: 在 plan 阶段的 Bridge 转换中合理控制分组粒度
