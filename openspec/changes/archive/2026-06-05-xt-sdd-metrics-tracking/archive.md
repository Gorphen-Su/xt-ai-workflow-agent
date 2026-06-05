# 归档记录 - xt-sdd-metrics-tracking

## 需求概要

**Why**：当前 xt-sdd 工作流缺乏对功能需求演进过程的量化度量能力。开发者在完成一个完整的 propose → plan → apply → verify → archive 流程后，无法得知：新增/编辑了多少文件、新增/变更了多少代码行、以及在整个过程中消费了多少 Token。

**What Changes**：
- sdd-state.yaml 新增 metrics 段（git_baseline、file_stats、line_stats、token_usage）
- propose 阶段记录起始 SHA 和 ccusage 环境检测
- 各阶段切换时收集 Token 数据（通过 ccusage）
- archive 阶段生成汇总报告 metrics-report.md
- 修改 xt-sdd 六个阶段 skill 文件

## 技术方案

### 决策 1：文件/代码行统计基于 Git Diff
在 propose 阶段记录起始 commit SHA，archive 阶段执行 `git diff --name-status` 和 `git diff --numstat` 计算统计。Git Diff 是最可靠的文件变更来源。

### 决策 2：Token 统计集成 ccusage（含自动安装）
在每个阶段切换时调用 `npx ccusage session --json`。propose 阶段自动检测并安装 ccusage，安装失败时降级处理不阻塞流程。

### 决策 3：sdd-state.yaml 新增 metrics 段
直接扩展现有 sdd-state.yaml 结构，包含 git_baseline、file_stats、line_stats、token_usage 子段。

### 决策 4：每个阶段 skill 的最小侵入修改
仅在关键检查点追加 metrics 收集指令，不改变核心流程。

## 实现详情

### 任务执行记录

所有 16 个任务均以轻量模式（内联 TDD）完成：

| 分组 | 任务 | 状态 | 测试结果 |
|------|------|------|---------|
| 1. Metrics 段结构定义 | 1-3 | ✅ 完成 | 结构完整、字段覆盖 |
| 2. ccusage 检测与 Token 快照 | 4-10 | ✅ 完成 | 六阶段格式一致、降级完整 |
| 3. Git Diff 文件与行数统计 | 11 | ✅ 完成 | 包含基线缺失处理、脏状态检查 |
| 4. Token 数据汇总 | 12 | ✅ 完成 | 包含无数据降级 |
| 5. Metrics Report 生成 | 13 | ✅ 完成 | 模板完整、部分缺失处理 |
| 6. 验证与测试 | 14-16 | ✅ 完成 | 端到端验证通过 |

### 审查记录
- 审查轮次：2 轮
- 第 1 轮发现 3 Important + 5 Suggestion，全部修复

## 规格变更

### ADDED Requirements

**git-diff-metrics/spec.md**（8 个 Scenario）：
- Propose 阶段记录 Git 基线（正常/脏状态）
- Archive 阶段计算文件变更统计（正常/无变更/基线缺失）
- Archive 阶段计算代码行数统计（正常/区分二进制文件）
- Metrics 段初始化

**token-tracking/spec.md**（8 个 Scenario）：
- ccusage 可用性检测与自动安装（已安装/安装成功/安装失败）
- 阶段切换时记录 Token 快照（正常/不可用/执行失败）
- Archive 阶段汇总 Token 数据（计算总量/无可用数据）

**metrics-report/spec.md**（5 个 Scenario）：
- 生成完整报告（内容/格式）
- 部分数据缺失时生成报告
- 报告作为归档产物
- 无 metrics 数据时的归档

## 测试覆盖

- **结构验证**：20/20 spec 场景覆盖通过
- **格式验证**：6/6 SKILL.md frontmatter 和内容格式一致
- **降级路径验证**：ccusage 不可用/执行失败/基线缺失 三种降级路径完整
- **端到端验证**：propose → archive 步骤链完整性验证通过
- **代码审查**：2 轮，3 Important + 5 Suggestion 全部修复

## 文档同步记录

- **影响级别**：无（所有代码变更为新增行为，与 ADDED specs 完全对应）
- **修复的文档一致性**：
  1. token-tracking spec 补充 fix 阶段
  2. design.md 删除未实现的 `lines_modified` 字段
  3. fix SKILL.md 增加 metrics 汇总指引

## 级联回退记录

无级联回退事件。

## 任务执行统计
- 总任务数：16
- 已完成：16
- 已失败：0
- 审查轮次：2
- 执行时间范围：2026-06-05T12:00:00+08:00 - 2026-06-05T19:10:00+08:00
