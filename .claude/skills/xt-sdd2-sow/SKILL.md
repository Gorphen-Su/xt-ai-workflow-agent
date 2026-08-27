---
name: xt-sdd2-sow
description: Use when 目标仓库尚无 openspec/specs/ 主规格库而要启用 xt-sdd2 流程，用户说"初始化规格库"、"播种主库"、"冷启动"，或使用 /xt-sdd2:sow 时触发。一次性引导命令。
---

# xt-sdd2 · sow — 主规格库冷启动（一次性）

## 定位

扫描存量代码反推初版契约骨架。产物全部打低信任旗标 `[SOURCE: 反推][DRAFT]`——它们是对齐讨论的起点，**不是圣旨**，必须经用户逐域校准。

## 步骤

### 0. 依赖检查
- `openspec` CLI 可用性；不可用则提示 `npx @fission-ai/openspec init` 并等安装完成后继续
- **主库非空检测（2026-08-27 试点缺陷修复）**：`openspec/specs/` 已有内容时严禁按空库冷启动——转入**增量模式**：扫描现有域清单并向用户展示，本次只允许新增域或经用户仲裁后修改既有域；`project.md` 已存在则只补缺失的 frontmatter 键，不覆盖正文

### 1. 初始化 project.md
若 `openspec/project.md` 不存在，按 [shared·配置 schema](../xt-sdd2-shared/SKILL.md#openspecprojectmd-配置-schema) 创建 frontmatter，交互式收集：
- language（默认 zh-CN）
- authors 缩写登记表（谁用什么缩写署名卷宗）
- test_command / build_command（问用户拿真实命令，猜的不算）

### 2. 能力域归纳
用 codegraph_explore 做全域结构勘察（无索引时提示 `/xt-codegraph-init`），提炼 3~9 个 capability 候选（kebab-case）。展示清单请用户增删改名。

### 3. 逐域反推初稿
每个 capability 一份 `specs/<cap>/spec.md`：Requirement 从代码现状归纳（输入/行为/边界/异常），每条标注 `- ID: R-<cap>-NNN` 与旗标 `[SOURCE: 反推][DRAFT]`。
**每条 Requirement MUST 至少携带一个 `#### Scenario:`（WHEN/THEN）**——strict 校验强制此结构（2026-08-27 实测：缺场景在 land 复验即炸），归纳时一并写全，禁止"先立条目后补场景"。
单域超过 ~10 条 Requirement 时主动建议拆域，防止大杂烩能力域诞生。

### 4. 校准循环
逐域过目：用户确认 / 修正 / 删除伪契约（AI 编造但代码不存在的"应有行为"直接删）。修正后的条目移除 DRAFT 旗标仅移除`[DRAFT]`（保留 SOURCE 溯源）；未确认条目保持 DRAFT 并列入"待校准清单"写入报告。

### 5. 固化
一次性提交：`[sow] docs: 初始化主规格库骨架（N 域 M 条，其中 K 条待校准）`
输出总结报告：域列表、各域 Requirement 数、待校准项。之后所有变更走五命令管线。

## 边界

- 本命令不改任何生产代码，不建 changes 卷宗
- 用户要求跳过校准直接进入开发 → 允许，但所有条目保持 DRAFT，后续首个触碰该域的 draft 必须先把 DRAFT 条目处理掉（确认或删除）才能新增
