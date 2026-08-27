# Purpose

从 GitHub 仓库拉取 tarball 并安全解压、清理的传输层契约。

## Requirements

### Requirement: Tarball 拉取

- ID: R-cli-fetcher-001 [SOURCE: 反推]

`fetchTarball(source, tag)` SHALL 按 owner/repo@ref 拉取仓库归档到本地临时路径并返回其路径信息。

#### Scenario: 正常拉取返回归档

- **WHEN** 网络可达且 source/ref 存在时调用 fetchTarball
- **THEN** 返回的临时 tarball 文件存在且非空，可供解压消费

### Requirement: 解压与临时资源清理

- ID: R-cli-fetcher-002 [SOURCE: 反推]

`extractTarball` SHALL 解压归档至临时目录供 installer 使用；无论成败，tarball 与解压目录 SHALL 通过 `cleanup` 释放，失败路径不得遗留临时资源。

#### Scenario: 失败路径不遗留临时资源

- **WHEN** 解压过程因清单校验失败等异常中止
- **THEN** cleanup 被执行，本地不再残留本次下载的 tarball 与解压目录

### Requirement: 网络错误退出码约定

- ID: R-cli-fetcher-003 [SOURCE: 反推]

网络类失败 MUST 抛出 FetcherError（退出码 2），与其他类别错误的退出码可区分。

#### Scenario: 网络不可达退出码

- **WHEN** 拉取期间发生网络错误（DNS 失败/连接拒绝/超时）
- **THEN** 进程以退出码 2 终止，错误输出可辨识 NETWORK_ERROR / NETWORK_TIMEOUT 类别
