<!-- sdd change: xt-sdd-skills-npx-installer -->

# 3. Fetcher 模块

GitHub tarball 拉取与解压，位于 `packages/cli/src/fetcher.js`。

## Steps

### Step 3.1: 实现 fetchTarball(source, ref)

<!-- TODO: 核心网络操作，用 Node 18+ 内置 fetch -->
- [ ] 创建 `packages/cli/src/fetcher.js`
- [ ] 实现 `fetchTarball(source, ref)`：
  1. 构造 URL: `https://codeload.github.com/${source}/tar.gz/${ref}`
  2. 用 `AbortController` 设置 30 秒超时
  3. 调用 `fetch(url, { signal })`
  4. 若响应不 ok（如 404），抛出 `FetcherError('REF_NOT_FOUND', ...)`
  5. 若网络错误（TypeError），自动重试一次（间隔 1 秒）
  6. 若重试仍失败，抛出 `FetcherError('NETWORK_TIMEOUT' 或 'NETWORK_ERROR', ...)`
  7. 成功时，将响应 body 写入临时文件（`os.tmpdir()` + 随机名 `.tar.gz`）
  8. 返回 `{ tarballPath, resolvedRef: ref }`
- [ ] 从响应头 `content-disposition` 中尝试提取 commit SHA（可选），若失败则为 null
- [ ] 编写测试：
  - mock fetch 返回成功响应 → 验证返回 tarballPath 且文件存在
  - mock fetch 返回 404 → 验证抛出 FetcherError('REF_NOT_FOUND')
  - mock fetch 抛出 TypeError → 验证重试一次后抛出 FetcherError('NETWORK_ERROR')
  - mock fetch 一直挂断（AbortSignal 触发） → 验证抛出 FetcherError('NETWORK_TIMEOUT')

### Step 3.2: 实现 extractTarball(tarballPath, manifest)

<!-- TODO: 用 tar 包解压并校验清单，需要处理路径前缀剥离 -->
- [ ] 实现 `extractTarball(tarballPath, manifest)`：
  1. 创建临时解压目录（`fs.mkdtempSync()`）
  2. 用 `tar.extract({ file: tarballPath, cwd: extractedDir, strip: 1 })` 解压（strip: 1 去掉顶级目录 `xt-ai-workflow-agent-main/` 前缀）
  3. 读取 tarball 实际包含的根目录名（第一个条目带的前缀），记录为 `sourceDirName`
  4. 校验 manifest 中所有必需文件在解压目录下可访问
  5. 返回 `{ extractedDir, sourceDirName }`
- [ ] 编写测试：
  - 用测试 fixtures 目录创建假 tarball（用 tar 包打包小的假文件结构）
  - 验证合法 tarball 解压并返回目录
  - 验证缺少 manifest 中一个 skill 时抛出 FetcherError('MANIFEST_MISMATCH')
  - 传递非法文件作为 tarballPath → 验证抛出 FetcherError('TARBALL_CORRUPT')

### Step 3.3: 实现 cleanup(deletePaths)

<!-- TODO: 清理临时文件，健壮处理部分删除 -->
- [ ] 实现 `cleanup(deletePaths)`，接受 `{ tarballPath, extractedDir }`：
  1. 尝试删除 `tarballPath`（`fs.rm`）
  2. 尝试删除 `extractedDir`（递归 `fs.rm(d, { recursive: true })`）
  3. 对 ENOENT 静默忽略
  4. 对其他错误抛出（非吞没）
- [ ] 编写测试：
  - 创建一个假临时文件和目录 → 调用 cleanup 验证两个都消失
  - 调用 cleanup 时路径已不存在 → 不抛异常
  - 调用 cleanup 时路径无权限（模拟）→ 抛权限错误

### Step 3.4: fetcher 模块集成测试

- [ ] 创建 `packages/cli/src/__tests__/fetcher.test.js`
- [ ] 在描述性 `describe` 块中组织 3.1、3.2、3.3 的测试
- [ ] mock 外部依赖（fetch、tar、fs）确保测试不联网、不写真实文件
- [ ] 验证 `npx vitest run fetcher` 全绿