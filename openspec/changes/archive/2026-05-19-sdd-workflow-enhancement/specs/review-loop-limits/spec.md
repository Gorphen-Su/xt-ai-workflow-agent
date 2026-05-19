## ADDED Requirements

### Requirement: 全局审查循环限制

系统 SHALL 在 sdd-verify 的全局代码审查中设置 5 轮上限。每轮审查发现问题后修复，修复后重新验证和审查。

#### Scenario: 审查在 5 轮内通过

- **WHEN** sdd-verify 执行全局审查，在第 N 轮（N ≤ 5）审查通过
- **THEN** 审查流程正常结束，更新 sdd-state.yaml 的 checkpoint，继续后续步骤

#### Scenario: 审查超过 5 轮仍未通过

- **WHEN** sdd-verify 执行全局审查，5 轮后仍有 CRITICAL 问题
- **THEN** 系统暂停审查流程，使用 AskUserQuestion 提示用户："审查已循环 5 次仍有 CRITICAL 问题，可能需要回到 sdd:plan 重新审视设计方案。"提供选项：A. 继续（额外 5 轮）/ B. 回到 sdd:plan

### Requirement: 单任务修改循环限制

系统 SHALL 在 sdd-implement 的单任务确认中设置 5 次修改上限。

#### Scenario: 任务确认在 5 次内通过

- **WHEN** sdd-implement 执行单任务确认，用户在第 N 次（N ≤ 5）确认"通过"
- **THEN** 任务正常完成，进入下一个任务

#### Scenario: 任务修改超过 5 次仍未通过

- **WHEN** sdd-implement 执行单任务确认，用户连续 5 次选择"不通过，需要修改"
- **THEN** 系统暂停当前任务，使用 AskUserQuestion 提示用户："任务已修改 5 次仍未通过，可能需要回到 sdd:plan 重新审视任务拆分。"提供选项：A. 继续（额外 5 次）/ B. 回到 sdd:plan

### Requirement: 审查计数器持久化

系统 SHALL 将审查循环计数器写入 sdd-state.yaml，确保跨会话时计数器不丢失。

#### Scenario: 计数器跨会话恢复

- **WHEN** sdd-implement 中断后重新启动，读取 sdd-state.yaml 中 task_retries 记录
- **THEN** 恢复之前的修改次数计数，继续累计而不是重新计数

#### Scenario: 级联回退时重置计数器

- **WHEN** 触发级联回退，某个阶段的任务被重置为 pending
- **THEN** 被重置任务的 task_retries 计数器清零，全局 review_counters 也清零
