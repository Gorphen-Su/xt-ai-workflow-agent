# 通用上下文管理规则

本文档定义 xt-sdd 所有阶段共享的上下文管理规则，控制对话历史累积，保持 token 消耗线性增长。

## 目标

解决长对话中 token 消费呈指数增长的问题，支持小窗口模型（glm-4.7、deepseek-flash）。

---

## 执行原则

### 1. 进度跟踪用 TodoWrite，不用对话累述

- ✅ 好：`TodoWrite: [{"content": "Git 状态检查", "status": "completed"}]`
- ❌ 差：重复说"已完成 Git 状态检查，现在进入..."

### 2. 关键决策写入 sdd-state.yaml

将重要选择保存到状态文件的 `context_summary` 字段，可从文件恢复，无需记忆对话历史。

**写入时机**：
- 方案选择后
- 技术栈确认后
- 用户给出重要反馈后
- 阶段切换时

### 3. 每完成 2-3 个步骤，触发上下文归档

- 显示提示："步骤 X-Y 已完成，进度已保存。可忽略之前的详细对话。"
- 后续响应聚焦当前任务，不再回顾历史细节

### 4. 精简工具调用输出

| 类型 | 冗长输出 | 精简输出 |
|------|---------|---------|
| Git 状态 | 贴完整 git status 输出 | `Git: 2M, 1A → 脏状态` |
| CLI 调用 | 贴完整 JSON 输出 | `状态: proposal ✓, design ✓, specs pending` |
| 文件创建 | 详细说明创建过程 | `✓ proposal.md 创建` |
| 测试结果 | 贴完整测试输出 | `测试: 15/15 通过` |

---

## 状态优先对话模式

优先从 `sdd-state.yaml` 读取上下文，而非从对话历史：

| 字段 | 用途 |
|------|------|
| `context_summary.last_action` | 上一步做了什么 |
| `context_summary.key_decisions` | 关键决策列表 |
| `context_summary.current_objective` | 当前要做什么 |
| `context_summary.user_feedback` | 用户反馈 |

**断点恢复时**：读取状态文件即可恢复上下文，无需加载历史对话。

---

## context_summary 结构

各阶段共享的上下文摘要结构：

```yaml
context_summary:
  last_action: <最后执行的 action，一句话>
  key_decisions:
    - "<决策描述>"
  current_objective: <当前目标，下一步要做什么>
  user_feedback:
    - "<反馈内容>"
  artifacts_created:
    - "<artifact 文件名>"
```

---

## 清理触发点

### 通用清理节点

每个阶段在以下节点执行上下文清理：
- 高 token 消耗操作完成后（如 skill 调用、CLI 批量调用）
- 阶段内步骤切换时
- 用户确认操作后

### 清理提示格式

```
[上下文归档]

已保存进度到 sdd-state.yaml：
- checkpoint: <当前检查点>
- last_action: <最后执行的动作>

可忽略之前的详细对话，继续执行：
→ <下一步骤>
```

---

## 各阶段应用要点

| 阶段 | 关键应用点 |
|------|----------|
| propose | 需求澄清多轮对话后归档；openspec-propose 调用后归档 |
| plan | 按 N 分组调用 writing-plans 之间归档 |
| apply | **每个 TDD 任务完成后归档**（最关键） |
| verify | 审查循环每轮之间归档 |
| quick | 复用 apply 的清理规则 |
| archive | 双源合并读取后归档 |

---

## 预期收益

| 场景 | 原 token 消耗 | 优化后 | 减少 |
|------|-------------|--------|------|
| 5 轮对话 | ~6500 tokens | ~4000 tokens | ~40% |
| 10 轮对话 | ~15000 tokens | ~7000 tokens | ~50% |
| 断点恢复 | ~3000 tokens 历史上下文 | ~500 tokens 状态文件 | ~85% |
