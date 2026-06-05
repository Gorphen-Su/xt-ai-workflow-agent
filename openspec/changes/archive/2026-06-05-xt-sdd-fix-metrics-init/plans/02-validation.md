<!-- sdd change: xt-sdd-fix-metrics-init -->

# 2. 验证

验证 fix 步骤 2 的 metrics 初始化逻辑完整性和正确性。

## 前置条件

- 步骤 1 的所有修改已完成
- 读取修改后的 xt-sdd-fix/SKILL.md

## 验证步骤

- [x] Step 2.1: 对比 fix 步骤 2 的 ccusage 检测逻辑与 propose 步骤 0 第 4 条，确认一致性（检测命令、安装命令、降级处理、字段写入）
- [x] Step 2.2: 对比 fix 步骤 2 的 sdd-state.yaml 模板与 propose 步骤 5 的模板，确认 metrics 段结构一致（git_baseline、file_stats、line_stats、token_usage 含所有子字段）
- [x] Step 2.3: 检查 fix-init Token 快照的三种降级情况（可用/不可用/执行失败）与 spec 中的 3 个 Scenario 一一对应
- [x] Step 2.4: 检查 fix 步骤 2 的 Metrics 初始化操作不会阻塞 fix 流程的主逻辑
