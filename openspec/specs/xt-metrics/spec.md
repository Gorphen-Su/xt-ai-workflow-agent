# Purpose

xt-metrics 按需统计技能的统计周期（cutoff）与报告产物的行为契约。初版置信度较低（脚本未经测试覆盖），逐条待校准。

## Requirements

### Requirement: 统计周期记录与重建

- ID: R-xt-metrics-001 [SOURCE: 反推][DRAFT]

cutoff.yaml SHALL 记录上次统计截止时间；读取时 SHOULD 对缺失/损坏配置做检测并支持重建（readOrCreateCutoff），使重复统计不重复计数。

### Requirement: 报告产物与历史更新

- ID: R-xt-metrics-002 [SOURCE: 反推][DRAFT]

report 命令 SHALL 生成统计报告文件（writeReport/finalizeReport）并更新历史索引（updateHistory）；git 维度统计基于提交解析（git-stats 模块）。
