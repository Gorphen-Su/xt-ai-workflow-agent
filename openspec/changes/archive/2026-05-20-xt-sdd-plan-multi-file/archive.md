# 归档记录 - xt-sdd-plan-multi-file

## 需求概要

xt-sdd plan 阶段当前将所有实现计划输出到单一 `plan.md` 文件中。当任务涉及多个模块或功能时，单一文件体积过大、难以维护和查阅，且与 tasks.md 的分组结构脱节。需要将计划输出改为多文件结构，提升可读性和可维护性。

**核心变更**：
- **BREAKING** 将 plan 阶段的实现计划输出从单一 `plan.md` 改为 `plans/` 目录下的多文件结构
- 新增 `plans/` 目录，每个文件对应 tasks.md 中的一个二级分组
- 文件命名采用 `plans/NN-<分组名>.md` 格式
- `plan.md` 角色变更为索引文件
- 始终使用 `plans/` 目录结构，无论任务多少

## 技术方案

### 决策 1：按 tasks.md 二级分组拆分 plans/
以 tasks.md 的 `## N. 分组名` 作为拆分依据。tasks.md 的二级分组是 Bridge 转换的产物，已按功能模块组织好，且与 spec capability 有清晰的映射关系。

### 决策 2：文件命名采用 `NN-<分组名>.md` 格式
编号保证文件排序与 tasks.md 中的分组顺序一致，kebab-case 分组名提供可读性。

### 决策 3：plan.md 作为索引文件
保留 plan.md 作为索引/目录，包含每个子计划的简要描述、链接和执行顺序。具体实现步骤只存在于 plans/ 子文件中，避免信息重复。

### 决策 4：writing-plans 按分组多次调用
按 tasks.md 分组，为每个分组单独调用一次 writing-plans（或等效逻辑），控制每次的上下文范围，减少无关信息干扰。

## 实现详情

5 组 20 个任务全部完成，采用轻量模式（内联执行）：

1. **分组 1（plan-stage spec 修改）**：3 个任务 — 更新 plan-stage spec 中的计划输出路径、新增索引文件场景、修改降级场景
2. **分组 2（apply-stage spec 修改）**：4 个任务 — 新增 plans/ 目录读取、分组定位、索引读取、兼容旧目录等场景
3. **分组 3（xt-sdd-plan SKILL.md 修改）**：7 个任务 — 核心修改：步骤 4.5 从单次 writing-plans 调用改为按分组多文件输出，新增分组提取、索引生成、逐文件审查、降级路径
4. **分组 4（xt-sdd-apply SKILL.md 修改）**：4 个任务 — 计划读取逻辑改为扫描 plans/ 目录，新增兼容旧目录回退
5. **分组 5（CLAUDE.md 更新）**：2 个任务 — 更新目录结构描述和产出列

## 规格变更

### ADDED（新增）
- `plan-multi-file-output`：plan 阶段多文件计划输出 — 包含 5 个 Requirement、10 个 Scenario

### MODIFIED（修改）
- `plan-stage`：调用 writing-plans 场景从单文件改为按分组多文件，新增索引文件场景，降级场景更新
- `apply-stage`：新增读取计划文件 Requirement，包含遍历 plans/、按分组定位、索引读取、兼容旧目录 4 个 Scenario

## 测试覆盖

本项目为纯文档项目（markdown/yaml），无测试套件。验证方式为规范合规检查：
- 场景覆盖：23/23 (100%)
- 架构决策遵循：4/4 (100%)

## 文档同步记录

- 检测到 1 个 WARNING：CLAUDE.md 六命令五阶段表格中 plan 阶段产出列缺少 `plans/` 目录
- 已修复：产出列更新为 `design.md、specs/、tasks.md、plans/、plan.md`

## 级联回退记录

无级联回退事件。

## 任务执行统计
- 总任务数：20
- 已完成：20
- 已失败：0
- 审查轮次：0（无审查循环）
- 执行时间范围：2026-05-20T10:15:00+08:00 - 2026-05-20T10:35:00+08:00
