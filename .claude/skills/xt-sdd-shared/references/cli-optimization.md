# 通用 CLI 调用优化

本文档定义 xt-sdd 所有阶段共享的 CLI 调用优化策略，减少冗余调用，降低 token 消耗。

## 目标

减少 openspec CLI 的冗余调用，用文件检查和缓存替代。

---

## 策略 1：状态检查合并

### 原理

用文件存在性检查替代 `openspec status` 调用。

### 原流程（冗余）

```bash
openspec status --change X --json  # 获取构建顺序
[创建 proposal.md]
openspec status --change X --json  # 检查完成状态 ← 冗余
[创建 design.md]
openspec status --change X --json  # 检查完成状态 ← 冗余
```

### 优化后

```bash
# 首次获取状态并缓存
STATUS=$(openspec status --change X --json)

# 后续用文件检查替代
[ -f "openspec/changes/X/proposal.md" ] && echo "✓ proposal"
[ -f "openspec/changes/X/design.md" ] && echo "✓ design"
```

### 适用阶段

| 阶段 | 适用性 | 说明 |
|------|--------|------|
| propose | ✅ 已实施 | 步骤 7 openspec-propose 调用 |
| plan | ✅ 已实施 | 步骤 3 生成规范产物 |
| apply | ❌ 不适用 | 不调用 openspec status |
| verify | ❌ 不适用 | 不调用 openspec status |
| archive | ⭐ 低价值 | 仅步骤 4 调 1 次 |

---

## 策略 2：instructions 缓存

### 原理

缓存 `openspec instructions` 输出，跨阶段、跨变更复用。

### 缓存位置

```
openspec/.instructions-cache.json
```

### 缓存脚本

```bash
# 检查缓存
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh check

# 获取并缓存
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh fetch <change>

# 读取特定 artifact
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get <artifact>
```

### 跨阶段复用原理

propose 和 plan 操作**同一变更目录**，instructions 完全可复用：

| 字段 | 是否随 change 变化 | 复用性 |
|------|-----------------|--------|
| template | 否 | ✅ 完全可复用 |
| rules | 否 | ✅ 完全可复用 |
| instruction | 否 | ✅ 完全可复用 |
| context | 是 | ⚠️ 各阶段自带上下文 |

### 适用阶段

| 阶段 | 适用性 | 收益 |
|------|--------|------|
| propose | ✅ 已实施 | 建立缓存 |
| plan | ✅ 已实施 | 复用缓存，减少 3 次调用 |
| apply/verify/archive | ❌ 不适用 | 不调用 instructions |

---

## 策略 3：文件检查替代

### 原理

优先用文件系统检查替代 CLI 调用。

### 常用替代模式

| 原 CLI 调用 | 文件检查替代 |
|------------|------------|
| `openspec status` 检查完成 | `[ -f "path/file" ]` |
| `openspec status` 获取顺序 | 缓存首次结果 |
| `openspec validate` | 文件存在 + 非空检查 |
| 重复读取配置 | 缓存到 .project-cache.json |

---

## 策略 4：批量操作

### 原理

合并多个小操作为一次批量操作。

### 适用场景

| 场景 | 原方式 | 批量方式 |
|------|--------|---------|
| 更新多个 checkbox | 逐个 Edit | 批量 Edit |
| 读取多个 artifact | 逐个 Read | 按需 Read |
| Git 操作 | 逐文件 commit | 分组批量 commit |

---

## 各阶段 CLI 调用清单

### propose 阶段
- `openspec new change` — 1 次（必需）
- `openspec status` — 1 次（优化后，原 3 次）
- `openspec instructions` — 0 次（优化后，用缓存）

### plan 阶段
- `openspec instructions` — 0 次（优化后，复用 propose 缓存）
- `openspec status` — 0 次（优化后，用文件检查）

### apply 阶段
- 不调用 openspec CLI（基于计划文件执行）

### verify 阶段
- 不调用 openspec CLI（基于 git diff 和测试）

### archive 阶段
- `openspec status` — 1 次（检查 delta specs）
- `openspec sync` — 1 次（同步 specs）
- `openspec archive` — 1 次（归档）

---

## 总体收益

| 优化项 | 调用减少 | Token 节省 |
|-------|---------|----------|
| 状态检查合并 | 4-6 次 | ~1000 |
| instructions 缓存 | 3-6 次 | ~2000 |
| 文件检查替代 | 3-5 次 | ~500 |
| **合计** | **10-17 次** | **~3500** |
