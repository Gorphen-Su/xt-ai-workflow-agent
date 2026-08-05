# openspec CLI 调用优化方案

## 策略 2：状态检查合并

### 问题分析

当前 `openspec-propose` 执行流程中的冗余调用：

```bash
# 典型流程需要 3 次 status 调用
1. openspec status --change X --json  # 获取构建顺序
2. [创建 proposal.md]
3. openspec status --change X --json  # 检查 proposal 完成状态 ← 冗余
4. [创建 design.md]
5. openspec status --change X --json  # 检查 design 完成状态 ← 冗余
6. [创建 specs/]
7. openspec status --change X --json  # 检查 specs 完成状态 ← 冗余
8. [创建 tasks.md]
9. openspec status --change X --json  # 验证所有完成 ← 可优化
10. openspec status --change X        # 最终显示 ← 可合并
```

**问题**：
- 每个 artifact 创建后都调用一次 status 检查
- 最终显示又重新调用一次
- 大量重复的 CLI 调用和 JSON 解析

### 优化方案

#### 优化 1：用文件检查替代状态检查

**原逻辑**：
```bash
# 每次都调用 CLI
openspec status --change "$name" --json
```

**优化后**：
```bash
# 直接检查文件是否存在
if [ -f "openspec/changes/$name/proposal.md" ]; then
  echo "✓ proposal.md 已创建"
fi
```

#### 优化 2：缓存状态信息

**原逻辑**：
```bash
# 多次调用获取相同信息
openspec status --change "$name" --json  # 获取构建顺序
openspec status --change "$name" --json  # 验证完成状态
openspec status --change "$name"        # 最终显示
```

**优化后**：
```bash
# 只调用一次，缓存结果
STATUS_JSON=$(openspec status --change "$name" --json)
echo "$STATUS_JSON" > /tmp/openspec-status-$$.json

# 后续使用缓存结果
applyRequires=$(echo "$STATUS_JSON" | jq '.applyRequires')
```

#### 优化 3：最终显示复用缓存

**原逻辑**：
```bash
# 最终显示又调用一次
openspec status --change "$name"
```

**优化后**：
```bash
# 使用之前缓存的 JSON，格式化输出
format_status_from_cache /tmp/openspec-status-$$.json
```

### 实施方法

在 `openspec-propose` skill 中修改：

```markdown
## 步骤 4：创建 artifacts in sequence until apply-ready

### 优化：仅调用一次 status

1. **首次获取状态并缓存**：
   ```bash
   openspec status --change "$name" --json > /tmp/status.json
   ```

2. **解析缓存获取信息**：
   - `applyRequires`: 从 `/tmp/status.json` 解析
   - `artifacts`: 从 `/tmp/status.json` 解析

3. **创建每个 artifact 后，用文件检查替代 status 调用**：
   ```bash
   # 检查文件是否存在
   if [ -f "openspec/changes/$name/proposal.md" ]; then
     echo "✓ proposal.md 已创建"
   fi
   ```

4. **最终显示复用缓存**：
   ```bash
   # 格式化显示状态（使用 /tmp/status.json）
   ```
```

### 预期收益

- **减少调用**：从 3-5 次减少到 1 次
- **时间节省**：每次减少 ~2-3 秒
- **Token 节省**：减少重复的 JSON 输出解析

---

## 策略 1：本地缓存指令

### 缓存设计

#### 缓存文件位置

```
openspec/.instructions-cache.json
```

#### 缓存结构

```json
{
  "version": 1,
  "schema_version": "1.2.0",
  "cached_at": "2025-01-15T10:30:00Z",
  "artifacts": {
    "proposal": {
      "context": "...",
      "rules": "...",
      "template": "...",
      "instruction": "..."
    },
    "design": { ... },
    "specs": { ... },
    "tasks": { ... }
  }
}
```

### 缓存检查逻辑

```bash
#!/bin/bash
# 检查缓存是否有效的函数

function is_instructions_cache_valid() {
  local cache_file="openspec/.instructions-cache.json"

  # 1. 缓存不存在
  if [ ! -f "$cache_file" ]; then
    return 1
  fi

  # 2. 检查 schema 版本是否一致
  local current_schema=$(openspec schema current 2>/dev/null || echo "unknown")
  local cached_schema=$(jq -r '.schema_version' "$cache_file" 2>/dev/null || echo "none")

  if [ "$current_schema" != "$cached_schema" ]; then
    echo "→ Schema 版本已变更 ($cached_schema → $current_schema)"
    return 1
  fi

  # 3. 检查缓存时间（可选：超过 7 天强制刷新）
  local cache_time=$(jq -r '.cached_at' "$cache_file" 2>/dev/null || echo "")
  if [ -n "$cache_time" ]; then
    local cache_age=$(( $(date +%s) - $(date -d "$cache_time" +%s 2>/dev/null || echo 0) ))
    local max_age=$((7 * 24 * 60 * 60))  # 7 天
    if [ $cache_age -gt $max_age ]; then
      echo "→ 缓存已过期（$(($cache_age / 86400)) 天）"
      return 1
    fi
  fi

  echo "✓ 缓存有效"
  return 0
}
```

### 使用流程

#### 在 openspec-propose 中

```bash
# 步骤 4：创建 artifacts

# 1. 检查缓存
if is_instructions_cache_valid; then
  echo "✓ 使用缓存的 instructions"
  INSTRUCTIONS_CACHE=$(cat openspec/.instructions-cache.json)
else
  echo "→ 获取 instructions 并缓存..."
  # 首次调用时批量获取并缓存
  fetch_and_cache_instructions "$name"
  INSTRUCTIONS_CACHE=$(cat openspec/.instructions-cache.json)
fi

# 2. 从缓存中读取特定 artifact 的 instructions
for artifact in proposal design specs tasks; do
  artifact_instructions=$(echo "$INSTRUCTIONS_CACHE" | jq ".artifacts.$artifact")
  # 使用 artifact_instructions 创建文件
done
```

#### 更新缓存

```bash
function fetch_and_cache_instructions() {
  local change="$1"
  local cache_file="openspec/.instructions-cache.json"
  local schema_version=$(openspec schema current 2>/dev/null || echo "unknown")
  local cached_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # 构建 JSON
  cat > "$cache_file" <<EOF
{
  "version": 1,
  "schema_version": "$schema_version",
  "cached_at": "$cached_at",
  "artifacts": {
    "proposal": $(openspec instructions proposal --change "$change" --json 2>/dev/null),
    "design": $(openspec instructions design --change "$change" --json 2>/dev/null),
    "specs": $(openspec instructions specs --change "$change" --json 2>/dev/null),
    "tasks": $(openspec instructions tasks --change "$change" --json 2>/dev/null)
  }
}
EOF

  echo "✓ instructions 已缓存到 $cache_file"
}
```

### 清理缓存

```bash
# 手动清理
rm openspec/.instructions-cache.json

# 或通过 skill 命令
/opsx:clear-cache
```

### 预期收益

| 场景 | 原调用次数 | 优化后调用次数 | 减少 |
|------|----------|-------------|------|
| 首次运行 | 4 次 | 4 次 | 0 |
| 断点恢复 | 4 次 | 0 次（缓存） | 4 |
| 第二个变更 | 4 次 | 0 次（缓存） | 4 |

---

## 实施检查清单

### 策略 2：状态检查合并

- [ ] 更新 `openspec-propose` skill，移除冗余 status 调用
- [ ] 使用文件检查替代状态验证
- [ ] 缓存首次 status 结果用于最终显示
- [ ] 测试验证功能正常

### 策略 1：本地缓存指令

- [ ] 创建缓存检查脚本
- [ ] 创建缓存更新脚本
- [ ] 更新 `openspec-propose` skill 使用缓存
- [ ] 添加缓存清理命令
- [ ] 测试验证缓存机制
