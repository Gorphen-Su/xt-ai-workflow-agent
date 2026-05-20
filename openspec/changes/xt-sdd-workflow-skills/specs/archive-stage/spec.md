## ADDED Requirements

### Requirement: 归档前验证
系统 SHALL 在归档前确认所有任务已完成、verify 阶段已通过。存在未完成项时 MUST 警告用户并由用户决定是否继续。

#### Scenario: 全部完成正常归档
- **WHEN** 所有任务 status 为 completed 且 verify 阶段 checkpoint 为 done
- **THEN** 直接进入归档流程

#### Scenario: 存在未完成项
- **WHEN** 有未完成的任务或未通过的验证
- **THEN** 警告用户"存在未完成的任务/未通过的验证"，由用户确认是否继续归档

### Requirement: 双源信息合并归档
系统 SHALL 合并 OpenSpec 和 Superpowers 双源信息生成 archive.md，包含需求概要、技术方案、实现详情、规格变更、测试覆盖、级联回退记录、任务执行统计。

#### Scenario: 生成 archive.md
- **WHEN** 归档流程开始
- **THEN** 读取 proposal.md、design.md、sdd-state.yaml、验证报告，生成包含所有信息的 archive.md

### Requirement: 同步 specs
系统 SHALL 将变更目录下的 delta specs 同步到主规格库（`openspec/specs/`）。

#### Scenario: delta specs 同步
- **WHEN** 归档流程中检测到未同步的 delta specs
- **THEN** 运行 `openspec sync --change "<name>"` 同步到主规格库

### Requirement: 归档变更目录
系统 SHALL 将变更目录归档到 `openspec/changes/archive/` 下，sdd-state.yaml 随变更目录保留。

#### Scenario: 正常归档
- **WHEN** archive.md 已生成且 specs 已同步
- **THEN** 运行 `openspec archive --change "<name>"`，变更目录移至 archive/

### Requirement: Git 提交提示
系统 SHALL 在归档完成后提示用户是否提交 Git，并将所有相关代码和文档整理成清单作为日志提交。

#### Scenario: 提示 Git 提交
- **WHEN** 归档完成且用户确认
- **THEN** 展示变更清单（涉及文件列表），提示用户提交 Git

### Requirement: archive 阶段硬门
系统 SHALL 在 archive 阶段禁止修改代码和规格文档。

#### Scenario: 检测到修改意图
- **WHEN** archive 阶段出现修改代码或规格的意图
- **THEN** 系统 MUST 阻止并提示"archive 阶段禁止改代码和规格"

### Requirement: archive 阶段完成确认
系统 SHALL 在归档完成后要求用户确认，MUST NOT 自动跳过。

#### Scenario: 用户确认归档完成
- **WHEN** 归档操作完成且用户确认
- **THEN** 更新 sdd-state.yaml（phase: archive checkpoint: done）
