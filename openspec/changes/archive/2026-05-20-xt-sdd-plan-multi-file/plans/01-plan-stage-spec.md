<!-- sdd change: xt-sdd-plan-multi-file -->

# 1. plan-stage spec 修改

修改 xt-sdd-workflow-skills 变更中 plan-stage spec，将计划输出路径从单一 plan.md 改为 plans/ 多文件目录 + plan.md 索引。

## 任务清单

- [x] 1.1 更新 xt-sdd-workflow-skills 的 plan-stage spec — 将"计划文件保存到变更目录内的 plan.md"改为"按 tasks.md 二级分组生成子计划文件到 plans/ 目录"
- [x] 1.2 更新 xt-sdd-workflow-skills 的 plan-stage spec — 新增"生成 plan.md 索引文件"场景
- [x] 1.3 更新 xt-sdd-workflow-skills 的 plan-stage spec — 修改 writing-plans 降级场景，降级时仍按分组拆分到 plans/ 目录

## 实现步骤

### 任务 1.1：更新计划输出路径描述

**修改文件**：`openspec/changes/xt-sdd-workflow-skills/specs/plan-stage/spec.md`

1. 读取当前 plan-stage spec 内容
2. 定位 "调用 writing-plans 生成实现计划" requirement 下的 Scenario
3. 将 "计划文件保存到变更目录内的 `plan.md`" 改为 "按 tasks.md 二级分组生成子计划文件到 `plans/NN-<分组名>.md`"
4. 修改 "正常调用 writing-plans" Scenario 的 THEN 部分：从 "调用 `superpowers:writing-plans`，计划文件保存到变更目录内的 `plan.md`" 改为 "按 tasks.md 二级分组，为每个分组分别调用 `superpowers:writing-plans`，每个分组生成一个子计划文件到 `plans/NN-<分组名>.md`"

### 任务 1.2：新增索引文件场景

**修改文件**：`openspec/changes/xt-sdd-workflow-skills/specs/plan-stage/spec.md`

1. 在 "调用 writing-plans 生成实现计划" requirement 下新增 Scenario
2. 添加：
   ```
   #### Scenario: 生成索引文件
   - **WHEN** 所有子计划文件已生成且质量审查完成
   - **THEN** 系统 MUST 生成 `plan.md` 索引文件，列出所有子计划的描述、链接和执行顺序
   ```

### 任务 1.3：修改降级场景

**修改文件**：`openspec/changes/xt-sdd-workflow-skills/specs/plan-stage/spec.md`

1. 定位 "writing-plans 降级" Scenario
2. 将 THEN 部分从 "跳过 writing-plans，使用 Bridge 转换产出的 tasks.md 作为实现指导（无 checkbox 微步骤）" 改为 "跳过 writing-plans，使用 Bridge 转换产出的 tasks.md 作为实现指导（无 checkbox 微步骤），仍按分组拆分到 `plans/` 目录"
