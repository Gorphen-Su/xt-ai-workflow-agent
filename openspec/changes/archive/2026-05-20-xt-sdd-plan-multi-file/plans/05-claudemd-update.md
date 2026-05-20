<!-- sdd change: xt-sdd-plan-multi-file -->

# 5. CLAUDE.md 更新

更新项目 CLAUDE.md 中的目录结构描述，反映 plans/ 多文件结构。

## 任务清单

- [x] 5.1 更新目录结构描述 — 将 "plan.md — 实现计划（带 checkbox 微步骤）" 改为 "plan.md — 实现计划索引 + plans/ — 子计划文件目录"
- [x] 5.2 在变更目录结构说明中新增 plans/ 子目录描述

## 实现步骤

### 任务 5.1：更新目录结构描述

**修改文件**：`CLAUDE.md`

1. 读取当前 CLAUDE.md 中的目录结构部分
2. 定位 `plan.md — 实现计划（带 checkbox 微步骤）` 行
3. 改为两行：
   - `plan.md — 实现计划索引（列出子计划列表和执行顺序）`
   - `plans/ — 子计划文件目录（每个文件对应 tasks.md 中的一个分组）`

### 任务 5.2：新增 plans/ 子目录描述

**修改文件**：`CLAUDE.md`

1. 在变更目录结构说明中，`plan.md` 行之后新增：
   - `plans/ — 子计划文件目录`
   - `plans/NN-<分组名>.md — 对应 tasks.md 二级分组的实现计划（带 checkbox 微步骤）`
2. 确保目录结构的缩进和格式与现有条目一致
