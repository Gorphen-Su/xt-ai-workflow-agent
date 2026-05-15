# 项目配置

## 语言偏好

**所有对话、代码注释、文档和输出内容必须使用中文。**

- 与用户的对话使用中文
- 代码注释使用中文
- 生成的文档使用中文
- 错误信息使用中文
- 提交信息使用中文

## OpenSpec 规格驱动开发

本项目使用 OpenSpec 进行规格驱动开发，遵循 `xt-superpowers-openspec-workflow` 工作流。

### 核心纪律

**先探索、再锁规范、最后严谨执行。**

### 目录结构

- `openspec/openspec.yaml` — OpenSpec 项目配置
- `openspec/changes/<change-name>/` — 变更管理目录
  - `proposal.md` — 变更提案
  - `design.md` — 技术方案
  - `specs/` — 行为规格
  - `tasks.md` — 实现检查清单
  - `children.yaml` — 子需求索引（主需求）
  - `parent-ref.md` — 父需求引用（子需求）
- `docs/designs/YYYY-MM-DD-<topic>-design.md` — 设计文档
- `docs/plans/YYYY-MM-DD-<topic>.md` — 实现计划

### 工作流阶段

1. **探索与需求澄清** — 理解需求，不写生产代码
2. **规范锁定** — 正式化 OpenSpec 变更产物，不写生产代码
3. **严谨执行** — TDD 方式实现功能
4. **归档与自动提交** — 三方对齐确认后归档提交

### 强制规则

- 探索阶段和规范阶段不写生产代码
- TDD 强制：新行为必须先写失败测试
- OpenSpec 产物完成前不编码
- 没有验证输出不声称完成
- 禁用 git worktree
