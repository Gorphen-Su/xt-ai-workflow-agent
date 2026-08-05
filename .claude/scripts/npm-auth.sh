#!/bin/bash
# npm 认证设置脚本
# 从 .claude/.npm-token-config 读取 token 并设置 npm 认证

echo "🔧 设置 npm 认证..."

# 检查 token 配置文件是否存在
TOKEN_FILE=".claude/.npm-token-config"
if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ Token 配置文件不存在: $TOKEN_FILE"
    echo "请先创建该文件并添加你的 npm token"
    exit 1
fi

# 读取 token
NPM_TOKEN=$(grep NPM_TOKEN "$TOKEN_FILE" | cut -d'=' -f2)

if [ -z "$NPM_TOKEN" ]; then
    echo "❌ 无法从配置文件中读取 NPM_TOKEN"
    exit 1
fi

echo "📝 读取到 token: ${NPM_TOKEN:0:10}..."

# 临时切换到官方 npm registry
echo "🔄 切换到官方 npm registry..."
npm config set registry https://registry.npmjs.org/

# 设置 npm 认证
echo "🔐 设置 npm token 认证..."
npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"

# 验证认证
echo "✅ 验证 npm 认证状态..."
npm whoami

if [ $? -eq 0 ]; then
    echo "✨ npm 认证设置成功！"
    echo ""
    echo "现在可以发布包："
    echo "  cd packages/cli"
    echo "  npm publish --access public"
else
    echo "❌ npm 认证设置失败，请检查 token 是否有效"
    exit 1
fi