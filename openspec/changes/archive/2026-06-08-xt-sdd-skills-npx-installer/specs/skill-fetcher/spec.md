# Spec: skill-fetcher

GitHub tarball 拉取器。

## ADDED Requirements

### Requirement: fetcher 必须从 GitHub codeload 下载 tarball

MUST fetcher 模块必须实现 `fetchTarball(source, ref)` 函数，从 `https://codeload.github.com/<source>/tar.gz/<ref>` 下载源仓 tarball 到操作系统临时目录。

#### Scenario: 成功下载 main 分支 tarball

- **WHEN** 调用 `fetchTarball('xt-ai/xt-ai-workflow-agent', 'main')`
- **THEN** 函数必须返回一个对象 `{ tarballPath: <临时文件绝对路径>, resolvedRef: 'main', sourceCommitSha: <从响应头或后续解析得到的 commit SHA> }`，且该临时文件存在、大小 > 0

#### Scenario: 成功下载 tag tarball

- **WHEN** 调用 `fetchTarball('xt-ai/xt-ai-workflow-agent', 'v1.0.0')` 且该 tag 存在
- **THEN** 函数必须返回对应的 tarball 路径，resolvedRef 为 `'v1.0.0'`

#### Scenario: GitHub 返回 404（ref 不存在）

- **WHEN** 调用 `fetchTarball('xt-ai/xt-ai-workflow-agent', 'nonexistent-branch')` 时 GitHub 返回 404
- **THEN** 函数必须抛出 `FetcherError`，code 为 `'REF_NOT_FOUND'`，message 包含 "ref 'nonexistent-branch' not found in xt-ai/xt-ai-workflow-agent"

#### Scenario: 网络超时

- **WHEN** 下载请求 30 秒内无响应
- **THEN** 函数必须取消请求，自动重试一次；若重试仍超时，抛出 `FetcherError`，code 为 `'NETWORK_TIMEOUT'`

#### Scenario: 网络错误（DNS 解析失败等）

- **WHEN** 调用 fetch 时抛出网络异常（如 ENOTFOUND、ECONNRESET）
- **THEN** 函数必须自动重试一次；若重试仍失败，抛出 `FetcherError`，code 为 `'NETWORK_ERROR'`，message 包含原始错误信息

### Requirement: fetcher 必须解压 tarball 并验证清单文件存在

MUST fetcher 必须实现 `extractTarball(tarballPath, manifest)` 函数，将 tarball 解压到临时目录，并校验 manifest 中所有必需文件均存在。

#### Scenario: 解压并通过清单校验

- **WHEN** 调用 `extractTarball(<合法 tarball>, MANIFEST)`，tarball 中包含所有 6 个 xt-sdd-* skill 目录和模板文件
- **THEN** 函数必须返回 `{ extractedDir: <解压后的根目录绝对路径> }`，该目录下能按 manifest 路径访问到所有清单文件

#### Scenario: tarball 缺少清单中的 skill

- **WHEN** 解压后的目录缺少 `xt-sdd-fix` skill（manifest 声明的必需项）
- **THEN** 函数必须抛出 `FetcherError`，code 为 `'MANIFEST_MISMATCH'`，message 列出所有缺失的文件路径

#### Scenario: tarball 损坏

- **WHEN** 调用 `extractTarball()` 时 tar 包解压失败
- **THEN** 函数必须抛出 `FetcherError`，code 为 `'TARBALL_CORRUPT'`

### Requirement: fetcher 必须在完成后清理临时文件

MUST fetcher 必须提供 `cleanup(paths)` 函数，删除拉取过程产生的临时 tarball 文件和解压目录。

#### Scenario: 清理成功

- **WHEN** 调用 `cleanup({ tarballPath, extractedDir })` 且两个路径都存在
- **THEN** 两个路径必须从文件系统被删除，函数不抛异常

#### Scenario: 清理时路径已不存在

- **WHEN** 调用 `cleanup()` 时某些路径已被其他进程删除
- **THEN** 函数必须静默忽略 ENOENT 错误，不抛异常
