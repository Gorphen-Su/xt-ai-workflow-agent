# apply 阶段 TDD 上下文管理

本文档说明 `xt-sdd-apply` 阶段特有的上下文管理策略，针对 TDD 循环的上下文累积问题。

## 核心问题

apply 是**最耗 token、最容易爆**的阶段：

```
任务 1: RED → GREEN → REFACTOR → 验证     ~2000 tokens
任务 2: RED → GREEN → REFACTOR → 验证     ~2500 tokens（含历史）
任务 3: RED → GREEN → REFACTOR → 验证     ~3000 tokens（含历史）
...
任务 N: 累积到 ~N×2000 tokens
```

**痛点**：
- 每个任务的测试代码、实现代码、调试输出都累积
- 完整模式 subagent 返回大量上下文
- 小窗口模型在 3-5 个任务后就可能爆掉

---

## 优化策略 1：TDD 任务级上下文清理

### 核心原则

**每个任务完成后，强制触发上下文归档**，下一个任务从 sdd-state.yaml 恢复上下文。

### 清理触发点

在 TDD 循环的**测试验证通过后**（任务 status → completed 时）：

```markdown
[上下文归档 - 任务 N 完成]

已保存进度到 sdd-state.yaml：
- 任务 N: status=completed, checkpoint=complete
- test_result: <pass/fail 摘要>
- last_action: "任务 N 完成，TDD 循环结束"

下一个任务（N+1）将从 sdd-state.yaml 恢复上下文。
可忽略任务 N 的详细实现过程。
```

### 任务间上下文恢复

下一个任务开始时，**仅加载该任务所需的最小上下文**：

```yaml
# 从 sdd-state.yaml 读取
当前任务: N+1
任务描述: <从 tasks.md 读取>
任务 checkpoint: null（新任务）

# 按需加载（非全量）
- 当前任务所在分组的 plans/NN-*.md
- 当前任务对应的 specs/<capability>/spec.md
- sdd-project-profile.yaml 的 compile_command/test_command
```

---

## 优化策略 2：完整模式 subagent 优化

### 问题

完整模式调用 `superpowers:subagent-driven-development`，每个子代理返回完整上下文，主对话累积严重。

### 优化：摘要式接收

子代理完成后，**只接收摘要，不保留完整上下文**：

```markdown
### 子代理返回处理

✅ 保留：
- 任务完成状态（completed/failed）
- 测试结果摘要（pass/fail 计数）
- 关键决策（如有规范偏离）
- 修改的文件列表

❌ 丢弃（归档后清理）：
- 完整的实现代码（已在文件中）
- 详细的调试过程
- 中间的失败尝试
- 子代理的推理过程
```

### 摘要记录到 sdd-state.yaml

```yaml
tasks:
  - id: N
    description: <任务描述>
    status: completed
    test_result: "pass - 3/3 测试通过"
    checkpoint: complete
    files_modified:  # 新增：修改的文件列表
      - src/auth/login.ts
      - tests/auth/login.test.ts
```

---

## 优化策略 3：按需加载规范上下文

### 强化步骤 3 的分层规则

apply 步骤 3 已有按需加载规则，**进一步强化**：

| 上下文类型 | 加载时机 | 加载范围 |
|----------|---------|---------|
| sdd-state.yaml | 每个任务开始 | 全文件（轻量） |
| tasks.md | 每个任务开始 | 全文件（轻量） |
| plans/NN-*.md | 每个任务开始 | **仅当前分组** |
| specs/ | 每个任务开始 | **仅当前 capability** |
| proposal/design | **仅断点恢复/架构决策时** | 对应章节 |

### 禁止行为

- ❌ 一上来读 specs/ 全目录
- ❌ 通读 proposal.md/design.md
- ❌ 读取所有分组的 plans/
- ❌ 保留前一个任务的实现代码在上下文

---

## 优化策略 4：小窗口模型分段执行

### 检测到小窗口模型时

**强制分段执行**：
- 每个任务独立完成，任务间强制清空
- 连续执行模式降级为"每任务确认"
- 子代理返回后立即清理

### 分段执行流程

```
任务 1 完整 TDD 循环
  ↓ 测试通过
  ↓ [紧急清空]  ← 小窗口模型强制
任务 2 从 sdd-state.yaml 恢复
  ↓ 仅加载任务 2 所需上下文
任务 2 完整 TDD 循环
  ↓ 测试通过
  ↓ [紧急清空]
...
```

---

## 与共享规则的协同

apply 阶段在共享规则基础上，强化以下要点：

| 共享规则 | apply 强化点 |
|---------|------------|
| 上下文管理 | **每个 TDD 任务后清理**（最频繁） |
| 小窗口适配 | **任务级分段执行**（最细粒度） |
| 输出精简 | 测试结果摘要式输出 |

→ 共享规则参见 [xt-sdd-shared/references/](../../xt-sdd-shared/references/)

---

## sdd-state.yaml 任务字段增强

为支持任务级上下文恢复，建议增强任务字段：

```yaml
tasks:
  - id: N
    description: <任务描述>
    status: completed
    updated: <ISO 8601 时间戳>
    test_result: <pass/fail 摘要>
    checkpoint: complete
    # 增强字段
    files_modified: [<修改的文件列表>]
    key_decisions: [<实现中的关键决策>]
    group: <所属分组编号>
```

---

## 预期收益

| 场景 | 原流程 | 优化后 | 改善 |
|------|-------|--------|------|
| 5 个任务的 TDD 循环 | ~10000 tokens 累积 | ~3000 tokens（线性） | ~70% |
| 10 个任务的 TDD 循环 | ~20000 tokens（易爆） | ~5000 tokens | ~75% |
| 完整模式 subagent | 每个返回完整上下文 | 摘要式接收 | ~60% |
| 小窗口模型成功率 | 20%（3-5 任务后爆） | 80%（任务级分段） | +60% |
