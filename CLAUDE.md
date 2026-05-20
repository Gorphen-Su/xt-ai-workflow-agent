# 项目配置

## 语言偏好

**所有对话、代码注释、文档和输出内容必须使用中文。**

- 与用户的对话使用中文
- 代码注释使用中文
- 生成的文档使用中文
- 错误信息使用中文
- 提交信息使用中文

## xt-sdd 规格驱动开发

本项目使用 xt-sdd 工作流，统一封装 OpenSpec（规格管理）和 Superpowers（代码执行）的能力。

**核心纪律：先探索、再锁规范、最后严谨执行。**

### 六命令五阶段 + Bug 修复

| 阶段 | 命令 | 说明 | 产出 |
|------|------|------|------|
| 需求探索 | `/xt-sdd:propose` | 项目分析、需求澄清、规格生成 | proposal.md |
| 方案设计 | `/xt-sdd:plan` | 规范产物 + Bridge 转换 + 实现计划 | design.md、specs/、tasks.md、plan.md |
| TDD 实现 | `/xt-sdd:apply` | subagent/inline 双模式 TDD | 代码 + 测试 |
| 验证审查 | `/xt-sdd:verify` | 文档同步 + 合规验证 + 代码审查 | 验证报告 |
| 归档收尾 | `/xt-sdd:archive` | 双源合并归档 + Git 提交 | archive.md |
| Bug 修复 | `/xt-sdd:fix` | 分诊路由 + 自动升级 + 简化流程 | 动态产出 |

每个阶段完成后必须用户确认，禁止跳过。

### 阶段硬门

| 阶段 | 禁止 |
|------|------|
| propose | 写代码、写实现计划 |
| plan | 写代码 |
| apply | 改规格文档 |
| verify | 新增功能代码，只允许修复审查问题 |
| archive | 改代码和规格 |

### 目录结构

- `openspec/openspec.yaml` — OpenSpec 项目配置
- `openspec/sdd-project-profile.yaml` — 项目技术栈 profile
- `openspec/changes/YYYY-MM-DD-<模块>-<子模块>-<功能>/` — 变更管理目录
  - `proposal.md` — 变更提案
  - `design.md` — 技术方案
  - `specs/` — 行为规格
  - `tasks.md` — 实现检查清单
  - `plan.md` — 实现计划索引（列出子计划列表和执行顺序）
  - `plans/` — 子计划文件目录
    - `NN-<分组名>.md` — 对应 tasks.md 二级分组的实现计划（带 checkbox 微步骤）
  - `sdd-state.yaml` — 任务状态跟踪（动态更新）
  - `archive.md` — 归档记录
- `docs/designs/` — 设计文档
- `docs/plans/` — 实现计划
- `docs/explores/` — 需求探索记录

### 强制规则

- propose 和 plan 阶段不写生产代码
- TDD 强制：新行为必须先写失败测试
- 规范产物完成前不编码
- 没有验证输出不声称完成
- 禁用 git worktree，串行推进
- 简化需求管理：每个需求独立，不支持父子层级
- 多需求并发：每个变更目录独立 sdd-state.yaml，互不干扰
- 并发冲突：后者覆盖前者，apply 时检测文件冲突并警告
- 归档时机：verify 通过 + 用户确认即可归档
