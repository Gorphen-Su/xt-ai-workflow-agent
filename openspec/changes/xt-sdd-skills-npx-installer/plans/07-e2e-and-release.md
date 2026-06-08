<!-- sdd change: xt-sdd-skills-npx-installer -->

# 7. 端到端验证与发布准备

确认 CLI 功能完整，准备 npm publish。

## Steps

### Step 7.1: 端到端测试

<!-- TODO: 在隔离的临时目录跑完整流程 -->
- [ ] 创建 `packages/cli/src/__tests__/e2e.test.js`
- [ ] 在每个测试中：
  1. 创建临时项目根（含 `package.json` 或 `.git/` 标识）
  2. 用 `execFile('node', [binPath, 'install', '--tag', 'main', '--dry-run'])` 测试 install 的 dry-run 模式（不实际改文件）
  3. 用 `execFile('node', [binPath, 'install', '--tag', 'main', '--source', '../..'])` 测试真实 install（拉本地 repo 模拟）— 或用 mock HTTP server 替代
  4. 验证文件被正确写入 `.claude/skills/xt-sdd-*/` 目录
- [ ] 端到端测试标记为 `--runInBand`（不并行）和较长的 `testTimeout: 30000`

### Step 7.2: 平台验证（手工）

<!-- TODO: 至少 1 个平台手工验证 -->
- [ ] **手工测试项**（将此 checklist 写入 README 或仓库 CI 文档）：
  - [ ] Windows 上运行 `npx xt-sdd-skills update`（指向本仓 main）
  - [ ] macOS/Linux 上相同操作
  - [ ] 验证 `.claude/skills/.backup/<timestamp>/` 下备份文件完整性
  - [ ] 验证 `list` 命令输出
  - [ ] 验证 `--tag` 参数工作
  - [ ] 验证 `--dry-run` 不改变文件系统

### Step 7.3: npm pack 产物体积检查

<!-- TODO: 确保包小而精确 -->
- [ ] 在 `packages/cli/` 下执行 `npm pack --dry-run` 确认发布清单
- [ ] `npm pack` 后检查生成的 tarball 体积 < 100KB（不含 tar/kleur 依赖，仅本包文件）
- [ ] 确认 `files` 字段排除了所有测试文件和 devDependencies 相关文件

### Step 7.4: 更新根目录 README

<!-- TODO: 让用户一眼知道怎么装 -->
- [ ] 在 `README.md` 顶部新增 "## Installation" 章节：
  ```markdown
  ## Installation

  Users of xt-sdd workflow can install or update the skills in their project via:

  ```bash
  npx xt-sdd-skills install    # First-time setup
  npx xt-sdd-skills update     # Upgrade to latest
  npx xt-sdd-skills list       # See available components
  ```
  ```

### Step 7.5: 发布前核查清单

<!-- TODO: npm publish 前务必确认 -->
- [ ] 运行 `npm search xt-sdd-skills` 确认包名可用
- [ ] 运行 `npm whoami` 确认已登录
- [ ] 确认 `packages/cli/package.json` 的 version 为期望值（`0.1.0` 或 `1.0.0`）
- [ ] 确认 `DEFAULT_SOURCE` 中的 `:owner/:repo` 已被替换为实际 GitHub owner/repo
- [ ] 确认 `.npmignore` 包含测试文件、coverage、vitest 配置
- [ ] 确认 `npx vitest run` 全绿
- [ ] 确认发布流程文档化（写在本仓 README 或 CONTRIBUTING.md）