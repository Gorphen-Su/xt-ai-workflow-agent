---
name: sdd-verify
description: SDD 验证阶段 — 测试套件运行 + 规范合规检查，读取 sdd-project-profile.yaml 的 test_command，审查循环限制 5 轮，级联回退触发（执行归 sdd-plan），输出验证报告，强制用户确认。当用户说"验证实现"、"检查合规"、使用 /sdd:verify 时触发。
---

# SDD 验证阶段

SDD 规格驱动开发的第四阶段：双重验证确保实现既正确又合规。

## 铁律

1. **验证 MUST 包含双重检查：代码质量验证 + 规范合规验证**
2. **CRITICAL 问题 MUST 阻止通过，MUST NOT 忽略**
3. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**
4. **全局审查 MUST NOT 超过 5 轮**

## 执行步骤

### 步骤 1：确定当前变更

1. 读取变更目录下的 `sdd-state.yaml`，获取当前 change 名和 checkpoint
2. 如果 sdd-state.yaml 不存在，扫描 `openspec/changes/` 目录查找进行中的变更
3. 如果有多个 → 使用 AskUserQuestion 让用户选择

### 步骤 2：读取上下文

1. 读取变更目录下的所有产物：proposal.md、design.md、specs/、tasks.md、sdd-state.yaml
2. 读取 `openspec/sdd-project-profile.yaml`（如果存在），获取 test_command
3. 读取项目代码和测试文件

### 步骤 3：代码质量验证（测试套件运行）

1. 优先使用 `sdd-project-profile.yaml` 的 test_command 运行测试
2. 如果 sdd-project-profile.yaml 不存在或 test_command 为 null，临时推导测试命令（检查 package.json、Makefile、pytest.ini 等）
3. 运行完整的测试套件
4. 收集测试结果：通过数、失败数、跳过数、覆盖率（如有）
5. 如果有失败用例 → 在验证报告中标记

更新 sdd-state.yaml checkpoint: code-quality-done

### 步骤 4：规范合规检查（内置 spec-compliance-check）

#### 4a. 场景实现覆盖检查

1. 遍历 specs/ 下每个 spec.md 中的每个 Scenario
2. 检查对应的实现代码是否存在
3. 检查对应的测试用例是否存在
4. 未覆盖的场景标记为 CRITICAL

#### 4b. 架构决策遵循检查

1. 读取 design.md 中的 Decisions 部分
2. 检查实现代码是否遵循了每个 Decision
3. 偏离的决策标记为 WARNING

#### 4c. 排除范围违反检查

1. 读取 proposal.md 的 What Changes 部分
2. 检查实现代码是否包含了被排除的功能
3. 违反排除范围标记为 CRITICAL

#### 4d. 主规范兼容检查

1. 如果 `openspec/specs/` 下有主规范文件，读取并检查本次实现是否违反已有需求
2. 违反标记为 CRITICAL

更新 sdd-state.yaml checkpoint: compliance-done

### 步骤 5：问题分类

将发现的所有问题按严重程度分类：

| 级别 | 含义 | 示例 |
|------|------|------|
| CRITICAL | 必须修复，阻止通过 | spec 场景无实现覆盖、排除范围被违反 |
| WARNING | 建议修复 | 架构决策偏离、测试不充分 |
| SUGGESTION | 可选优化 | 代码风格、性能优化建议 |

### 步骤 6：生成验证报告

输出完整的验证报告，包含：

```
## 验证报告 - <change-name>

### 摘要
- 测试结果：<通过数>/<总数> 通过
- 规范合规：<CRITICAL数> CRITICAL / <WARNING数> WARNING / <SUGGESTION数> SUGGESTION
- 最终评估：✓ 通过 / ✗ 未通过

### 测试结果
<测试运行输出的摘要>

### 规范合规检查

#### CRITICAL（必须修复）
1. [场景名] 无实现覆盖
2. ...

#### WARNING（建议修复）
1. [决策名] 实现偏离
2. ...

#### SUGGESTION（可选优化）
1. ...
```

### 步骤 7：阶段完成确认

使用 AskUserQuestion 展示验证报告摘要，提供三个选项：
- **A. 通过，进入下一阶段**：更新 sdd-state.yaml（phase_checkpoints.verify: done），提示用户运行 `/sdd:archive`
- **B. 回到 implement 修复**：
  1. 检查 review_counters.global_review_rounds（在 sdd-state.yaml 中）
  2. 如果 rounds < 5 → 递增计数器，根据问题类型建议回到 sdd:implement（代码问题）或 sdd:plan（规范问题）
  3. 如果选择回到 sdd:plan → 在 sdd-state.yaml 的 cascade 字段写入回退意图（last_affected_phase: plan, invalidated_from: implement, reason: 验证发现规范偏离），更新 phase → plan，引导用户运行 `/sdd:plan`（级联重置由 sdd-plan 启动时统一处理）
  4. 如果 rounds ≥ 5 → 暂停，使用 AskUserQuestion 提示："审查已循环 5 次仍有 CRITICAL 问题，可能需要回到 sdd:plan 重新审视设计方案。"选项：A. 继续（额外 5 轮）/ B. 回到 sdd:plan
- **C. 暂停，稍后继续**：保存验证报告到变更目录，退出

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 phase_checkpoints.verify：

| checkpoint | 恢复动作 |
|-----------|---------|
| `entered` | 从步骤 3（代码质量验证）开始 |
| `code-quality-done` | 从步骤 4（规范合规检查）继续 |
| `compliance-done` | 从步骤 7（阶段完成确认）继续 |
| `done` | 已完成，可直接进入 archive |

## 判断规则

- 存在 CRITICAL → 评估为"未通过"，MUST 修复
- 仅有 WARNING → 可由用户决定是否通过
- 仅有 SUGGESTION → 评估为"通过"，附建议
- 不确定时 → 优先 SUGGESTION > WARNING > CRITICAL

## 常见问题

- "测试全部通过但规范合规有问题"：代码质量 ≠ 规范合规，两者必须同时满足
- "规范场景与测试不完全对应"：标记为 WARNING，建议补充测试
- "design.md 的决策已过时"：建议回到 sdd:plan 更新 design.md
- "审查超过 5 轮仍不通过"：系统会提示回退 sdd:plan 重新审视设计方案
