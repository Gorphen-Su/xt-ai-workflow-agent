# Purpose

xt-sdd-skills 安装器 CLI 的核心行为契约：三条子命令（install/update/list）、项目根探测、模板保护与分发内容边界。

## Requirements

### Requirement: 首次安装命令

- ID: R-cli-installer-001 [SOURCE: 反推]

`install` SHALL 从默认源（Gorphen-Su/xt-ai-workflow-agent@main）下载 tarball，把 MANIFEST 声明的 skills、templates、commands 安装到当前项目的对应位置。

### Requirement: 升级命令与备份前置

- ID: R-cli-installer-002 [SOURCE: 反推]

`update` SHALL 在覆盖既有 skill 前创建完整备份；`--no-backup` SHALL 允许跳过且 MUST 给出不可逆警告。无既有 skill 时 SHALL 自动降级为全新安装（degradedToInstall）。

### Requirement: dry-run 预演模式

- ID: R-cli-installer-003 [SOURCE: 反推]

install/update 的 `--dry-run` SHALL 只列出将要执行的操作而不写任何文件。

### Requirement: 模板跳过保护

- ID: R-cli-installer-004 [SOURCE: 反推]

模板文件在目标已存在时 SHALL 跳过写入以保护用户定制（skip-if-exists），并被计入 skipped 结果。

### Requirement: 项目根自动探测

- ID: R-cli-installer-005 [SOURCE: 反推]

CLI SHALL 自 cwd 向上探测项目标记以定位目标根；未找到时 SHALL 回退当前目录并给出 warning。

### Requirement: 清单查看命令

- ID: R-cli-installer-006 [SOURCE: 反推]

`list` SHALL 以人类可读文本打印 MANIFEST 的 skills、templates、commands 三段清单。

### Requirement: 分发内容以 MANIFEST 为准

- ID: R-cli-installer-007 [SOURCE: 反推]

分发的 skills/templates/commands 清单 MUST 与 src/manifest.js 的 MANIFEST 一致；新增或下线技能通过修改该清单完成。
