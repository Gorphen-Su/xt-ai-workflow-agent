# 上下文剪裁机制

本文档说明 `xt-sdd-propose` 的上下文剪裁机制，用于控制对话历史累积，保持 token 消耗线性增长。

## 目标

解决长对话中 token 消费呈指数增长的问题：

```
第 1 轮:  1000 tokens  (初始上下文)
第 2 轮:  1500 tokens  (+500 响应)
第 3 轮:  2500 tokens  (+1000 历史 + 500 响应)
第 4 轮:  4000 tokens  (+2000 历史 + 500 响应)
...
```

**优化后**：保持线性增长，每轮增加约 500-800 tokens。

---

## 核心策略

### 1. 状态优先对话模式

**原理**：将关键信息保存在 `sdd-state.yaml` 中，对话只关注当前任务

**断点恢复**：读取状态文件即可恢复上下文，无需加载历史对话

---

## context_summary 结构

### 扩展的 sdd-state.yaml

```yaml
version: 1
change: <变更名>

# 当前阶段和检查点
phase: propose
checkpoint: git-checked

# 上下文摘要（新增）
context_summary:
  # 最后执行的 action（一句话）
  last_action: "完成 Git 状态检查，仓库干净"

  # 关键决策列表（仅记录需要记住的）
  key_decisions:
    - "变更名称: 2025-01-15-user-auth"
    - "技术栈: TypeScript + Vue + Vite"
    - "方案选择: 方案 A - OAuth2 集成（理由：已有多系统 SSO 需求）"

  # 当前目标（下一步要做什么）
  current_objective: "执行项目分析器"

  # 用户反馈（需要记住的反馈）
  user_feedback:
    - "用户确认使用方案 A"
    - "用户要求保持向后兼容"

  # 已创建的 artifacts（用于去重判断）
  artifacts_created:
    - "proposal.md"
    - "design.md"

  # 缓存的关键信息（避免重新读取文件）
  project_info:
    languages: ["TypeScript"]
    frameworks: ["Vue", "Vite"]
    build_tool: "npm"

# 时间戳（用于判断信息新鲜度）
last_updated: "2025-01-15T10:30:00Z"

# ... 其他原有字段
```

---

## 使用场景

### 场景 1：步骤间切换

**读取 context_summary**：
```yaml
# 知道上一步做了什么
context_summary.last_action: "完成 Git 状态检查"

# 知道当前要做什么
context_summary.current_objective: "执行项目分析器"
```

**无需回顾对话历史**，直接从状态文件恢复上下文。

**完成后更新**：
```yaml
context_summary:
  last_action: "完成项目分析器"
  current_objective: "确定变更名称"
```

---

### 场景 2：断点恢复

**重新运行时**：

1. 读取 `sdd-state.yaml`
2. 检查 `checkpoint` 和 `context_summary`
3. 从 `last_action` 和 `current_objective` 恢复上下文
4. 继续执行，无需加载历史对话

**示例**：
```yaml
checkpoint: "requirements-confirmed"
context_summary:
  last_action: "完成需求澄清，确认方案 A"
  current_objective: "调用 openspec-propose 生成规格文档"
  key_decisions:
    - "方案选择: 方案 A - OAuth2 集成"
```

→ 直接知道要做什么，无需回顾之前的需求讨论过程。

---

### 场景 3：长对话优化

**每 2-3 个步骤后**：

1. 显示上下文归档提示
2. 更新 `context_summary`
3. 后续响应聚焦当前任务

**示例提示**：
```
✓ 项目分析器完成
- 语言: TypeScript
- 框架: Vue, Vite
- 构建工具: npm

[上下文归档] 以上信息已保存到 sdd-project-profile.yaml 和 sdd-state.yaml。
后续对话可忽略此步骤的详细分析过程。
```

---

## 执行规则

### 规则 1：进度跟踪用 TodoWrite

✅ **好**：
```javascript
TodoWrite([{
  content: "Git 状态检查",
  status: "completed"
}])
```

❌ **差**：
```
"已完成 Git 状态检查，仓库干净。现在进入下一步：项目分析器..."
```

---

### 规则 2：关键决策写入 sdd-state.yaml

**何时写入**：
- 方案选择后
- 技术栈确认后
- 用户给出重要反馈后

**写入示例**：
```yaml
context_summary:
  key_decisions:
    - "方案选择: 方案 A（理由：...）"
  user_feedback:
    - "用户要求保持向后兼容"
```

---

### 规则 3：精简工具调用输出

**Git 状态**：

❌ **冗长**：
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

✅ **精简**：
```
Git 状态: 2 个修改, 1 个新文件
→ 建议: 先提交或继续在脏状态下工作
```

**CLI 调用**：

❌ **冗长**：
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

✅ **精简**：
```
状态: proposal ✓, design ✓, specs pending, tasks pending
```

---

## 清理触发点

在以下节点后执行上下文清理：

| 节点 | 清理内容 | 保存位置 |
|------|---------|---------|
| 步骤 1 完成 | Git 状态 | sdd-state.yaml |
| 步骤 2 完成 | 项目分析结果 | sdd-project-profile.yaml + .project-cache.json |
| 步骤 6 完成 | 需求讨论结果 | sdd-state.yaml (context_summary) |
| 步骤 7 完成 | Artifacts 生成结果 | sdd-state.yaml (artifacts_created) |

---

## 预期收益

| 场景 | 原 token 消耗 | 优化后 | 减少 |
|------|-------------|--------|------|
| 5 轮对话 | ~6500 tokens | ~4000 tokens | ~40% |
| 10 轮对话 | ~15000 tokens | ~7000 tokens | ~50% |
| 断点恢复 | 需要 3000 tokens 历史上下文 | 只需 500 tokens 状态文件 | ~85% |

---

## 实施检查清单

- [x] SKILL.md 添加上下文管理规则
- [ ] sdd-state.yaml 结构扩展（在各阶段实施）
- [ ] execution.md 更新状态文件结构说明
- [ ] 各步骤完成后添加清理提示（SKILL.md 已完成）
