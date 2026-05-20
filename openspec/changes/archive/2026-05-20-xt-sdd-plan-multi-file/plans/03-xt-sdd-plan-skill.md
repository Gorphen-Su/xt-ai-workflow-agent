<!-- sdd change: xt-sdd-plan-multi-file -->

# 3. xt-sdd-plan SKILL.md 修改

修改 xt-sdd-plan skill 的核心逻辑，实现按分组生成 plans/ 多文件结构。

## 任务清单

- [x] 3.1 修改步骤 4.5 的 writing-plans 调用逻辑 — 从单次调用改为按 tasks.md 分组多次调用，每次为对应分组生成子计划文件
- [x] 3.2 新增"从 tasks.md 提取分组信息"逻辑 — 解析 tasks.md 的二级标题，生成分组列表（编号 + 分组名 + kebab-case 文件名）
- [x] 3.3 修改 writing-plans 上下文准备 — 每次调用只传入对应分组的上下文（相关 specs + 相关 tasks + 全局 design）
- [x] 3.4 修改计划保存路径 — 从 `openspec/changes/<变更名>/plan.md` 改为 `openspec/changes/<变更名>/plans/NN-<分组名>.md`
- [x] 3.5 新增 plan.md 索引文件生成步骤 — 在所有子计划文件生成后，生成索引文件列出所有子计划
- [x] 3.6 修改质量审查逻辑 — 从审查单一 plan.md 改为逐文件审查 plans/ 下的子计划文件
- [x] 3.7 修改降级路径 — 降级时仍按分组拆分到 plans/ 目录，每个分组文件只包含 tasks.md 中的对应任务列表

## 实现步骤

### 任务 3.1：修改 writing-plans 调用逻辑

**修改文件**：`.claude/skills/xt-sdd-plan/SKILL.md`

1. 读取当前 SKILL.md 中步骤 4.5 的内容
2. 将"3. 调用 `superpowers:writing-plans`"部分的单次调用逻辑改为循环调用：
   - 在调用 writing-plans 之前，先解析 tasks.md 提取分组列表
   - 对每个分组，准备该分组的上下文，调用 writing-plans
   - 每次调用的输出路径为 `plans/NN-<分组名>.md`
3. 修改"4. 跳过执行移交"部分，确保每次调用后都跳过执行移交
4. 修改"5. 确认计划文件"部分，改为确认每个子计划文件存在且包含 checkbox

### 任务 3.2：新增分组信息提取逻辑

**修改文件**：`.claude/skills/xt-sdd-plan/SKILL.md`

1. 在步骤 4.5 之前（或步骤 4 Bridge 转换中），新增子步骤：
   - 读取 tasks.md
   - 提取所有 `## N. 分组名` 二级标题
   - 生成分组列表，每项包含：
     - `number`：分组编号（如 1, 2, 3）
     - `name`：原始分组名（如 "基础设施"）
     - `slug`：kebab-case 英文名（如 "infrastructure"）
     - `filename`：`NN-<slug>.md`（如 "01-infrastructure.md"）
     - `tasks`：该分组下的任务列表（从 `- [ ] X.Y` 提取）
2. 分组名到 slug 的转换规则：
   - 中文分组名：根据上下文翻译为英文再 kebab-case（如 "基础设施" → "infrastructure"、"propose 阶段 skill" → "propose-stage"）
   - 英文分组名：直接 kebab-case（如 "Setup Tasks" → "setup-tasks"）

### 任务 3.3：修改上下文准备

**修改文件**：`.claude/skills/xt-sdd-plan/SKILL.md`

1. 修改"1. 准备上下文"部分：
   - 全局上下文（每次都传入）：proposal.md、design.md、sdd-project-profile.yaml
   - 分组上下文（仅传入当前分组的）：对应的 specs 文件 + 该分组在 tasks.md 中的任务
   - 去掉原来"拼接所有 openspec artifacts"的做法
2. 修改 args 传入内容，增加分组标识：
   - `当前分组编号`：N
   - `当前分组名`：分组名
   - `当前分组任务列表`：该分组下的所有任务

### 任务 3.4：修改计划保存路径

**修改文件**：`.claude/skills/xt-sdd-plan/SKILL.md`

1. 将步骤 4.5 中所有 `openspec/changes/<变更名>/plan.md` 路径引用改为 `openspec/changes/<变更名>/plans/NN-<分组名>.md`
2. 确保在第一次调用前创建 `plans/` 目录
3. 修改"添加绑定注释"部分，确保每个子计划文件都添加 `<!-- sdd change: <变更名> -->`

### 任务 3.5：新增索引文件生成步骤

**修改文件**：`.claude/skills/xt-sdd-plan/SKILL.md`

1. 在步骤 4.5 的"5. 确认计划文件"之后，新增子步骤：
   - 遍历所有生成的子计划文件
   - 生成 `plan.md` 索引文件，内容包含：
     - 变更名标题
     - 执行顺序说明
     - 每个子计划的条目：编号 + 名称 + 链接 + 简要描述
2. 索引文件格式示例：
   ```markdown
   <!-- sdd change: <变更名> -->

   # 实现计划索引：<变更名>

   ## 执行顺序

   按编号顺序依次执行每个子计划。

   ## 子计划列表

   | # | 名称 | 文件 | 描述 |
   |---|------|------|------|
   | 1 | 基础设施 | [plans/01-infrastructure.md](plans/01-infrastructure.md) | 创建基础配置文件 |
   | 2 | propose 阶段 | [plans/02-propose-stage.md](plans/02-propose-stage.md) | 实现 propose 阶段 skill |
   ```

### 任务 3.6：修改质量审查逻辑

**修改文件**：`.claude/skills/xt-sdd-plan/SKILL.md`

1. 修改"6. 计划质量审查"部分：
   - 改为遍历 `plans/` 目录下所有子计划文件
   - 对每个文件执行原有的质量审查检查项
   - 如发现问题，直接在对应子计划文件中修复
2. 不再审查 plan.md 索引文件的质量（索引不包含实现步骤）

### 任务 3.7：修改降级路径

**修改文件**：`.claude/skills/xt-sdd-plan/SKILL.md`

1. 修改步骤 4.5 末尾的"降级路径"：
   - 从 "跳过此步骤，使用 Bridge 转换产出的 tasks.md 作为实现指导（无 checkbox 微步骤）"
   - 改为 "跳过 writing-plans 调用，但仍按分组拆分到 `plans/` 目录：每个分组文件只包含 tasks.md 中对应分组的任务列表（无 TDD 微步骤），并生成 plan.md 索引文件"
2. 降级时分组文件的格式：
   ```markdown
   <!-- sdd change: <变更名> -->

   # N. <分组名>

   - [ ] X.Y 任务描述
   - [ ] X.Z 任务描述
   ```
