# xt-sdd-propose 辅助脚本

本目录包含 `xt-sdd-propose` 流程的优化辅助脚本。

---

## 1. cache-check.sh — 项目分析缓存

检查和管理项目分析结果缓存。

### 使用方法

```bash
# 检查缓存是否有效
bash .claude/skills/xt-sdd-propose/scripts/cache-check.sh check

# 清理缓存
bash .claude/skills/xt-sdd-propose/scripts/cache-check.sh clear
```

### 缓存文件

- 缓存文件：`openspec/.project-cache.json`
- profile 文件：`openspec/sdd-project-profile.yaml`

---

## 2. instructions-cache.sh — Instructions 缓存

管理和缓存 `openspec instructions` 输出，减少 CLI 调用次数。

### 使用方法

```bash
# 检查缓存是否有效
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh check

# 获取并缓存 instructions
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh fetch <change-name>

# 从缓存读取特定 artifact 的 instructions
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get <artifact-id>

# 显示缓存信息
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh info

# 清理缓存
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh clear
```

### 缓存文件

- 缓存文件：`openspec/.instructions-cache.json`
- 包含所有 artifacts（proposal, design, specs, tasks）的 instructions

### 示例

```bash
# 首次运行：获取并缓存
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh fetch user-auth

# 后续运行：使用缓存
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get proposal

# 查看缓存信息
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh info
```

---

## 3. resume-check.sh — 断点恢复检查

检查 artifact 完成状态，确定恢复点，支持流程拆分检查点化。

### 使用方法

```bash
# 确定恢复点（根据 checkpoint 和文件状态）
STATE_FILE=openspec/changes/<变更名>/sdd-state.yaml \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh check

# 查看所有 artifacts 状态
STATE_FILE=openspec/changes/<变更名>/sdd-state.yaml \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh status

# 验证所有 artifacts 文件存在
STATE_FILE=openspec/changes/<变更名>/sdd-state.yaml \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh verify
```

### 输出示例

**check 命令**：
```
断点状态分析:
  checkpoint: proposal-created
  change_dir: openspec/changes/user-auth

恢复点: 从步骤 7.2 开始（生成 design）
```

**status 命令**：
```
Artifacts 状态:
  proposal:    ✓ completed
  design:      → pending
  specs:       → pending
  tasks:       → pending

→ 存在未完成的 artifacts
```

### 在 xt-sdd-propose 流程中使用

#### 步骤 7.0：检查断点状态

```bash
# 确定从哪个 artifact 恢复
STATE_FILE="openspec/changes/$change/sdd-state.yaml" \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh check
```

#### 步骤 7.5：验证所有 artifacts

```bash
# 验证所有 artifacts 文件存在且非空
STATE_FILE="openspec/changes/$change/sdd-state.yaml" \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh verify
```

---

## 在 xt-sdd-propose 流程中使用

### 步骤 2：项目分析器（带缓存）

```bash
# 检查项目分析缓存
if bash .claude/skills/xt-sdd-propose/scripts/cache-check.sh check; then
  echo "✓ 使用缓存的项目分析结果"
else
  echo "→ 执行项目分析器..."
fi
```

### 步骤 7：调用 openspec-propose（带缓存）

```bash
# 检查 instructions 缓存
if bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh check; then
  echo "✓ 使用缓存的 instructions"
  # 从缓存读取
else
  echo "→ 获取 instructions 并缓存..."
  bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh fetch "$change_name"
fi
```

---

## 环境变量

所有脚本支持以下环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VERBOSE` | 启用详细输出 | `false` |
| `CACHE_FILE` | 缓存文件路径 | 脚本特定 |

### 示例

```bash
# 启用详细输出
VERBOSE=true bash .claude/skills/xt-sdd-propose/scripts/cache-check.sh check

# 指定自定义缓存路径
CACHE_FILE=/tmp/my-cache.json bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh info
```
