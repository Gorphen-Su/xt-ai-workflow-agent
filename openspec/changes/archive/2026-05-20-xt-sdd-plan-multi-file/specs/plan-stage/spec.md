## MODIFIED Requirements

### Requirement: 调用 writing-plans 生成实现计划
系统 SHALL 在 Superpowers 可用时调用 `superpowers:writing-plans` 生成实现计划，传入 openspec artifacts + project_profile + API 验证上下文 + 编译约束 + checkbox 唯一性约束，输出到 `plans/` 目录下的多个子计划文件中。

#### Scenario: 按分组调用 writing-plans
- **WHEN** Bridge 转换完成且 Superpowers 可用
- **THEN** 系统 MUST 按 tasks.md 的二级分组，为每个分组分别准备上下文并调用 `superpowers:writing-plans`，每个分组生成一个子计划文件到 `plans/NN-<分组名>.md`

#### Scenario: writing-plans 降级
- **WHEN** Superpowers 不可用
- **THEN** 跳过 writing-plans，使用 Bridge 转换产出的 tasks.md 作为实现指导（无 checkbox 微步骤），仍按分组拆分到 plans/ 目录

#### Scenario: 计划质量审查
- **WHEN** 所有子计划文件生成完成后
- **THEN** 系统 MUST 逐文件检查编译约束遵守、import 正确性、无效代码、类型一致性，发现问题直接在对应子计划文件中修复

#### Scenario: 生成索引文件
- **WHEN** 所有子计划文件已生成且质量审查完成
- **THEN** 系统 MUST 生成 `plan.md` 索引文件，列出所有子计划的描述、链接和执行顺序
