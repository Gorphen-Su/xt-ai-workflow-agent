## 1. fix 步骤 2 增加 metrics 初始化

- [x] 1.1 在 xt-sdd-fix SKILL.md 的步骤 2 中，"初始化 sdd-state.yaml" 之前增加 ccusage 可用性检测指令（检测 + 自动安装 + 降级处理，与 propose 步骤 0 第 4 条逻辑一致）
- [x] 1.2 在 xt-sdd-fix SKILL.md 的步骤 2 中，修改 sdd-state.yaml 初始化模板为包含完整 metrics 段的模板（与 propose 步骤 5 模板一致）
- [x] 1.3 在 xt-sdd-fix SKILL.md 的步骤 2 中，增加 Metrics 初始化操作指令（git rev-parse HEAD 记录 start_sha、dirty 标记、fix-init Token 快照记录，含三种降级处理）

## 2. 验证

- [x] 2.1 验证 fix 步骤 2 的 ccusage 检测逻辑与 propose 步骤 0 第 4 条一致
- [x] 2.2 验证 fix 步骤 2 的 sdd-state.yaml 模板包含完整 metrics 段
- [x] 2.3 验证 fix-init Token 快照的三种情况（可用/不可用/执行失败）覆盖完整
