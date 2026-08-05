---
name: xt-sdd-propose
description: xt-sdd 需求探索阶段 — 项目分析器、需求澄清、方案讨论、调用 openspec-propose 生成 proposal.md，初始化 sdd-state.yaml，强制用户确认。当用户说"探索需求"、"需求澄清"、"规格生成"、使用 /xt-sdd:propose 时触发。
---

# xt-sdd 需求探索阶段

xt-sdd 规格驱动开发的第一阶段：项目分析、需求澄清、方案讨论、产出 proposal.md 和初始化 sdd-state.yaml。

## 铁律

1. **此阶段 MUST NOT 编写任何生产代码或实现计划**
2. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**
3. **MUST 先检查 Git 状态和依赖，不能跳过**

## 上下文管理规则

**目标**：控制对话历史累积，保持 token 消耗线性增长，支持小窗口模型（glm-4.7、deepseek-flash）

### 小窗口模型自适应

**检测逻辑**：检查 MODEL_NAME 环境变量，如果包含 glm-4、deepseek-flash → 自动启用轻量模式

**轻量模式特征**：
- 跳过详细说明，仅保留核心指令
- 每完成一个步骤后清空历史上下文
- 强制检查点保存
- 输出精简为摘要格式

**小窗口模型列表**：glm-4-plus、glm-4-air、glm-4-flash、deepseek-chat、deepseek-reasoner

→ 详见 [references/small-window-adaptation.md](references/small-window-adaptation.md)

### 执行原则

1. **进度跟踪用 TodoWrite，不用对话累述**
   - ✅ 好：`TodoWrite: [{"content": "Git 状态检查", "status": "completed"}]`
   - ❌ 差：重复说"已完成 Git 状态检查，现在进入..."

2. **关键决策写入 sdd-state.yaml**
   - 将重要选择保存到状态文件的 `context_summary` 字段
   - 可从文件恢复，无需记忆对话历史
   - 示例：方案选择、技术栈确认、用户反馈

3. **每完成 2-3 个步骤，触发上下文归档**
   - 显示提示："步骤 X-Y 已完成，进度已保存。可忽略之前的详细对话。"
   - 后续响应聚焦当前任务，不再回顾历史细节

4. **精简工具调用输出**
   - Git status 只显示摘要，不贴完整输出
   - CLI 调用结果只显示关键信息
   - Read 工具只在必要时使用

**输出精简示例**：

| 类型 | 冗长输出 | 精简输出 |
|------|---------|---------|
| Git 状态 | 贴完整 git status 输出 | `Git: 2M, 1A → 脏状态` |
| CLI 调用 | 贴完整 JSON 输出 | `状态: proposal ✓, design ✓, specs pending` |
| Artifact 创建 | 详细说明创建过程 | `✓ proposal.md 创建` |

**轻量模式强制精简**：检测到小窗口模型时，所有输出自动使用精简格式。

### 清理触发点

在以下节点后执行上下文清理提示：
- 步骤 1 完成后（Git 检查）
- 步骤 2 完成后（项目分析器）
- 步骤 6 完成后（需求确认）
- 步骤 7 完成后（生成 artifacts）

### 紧急清空触发

**小窗口模型额外触发条件**：
- 已完成 3-4 个步骤时，自动触发紧急清空
- 即将执行高 token 消耗操作（如 openspec-propose）前

**清空后显示**：
```
[上下文清空]

已保存进度到 sdd-state.yaml：
- checkpoint: <当前检查点>
- last_action: <最后执行的动作>
- current_objective: <下一步目标>

可忽略之前的详细对话，继续执行：
→ <下一步骤>
```

### 状态优先对话模式

优先从 `sdd-state.yaml` 读取上下文，而非从对话历史：
- `context_summary.last_action` → 上一步做了什么
- `context_summary.key_decisions` → 关键决策列表
- `context_summary.current_objective` → 当前要做什么

断点恢复时，读取状态文件即可恢复上下文，无需加载历史对话。

→ 详见 [references/execution.md](references/execution.md#context-summary-结构)

## 执行步骤

### 步骤 0：前置条件检查

1. **OpenSpec CLI**：检查 `openspec/` 目录，无则提示 `npx @fission-ai/openspec init`
2. **Superpowers**：检测可用性，标记 `superpowers_available` 状态
3. **CodeGraph**：检查 `.codegraph/` 或 CLI 可用性，优先使用 codegraph 检索代码

→ 详细降级方案见 [references/troubleshooting.md](references/troubleshooting.md#降级方案)

### 步骤 1：Git 状态前置检查

```bash
git status --porcelain
git diff --stat
```

- 仓库干净 → 进入步骤 2
- 有脏状态 → AskUserQuestion 询问是否先提交

更新 `sdd-state.yaml` checkpoint: `git-checked`

**上下文归档**：Git 状态已记录，后续对话可忽略此步骤的详细输出。

### 步骤 2：项目分析器（仅首次运行）

**缓存优化**：优先检查缓存，关键文件未变更则跳过重新分析。

```bash
# 检查缓存是否有效
bash .claude/skills/xt-sdd-propose/scripts/cache-check.sh check
```

- 返回 `✓ 缓存有效` → 跳过分析，直接读取 `sdd-project-profile.yaml`
- 返回 `→ 缓存无效或不存在` → 执行完整项目分析

→ 详见 [references/project-cache.md](references/project-cache.md) 和 [scripts/README.md](scripts/README.md)

如果 `sdd-project-profile.yaml` 不存在且缓存无效，执行分析：

| 检测项 | 检测方式 |
|--------|---------|
| languages | 统计 `src/`、`lib/`、`app/` 下文件扩展名 |
| frameworks | 读取 package.json / pom.xml / go.mod 等 |
| build_tool | 检测根目录配置文件 |
| structure | 检测 monorepo 模式 |
| has_ci | 检测 CI 配置文件 |

→ 完整映射表见 [references/troubleshooting.md](references/troubleshooting.md#项目分析器详细规则)

分析完成后写入 `openspec/sdd-project-profile.yaml` 和 `.project-cache.json`。

更新 `sdd-state.yaml` checkpoint: `profiler-done`

**上下文归档**：项目分析结果已保存到 profile 和缓存，后续对话可忽略分析过程，直接读取文件。

### 步骤 3：确定变更名称

按 `YYYY-MM-DD-<模块>-<子模块(可选)>-<功能>` 格式生成目录名（kebab-case）

### 步骤 4：创建变更目录

```bash
openspec new change "<change-name>"
```

### 步骤 5：初始化 sdd-state.yaml

在变更目录下创建 `sdd-state.yaml`，结构详见 [references/execution.md](references/execution.md)

**git_baseline 初始化**：
```bash
git rev-parse HEAD  # 获取 start_sha
git status --porcelain  # 检查 dirty 状态
```

使用 Edit 工具填入字段。

### 步骤 6：探索与需求澄清

**CodeGraph 优先**：若可用，用 `codegraph explore <需求关键词>` 收集相关符号与调用链。

1. 与用户讨论需求，每次只问一个关键问题
2. 提出 2-3 个可行方案，列出优缺点，给出推荐方案
3. 使用 AskUserQuestion 确认方案选择

空白项目在此步骤一并确认技术栈。

更新 `sdd-state.yaml` checkpoint: `requirements-confirmed`

**上下文归档**：需求讨论结果已保存到 sdd-state.yaml 的 context_summary，可忽略讨论过程。

### 步骤 7：调用 openspec-propose 生成规格文档（支持断点恢复）

#### 7.0：检查断点状态

```bash
# 检查已完成的 artifacts，确定恢复点
STATE_FILE="openspec/changes/<变更名>/sdd-state.yaml" \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh check
```

- 如果所有 artifacts 已完成 → 跳过调用，直接进入 7.5 验证
- 如果部分完成 → 记录已完成项，继续调用生成缺失的
- 如果全部未完成 → 正常调用

→ 详见 [references/checkpoint-split.md](references/checkpoint-split.md)

#### 7.1：调用 openspec-propose

**建立 instructions 缓存**（为 plan 阶段复用准备，避免 plan 重复调用 `openspec instructions`）：
```bash
bash .claude/skills/xt-sdd-propose/scripts/instructions-cache.sh fetch "<变更名>"
```

1. 宣布："调用 openspec-propose 生成规格文档"
2. Skill 调用 `openspec-propose`，args 格式：
   ```
   Change name: <变更名>. Description: [项目: {languages} + {frameworks}, 构建: {build_tool}] <需求描述>
   ```
3. 忽略 "Run /opsx:apply" 建议，宣布 "回到 xt-sdd 流程"

→ 降级方案见 [references/troubleshooting.md](references/troubleshooting.md#openspec-propose-skill-不可用)

#### 7.2-7.4：更新 artifacts_status（分段检查点）

openspec-propose 完成后，逐个验证并更新状态：

```bash
# 验证所有 artifacts 文件存在
STATE_FILE="openspec/changes/<变更名>/sdd-state.yaml" \
  bash .claude/skills/xt-sdd-propose/scripts/resume-check.sh verify
```

逐个更新 `artifacts_status`：
- proposal: completed → checkpoint: `proposal-created`
- design: completed → checkpoint: `design-created`
- specs: completed → checkpoint: `specs-created`
- tasks: completed → checkpoint: `tasks-created`

#### 7.5：完成验证

更新 `sdd-state.yaml` checkpoint: `openspec-generated`

**上下文归档**：规格文档已生成，可忽略 openspec-propose 的详细执行过程，artifacts_status 已记录完成状态。

### 步骤 8：阶段完成确认

AskUserQuestion 展示 proposal.md 摘要：
- **A. 通过，进入下一阶段**：更新 sdd-state.yaml，提示运行 `/xt-sdd:plan`

  **阶段切换 /clear 提示**（上下文隔离）：
  ```
  ✓ propose 阶段完成

  所有进度已保存到 sdd-state.yaml（phase: propose, checkpoint: done）。

  【建议】运行 /clear 清除上下文，然后运行 /xt-sdd:plan 进入方案设计阶段。
  （断点恢复机制确保从正确位置继续）
  ```
  → 详见 [xt-sdd-shared/references/context-isolation-strategy.md](../xt-sdd-shared/references/context-isolation-strategy.md#策略-2阶段切换时建议-clear)

- **B. 不通过，需要修改**：回到步骤 6
- **C. 暂停，稍后继续**：保存进度，退出

## 参考文档

**阶段专属**：
- [execution.md](references/execution.md) — sdd-state.yaml 结构、checkpoint 定义、断点恢复
- [troubleshooting.md](references/troubleshooting.md) — 常见问题、降级方案
- [project-cache.md](references/project-cache.md) — 项目分析缓存机制
- [checkpoint-split.md](references/checkpoint-split.md) — 流程拆分检查点化

**共享优化规则**（提取至公共模块，各阶段通用）：
- [xt-sdd-shared/references/context-management.md](../xt-sdd-shared/references/context-management.md) — 通用上下文管理
- [xt-sdd-shared/references/small-window-adaptation.md](../xt-sdd-shared/references/small-window-adaptation.md) — 小窗口模型适配
- [xt-sdd-shared/references/cli-optimization.md](../xt-sdd-shared/references/cli-optimization.md) — CLI 调用优化

> propose 阶段的 [context-trimming.md](references/context-trimming.md)、[small-window-adaptation.md](references/small-window-adaptation.md)、[cli-optimization.md](references/cli-optimization.md) 为详细实现，通用规则已提取至共享模块。

## 常见问题速查

| 问题 | 处理 |
|------|------|
| 用户描述不明确 | 每次只问一个关键问题 |
| 多方案难选择 | 列优缺点对比，推荐+理由 |
| 需求范围过大 | 建议拆分为独立需求 |
| 分析器检测不准 | 运行时验证，环境问题阻塞 |
