## 1. 基础设施

- [x] 1.1 创建 sdd-state.yaml 状态文件规范 — 定义 5 阶段状态结构、phase_checkpoints、tasks 列表、review_counters、cascade 字段
- [x] 1.2 创建 openspec/sdd-project-profile.yaml 规范 — 定义项目级 profile 结构（languages/frameworks/build_tool/compile_command/test_command/structure/has_ci/compile_constraints）
- [x] 1.3 实现 xt-sdd-propose skill 的 SKILL.md frontmatter — name/description/触发条件

## 2. propose 阶段 skill

- [x] 2.1 实现项目分析器逻辑 — 扫描源码目录、读取依赖配置、推导构建命令、运行时验证、写入 sdd-project-profile.yaml
- [x] 2.2 实现需求澄清与方案讨论 — 交互式问答、提取变更名、方案推荐与确认
- [x] 2.3 实现 openspec-propose 调用与降级 — 正常调用 skill，不可用时降级为 CLI 命令
- [x] 2.4 实现 proposal.md 生成 — 调用 openspec-propose 产出完整 proposal
- [x] 2.5 实现 sdd-state.yaml 初始化 — 创建变更目录，初始化状态文件（phase: propose, checkpoint: entered）
- [x] 2.6 实现阶段完成确认 — AskUserQuestion 展示摘要，三个选项（通过/修改/暂停）
- [x] 2.7 实现断点恢复逻辑 — 根据 checkpoint 和实际文件状态恢复到正确步骤

## 3. plan 阶段 skill

- [x] 3.1 实现 xt-sdd-plan skill 的 SKILL.md frontmatter
- [x] 3.2 实现级联重置检查 — 读取 cascade 字段，展示回退原因，执行级联重置
- [x] 3.3 实现规范产物按序生成 — design.md → specs/ → tasks.md，每步调用 openspec instructions
- [x] 3.4 实现 Bridge 转换 — specs 场景映射为测试任务、design 决策映射为实现任务、compile_constraints 注入
- [x] 3.5 实现 writing-plans 调用与降级 — Superpowers 可用时调用，不可用时使用 Bridge 产物
- [x] 3.6 实现计划质量审查 — 编译约束、import 正确性、无效代码、类型一致性检查
- [x] 3.7 实现 plan.md 保存到变更目录内 — 绑定注释 `<!-- sdd change: <name> -->`
- [x] 3.8 实现 sdd-state.yaml 任务状态更新 — 从 tasks.md 提取任务列表写入 state
- [x] 3.9 实现阶段完成确认与断点恢复

## 4. apply 阶段 skill

- [x] 4.1 实现 xt-sdd-apply skill 的 SKILL.md frontmatter
- [x] 4.2 实现智能执行模式选择 — 多因子分析（任务数/独立性/跨模块性/项目结构），向用户推荐模式
- [x] 4.3 实现 TDD 强制循环 — RED（失败测试）→ GREEN（最小实现）→ REFACTOR（重构）
- [x] 4.4 完整模式执行 — 调用 superpowers:subagent-driven-development，每个子代理完成后更新 checkbox 和 state
- [x] 4.5 轻量模式执行 — 内联 TDD 循环，逐 task 执行
- [x] 4.6 实现每个任务完成后的提交流程 — 编译检查 → 更新 checkbox → 更新 state → commit
- [x] 4.7 实现规范偏离处理 — 暂停、说明原因、提供回到 plan 或继续实现两个选项
- [x] 4.8 实现审查循环限制 — 单任务 5 次、全局 5 轮，超限提示回到 plan
- [x] 4.9 实现并发变更冲突检测 — apply 开始时扫描其他活跃变更是否修改同一文件，有则警告
- [x] 4.10 实现阶段完成确认与断点恢复

## 5. verify 阶段 skill

- [x] 5.1 实现 xt-sdd-verify skill 的 SKILL.md frontmatter
- [x] 5.2 实现文档同步检查（前置步骤）— 扫描代码变更对比 specs/design，按影响级别更新文档
- [x] 5.3 实现代码质量验证 — Superpowers 可用时调用 verification-before-completion，不可用时内联验证
- [x] 5.4 实现规范合规检查 — 场景覆盖、架构决策遵循、排除范围违反、主规范兼容
- [x] 5.5 实现代码审查 — 调用 requesting-code-review，审查循环不超过 5 轮
- [x] 5.6 实现问题分类与验证报告生成 — CRITICAL/WARNING/SUGGESTION 分级
- [x] 5.7 实现阶段完成确认与断点恢复

## 6. archive 阶段 skill

- [x] 6.1 实现 xt-sdd-archive skill 的 SKILL.md frontmatter
- [x] 6.2 实现归档前验证 — 检查所有任务完成和 verify 通过，未完成时警告用户
- [x] 6.3 实现双源信息合并归档 — 生成包含 proposal/design/state/验证报告信息的 archive.md
- [x] 6.4 实现 specs 同步 — 运行 openspec sync 将 delta specs 同步到主规格库
- [x] 6.5 实现变更目录归档 — 调用 openspec archive，sdd-state.yaml 随迁保留
- [x] 6.6 实现 Git 提交提示 — 整理变更清单，提示用户提交
- [x] 6.7 实现阶段完成确认与断点恢复

## 7. fix 命令 skill

- [x] 7.1 实现 xt-sdd-fix skill 的 SKILL.md frontmatter
- [x] 7.2 实现分诊判断逻辑 — 根因明确？修法明确？两个维度路由到 propose/plan/apply
- [x] 7.3 实现自动升级机制 — apply 中发现复杂度超预期时暂停并询问用户
- [x] 7.4 实现简化文档格式 — fix 的 proposal/plan/archive 使用简化模板
- [x] 7.5 实现 fix 变更目录命名 — `fix-<简述>` 格式
- [x] 7.6 实现 verify 聚焦验证 — 验证范围聚焦修复点和直接影响范围，非全量回归
- [x] 7.7 实现文档同步检查集成 — 小 Bug 跳过/中等更新 specs/大 Bug 更新 design+specs

## 8. 集成与更新

- [x] 8.1 更新 CLAUDE.md — 替换原 sdd 命令为 xt-sdd 命令，更新阶段名称和硬门描述
- [x] 8.2 验证 6 个 skill 命令可正常触发 — 测试每个 `/xt-sdd:*` 命令的 frontmatter 匹配
- [x] 8.3 验证状态文件多需求并发 — 创建多个变更目录，确认 sdd-state.yaml 互不干扰
