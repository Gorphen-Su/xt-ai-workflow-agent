## Context

xt-sdd 是一套规格驱动开发工作流，包含 propose → plan → apply → verify → archive 五个阶段以及 fix 修复流程。每个阶段通过独立的 SKILL.md 文件定义执行步骤，通过 `sdd-state.yaml` 跟踪状态。

前一个变更 `xt-sdd-metrics-tracking` 在 propose 阶段实现了完整的 metrics 初始化（ccusage 检测、Git start_sha 记录、Token 快照）。但 fix 流程通过分诊路由可能跳过 propose 阶段，直接进入 apply/plan/propose，导致 metrics 数据缺失。

**技术栈约束**：
- 项目以 markdown（SKILL.md）和 yaml（sdd-state.yaml）为主
- 所有 skill 文件位于 `.claude/skills/xt-sdd-fix/SKILL.md`
- fix 流程的步骤 2 负责创建变更目录和初始化 sdd-state.yaml

## Goals / Non-Goals

**Goals:**
- 在 fix 流程的步骤 2 中补充 metrics 初始化逻辑
- 确保 fix 流程初始化后，sdd-state.yaml 的 metrics 段与 propose 流程初始化后的状态一致
- 复用 propose 阶段的 ccusage 检测逻辑（检测 + 自动安装 + 降级处理）
- 记录 fix-init Token 快照作为 fix 流程的起始数据点

**Non-Goals:**
- 不修改 propose 阶段的 metrics 初始化逻辑
- 不修改 archive 阶段的 metrics 汇总逻辑
- 不改变 fix 流程的分诊路由逻辑
- 不改变 sdd-state.yaml 的 metrics 段结构

## Decisions

### 决策 1：在 fix 步骤 2 中内联 metrics 初始化（而非提取共享模块）

**选择**：直接在 xt-sdd-fix SKILL.md 的步骤 2 中写入完整的 metrics 初始化指令，与 propose 步骤 0 第 4 条和步骤 5 的逻辑保持一致。

**替代方案**：
- A) 提取 metrics 初始化为共享 skill → 过度工程化，当前只有 propose 和 fix 两个入口
- B) 在 fix 步骤 2 中引用 propose 的逻辑 → SKILL.md 是自包含的指令文档，不应依赖外部引用

**理由**：直接内联确保 fix SKILL.md 的自包含性和可执行性。两份逻辑保持一致即可，提取共享模块的收益不足以抵消引入额外抽象的复杂度。

### 决策 2：fix-init 快照作为初始 Token 数据点

**选择**：在 fix 步骤 2 初始化完成后，记录一个 `phase: fix-init` 的 Token 快照。

**替代方案**：
- A) 不记录初始快照，只在 fix 步骤 1（分诊）记录第一个快照 → 步骤 1 的快照记录依赖步骤 2 创建的 sdd-state.yaml，时序矛盾
- B) 使用 `phase: fix` 作为初始快照名 → 与 fix 步骤 1 已有的 `phase: fix` 快照冲突

**理由**：`fix-init` 明确标识这是 fix 流程的初始化快照，与步骤 1 的分诊阶段快照区分开，避免混淆。

## Risks / Trade-offs

- **[双份维护成本]** → 两处 metrics 初始化逻辑（propose + fix）需要同步维护。缓解：逻辑稳定后变更频率低；如果未来有第三个入口，再考虑提取共享模块
- **[fix 路由到 propose/plan 时的重复检测]** → 如果 fix 分诊后路由到 propose 或 plan，propose 阶段会再次检测 ccusage。但 ccusage 检测是幂等的（已安装则跳过），不会产生副作用
