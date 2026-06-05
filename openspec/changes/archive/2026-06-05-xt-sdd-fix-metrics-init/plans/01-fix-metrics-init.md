<!-- sdd change: xt-sdd-fix-metrics-init -->

# 1. fix 步骤 2 增加 metrics 初始化

本分组修改 xt-sdd-fix/SKILL.md 的步骤 2，补充 ccusage 检测、Git 基线记录和 fix-init Token 快照。

## 前置条件

- 读取当前 xt-sdd-fix/SKILL.md（路径：`.claude/skills/xt-sdd-fix/SKILL.md`）
- 读取 xt-sdd-propose/SKILL.md 作为参考（步骤 0 第 4 条的 ccusage 检测逻辑、步骤 5 的 Metrics 初始化操作）
- 读取 specs/fix-metrics-init/spec.md 了解 8 个行为场景

## 实现步骤

- [x] Step 1.1: 读取 xt-sdd-fix/SKILL.md 步骤 2 的当前内容，定位"初始化 sdd-state.yaml（与 propose 阶段相同结构，phase 设为路由目标阶段）"这段文字
- [x] Step 1.2: 在步骤 2 的"初始化 sdd-state.yaml"之前，增加 ccusage 可用性检测指令，内容与 propose 步骤 0 第 4 条一致：执行 `npx ccusage --version` 检测，不可用则自动安装，安装失败则降级，将结果写入 sdd-state.yaml 的 `metrics.token_usage.ccusage_available`、`auto_installed`、`install_error`
- [x] Step 1.3: 将"与 propose 阶段相同结构"替换为包含完整 metrics 段的 sdd-state.yaml 模板（参考 propose 步骤 5 的模板，但 phase 设为路由目标阶段而非 propose）
- [x] Step 1.4: 在 sdd-state.yaml 模板之后增加"Metrics 初始化操作"指令块：1) `git rev-parse HEAD` 记录 start_sha；2) `git status --porcelain` 记录 dirty 标记；3) `metrics.git_baseline.start_time` 记录当前时间
- [x] Step 1.5: 在 Metrics 初始化操作之后增加 fix-init Token 快照记录指令，包含三种情况：ccusage_available=true 时执行 ccusage session、false 时追加 unavailable、执行失败时追加 error，phase 固定为 `fix-init`
- [x] Step 1.6: 确认修改后的步骤 2 内容完整、与 propose 的初始化逻辑一致

## 验证

- [x] Step 1.7: 检查 ccusage 检测逻辑的三个分支（已安装/安装成功/安装失败）覆盖完整
- [x] Step 1.8: 检查 fix-init Token 快照的三种情况（可用/不可用/执行失败）覆盖完整
- [x] Step 1.9: 检查 sdd-state.yaml 模板包含完整的 metrics 段结构
