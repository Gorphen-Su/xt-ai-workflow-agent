# 项目配置

## 语言偏好

**所有对话、代码注释、文档和输出内容必须使用中文。**

- 与用户的对话使用中文
- 代码注释使用中文
- 生成的文档使用中文
- 错误信息使用中文
- 提交信息使用中文

## SDD 规格驱动开发

本项目使用 SDD（Spec-Driven Development）工作流，统一封装 OpenSpec（规格管理）和 Superpowers（代码执行）的能力。

**核心纪律：先探索、再锁规范、最后严谨执行。**

### 五阶段命令

| 阶段 | 命令 | 说明 | 产出 |
|------|------|------|------|
| 探索 | `/sdd:explore` | 需求澄清与方案讨论 | proposal.md |
| 计划 | `/sdd:plan` | 生成规范产物 + bridge 转换 | design.md、specs/、tasks.md、task-status.md |
| 实现 | `/sdd:implement` | 逐任务 TDD 循环 | 代码 + 测试 + 更新的 task-status.md |
| 验证 | `/sdd:verify` | 测试套件 + 规范合规检查 | 验证报告 |
| 归档 | `/sdd:archive` | 合并归档 + 提示 Git 提交 | archive.md |

每个阶段完成后必须用户确认，禁止跳过。

### 目录结构

- `openspec/openspec.yaml` — OpenSpec 项目配置
- `openspec/changes/YYYY-MM-DD-<模块>-<子模块>-<功能>/` — 变更管理目录
  - `proposal.md` — 变更提案
  - `design.md` — 技术方案
  - `specs/` — 行为规格
  - `tasks.md` — 实现检查清单
  - `task-status.md` — 任务状态跟踪（动态更新）
  - `archive.md` — 归档记录
- `docs/designs/` — 设计文档
- `docs/plans/` — 实现计划
- `docs/explores/` — 需求探索记录

### 强制规则

- 探索阶段和计划阶段不写生产代码
- TDD 强制：新行为必须先写失败测试
- 规范产物完成前不编码
- 没有验证输出不声称完成
- 禁用 git worktree，串行推进
- 简化需求管理：每个需求独立，不支持父子层级
