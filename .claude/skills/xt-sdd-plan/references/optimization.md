# plan 阶段优化说明

本文档说明 `xt-sdd-plan` 阶段的 token 与调用优化策略。

## 优化项

### 1. 复用 instructions 缓存（核心优化）

**原理**：propose 和 plan 操作**同一变更目录**，`openspec instructions` 输出完全可复用。

**实施**：步骤 3.0 先检查 propose 阶段的缓存，有效则直接读取，无效则重新获取。

```bash
# 复用 propose 阶段的缓存
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh check

# 读取特定 artifact 的 instructions
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get design
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get specs
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh get tasks
```

**为什么可跨阶段复用**：

| 字段 | 是否随 change 变化 | 复用性 |
|------|-----------------|--------|
| template | 否（由 schema 决定） | ✅ 完全可复用 |
| rules | 否（由 schema 决定） | ✅ 完全可复用 |
| instruction | 否（由 artifact 类型决定） | ✅ 完全可复用 |
| context | 是（含项目背景） | ⚠️ plan 自带 proposal.md 上下文，无需依赖 |

**预期收益**：减少 3 次 `openspec instructions` 调用，节省 ~1500 tokens。

---

### 2. 状态检查合并

**原理**：用文件存在性检查替代 `openspec status` 调用。

**原流程**（步骤 3 末尾）：
```bash
# 每生成一个产物后调用（冗余）
每生成一个产物后，运行 openspec status --change "<name>" --json 确认状态
```

**优化后**：
```bash
# 文件检查替代（零 CLI 调用）
[ -f "openspec/changes/<name>/design.md" ] && echo "✓ design.md"
[ -d "openspec/changes/<name>/specs" ] && echo "✓ specs/"
[ -f "openspec/changes/<name>/tasks.md" ] && echo "✓ tasks.md"
```

**预期收益**：减少 3 次 `openspec status` 调用，节省 ~500 tokens + ~3 秒。

---

## 跨脚本引用说明

plan 阶段引用 propose 阶段的脚本：

```
.claude/skills/xt-sdd-propose/scripts/instructions-cache.sh
```

**路径基准**：相对项目根目录（所有 skill 都可访问）。

**优势**：
- 无需为 plan 重复创建脚本
- 缓存统一管理（一处建立，多处复用）
- 维护成本低

---

## 总体收益

| 优化项 | 调用减少 | Token 节省 | 时间节省 |
|-------|---------|----------|---------|
| instructions 缓存复用 | 3 次 | ~1500 | ~3 秒 |
| 状态检查合并 | 3 次 | ~500 | ~3 秒 |
| **合计** | **6 次** | **~2000** | **~6 秒** |

---

## 后续可优化项（未实施）

| 优化项 | 价值 | 说明 |
|-------|------|------|
| 文档分层 | ⭐⭐ 中 | 步骤 4 writing-plans 较长，可拆到子文档 |
| 上下文剪裁 | ⭐⭐ 中 | 步骤 4.3 按 N 分组调用 writing-plans 累积上下文 |
| 小窗口模型适配 | ⭐⭐ 中 | 长流程，可启用轻量模式 |

→ 通用优化规则参见共享模块 [xt-sdd-shared/references/](../../xt-sdd-shared/references/)：
- [context-management.md](../../xt-sdd-shared/references/context-management.md) — 上下文管理
- [small-window-adaptation.md](../../xt-sdd-shared/references/small-window-adaptation.md) — 小窗口适配
- [cli-optimization.md](../../xt-sdd-shared/references/cli-optimization.md) — CLI 优化
