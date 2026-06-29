---
name: xt-sdd-fix
description: xt-sdd Bug 修复入口 — 内置分诊判断（根因明确？修法明确？）自动路由到 propose/plan/apply，自动升级机制，简化文档格式，文档同步检查，聚焦验证。当用户说"修 Bug"、"修复问题"、"fix"、使用 /xt-sdd:fix 时触发。
---

# xt-sdd Bug 修复入口

Bug 修复专用入口，内置分诊逻辑，根据信息清晰度自动路由到合适的起始阶段，使用简化文档格式。

## 核心原则

- **分诊路由**：不是所有 Bug 都需要走完整 5 阶段
- **自动升级**：简单修复发现复杂度超预期时，自动升级到更高阶段
- **简化文档**：Bug 修复使用轻量级文档格式，不写完整的影响分析
- **聚焦验证**：验证范围聚焦修复点和影响范围，非全量回归

## 执行步骤

### 步骤 1：分诊判断

> 若 CodeGraph 可用，优先用 `codegraph explore <报错入口/相关关键词>` 一次拿到调用链与影响半径定位根因，替代反复 grep + read。详见 [CodeGraph × xt-sdd 提效指南 · fix](.claude/skills/xt-codegraph-init/references/codegraph-xt-sdd.md#fixbug-修复)。

分析用户描述 + 定位相关代码，在两个维度上评估：

```
根因明确？
  否 → propose（需要搞清楚问题是什么）
  是 → 修法明确？
         否 → plan（知道问题，修法需设计）
         是 → apply（直接修）
```

#### 分诊判断逻辑

| 维度 | 判断方式 | 示例 |
|------|---------|------|
| **根因明确？** | 用户描述是否指出了具体位置/原因，或代码扫描能定位 | "第 42 行空指针" → 是 / "登录后白屏" → 否 |
| **修法明确？** | 修复方式是否唯一或显而易见，不存在多种方案的选择 | "加 null 检查" → 是 / "缓存并发问题" → 否 |

#### 分诊结果确认

向用户展示分诊结果和路由建议：

```
分诊判断：
- 根因：明确/不明确
- 修法：明确/不明确
- 路由：apply / plan / propose

是否同意此路由？
```

使用 AskUserQuestion 让用户确认或调整路由。

### 步骤 2：创建 fix 变更目录

1. 使用 `fix-<简述>` 格式命名（如 `fix-null-pointer-login`）
2. 运行 `openspec new change "fix-<简述>"` 创建变更目录
3. 初始化 sdd-state.yaml，包含 metrics 段结构（仅 git_baseline，文件/行数/token 统计由 `/xt-metrics` 按需计算），phase 设为路由目标阶段：

```yaml
version: 1
change: <fix-简述>

phase: <路由目标阶段>
checkpoint: entered

phase_checkpoints:
  propose: null
  plan: null
  apply: null
  verify: null
  archive: null

superpowers_available: <true 或 false>

tasks: []

review_counters:
  global_review_rounds: 0
  task_retries: {}

cascade:
  last_affected_phase: null
  invalidated_from: null
  reason: null
  preserved_tasks: []

metrics:
  git_baseline:
    start_sha: null
    start_time: null
    end_sha: null
    end_time: null
    dirty: false
```

**Metrics 初始化操作：**

1. 执行 `git rev-parse HEAD` 获取当前 commit SHA
2. 执行 `git status --porcelain` 检查工作区是否干净
3. 将获取的数据填入 sdd-state.yaml 的 metrics 段：
   - `metrics.git_baseline.start_sha` ← `git rev-parse HEAD` 的输出
   - `metrics.git_baseline.start_time` ← 当前 ISO 8601 时间戳
   - `metrics.git_baseline.dirty` ← 工作区干净则为 `false`，有未提交更改则为 `true`
4. 使用 Edit 工具更新 sdd-state.yaml 文件中对应字段

### 步骤 3：按路由执行

根据分诊结果，执行对应阶段的流程，但使用**简化文档格式**。

#### 3a. 路由到 propose

执行需求澄清 → 生成简化 proposal.md：

```markdown
# Bug 修复提案 - fix-<简述>

## Bug 描述
<现象描述>

## 根因分析
<定位到的原因>

## 修复方案
<修法概述>

## 影响范围
<影响的模块/文件>
```

完成后 → 路由到 plan 或 apply（根据修复方案复杂度决定）。

#### 3b. 路由到 plan

生成简化 plan.md：

```markdown
# 修复计划 - fix-<简述>

## 修复步骤
- [ ] Step 1: ...
- [ ] Step 2: ...

## 影响分析
- 涉及文件：...
- 关联 specs：...
- 文档同步：无/specs影响/design影响
```

完成后 → 路由到 apply。

#### 3c. 路由到 apply

直接执行修复：
1. 读取相关代码
2. 执行 TDD 循环（RED → GREEN → REFACTOR）
3. 编译检查
4. 提交代码

### 步骤 4：自动升级机制

在 apply 执行过程中，如果发现复杂度超预期：

1. **触发条件**（满足任一）：
   - 修复涉及 3 个以上文件
   - 修复影响多个模块的接口
   - 修复引入了新的行为变更（不仅仅是修正错误行为）
   - 修复需要修改其他变更的代码

2. **升级处理**：
   - 暂停当前实现
   - 向用户说明升级原因："修复复杂度超预期：<具体原因>"
   - 使用 AskUserQuestion 提供选项：
     - **继续 apply**：按照当前方向继续，接受额外复杂度
     - **升级到 plan**：暂停实现，回到 plan 阶段产出完整方案
   - 用户选择升级到 plan → 更新 sdd-state.yaml（phase: plan），引导运行 `/xt-sdd:plan`

### 步骤 5：verify 聚焦验证

fix 流程的 verify 使用**聚焦验证**，非全量回归：

1. **文档同步检查**（前置步骤）：
   - 扫描修复涉及的代码变更
   - 对比现有 specs/design
   - 按影响级别处理：

   | 影响级别 | 判断标准 | 操作 |
   |----------|---------|------|
   | 无文档影响 | 修复不改变外部可观察行为（如空指针、边界检查） | 跳过 |
   | specs 影响 | 修复改变了 specs 中描述的行为 | 更新 specs/ |
   | design 影响 | 修复改变了架构决策 | 更新 design.md + specs/ |

2. **聚焦测试**：只运行与修复点直接相关的测试，非全量回归
3. **影响范围验证**：验证修复未破坏直接关联的功能
4. **代码审查**：Superpowers 可用时调用代码审查，不可用时跳过

### 步骤 6：简化归档

fix 流程使用简化归档：

**建议运行 /xt-metrics**：归档完成后，提示用户"建议运行 `/xt-metrics report` 更新项目统计数据"。

```markdown
# 归档记录 - fix-<简述>

## Bug 描述
<简要描述>

## 修复内容
<修复了什么>

## 文档同步
- 影响级别：无/specs/design
- 更新的文档：<文件列表>

## 验证结果
- 聚焦测试：<通过数>/<总数>
- 影响范围验证：通过/未通过
```

### 步骤 7：Git 提交提示

1. 展示修复涉及的文件清单
2. 提示用户提交 Git
3. commit message 格式：`fix(<范围>): <修复描述>`

## 与完整流程的关系

`/xt-sdd:fix` 不是独立的新流程，而是**完整流程的智能入口**：
- 走的仍然是同样的 sdd-state.yaml 状态管理
- 走的仍然是同样的 verify 阶段（只是验证范围聚焦）
- 走的仍然是同样的 archive 阶段（只是文档格式简化）
- 只是根据分诊结果跳过了不需要的前置阶段

```
完整流程：propose → plan → apply → verify → archive
fix 流程：[propose?] → [plan?] → apply → verify(聚焦) → archive(简化)
```

## 断点恢复

fix 流程的断点恢复与对应阶段的恢复逻辑一致，由 sdd-state.yaml 的 phase 和 checkpoint 驱动。

## 常见问题

- "分诊判断错误"：自动升级机制会在 apply 中发现复杂度超预期时暂停并询问用户
- "Bug 实际是需求变更"：如果在 fix 流程中发现需要新增功能而非修复，提示用户退出 fix 流程，改用 `/xt-sdd:propose` 走完整流程
- "fix 和完整流程可以混用吗"：可以，fix 路由到 propose 后，后续流程与完整流程完全一致
