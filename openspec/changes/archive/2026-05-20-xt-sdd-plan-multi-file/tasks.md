## 1. plan-stage spec 修改

- [ ] 1.1 更新 xt-sdd-workflow-skills 的 plan-stage spec — 将"计划文件保存到变更目录内的 plan.md"改为"按 tasks.md 二级分组生成子计划文件到 plans/ 目录"
- [ ] 1.2 更新 xt-sdd-workflow-skills 的 plan-stage spec — 新增"生成 plan.md 索引文件"场景
- [ ] 1.3 更新 xt-sdd-workflow-skills 的 plan-stage spec — 修改 writing-plans 降级场景，降级时仍按分组拆分到 plans/ 目录

## 2. apply-stage spec 修改

- [ ] 2.1 更新 xt-sdd-workflow-skills 的 apply-stage spec — 新增"从 plans/ 目录读取子计划文件"场景
- [ ] 2.2 更新 xt-sdd-workflow-skills 的 apply-stage spec — 新增"按分组定位子计划文件"场景
- [ ] 2.3 更新 xt-sdd-workflow-skills 的 apply-stage spec — 新增"使用 plan.md 索引获取全局视图"场景
- [ ] 2.4 更新 xt-sdd-workflow-skills 的 apply-stage spec — 新增"兼容旧变更目录"场景

## 3. xt-sdd-plan SKILL.md 修改

- [ ] 3.1 修改步骤 4.5 的 writing-plans 调用逻辑 — 从单次调用改为按 tasks.md 分组多次调用，每次为对应分组生成子计划文件
- [ ] 3.2 新增"从 tasks.md 提取分组信息"逻辑 — 解析 tasks.md 的二级标题，生成分组列表（编号 + 分组名 + kebab-case 文件名）
- [ ] 3.3 修改 writing-plans 上下文准备 — 每次调用只传入对应分组的上下文（相关 specs + 相关 tasks + 全局 design）
- [ ] 3.4 修改计划保存路径 — 从 `openspec/changes/<变更名>/plan.md` 改为 `openspec/changes/<变更名>/plans/NN-<分组名>.md`
- [ ] 3.5 新增 plan.md 索引文件生成步骤 — 在所有子计划文件生成后，生成索引文件列出所有子计划
- [ ] 3.6 修改质量审查逻辑 — 从审查单一 plan.md 改为逐文件审查 plans/ 下的子计划文件
- [ ] 3.7 修改降级路径 — 降级时仍按分组拆分到 plans/ 目录，每个分组文件只包含 tasks.md 中的对应任务列表

## 4. xt-sdd-apply SKILL.md 修改

- [ ] 4.1 修改计划文件读取逻辑 — 从读取单一 plan.md 改为扫描 plans/ 目录、按编号排序读取子计划文件
- [ ] 4.2 新增按分组定位子计划文件 — 根据 tasks.md 分组编号和 kebab-case 名称定位对应的 plans/NN-<分组名>.md
- [ ] 4.3 新增 plan.md 索引读取 — 从索引文件获取全局执行顺序
- [ ] 4.4 新增兼容逻辑 — 检测 plans/ 目录是否存在，不存在则回退到读取单一 plan.md

## 5. CLAUDE.md 更新

- [ ] 5.1 更新目录结构描述 — 将 "plan.md — 实现计划（带 checkbox 微步骤）" 改为 "plan.md — 实现计划索引 + plans/ — 子计划文件目录"
- [ ] 5.2 在变更目录结构说明中新增 plans/ 子目录描述
