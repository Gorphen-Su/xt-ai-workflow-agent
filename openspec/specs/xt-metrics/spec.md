# Purpose

xt-metrics 按需统计技能的统计周期（cutoff）与报告产物的行为契约。初版置信度较低（脚本未经测试覆盖），逐条待校准。

## Requirements

### Requirement: 统计周期记录与重建

- ID: R-xt-metrics-001 [SOURCE: 反推][DRAFT]

cutoff.yaml SHALL 记录上次统计截止时间；读取时 SHOULD 对缺失/损坏配置做检测并支持重建（readOrCreateCutoff），使重复统计不重复计数。

#### Scenario: 损坏配置自愈重建

- **WHEN** cutoff.yaml 内容损坏或缺失时执行统计
- **THEN** 配置被重建为合法初始态，流程不崩溃（待测试保护，条目保持 DRAFT）

### Requirement: 报告产物与历史更新

- ID: R-xt-metrics-002 [SOURCE: 反推][DRAFT]

report 命令 SHALL 生成统计报告文件（writeReport/finalizeReport）并更新历史索引（updateHistory）；git 维度统计基于提交解析（git-stats 模块）。

#### Scenario: 报告产物落地并登记历史

- **WHEN** 执行 report 统计完成后
- **THEN** 报告文件写入报告目录且历史索引新增本次记录（待测试保护，条目保持 DRAFT）
