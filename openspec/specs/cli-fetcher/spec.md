# Purpose

从 GitHub 仓库拉取 tarball 并安全解压、清理的传输层契约。

## Requirements

### Requirement: Tarball 拉取

- ID: R-cli-fetcher-001 [SOURCE: 反推]

`fetchTarball(source, tag)` SHALL 按 owner/repo@ref 拉取仓库归档到本地临时路径并返回其路径信息。

### Requirement: 解压与临时资源清理

- ID: R-cli-fetcher-002 [SOURCE: 反推]

`extractTarball` SHALL 解压归档至临时目录供 installer 使用；无论成败，tarball 与解压目录 SHALL 通过 `cleanup` 释放，失败路径不得遗留临时资源。

### Requirement: 网络错误退出码约定

- ID: R-cli-fetcher-003 [SOURCE: 反推]

网络类失败 MUST 抛出 FetcherError（退出码 2），与其他类别错误的退出码可区分。
