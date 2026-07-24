---
name: xt-sdd-verify
description: xt-sdd 验证阶段 — 文档同步检查（前置）+ 代码质量验证 + 规范合规检查 + 代码审查，审查循环限制 5 轮，级联回退触发，输出验证报告，强制用户确认。当用户说"验证实现"、"检查合规"、"代码审查"、使用 /xt-sdd:verify 时触发。
---

# xt-sdd 验证阶段

xt-sdd 规格驱动开发的第四阶段：文档同步 + 双重验证确保实现既正确又合规。

## 铁律

1. **验证 MUST 包含三步：文档同步检查（前置）→ 代码质量验证 → 规范合规验证**
2. **CRITICAL 问题 MUST 阻止通过，MUST NOT 忽略**
3. **此阶段 MUST NOT 新增功能代码，只允许修复审查发现的问题**
4. **全局审查 MUST NOT 超过 5 轮**
5. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**

## 执行步骤

### 步骤 1：确定当前变更

1. 读取变更目录下的 `sdd-state.yaml`，获取当前 change 名和 checkpoint
2. 如果 sdd-state.yaml 不存在，扫描 `openspec/changes/` **顶层目录**（排除 `openspec/changes/archive/` 归档子目录），查找进行中的变更
3. 如果有多个 → 使用 AskUserQuestion 让用户选择

### 步骤 2：读取上下文（按需，非全量）

1. 必读：`sdd-state.yaml`（任务最终状态、审查计数）、`tasks.md`（任务清单）
2. 读取 `openspec/sdd-project-profile.yaml`（如果存在），获取 test_command 和 compile_command
3. 通过 `git diff`（见步骤 3a）确定本次变更涉及的 capability / 文件，**仅读取受影响的 `specs/<capability>/spec.md` 与 design.md 相关章节**，MUST NOT 一上来全量读取所有 specs/proposal/design
4. 定位/理解代码与测试遵循 CLAUDE.md 的 codegraph 纪律：先用 `codegraph_explore`（MCP）或 `codegraph explore`（CLI）定位变更涉及的符号与调用链，禁止 grep + read 整文件。详见 [CodeGraph × xt-sdd 提效指南 · verify](.claude/skills/xt-codegraph-init/references/codegraph-xt-sdd.md#verify验证回归)

### 步骤 3：文档同步检查（前置步骤）

在合规验证之前，先执行文档同步检查：扫描代码变更 → 对比现有 specs/design → 按影响级别更新文档。

**核心判断标准**：修复是否改变了外部可观察的行为？

#### 3a. 扫描代码变更

1. 运行 `git diff` 获取本次变更涉及的所有代码改动
2. 提取改动涉及的模块、接口、行为变更

#### 3b. 对比 specs/design（单次遍历，同时收集文档同步与覆盖信息）

**只遍历一次** specs（避免与步骤 5a 重复遍历），对每个 spec.md 的每个 Scenario 同时记录两份信息：

1. 读取**受本次变更影响**的 specs（由 3a 的 git diff 圈定，非全量），逐 Scenario 检查：
   - **文档同步维度**：该 Scenario 描述的行为是否与代码变更一致（用于步骤 3c 的文档更新决策）
   - **覆盖维度**：该 Scenario 是否有对应实现代码、是否有对应测试用例（**记录到中间清单**，供步骤 5a 直接复用，不再重复遍历）
2. 读取 design.md 中的 Decisions 部分，检查架构决策是否被代码变更改变

> 覆盖清单在内存/草稿中保留，步骤 5a 直接读取，MUST NOT 再次遍历 specs。

#### 3c. 按影响级别处理

| 影响级别 | 判断标准 | 操作 |
|----------|---------|------|
| 无文档影响 | 代码变更不改变外部可观察行为（如空指针修复、边界检查） | 跳过，不做文档更新 |
| specs 影响 | 代码变更改变了 specs 中描述的行为但未改变架构决策 | 更新 specs/ 下的对应文件 |
| design 影响 | 代码变更改变了 design.md 中的架构决策 | 更新 design.md + specs/ 下的对应文件 |

#### 3d. 用户确认

如果检测到文档影响，向用户展示：
- 哪些行为发生了变化
- 建议更新的文档和更新内容
- 使用 AskUserQuestion 确认是否执行文档同步

更新 sdd-state.yaml checkpoint: doc-sync-done

### 步骤 4：代码质量验证

> **CodeGraph 同步检查**：运行 `codegraph affected` 前，确保 CodeGraph 索引最新。代码修改后 daemon 会自动同步，但如查询结果可疑或切换分支后，先运行 `codegraph status` 检查时间戳，必要时 `codegraph index --force` 重建。

> **精准回归**：若 CodeGraph 可用，用 `codegraph affected <变更文件...>` 只跑受本次改动影响的测试（替代全量套件），显著提升验证效率。

#### 4a. 调用 `superpowers:verification-before-completion`（需要 Superpowers）

如果 sdd-state.yaml 的 `superpowers_available` 为 true：

1. 使用 Skill 工具调用 `superpowers:verification-before-completion`
2. 传入 test_command（来自 sdd-project-profile.yaml）
3. 如果 test_command 为 null，自动跳过测试运行
4. 收集验证结果：通过数、失败数、跳过数、覆盖率（如有）
5. 如果有失败用例 → 在验证报告中标记

**降级路径**：如果 Superpowers 不可用或调用失败，使用 4b 的内联验证逻辑。

#### 4b. 内联验证（降级模式）

1. 优先使用 `sdd-project-profile.yaml` 的 test_command 运行测试
2. 如果 sdd-project-profile.yaml 不存在或 test_command 为 null，临时推导测试命令（检查 package.json、Makefile、pytest.ini 等）
3. 运行完整的测试套件
4. 收集测试结果：通过数、失败数、跳过数、覆盖率（如有）
5. 如果有失败用例 → 在验证报告中标记

更新 sdd-state.yaml checkpoint: code-quality-done

### 步骤 5：规范合规检查

#### 5a. 场景实现覆盖检查（复用步骤 3b 的覆盖清单）

1. 直接读取步骤 3b 遍历时记录的覆盖清单（**MUST NOT 再次遍历 specs**）
2. 未覆盖的 Scenario 标记为 CRITICAL

#### 5b. 架构决策遵循检查

1. 读取 design.md 中的 Decisions 部分
2. 检查实现代码是否遵循了每个 Decision
3. 偏离的决策标记为 WARNING

#### 5c. 排除范围违反检查

1. 读取 proposal.md 的 What Changes 部分
2. 检查实现代码是否包含了被排除的功能
3. 违反排除范围标记为 CRITICAL

#### 5d. 主规范兼容检查

1. 如果 `openspec/specs/` 下有主规范文件，读取并检查本次实现是否违反已有需求
2. 违反标记为 CRITICAL

更新 sdd-state.yaml checkpoint: compliance-done

### 步骤 6：代码审查（需要 Superpowers）

如果 sdd-state.yaml 的 `superpowers_available` 为 true，调用 Superpowers 的代码审查 skill：

1. 使用 Skill 工具调用 `superpowers:requesting-code-review`
2. 审查结果按严重程度分类：
   - **Critical**：必须修复
   - **Important**：建议修复
   - **Suggestion**：可选优化
3. 如果发现 Critical 或 Important 问题：
   - 逐个修复（注意：只修复问题，不新增功能）
   - 修复后重新走文档同步检查 + 代码质量验证 + 代码审查（回到步骤 3）
4. 审查循环不超过 5 轮（与 review_counters.global_review_rounds 一致）
5. 超过 5 轮仍有 Critical → 建议回退到 xt-sdd-plan

更新 sdd-state.yaml checkpoint: code-reviewed

**降级路径**：如果 Superpowers 不可用，跳过代码审查步骤，直接进入步骤 7。

### 步骤 7：问题分类

将发现的所有问题按严重程度分类：

| 级别 | 含义 | 示例 |
|------|------|------|
| CRITICAL | 必须修复，阻止通过 | spec 场景无实现覆盖、排除范围被违反 |
| WARNING | 建议修复 | 架构决策偏离、测试不充分 |
| SUGGESTION | 可选优化 | 代码风格、性能优化建议 |

### 步骤 8：生成验证报告

输出完整的验证报告：

```markdown
## 验证报告 - <change-name>

### 摘要
- 测试结果：<通过数>/<总数> 通过
- 规范合规：<CRITICAL数> CRITICAL / <WARNING数> WARNING / <SUGGESTION数> SUGGESTION
- 文档同步：<已更新/无需更新>
- 最终评估：✓ 通过 / ✗ 未通过

### 文档同步检查
- 影响级别：无/specs/design
- 已更新的文档：<文件列表>

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

### 步骤 9：阶段完成确认

使用 AskUserQuestion 展示验证报告摘要，提供三个选项：
- **A. 通过，进入下一阶段**：更新 sdd-state.yaml（phase_checkpoints.verify: done），提示运行 `/xt-sdd:archive`
- **B. 回到 apply 修复**：
  1. 检查 review_counters.global_review_rounds
  2. 如果 rounds < 5 → 递增计数器，根据问题类型建议回到 xt-sdd:apply（代码问题）或 xt-sdd:plan（规范问题）
  3. 如果选择回到 xt-sdd:plan → 在 sdd-state.yaml 的 cascade 字段写入回退意图
  4. 如果 rounds >= 5 → 提示"审查已循环 5 次仍有 CRITICAL 问题"，选项：继续（额外 5 轮）/ 回到 plan
- **C. 暂停，稍后继续**：保存验证报告到变更目录，退出

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 phase_checkpoints.verify：

| checkpoint | 恢复动作 |
|-----------|---------|
| `entered` | 从步骤 3（文档同步检查）开始 |
| `doc-sync-done` | 从步骤 4（代码质量验证）继续 |
| `code-quality-done` | 从步骤 5（规范合规检查）继续 |
| `compliance-done` | 从步骤 6（代码审查）继续 |
| `code-reviewed` | 从步骤 9（阶段完成确认）继续 |
| `done` | 已完成，可直接进入 archive |

## 判断规则

- 存在 CRITICAL → 评估为"未通过"，MUST 修复
- 仅有 WARNING → 可由用户决定是否通过
- 仅有 SUGGESTION → 评估为"通过"，附建议
- 不确定时 → 优先 SUGGESTION > WARNING > CRITICAL

## 常见问题

- "测试全部通过但规范合规有问题"：代码质量 ≠ 规范合规，两者必须同时满足
- "规范场景与测试不完全对应"：标记为 WARNING，建议补充测试
- "design.md 的决策已过时"：建议回到 xt-sdd:plan 更新 design.md
- "审查超过 5 轮仍不通过"：系统会提示回退 plan 重新审视设计方案
