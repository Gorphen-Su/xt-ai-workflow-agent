<!-- sdd change: xt-sdd-plan-multi-file -->

# 2. apply-stage spec 修改

修改 xt-sdd-workflow-skills 变更中 apply-stage spec，更新读取计划文件的逻辑。

## 任务清单

- [x] 2.1 更新 xt-sdd-workflow-skills 的 apply-stage spec — 新增"从 plans/ 目录读取子计划文件"场景
- [x] 2.2 更新 xt-sdd-workflow-skills 的 apply-stage spec — 新增"按分组定位子计划文件"场景
- [x] 2.3 更新 xt-sdd-workflow-skills 的 apply-stage spec — 新增"使用 plan.md 索引获取全局视图"场景
- [x] 2.4 更新 xt-sdd-workflow-skills 的 apply-stage spec — 新增"兼容旧变更目录"场景

## 实现步骤

### 任务 2.1：新增从 plans/ 目录读取场景

**修改文件**：`openspec/changes/xt-sdd-workflow-skills/specs/apply-stage/spec.md`

1. 定位 apply-stage spec 中与计划文件读取相关的 requirement
2. 新增或修改 Scenario：
   ```
   #### Scenario: 遍历 plans 目录
   - **WHEN** apply 阶段开始执行任务
   - **THEN** 系统 MUST 扫描 `plans/` 目录下所有 `NN-*.md` 文件，按编号排序后依次读取
   ```

### 任务 2.2：新增按分组定位场景

**修改文件**：`openspec/changes/xt-sdd-workflow-skills/specs/apply-stage/spec.md`

1. 新增 Scenario：
   ```
   #### Scenario: 按分组定位子计划
   - **WHEN** 需要查找特定分组（如 "2. propose 阶段 skill"）的实现步骤
   - **THEN** 系统 MUST 定位到对应的 `plans/02-propose-stage.md` 文件并读取
   ```

### 任务 2.3：新增索引读取场景

**修改文件**：`openspec/changes/xt-sdd-workflow-skills/specs/apply-stage/spec.md`

1. 新增 Scenario：
   ```
   #### Scenario: 使用索引文件获取全局视图
   - **WHEN** apply 阶段需要了解整体执行顺序
   - **THEN** 系统 MUST 读取 `plan.md` 索引文件获取子计划列表和执行顺序
   ```

### 任务 2.4：新增兼容旧目录场景

**修改文件**：`openspec/changes/xt-sdd-workflow-skills/specs/apply-stage/spec.md`

1. 新增 Scenario：
   ```
   #### Scenario: 兼容旧变更目录
   - **WHEN** 变更目录中存在旧的单一 `plan.md`（无 plans/ 目录）
   - **THEN** 系统 MUST 仍能从单一 plan.md 读取执行步骤，不因缺少 plans/ 目录而报错
   ```
