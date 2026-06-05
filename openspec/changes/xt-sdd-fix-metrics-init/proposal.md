## Why

当前 xt-sdd 的 metrics tracking 功能仅在 propose 阶段初始化（ccusage 检测、Git start_sha 记录、Token 快照）。当用户通过 `/xt-sdd:fix` 入口进入时，fix 流程的分诊路由可能跳过 propose 阶段直接进入 apply，导致 sdd-state.yaml 中的 metrics 段缺少关键初始化数据，后续的 Token 快照全部走 unavailable 降级，Git Diff 统计因无 start_sha 而无法执行。

## What Changes

- **在 xt-sdd-fix SKILL.md 步骤 2 中增加 metrics 初始化逻辑**：当 fix 流程创建变更目录并初始化 sdd-state.yaml 时，同步执行 ccusage 可用性检测、记录 Git start_sha、记录 fix-init Token 快照
- **修改 xt-sdd-fix SKILL.md 步骤 2 的 sdd-state.yaml 初始化说明**：从"与 propose 阶段相同结构"改为包含完整的 metrics 初始化操作指令

## Capabilities

### New Capabilities

- `fix-metrics-init`: fix 流程的 metrics 初始化能力——在 fix 步骤 2 创建变更目录时，自动执行 ccusage 检测、Git start_sha 记录和 fix-init Token 快照，确保跳过 propose 的 fix 流程也能完整收集 metrics 数据

### Modified Capabilities

（无已有 spec 需要修改，本次变更是对 xt-sdd-fix SKILL.md 的补充，不改变已有行为规格）

## Impact

- **xt-sdd-fix SKILL.md**：步骤 2 需增加约 30-40 行 metrics 初始化指令
- **sdd-state.yaml 结构**：无变化，使用已有 metrics 段结构
- **依赖工具**：ccusage（已有自动安装逻辑，复用 propose 的检测+安装模式）
