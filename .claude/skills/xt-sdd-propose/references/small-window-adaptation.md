# 小窗口模型适配

本文档说明 `xt-sdd-propose` 对小窗口模型（glm-4.7、deepseek-flash）的适配策略。

## 目标

解决小窗口模型的上下文限制问题：
- 上下文窗口：8k-32k tokens（vs Claude 的 200k）
- 长对话容易中途爆掉
- 执行状态会缺失，导致无法恢复

**预期收益**：成功率从 30% → 80%

---

## 模型检测

### 检测逻辑

通过环境变量检测当前使用的模型：

```bash
# 检测是否为小窗口模型
is_small_window_model() {
  case "${MODEL_NAME:-}" in
    *glm*4*|*glm-4*|*deepseek*flash*)
      return 0  # 小窗口模型
      ;;
    *)
      return 1  # 大窗口模型
      ;;
  esac
}
```

### 小窗口模型列表

| 模型 | 上下文窗口 | 特征 |
|------|----------|------|
| glm-4-plus | ~128k | 较大，但仍需优化 |
| glm-4-air | ~128k | 较大，但仍需优化 |
| glm-4-flash | ~128k | 较大，但仍需优化 |
| deepseek-chat | ~32k | 小窗口 |
| deepseek-reasoner | ~64k | 中小窗口 |

---

## 轻量模式

### 模式对比

| 特性 | 标准模式 | 轻量模式 |
|------|---------|---------|
| 指令详细度 | 完整说明 | 精简到核心 |
| 历史保留 | 完整对话 | 仅 2-3 轮 |
| 清理频率 | 每 5 步 | 每 1-2 步 |
| 检查点保存 | 步骤完成 | 每个子操作 |
| 输出详细度 | 完整输出 | 摘要式 |

### 触发条件

```markdown
**轻量模式自动触发条件**：
1. 检测到小窗口模型（MODEL_NAME 包含 glm-4、deepseek）
2. 上下文已使用超过 40%（如果能检测）
3. 已完成 3+ 个步骤

**轻量模式特征**：
- 跳过详细说明，仅保留核心指令
- 每完成一个步骤后清空历史上下文
- 强制检查点保存
- 输出精简为摘要格式
```

---

## 紧急清空触发

### 触发条件

当满足以下任一条件时，触发紧急清空：

1. **已完成 3-4 个步骤**（小窗口模型）
2. **已使用超过 60% 的上下文窗口**（如果能检测）
3. **即将执行高 token 消耗操作**（如 openspec-propose）

### 清空后行为

```markdown
[上下文清空]

已保存进度到 sdd-state.yaml：
- checkpoint: <当前检查点>
- last_action: <最后执行的动作>
- current_objective: <下一步目标>

可忽略之前的详细对话，继续执行：
→ <下一步骤>
```

### 清空触发点

| 步骤 | 清空时机 | 保留内容 |
|------|---------|---------|
| 步骤 1 | Git 检查完成后 | checkpoint + git 状态 |
| 步骤 2 | 项目分析器完成后 | checkpoint + profile 信息 |
| 步骤 6 | 需求确认完成后 | checkpoint + 方案选择 |
| 步骤 7 每个 artifact | 每个 artifact 创建后 | checkpoint + artifact 列表 |

---

## 输出精简

### Git 状态

❌ **冗长输出**：
```
运行 git status --porcelain
输出:
M src/App.vue
M src/utils/auth.ts
?? src/new-feature.ts

更改统计:
 src/App.vue         | 10 ++--
 src/utils/auth.ts   | 5 +-
 src/new-feature.ts | 50 +++++++++++
 3 files changed, 65 insertions(+), 5 deletions(-)
```

✅ **精简输出**：
```
Git: 2M, 1A → 脏状态
```

### CLI 调用

❌ **冗长输出**：
```
运行 openspec status --change user-auth --json
输出:
{
  "change": "user-auth",
  "artifacts": [...],
  "applyRequires": ["tasks"],
  ...
}
```

✅ **精简输出**：
```
状态: proposal ✓, design ✓, specs pending, tasks pending
```

### Artifact 创建

❌ **冗长输出**：
```
创建 proposal.md

正在读取 instructions...
instructions JSON:
{
  "context": "...",
  "rules": "...",
  ...
}

根据 instructions 创建文件...
写入文件到 openspec/changes/user-auth/proposal.md
验证文件存在...
✓ proposal.md 创建成功
```

✅ **精简输出**：
```
✓ proposal.md 创建
```

---

## 中断恢复

### 增强结构

```yaml
# sdd-state.yaml 增强
interrupt_guard:
  # 最后成功完成的检查点
  last_successful_checkpoint: "proposal-created"

  # 执行到一半的步骤（如果中断）
  in_progress_step: "design-created"
  in_progress_action: "调用 openspec instructions design"

  # 保存的上下文片段（最小化）
  saved_context:
    change_name: "user-auth"
    last_artifact: "proposal.md"
    next_artifact: "design.md"

  # 模型类型标记
  model_type: "small-window"

  # 中断时间
  interrupted_at: "2025-01-15T10:30:00Z"
```

### 恢复逻辑

```markdown
**重新运行时**：

1. 检测到 sdd-state.yaml 存在
2. 读取 interrupt_guard.model_type
3. 如果是 small-window 且有中断：
   - 显示："从中断点恢复：checkpoint = <in_progress_step>"
   - 直接从中断步骤继续，而非从头开始
4. 清空 interrupt_guard（已恢复）
```

---

## 实施检查清单

- [ ] 添加模型检测逻辑到 SKILL.md
- [ ] 添加轻量模式说明
- [ ] 添加紧急清空触发条件
- [ ] 添加输出精简示例
- [ ] 更新 sdd-state.yaml 结构（interrupt_guard）
- [ ] 添加中断恢复逻辑

---

## 预期收益

| 场景 | 标准模式成功率 | 轻量模式成功率 | 提升 |
|------|-------------|-------------|------|
| 完整流程（8 步） | 30% | 80% | +50% |
| 断点恢复 | 50% | 90% | +40% |
| 长对话（10+ 轮） | 20% | 70% | +50% |
