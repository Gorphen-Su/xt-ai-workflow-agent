# Purpose

升级前的资产备份：完整复制既有技能到带时间戳的备份目录，并提供堆积预警。

## Requirements

### Requirement: 备份创建

- ID: R-cli-backup-001 [SOURCE: 反推]

`createBackup` SHALL 把 MANIFEST 中在目标项目实际存在为目录的每个 skill 完整复制到 `.claude/skills/.backup/<YYYY-MM-DD-HHmmss>/` 下，并写入 `_backup-meta.json`（含时间、版本区间、条目列表）。无任何既有 skill 时 SHALL 返回空结果而非空目录。

#### Scenario: 仅备份真实存在者并留档元数据

- **WHEN** 目标装有 3 个清单技能但 MANIFEST 声明 9 个时执行备份
- **THEN** 备份目录恰好含这 3 个技能的完整副本，_backup-meta.json 的 items 列表与之完全一致

#### Scenario: 空场返回而非建空目录

- **WHEN** 目标不存在任何清单内技能目录时调用 createBackup
- **THEN** 返回 items 为空且 backupDir 为 null，磁盘上未创建任何新目录

### Requirement: 时间戳冲突避让

- ID: R-cli-backup-002 [SOURCE: 反推]

同一秒多次备份时 SHALL 依次尝试 `<stamp>-2 … <stamp>-99` 后缀避让；全部被占用时 MUST 抛出 BackupError（退出码 4）。

#### Scenario: 同时间戳自动避让

- **WHEN** 同一秒内连续两次备份
- **THEN** 第二次落盘到 `<stamp>-2` 目录，两次内容互不覆盖

#### Scenario: 避让耗尽即硬失败

- **WHEN** base 及全部 -2…-99 后缀目录均已存在
- **THEN** 抛出 BackupError 且进程退出码为 4，不产生静默降级

### Requirement: 备份堆积预警

- ID: R-cli-backup-003 [SOURCE: 反推]

`checkBackupCount` SHALL 在备份目录数超过 5 时返回 shouldWarn 及最旧 3 个目录名，供 update 收尾时向用户告警。

#### Scenario: 堆积超阈值预警

- **WHEN** .backup 下存在 6 个及以上备份目录时调用 checkBackupCount
- **THEN** shouldWarn 为 true 且 oldestDirs 按从旧到新给出最多 3 个目录名
