# 归档记录 - xt-sdd-fix-metrics-init

## 需求概要

**Why**：当前 xt-sdd 的 metrics tracking 功能仅在 propose 阶段初始化。当用户通过 `/xt-sdd:fix` 入口进入时，fix 流程的分诊路由可能跳过 propose 阶段直接进入 apply，导致 sdd-state.yaml 中的 metrics 段缺少关键初始化数据。

**What Changes**：在 xt-sdd-fix SKILL.md 步骤 2 中增加 ccusage 可用性检测、完整 metrics 段模板、Git start_sha 记录和 fix-init Token 快照。

## 技术方案

### 决策 1：在 fix 步骤 2 中内联 metrics 初始化
直接在 xt-sdd-fix SKILL.md 中写入完整初始化逻辑，与 propose 保持一致，确保自包含性。

### 决策 2：fix-init 快照作为初始 Token 数据点
使用 `phase: fix-init` 标识初始化快照，与 fix 步骤 1 的 `phase: fix` 快照区分开。

## 实现详情

### 任务执行记录

所有 6 个任务均以轻量模式完成：

| 分组 | 任务 | 状态 | 测试结果 |
|------|------|------|---------|
| 1. fix 步骤 2 增加 metrics 初始化 | 1-3 | ✅ 完成 | ccusage 检测一致性 ✅ / 模板完整性 ✅ / 快照覆盖 ✅ |
| 2. 验证 | 4-6 | ✅ 完成 | 8/8 Scenario 覆盖 |

### 审查记录
- 审查轮次：1 轮
- 第 1 轮发现 1 Important（步骤编号断裂）+ 2 Suggestion，Important 已修复

## 规格变更

### ADDED Requirements

**fix-metrics-init/spec.md**（3 个 Requirement，8 个 Scenario）：
- fix 流程步骤 2 执行 ccusage 可用性检测（已安装/安装成功/安装失败）
- fix 流程步骤 2 记录 Git 基线 SHA（正常/脏状态）
- fix 流程步骤 2 记录 fix-init Token 快照（可用/不可用/执行失败）

## 测试覆盖

- **结构验证**：8/8 spec 场景覆盖通过
- **一致性验证**：ccusage 检测逻辑与 propose 完全一致
- **完整性验证**：sdd-state.yaml 模板包含所有 metrics 字段
- **降级验证**：三种降级路径完整
- **代码审查**：1 轮，1 Important（编号断裂）已修复

## 文档同步记录

- **影响级别**：无（所有代码变更与 ADDED specs 完全对应）
- **修复项**：步骤 2 编号断裂（将 Metrics 前置检测纳入编号体系）

## 级联回退记录

无级联回退事件。

## 任务执行统计
- 总任务数：6
- 已完成：6
- 已失败：0
- 审查轮次：1
- 执行时间范围：2026-06-05T19:30:00+08:00 - 2026-06-05T20:45:00+08:00
