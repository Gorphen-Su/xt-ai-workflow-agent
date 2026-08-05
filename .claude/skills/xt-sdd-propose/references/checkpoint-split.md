# 流程拆分检查点化

本文档说明 `xt-sdd-propose` 步骤 7 的分段执行和断点恢复机制。

## 目标

解决 openspec-propose 一次性生成所有 artifacts 的断点恢复问题：
- 中断后重新运行需要从头开始
- 已完成的 artifact 被重复生成
- 浪费 token 和时间

**预期收益**：断点恢复减少 ~3000 tokens

---

## 细粒度 Checkpoint

### 新增检查点

在 propose 阶段新增 artifact 级别检查点：

```
requirements-confirmed
       ↓
proposal-created ← 创建 proposal.md
       ↓
design-created ← 创建 design.md（依赖 proposal）
       ↓
specs-created ← 创建 specs/（依赖 design）
       ↓
tasks-created ← 创建 tasks.md（依赖 specs）
       ↓
openspec-generated ← 验证所有 artifacts
       ↓
done
```

---

## Artifact 状态追踪

### sdd-state.yaml 增强

```yaml
# 新增：artifacts 状态追踪
artifacts_status:
  proposal:
    status: pending           # pending | in_progress | completed | failed
    file: proposal.md
    created_at: null
    hash: null                # 文件哈希（用于验证完整性）
  
  design:
    status: pending
    file: design.md
    created_at: null
    hash: null
  
  specs:
    status: pending
    file: specs/
    created_at: null
    hash: null
  
  tasks:
    status: pending
    file: tasks.md
    created_at: null
    hash: null
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `status` | pending（未开始）、in_progress（进行中）、completed（已完成）、failed（失败） |
| `file` | artifact 文件路径 |
| `created_at` | 创建时间（ISO 8601） |
| `hash` | 文件 SHA256 哈希（用于验证） |

---

## 断点恢复逻辑

### 恢复决策树

```
重新运行 xt-sdd-propose
        ↓
读取 sdd-state.yaml
        ↓
检查 checkpoint 和 artifacts_status
        ↓
├── checkpoint < requirements-confirmed
│   → 从需求确认开始（步骤 6）
│
├── checkpoint = requirements-confirmed
│   → 从 proposal 开始（步骤 7.1）
│
├── checkpoint = proposal-created
│   → 验证 proposal.md 存在
│   ├── 存在 → 从 design 开始（步骤 7.2）
│   └── 不存在 → 从 proposal 开始（步骤 7.1）
│
├── checkpoint = design-created
│   → 验证 design.md 存在
│   ├── 存在 → 从 specs 开始（步骤 7.3）
│   └── 不存在 → 从 design 开始（步骤 7.2）
│
├── checkpoint = specs-created
│   → 验证 specs/ 存在
│   ├── 存在 → 从 tasks 开始（步骤 7.4）
│   └── 不存在 → 从 specs 开始（步骤 7.3）
│
├── checkpoint = tasks-created
│   → 验证 tasks.md 存在
│   ├── 存在 → 验证所有，进入步骤 8
│   └── 不存在 → 从 tasks 开始（步骤 7.4）
│
└── checkpoint = openspec-generated
    → 所有 artifacts 已完成，进入步骤 8
```

### 文件验证

```bash
# 验证 artifact 是否真实存在
verify_artifact() {
  local change="$1"
  local artifact="$2"
  local file="$3"
  local file_path="openspec/changes/$change/$file"

  # 1. 检查文件存在
  if [[ ! -e "$file_path" ]]; then
    return 1  # 文件不存在，需要重新生成
  fi

  # 2. 检查文件非空
  if [[ ! -s "$file_path" ]]; then
    return 1  # 文件为空，需要重新生成
  fi

  return 0  # 验证通过
}
```

---

## 分段执行流程

### 步骤 7（分段模式）

#### 7.0：检查断点状态

```bash
# 检查已完成的 artifacts
bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh check
```

输出示例：
```
断点状态:
- proposal: completed ✓
- design: completed ✓
- specs: pending → 需要生成
- tasks: pending → 需要生成

恢复点: 从 specs 开始
```

#### 7.1：生成 proposal.md（如未完成）

**检查**：
- `artifacts_status.proposal.status == completed`
- 文件 `openspec/changes/$change/proposal.md` 存在且非空

**如果已完成** → 跳过

**如果未完成**：
1. 调用 openspec-propose 生成（或内联生成）
2. 更新 `artifacts_status.proposal.status = completed`
3. 更新 checkpoint: `proposal-created`
4. [上下文归档]

#### 7.2：生成 design.md（如未完成）

**检查**：
- `artifacts_status.design.status == completed`
- 文件存在且非空

**如果已完成** → 跳过

**如果未完成**：
1. 读取 proposal.md（依赖）
2. 生成 design.md
3. 更新 `artifacts_status.design.status = completed`
4. 更新 checkpoint: `design-created`
5. [上下文归档]

#### 7.3：生成 specs/（如未完成）

同上流程，依赖 design.md

#### 7.4：生成 tasks.md（如未完成）

同上流程，依赖 specs/

#### 7.5：验证所有 artifacts

```bash
# 验证所有 artifacts 存在
bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh verify
```

更新 checkpoint: `openspec-generated`

---

## 与 openspec-propose 配合

### 方案 A 的执行方式

保留调用 `openspec-propose` skill，但在调用前后做检查：

```markdown
### 步骤 7（方案 A）

#### 调用前检查
1. 读取 artifacts_status
2. 检查哪些 artifact 已完成
3. 如果全部完成 → 跳过调用，直接验证

#### 调用 openspec-propose
- 如果有未完成的 artifact，调用 openspec-propose
- openspec-propose 会生成所有 artifacts（包括已完成的，但这是可接受的）

#### 调用后更新
1. 检查所有 artifacts 文件存在
2. 更新 artifacts_status（全部标记为 completed）
3. 更新 checkpoint: openspec-generated
```

### 优化点

虽然 openspec-propose 内部可能重新生成已完成的 artifact，但：
- ✅ 调用前检查可以跳过整个调用（如果全部完成）
- ✅ 调用后状态追踪精确
- ✅ 为未来升级到方案 B（内联分段）做准备

---

## 实施检查清单

- [x] 更新 checkpoint 定义（execution.md）
- [x] 扩展 sdd-state.yaml 结构（artifacts_status）
- [x] 创建断点恢复脚本
- [x] 更新 SKILL.md 步骤 7
- [x] 创建分段执行文档

---

## 预期收益

| 场景 | 原流程 | 优化后 | 改善 |
|------|-------|--------|------|
| 中断后恢复 | 重新生成所有 | 跳过已完成的 | 节省 ~3000 tokens |
| 全部完成恢复 | 重新调用 | 跳过调用 | 节省 ~5000 tokens |
| 部分完成识别 | 无法识别 | 精确识别 | 节省时间 |
