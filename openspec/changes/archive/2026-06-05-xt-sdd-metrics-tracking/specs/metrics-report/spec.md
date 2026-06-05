## ADDED Requirements

### Requirement: Archive 阶段生成 metrics-report.md
系统 SHALL 在 xt-sdd-archive 阶段自动生成 `metrics-report.md` 文件，汇总整个变更过程的统计数据。

#### Scenario: 生成完整报告
- **WHEN** archive 阶段执行且 sdd-state.yaml 中 metrics 段数据已填充
- **THEN** 系统在变更目录下生成 `metrics-report.md`，包含以下内容：
  - 变更名称和起止时间
  - Git 基线信息（起始/结束 SHA）
  - 文件变更统计表格（新增/编辑/删除/总计）
  - 代码行数统计（新增行/删除行）
  - Token 消费统计（输入/输出/总计/预估费用）
  - 各阶段 Token 快照明细表

#### Scenario: 部分数据缺失时生成报告
- **WHEN** archive 阶段执行但部分 metrics 数据缺失（如 ccusage 不可用）
- **THEN** 系统仍然生成报告，在缺失的数据段标记 "数据不可用" 或 "N/A"，SHALL NOT 因数据缺失而跳过报告生成

#### Scenario: 报告文件格式
- **WHEN** metrics-report.md 被生成
- **THEN** 文件使用标准 Markdown 格式，包含：
  - `# Metrics Report: <变更名>` 作为标题
  - `## 变更概览` 段包含时间范围和 Git SHA
  - `## 文件变更统计` 段包含 Markdown 表格
  - `## 代码行数统计` 段包含数值列表
  - `## Token 消费统计` 段包含汇总和阶段明细表格

### Requirement: 报告作为归档产物
metrics-report.md SHALL 作为 archive 阶段的标准归档产物之一，与 archive.md 一同保留在变更目录中。

#### Scenario: 归档包含 metrics 报告
- **WHEN** archive 阶段完成归档流程
- **THEN** 变更目录下存在 `metrics-report.md` 文件且内容非空

#### Scenario: 无 metrics 数据时的归档
- **WHEN** archive 阶段执行但整个 metrics 段为初始空值（所有字段为 0 或 null）
- **THEN** 系统生成一份最小报告，说明 "本次变更未收集到指标数据"，列出可能的原因
