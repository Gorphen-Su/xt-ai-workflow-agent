## ADDED Requirements

### Requirement: 创建 sdd-state.yaml 状态文件

系统 SHALL 在 sdd-explore 阶段创建 `openspec/changes/<name>/sdd-state.yaml`，替代原有 task-status.md。文件结构包含：

- version：版本号
- change：变更名
- phase：当前阶段（explore | plan | implement | verify | archive）
- checkpoint：当前阶段内的精确进度
- phase_checkpoints：各阶段检查点记录
- tasks：任务状态列表（id, description, status, updated, test_result, checkpoint）
- review_counters：审查循环计数
- cascade：级联回退标记

#### Scenario: sdd-explore 创建初始状态文件

- **WHEN** sdd-explore 完成变更目录创建后
- **THEN** 在变更目录下创建 `sdd-state.yaml`，phase 设为 explore，checkpoint 设为 entered，tasks 列表为空

#### Scenario: 不再创建 task-status.md

- **WHEN** sdd-explore 执行完成后
- **THEN** 变更目录下不存在 task-status.md 文件，所有状态信息通过 sdd-state.yaml 管理

### Requirement: Checkpoint 推进机制

系统 SHALL 在每个关键节点推进 checkpoint，确保状态文件与实际文件一致。

#### Scenario: explore 阶段 checkpoint 推进

- **WHEN** explore 阶段逐步执行
- **THEN** checkpoint 按序推进：entered → git-checked → requirements-confirmed → proposal-created → done

#### Scenario: plan 阶段 checkpoint 推进

- **WHEN** plan 阶段逐步执行
- **THEN** checkpoint 按序推进：entered → design-generated → specs-generated → tasks-generated → bridge-converted → quality-reviewed → done

#### Scenario: implement 阶段任务级 checkpoint 推进

- **WHEN** implement 阶段执行某个任务的 TDD 循环
- **THEN** 任务级 checkpoint 按序推进：red → green → refactor → complete，阶段级 checkpoint 更新为 task-N-complete

#### Scenario: verify 阶段 checkpoint 推进

- **WHEN** verify 阶段逐步执行
- **THEN** checkpoint 按序推进：entered → code-quality-done → compliance-done → done

#### Scenario: archive 阶段 checkpoint 推进

- **WHEN** archive 阶段逐步执行
- **THEN** checkpoint 按序推进：entered → consistency-verified → specs-synced → archived → done

### Requirement: 断点恢复机制

系统 SHALL 在每个 SDD 阶段启动时读取 sdd-state.yaml，根据 checkpoint 和实际文件状态确定恢复位置。

#### Scenario: 状态文件与实际文件一致时恢复

- **WHEN** sdd-implement 启动，读取 sdd-state.yaml 的 checkpoint 为 task-2-green，且实际代码中 task-2 的测试已通过
- **THEN** 从 task-2-refactor 步骤继续执行，不需要重做 RED 和 GREEN 步骤

#### Scenario: 状态文件与实际文件不一致时回退

- **WHEN** sdd-state.yaml 的 checkpoint 为 task-3-complete，但实际代码中 task-3 的测试未通过
- **THEN** 回退到上一个确认一致的 checkpoint（如 task-2-complete），从 task-3 重新开始

#### Scenario: 状态文件不存在时降级检测

- **WHEN** sdd-state.yaml 不存在（可能是手动删除或旧变更目录）
- **THEN** 通过扫描 openspec/changes/ 下的实际文件判断进度：检查 proposal.md 是否存在、design.md 是否存在、tasks.md 中是否有任务等，推断当前阶段

### Requirement: 级联回退控制

系统 SHALL 在规范变更导致回退时，系统性地标记失效的后续产物和任务，让用户选择重置范围。

#### Scenario: verify 发现规范偏离触发级联回退

- **WHEN** sdd-verify 发现实现与 design.md 的决策不一致，用户选择回退到 plan 修改规范
- **THEN** 系统在 sdd-state.yaml 的 cascade 字段中记录 last_affected_phase: plan、invalidated_from: implement、reason，展示受影响任务列表，使用 AskUserQuestion 询问重置范围

#### Scenario: 用户选择全量重置

- **WHEN** 级联回退时用户选择"全量重置"（默认选项）
- **THEN** 将 implement 和 verify 阶段的 checkpoint 清零，所有任务状态重置为 pending，preserved_tasks 为空列表

#### Scenario: 用户选择选择性保留

- **WHEN** 级联回退时用户选择"选择性保留"
- **THEN** 展示已完成任务列表供用户勾选，保留的任务状态不变，未保留的任务重置为 pending，preserved_tasks 记录用户保留的任务 id 列表

#### Scenario: explore 被修改导致全链路失效

- **WHEN** explore 阶段的 proposal.md 被修改（范围变更）
- **THEN** plan、implement、verify 全部标记为失效，所有任务重置为 pending，cascade.invalidated_from 设为 plan

#### Scenario: plan 被修改导致后续失效

- **WHEN** plan 阶段的 design.md 或 specs 被修改
- **THEN** implement 和 verify 标记为失效，已完成且不受影响的任务可由用户选择保留

#### Scenario: implement 被修改仅影响 verify

- **WHEN** implement 阶段代码被修改
- **THEN** 仅 verify 标记为失效，implement 内的任务状态保持不变

### Requirement: 归档时保留状态文件

系统 SHALL 在归档时将 sdd-state.yaml 随变更目录一起移至 archive 目录，保留作为历史记录。

#### Scenario: 正常归档

- **WHEN** sdd-archive 执行归档操作
- **THEN** sdd-state.yaml 随变更目录一起 mv 到 `openspec/changes/archive/` 下，不做清理或删除

### Requirement: 向后兼容处理

系统 SHALL 在遇到旧格式的 task-status.md 时能正确处理。

#### Scenario: 变更目录中存在 task-status.md 但无 sdd-state.yaml

- **WHEN** SDD 阶段启动时检测到变更目录中有 task-status.md 但没有 sdd-state.yaml
- **THEN** 提示用户："检测到旧格式的 task-status.md，建议迁移到 sdd-state.yaml。是否自动迁移？"用户确认后，从 task-status.md 提取信息生成 sdd-state.yaml
