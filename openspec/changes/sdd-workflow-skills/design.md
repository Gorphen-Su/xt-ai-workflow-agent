## Context

当前项目使用 OpenSpec（规格文档管理）和 Superpowers（代码执行与 TDD）两套 AI 编程框架。OpenSpec 通过 `openspec` CLI 和 11 个 opsx:* 命令/skill 提供规格管理能力（explore/propose/apply/verify/archive/sync 等）。Superpowers 通过 skill 提供 TDD 循环、代码审查、调试、验证等执行能力。

两者在需求澄清、计划拆分、质量验证等环节存在重叠，且产物格式和术语不一致。用户需要记住何时用 opsx:*、何时用 superpowers:*，导致混用混乱。旧版 `xt-superpowers-openspec-workflow` skill 尝试编排两者，但暴露了过多内部细节，且主子需求管理增加了不必要的复杂度。

本项目已安装 OpenSpec CLI 和所有 opsx:* 命令，Superpowers skill 也已就绪。

## Goals / Non-Goals

**Goals:**

- 对用户隐藏 OpenSpec 和 Superpowers 的底层细节，提供统一的五阶段交互入口
- 每个阶段完成后强制用户确认，防止跳过
- 内置 bridge 转换（OpenSpec 产物 → 可执行计划格式），对用户透明
- 内置规范合规检查，确保实现与 specs 对齐
- 自动跟踪任务状态（未开始/执行中/测试中/已完成/已失败）和阶段进度
- 归档时合并双源信息，产出完整的归档记录
- 归档后提醒用户提交 git

**Non-Goals:**

- 不支持主子需求层级管理（每个需求独立）
- 不支持 git worktree（串行推进）
- 不重新实现 OpenSpec CLI 的能力（直接调用 opsx:* 命令）
- 不修改 OpenSpec CLI 本身的配置或行为
- 不处理飞书集成（超出本次范围）
- 不处理多变更并行推进

## Decisions

### 决策 1：Skill + Command 混合实现

**选择**：每个阶段一个 command（入口路由）+ 一个 skill（完整逻辑）

**理由**：与 OpenSpec 自身的架构模式一致。command 作为 `/sdd:*` 斜杠命令的入口，负责触发条件和参数解析；skill 承载完整的阶段逻辑。用户既可以通过 `/sdd:explore` 显式调用，也可以让 AI 根据 skill 的 description 自动匹配触发。

**备选**：
- 纯 command：逻辑写在 command 里，缺乏 skill 的自动触发能力
- 纯 skill：无法提供 `/sdd:*` 斜杠命令入口

### 决策 2：调用 opsx:* 命令 + Superpowers skill 作为底层执行

**选择**：SDD skill 直接调用 `openspec` CLI 命令（`openspec new change`、`openspec status`、`openspec instructions` 等）复用 OpenSpec 已有的能力，同时通过 Skill 工具显式调用 Superpowers skill（`superpowers:writing-plans`、`superpowers:subagent-driven-development`、`superpowers:verification-before-completion`、`superpowers:requesting-code-review`）复用 Superpowers 的代码执行能力

**理由**：OpenSpec CLI 已提供完整的规格管理能力，Superpowers skill 已提供完整的代码执行能力（TDD 循环、子代理开发、验证、代码审查），重新实现成本高且容易与上游不同步。现在 Claude Code 已支持在 skill 内部通过 Skill 工具显式调用其他 skill，之前的限制已解除。

**降级策略**：所有 Superpowers 调用点都有降级路径——当 Superpowers 不可用时，SDD 使用内联的自包含逻辑替代。

**备选**：
- 完全重新实现所有逻辑：工作量大，且上游更新后需要同步维护
- ~~调用 opsx:* skill：skill 是被 Claude Code 自动匹配的，不适合在 skill 内部显式调用另一个 skill~~（此限制已解除）

### 决策 3：Bridge 转换内置到 sdd-plan

**选择**：将 OpenSpec 产物到 Superpowers 可消费格式的转换逻辑内联到 `sdd-plan` skill 中

**转换规则**：
- `proposal.md` → 提供 Superpowers brainstorming 的上下文（但跳过 brainstorming 阶段）
- `design.md` → 作为 Superpowers planning 的输入
- `specs/` 中的"假设/当/则"场景 → 映射为 TDD 测试用例（每个场景至少需要正常路径 + 错误路径两个测试）
- `tasks.md` 中的每个任务 → 拆成 Superpowers plan 的粒度

**理由**：bridge 是衔接层逻辑，不需要独立暴露。内置后用户只需关心"计划阶段"，不需要理解两套工具的产物映射

### 决策 4：规范合规检查内置到 sdd-verify

**选择**：将 spec-compliance-check 逻辑内联到 `sdd-verify` skill 中

**检查步骤**：
1. 读取 `openspec/specs/` 下的主规范（检查是否违反已有需求）
2. 读取本次变更对应的 `openspec/changes/` 下的 delta 规范
3. 逐条检查每个"假设/当/则"场景是否有对应实现
4. 检查 `design.md` 中提到的架构决策是否被遵守
5. 检查 `proposal.md` 的排除范围是否被违反

**理由**：合规检查是验证阶段的自然组成部分，独立暴露会增加用户理解成本

### 决策 5：task-status.md 作为任务跟踪产物

**选择**：在变更目录下新增 `task-status.md`，头部记录阶段进度，下方记录任务明细

**结构**：
```markdown
# 任务状态 - <change-name>

## 阶段进度
explore:✓ plan:✓ implement:▶ verify:☐ archive:☐

## 任务明细
| # | 任务 | 状态 | 更新时间 | 测试结果 |
|---|------|------|---------|---------|
| 1 | ...  | 已完成 | ... | ✓ 3/3 |
```

**状态流转**：未开始 → 执行中（写实现代码）→ 测试中（跑 TDD 测试）→ 已完成/已失败

**理由**：OpenSpec 的 `tasks.md` 是静态清单，没有一个"活"的状态跟踪文件。`task-status.md` 补充这个能力，且保持简单

### 决策 6：归档产物 archive.md 合并双源信息

**选择**：归档时生成 `archive.md`，包含需求概要、技术方案、实现详情、规格变更、测试覆盖、Git 提交等完整记录

**理由**：OpenSpec 和 Superpowers 的归档信息分散在不同位置，合并后方便回溯历史决策

### 决策 7：变更目录命名规则

**选择**：`YYYY-MM-DD-<模块>-<子模块(可选)>-<功能>` 格式，纯 kebab-case

**示例**：`2026-05-15-user-auth-login`

**理由**：日期前缀保证排序，模块-功能后缀保证语义可读，纯 kebab-case 避免特殊字符

### 决策 8：用户确认交互模式

**选择**：每个阶段完成后展示产出摘要，通过 AskUserQuestion 提供三个选项：
- A. 通过，进入下一阶段
- B. 不通过，需要修改
- C. 暂停，稍后继续

**理由**：强制确认防止跳过，三选项覆盖常见场景。暂停后下次调用同一命令时，通过读取 `task-status.md` 头部的阶段进度自动恢复

## Risks / Trade-offs

**[OpenSpec CLI 版本兼容]** → SDD skill 依赖 `openspec` CLI 的 JSON 输出格式，CLI 大版本升级可能导致字段变化。缓解：skill 内部做优雅降级，JSON 解析失败时回退到文本模式

**[Superpowers skill 调用方式]** → ~~Superpowers 的 skill 是通过 Claude Code 自动匹配触发的，不能在 skill 内部显式调用。缓解：SDD skill 内联 Superpowers 的核心逻辑（TDD 循环、验证步骤），而非调用 Superpowers skill~~ 此限制已解除，SDD 现在通过 Skill 工具显式调用 Superpowers skill，同时保留降级路径。

**[单次会话上下文窗口]** → 长需求的实现阶段可能跨越多个会话，上下文可能丢失。缓解：`task-status.md` 记录完整进度，每次恢复时重新读取变更目录下的所有产物

**[5 个 skill + 5 个 command 的维护成本]** → 10 个文件需要维护。缓解：每个 skill 自包含，逻辑边界清晰，互不依赖
