## 1. 基础结构搭建

- [x] 1.1 创建 `.claude/commands/sdd/` 目录和 5 个命令文件骨架（explore.md、plan.md、implement.md、verify.md、archive.md）
- [x] 1.2 创建 `.claude/skills/sdd-explore/SKILL.md` 文件，包含 frontmatter（name、description）和完整逻辑
- [x] 1.3 创建 `.claude/skills/sdd-plan/SKILL.md` 文件，包含 frontmatter 和完整逻辑
- [x] 1.4 创建 `.claude/skills/sdd-implement/SKILL.md` 文件，包含 frontmatter 和完整逻辑
- [x] 1.5 创建 `.claude/skills/sdd-verify/SKILL.md` 文件，包含 frontmatter 和完整逻辑
- [x] 1.6 创建 `.claude/skills/sdd-archive/SKILL.md` 文件，包含 frontmatter 和完整逻辑

## 2. sdd-explore 命令与 Skill 实现

- [x] 2.1 实现 Git 状态前置检查逻辑（`git status --porcelain` + `git diff --stat`）
- [x] 2.2 实现脏工作区处理逻辑（展示摘要 + 询问是否提交 + 自动生成 commit message）
- [x] 2.3 实现探索与需求澄清逻辑（调用 `openspec` CLI 讨论方案，产出 proposal.md）
- [x] 2.4 实现变更目录命名逻辑（`YYYY-MM-DD-<模块>-<子模块>-<功能>` 格式，从用户输入推导）
- [x] 2.5 实现阶段完成确认逻辑（展示产出摘要 + 三选项确认：通过/不通过/暂停）
- [x] 2.6 实现 task-status.md 初始化逻辑（创建阶段进度头：explore:✓ plan:☐ implement:☐ verify:☐ archive:☐）
- [x] 2.7 实现 `/sdd:explore` 命令入口（触发条件、参数解析、调用 sdd-explore skill）

## 3. sdd-plan 命令与 Skill 实现

- [x] 3.1 实现规范产物生成逻辑（读取 proposal.md，调用 `openspec` CLI 按依赖顺序生成 design → specs → tasks）
- [x] 3.2 实现 bridge 转换逻辑（specs 场景→TDD 测试用例映射，design→plan 输入，tasks→TDD 步骤拆分）
- [x] 3.3 实现 task-status.md 创建逻辑（阶段进度 + 任务明细表格，所有任务初始状态"未开始"）
- [x] 3.4 实现阶段完成确认逻辑（展示所有 plan 产物摘要 + 三选项确认）
- [x] 3.5 实现 `/sdd:plan` 命令入口（触发条件、参数解析、调用 sdd-plan skill）

## 4. sdd-implement 命令与 Skill 实现

- [x] 4.1 实现进度恢复逻辑（读取 task-status.md，从断点继续）
- [x] 4.2 实现规范上下文加载逻辑（读取 proposal + design + specs + tasks）
- [x] 4.3 实现 TDD 循环逻辑（RED：写失败测试 → GREEN：最小实现 → REFACTOR：重构）
- [x] 4.4 实现任务状态自动更新逻辑（未开始→执行中→测试中→已完成/已失败）
- [x] 4.5 实现规范偏离处理逻辑（发现规范需要调整时暂停，回到 sdd:plan）
- [x] 4.6 实现单任务完成确认逻辑（每个任务完成后三选项确认：通过/不通过/暂停）
- [x] 4.7 实现 `/sdd:implement` 命令入口（触发条件、参数解析、调用 sdd-implement skill）

## 5. sdd-verify 命令与 Skill 实现

- [x] 5.1 实现测试套件运行逻辑（调用项目测试命令，收集结果）
- [x] 5.2 实现规范合规检查逻辑（逐条验证 specs 场景覆盖 + 架构决策遵循 + 排除范围违反）
- [x] 5.3 实现合规问题分类逻辑（CRITICAL/WARNING/SUGGESTION 三级分类）
- [x] 5.4 实现验证报告输出逻辑（测试结果 + 规范合规结果 + 问题列表 + 最终评估）
- [x] 5.5 实现阶段完成确认逻辑（展示验证报告 + 三选项确认：通过/回到 implement/暂停）
- [x] 5.6 实现 `/sdd:verify` 命令入口（触发条件、参数解析、调用 sdd-verify skill）

## 6. sdd-archive 命令与 Skill 实现

- [x] 6.1 实现归档前验证逻辑（检查所有任务状态和验证结果）
- [x] 6.2 实现 archive.md 生成逻辑（合并 proposal + design + task-status + specs 变更 + 测试覆盖 + Git 提交记录）
- [x] 6.3 实现规格同步逻辑（调用 opsx:sync 同步 delta specs 到主规范）
- [x] 6.4 实现归档执行逻辑（调用 opsx:archive 归档变更目录）
- [x] 6.5 实现 Git 提交提醒逻辑（询问是否提交 + 自动生成 `feat(<模块>): <功能描述>` 格式 commit message）
- [x] 6.6 实现阶段完成确认逻辑（展示归档摘要 + 确认 + Git 提交选项）
- [x] 6.7 实现 `/sdd:archive` 命令入口（触发条件、参数解析、调用 sdd-archive skill）

## 7. CLAUDE.md 更新与验证

- [x] 7.1 更新 CLAUDE.md，将 OpenSpec 工作流指引替换为 SDD 工作流说明（5 阶段命令、目录结构、强制规则）
- [ ] 7.2 端到端验证：使用 `/sdd:explore` 启动一个简单需求，走完五阶段流程
