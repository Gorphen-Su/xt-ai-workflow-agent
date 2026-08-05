# npm Token 管理说明

## 📝 配置文件

### Token 存储
你的 npm token 已安全存储在：
```
.claude/.npm-token-config
```

### 安全措施
- ✅ 此文件已添加到 `.gitignore`，不会被提交到 git
- ✅ 仅在本地存储，不会被分享
- ✅ 文件权限设置为仅当前用户可读

## 🚀 使用方式

### 方式 1：使用自动化脚本（推荐）

```bash
# 一键设置 npm 认证
bash .claude/scripts/npm-auth.sh
```

### 方式 2：手动设置

```bash
# 读取 token 并设置环境变量
export NPM_TOKEN=$(grep NPM_TOKEN .claude/.npm-token-config | cut -d'=' -f2)

# 切换到官方 npm registry
npm config set registry https://registry.npmjs.org/

# 设置 npm 认证
npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN

# 验证认证
npm whoami
```

## 📦 发布流程

### 完整发布步骤

```bash
# 1. 设置认证
bash .claude/scripts/npm-auth.sh

# 2. 进入项目目录
cd packages/cli

# 3. 运行测试（可选但推荐）
npm test

# 4. 发布到 npm
npm publish --access public

# 5. 恢复国内镜像（可选）
npm config set registry https://registry.npmmirror.com
```

## 🔒 安全提醒

### Token 安全
- ⚠️ **不要分享**：npm token 相当于你的账户密码
- ⚠️ **不要提交**：此文件已在 .gitignore 中保护
- ⚠️ **定期更新**：建议定期更新 token 以提高安全性
- ⚠️ **权限控制**：token 有过期时间，失效后需重新创建

### Token 管理
1. **查看现有 tokens**：
   - 访问：https://www.npmjs.com/settings/tokens

2. **删除旧 token**：
   - 在 npm 网站上删除不再使用的 token

3. **创建新 token**：
   - 点击 "Generate New Token"
   - 选择合适的权限和过期时间
   - 更新 `.claude/.npm-token-config` 文件

## 📋 当前配置

**包信息**：
- 包名：`xt-sdd-skills`
- 当前版本：`0.5.0`
- 维护者：`gorphensu`

**Token 信息**：
- 类型：Automation token
- 用途：npm 包发布
- 状态：已配置 ✅

## 🆘 问题排查

### 认证失败
```bash
# 检查 token 是否正确设置
npm config get //registry.npmjs.org/:_authToken

# 检查当前 registry
npm config get registry

# 验证用户信息
npm whoami
```

### 发布失败
```bash
# 确保在正确的目录
pwd  # 应该显示 .../packages/cli

# 检查包名
cat package.json | grep name

# 检查版本
cat package.json | grep version
```

## 📚 相关资源

- npm 官网：https://www.npmjs.com/
- npm token 文档：https://docs.npmjs.com/about-access-tokens
- xt-sdd-skills：https://www.npmjs.com/package/xt-sdd-skills
