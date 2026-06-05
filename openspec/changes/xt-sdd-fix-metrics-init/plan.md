<!-- sdd change: xt-sdd-fix-metrics-init -->

# xt-sdd-fix-metrics-init 实现计划

## 执行顺序

按编号顺序执行。分组 1 是核心实现（修改 xt-sdd-fix/SKILL.md 步骤 2），分组 2 是验证。

## 子计划列表

| 编号 | 名称 | 文件 | 描述 | Task 数 | Step 数 |
|------|------|------|------|---------|---------|
| 1 | fix 步骤 2 增加 metrics 初始化 | [01-fix-metrics-init.md](plans/01-fix-metrics-init.md) | ccusage 检测 + metrics 模板 + Git 基线 + fix-init 快照 | 3 | 9 |
| 2 | 验证 | [02-validation.md](plans/02-validation.md) | 对比一致性、Scenario 覆盖、不阻塞验证 | 3 | 4 |

**总计**：6 个 Task，13 个 Step
