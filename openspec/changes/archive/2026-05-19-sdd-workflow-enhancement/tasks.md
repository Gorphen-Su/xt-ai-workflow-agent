## 1. 项目分析器（Project Profiler）

- [x] 1.1 在 sdd-explore 中增加项目分析器步骤：探测语言、框架、构建工具、编译/测试命令、项目结构、CI 配置
- [x] 1.2 实现构建命令映射表（maven/gradle/npm/go/cargo/python → compile_command/test_command）
- [x] 1.3 实现 compile_command 运行时验证逻辑（环境问题阻塞、代码问题标记、null 跳过）
- [x] 1.4 实现空白项目（greenfield）特殊处理：跳过自动探测，在需求确认中补充技术栈
- [x] 1.5 创建 `openspec/sdd-project-profile.yaml` 输出模板和写入逻辑
- [x] 1.6 实现 compile_constraints 自动提取逻辑（编译型语言 vs 解释型语言）

## 2. 结构化状态管理 — sdd-state.yaml

- [x] 2.1 设计并文档化 sdd-state.yaml 完整结构（version, change, phase, checkpoint, phase_checkpoints, tasks, review_counters, cascade）
- [x] 2.2 在 sdd-explore 中：创建初始 sdd-state.yaml 替代 task-status.md 的初始化逻辑
- [x] 2.3 在 sdd-plan 中：切换状态管理到 sdd-state.yaml（读取/更新 phase、checkpoint、tasks）
- [x] 2.4 在 sdd-implement 中：切换状态管理到 sdd-state.yaml（任务级 checkpoint: red/green/refactor/complete，进度恢复基于 checkpoint）
- [x] 2.5 在 sdd-verify 中：切换状态管理到 sdd-state.yaml（checkpoint 推进：code-quality-done/compliance-done）
- [x] 2.6 在 sdd-archive 中：切换状态管理到 sdd-state.yaml（归档时保留状态文件作为历史记录）
- [x] 2.7 移除所有 skill 中对 task-status.md 的创建和更新逻辑

## 3. 断点恢复机制

- [x] 3.1 实现 sdd-explore 断点恢复：根据 checkpoint（entered/git-checked/requirements-confirmed/proposal-created/done）恢复到正确步骤
- [x] 3.2 实现 sdd-plan 断点恢复：根据 checkpoint（entered/design-generated/specs-generated/tasks-generated/bridge-converted/quality-reviewed/done）恢复
- [x] 3.3 实现 sdd-implement 断点恢复：根据阶段级 checkpoint + 任务级 checkpoint（red/green/refactor/complete）精确恢复到任务内步骤
- [x] 3.4 实现 sdd-verify 断点恢复：根据 checkpoint（entered/code-quality-done/compliance-done/done）恢复
- [x] 3.5 实现 sdd-archive 断点恢复：根据 checkpoint（entered/consistency-verified/specs-synced/archived/done）恢复
- [x] 3.6 实现状态文件与实际文件一致性验证：checkpoint 声称的进度与实际文件不一致时回退

## 4. 级联回退控制

- [x] 4.1 设计级联规则矩阵：explore 被修改 → plan+implement+verify 失效；plan 被修改 → implement+verify 失效；implement 被修改 → verify 失效；verify 被修改 → 无级联
- [x] 4.2 在 sdd-implement 的规范偏离处理中实现级联回退：暂停 → 展示变更差异 + 受影响任务 → AskUserQuestion 选择重置范围
- [x] 4.3 在 sdd-verify 的规范偏离处理中实现级联回退：暂停 → 展示变更差异 → 询问回退目标阶段
- [x] 4.4 实现全量重置逻辑：后续阶段 checkpoint 清零，所有任务 → pending
- [x] 4.5 实现选择性保留逻辑：展示已完成任务列表，用户勾选保留，其余 → pending，记录 preserved_tasks
- [x] 4.6 实现 cascade 字段写入和清除逻辑：回退时写入，重新执行完成后清除

## 5. 审查循环限制

- [x] 5.1 在 sdd-implement 中增加单任务修改次数计数器，写入 sdd-state.yaml 的 task_retries
- [x] 5.2 在 sdd-implement 中实现超限处理：5 次后暂停，AskUserQuestion 提示回退 sdd:plan
- [x] 5.3 在 sdd-verify 中增加全局审查轮次计数器，写入 sdd-state.yaml 的 global_review_rounds
- [x] 5.4 在 sdd-verify 中实现超限处理：5 轮后暂停，AskUserQuestion 提示回退 sdd:plan
- [x] 5.5 实现级联回退时计数器重置：被重置任务的 task_retries 清零，global_review_rounds 清零

## 6. 后续阶段集成 profile

- [x] 6.1 sdd-plan 读取 sdd-project-profile.yaml，将 compile_constraints 注入 Bridge 转换的任务拆分逻辑
- [x] 6.2 sdd-implement 读取 sdd-project-profile.yaml 的 compile_command，任务完成后运行编译检查（非 null 时）
- [x] 6.3 sdd-verify 读取 sdd-project-profile.yaml 的 test_command，替代临时推导测试命令

## 7. 向后兼容

- [x] 7.1 实现旧格式检测：变更目录中有 task-status.md 但无 sdd-state.yaml 时提示迁移
- [x] 7.2 实现自动迁移：从 task-status.md 提取阶段进度和任务状态，生成 sdd-state.yaml
