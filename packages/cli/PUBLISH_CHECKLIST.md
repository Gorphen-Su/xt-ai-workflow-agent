# npm publish 前的核查清单

每次发布 `xt-sdd-skills` 到 npm 之前，按这份清单走一遍。

## 一. 代码就绪

- [ ] 当前分支已合到 main（或目标发布分支）
- [ ] git 工作区干净 (`git status` 无未提交改动)
- [ ] 当前 commit 已 push 到 GitHub origin
- [ ] 如果是稳定版，给当前 commit 打 git tag (`git tag v0.1.0 && git push origin v0.1.0`)

## 二. 包配置

- [ ] `packages/cli/package.json` 的 `version` 字段已升号
- [ ] `private` 字段已删除或改为 `false`（**初始模板设为 true 防误发布**）
- [ ] `DEFAULT_SOURCE` 在 `src/manifest.js` 中为实际 GitHub 路径（不是占位符）
- [ ] `bin/xt-sdd-skills.js` 首行是 `#!/usr/bin/env node`

## 三. 测试

- [ ] `cd packages/cli && npx vitest run` 全绿
- [ ] 至少在一种平台手工跑 `node bin/xt-sdd-skills.js list`，输出符合预期
- [ ] 至少在一种平台手工跑 `node bin/xt-sdd-skills.js install --dry-run`（在干净目录），无 unexpected error

## 四. 包大小

- [ ] `cd packages/cli && npm pack --dry-run`：
  - [ ] tarball size < 200 KB
  - [ ] 文件清单无 `src/__tests__/`、无 `vitest.config.*`、无 `node_modules/`
  - [ ] 文件清单包含 `bin/xt-sdd-skills.js`、`src/**/*.js`、`README.md`

## 五. npm 账号

- [ ] `npm whoami` 显示当前账号（有发布 `xt-sdd-skills` 权限）
- [ ] `npm search xt-sdd-skills`：如果包名首次发布，确认未被占用；如果是更新，确认这个包是你拥有的

## 六. 真正发布

```bash
cd packages/cli
npm publish
```

发布后：
- [ ] 在 npm 上确认页面：https://www.npmjs.com/package/xt-sdd-skills
- [ ] 在一个全新临时目录跑 `npx xt-sdd-skills@latest list`，确认能拉到新版
- [ ] 在 GitHub 创建 release 关联 git tag（可选但推荐）

## 注意：首次发布要点

第一次 `npm publish` 时务必先：
1. 删除 `package.json` 的 `private: true`
2. 在 `package.json` 加 `publishConfig: { "access": "public" }`（如果用 scope 包名如 @xt-ai/sdd-skills）
3. 若包名 `xt-sdd-skills` 在 npm 上已被占用：
   - 改用 scope: `@gorphensu/xt-sdd-skills`
   - 同步修改 README 中所有 `npx xt-sdd-skills` 为 `npx @gorphensu/xt-sdd-skills`
