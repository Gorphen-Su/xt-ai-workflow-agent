# Purpose

升级前的资产备份：完整复制既有技能到带时间戳的备份目录，并提供堆积预警。

## Requirements

### Requirement: 备份创建

- ID: R-cli-backup-001 [SOURCE: 反推]

`createBackup` SHALL 把 MANIFEST 中在目标项目实际存在为目录的每个 skill 完整复制到 `.claude/skills/.backup/<YYYY-MM-DD-HHmmss>/` 下，并写入 `_backup-meta.json`（含时间、版本区间、条目列表）。无任何既有 skill 时 SHALL 返回空结果而非空目录。

### Requirement: 时间戳冲突避让

- ID: R-cli-backup-002 [SOURCE: 反推]

同一秒多次备份时 SHALL 依次尝试 `<stamp>-2 … <stamp>-99` 后缀避让；全部被占用时 MUST 抛出 BackupError（退出码 4）。

### Requirement: 备份堆积预警

- ID: R-cli-backup-003 [SOURCE: 反推]

`checkBackupCount` SHALL 在备份目录数超过 5 时返回 shouldWarn 及最旧 3 个目录名，供 update 收尾时向用户告警。
