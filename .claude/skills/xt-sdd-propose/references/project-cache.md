# 项目分析缓存机制

本文档说明 `xt-sdd-propose` 项目分析器的缓存机制，避免重复读取配置文件。

## 缓存设计

### 缓存文件位置

`openspec/.project-cache.json`

### 缓存结构

```json
{
  "version": 1,
  "cached_at": "2025-01-15T10:30:00Z",
  "languages": ["TypeScript"],
  "frameworks": ["Vue", "Vite"],
  "build_tool": "npm",
  "compile_command": "npm run build",
  "test_command": "npm test",
  "structure": "single-module",
  "has_ci": true,
  "compile_constraints": ["接口层和实现层分开定义在不同 Task 中会导致单独编译失败"],
  "file_hashes": {
    "package.json": "sha256:abc123...",
    "tsconfig.json": "sha256:def456...",
    "vite.config.ts": "sha256:789012..."
  }
}
```

## 检测逻辑

### 判断是否需要重新分析

```javascript
// 伪代码
function shouldReanalyze() {
  // 1. 缓存文件不存在
  if (!cacheExists()) {
    return true;
  }

  // 2. 读取缓存
  const cache = readCache();

  // 3. 检查关键文件是否变更
  const keyFiles = getKeyFiles(); // package.json, pom.xml, go.mod 等
  for (const file of keyFiles) {
    const currentHash = hashFile(file);
    const cachedHash = cache.file_hashes[file];
    if (currentHash !== cachedHash) {
      return true; // 文件变更，需要重新分析
    }
  }

  // 4. 检查时间戳（可选：超过 7 天强制重新分析）
  const cacheAge = Date.now() - new Date(cache.cached_at).getTime();
  if (cacheAge > 7 * 24 * 60 * 60 * 1000) {
    return true;
  }

  return false; // 缓存有效，无需重新分析
}
```

## 使用流程

### propose 阶段步骤 2：项目分析器

```bash
# 原流程
if sdd-project-profile.yaml 不存在:
  执行项目分析器
  写入 sdd-project-profile.yaml

# 优化流程
if shouldReanalyze():
  执行项目分析器
  写入 sdd-project-profile.yaml
  更新 .project-cache.json
else:
  读取 .project-cache.json
  验证 sdd-project-profile.yaml 存在且一致
  跳过分析，直接使用缓存
```

## 关键文件列表

不同技术栈的关键文件：

| 技术栈 | 关键文件 |
|-------|---------|
| npm/yarn/pnpm | package.json, package-lock.json/yarn.lock/pnpm-lock.yaml |
| Maven | pom.xml, .mvn/settings.xml |
| Gradle | build.gradle/build.gradle.kts, gradle.properties |
| Go | go.mod, go.sum |
| Cargo | Cargo.toml, Cargo.lock |
| Python | pyproject.toml, requirements.txt, Poetry.lock |

## Bash 实现示例

```bash
#!/bin/bash
# 项目分析缓存检查

CACHE_FILE="openspec/.project-cache.json"
PROFILE_FILE="openspec/sdd-project-profile.yaml"

# 检查缓存是否有效
function is_cache_valid() {
  # 缓存不存在
  [[ ! -f "$CACHE_FILE" ]] && return 1

  # profile 不存在
  [[ ! -f "$PROFILE_FILE" ]] && return 1

  # 检查关键文件（示例：npm 项目）
  if [[ -f "package.json" ]]; then
    local current_hash=$(sha256sum package.json | awk '{print $1}')
    local cached_hash=$(grep -A1 "package.json" "$CACHE_FILE" | tail -1 | xargs)

    if [[ "$current_hash" != "$cached_hash" ]]; then
      return 1
    fi
  fi

  return 0
}

# 主流程
if is_cache_valid; then
  echo "✓ 使用缓存的项目分析结果"
  # 读取并使用缓存
else
  echo "→ 执行项目分析器..."
  # 执行分析，写入 profile 和缓存
fi
```

## 更新缓存

分析完成后，更新缓存：

```bash
# 1. 计算文件哈希
function compute_hash() {
  sha256sum "$1" | awk '{print $1}'
}

# 2. 构建 JSON
cat > "$CACHE_FILE" <<EOF
{
  "version": 1,
  "cached_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "languages": $languages_json,
  "frameworks": $frameworks_json,
  "build_tool": "$build_tool",
  "compile_command": "$compile_command",
  "test_command": "$test_command",
  "structure": "$structure",
  "has_ci": $has_ci,
  "compile_constraints": $constraints_json,
  "file_hashes": {
    "package.json": "sha256:$(compute_hash package.json)",
    "tsconfig.json": "sha256:$(compute_hash tsconfig.json)"
  }
}
EOF
```

## 清理缓存

用户手动清理：

```bash
# 删除缓存，下次运行强制重新分析
rm openspec/.project-cache.json
```

或在 skill 中提供命令：

```bash
# xt-sdd 技能中添加清理命令
/xt-sdd:clear-cache  # 清理项目分析缓存
```
