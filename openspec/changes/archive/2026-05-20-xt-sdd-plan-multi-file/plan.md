<!-- sdd change: xt-sdd-plan-multi-file -->

# 实现计划索引：xt-sdd-plan-multi-file

## 变更概述

将 xt-sdd plan 阶段的实现计划输出从单一 `plan.md` 改为 `plans/` 目录下的多文件结构，每个文件对应 tasks.md 中的一个二级分组。

## 执行顺序

按编号顺序依次执行每个子计划。每个子计划完成后更新 sdd-state.yaml 中对应任务的状态。

## 子计划列表

| # | 名称 | 文件 | 描述 |
|---|------|------|------|
| 1 | plan-stage spec 修改 | [plans/01-plan-stage-spec.md](plans/01-plan-stage-spec.md) | 更新 plan-stage spec 中的计划输出路径、索引文件和降级场景描述 |
| 2 | apply-stage spec 修改 | [plans/02-apply-stage-spec.md](plans/02-apply-stage-spec.md) | 更新 apply-stage spec 中读取计划文件的逻辑和兼容性 |
| 3 | xt-sdd-plan SKILL.md 修改 | [plans/03-xt-sdd-plan-skill.md](plans/03-xt-sdd-plan-skill.md) | 核心修改：分组调用 writing-plans、分组提取、上下文拆分、多文件输出、索引生成、质量审查、降级路径 |
| 4 | xt-sdd-apply SKILL.md 修改 | [plans/04-xt-sdd-apply-skill.md](plans/04-xt-sdd-apply-skill.md) | 修改计划读取逻辑：多文件遍历、分组定位、索引读取、旧目录兼容 |
| 5 | CLAUDE.md 更新 | [plans/05-claudemd-update.md](plans/05-claudemd-update.md) | 更新目录结构描述，新增 plans/ 子目录说明 |
