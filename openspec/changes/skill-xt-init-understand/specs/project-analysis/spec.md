## ADDED Requirements

### Requirement: 全项目分析模式
Skill SHALL 支持在不传参数时，对整个项目进行全量代码分析和领域分析。

#### Scenario: 全项目代码分析
- **WHEN** 用户调用 `/xt-init:understand` 且不传参数
- **THEN** 依次调用 `/understand`（代码扫描）和 `/understand-domain`（领域分析），对整个项目执行完整分析

#### Scenario: 全项目分析完成
- **WHEN** 全项目分析流程执行完成
- **THEN** 在 `docs/understand/` 目录下生成结构化的 Markdown 理解文档，包含项目概览、模块结构、领域流图、关键实体等内容

### Requirement: 指定目录/模块分析模式
Skill SHALL 支持用户传入目录路径参数，仅对指定范围进行分析。

#### Scenario: 指定目录分析
- **WHEN** 用户调用 `/xt-init:understand src/auth` 传入目录路径
- **THEN** 调用 `/understand src/auth` 只分析 `src/auth` 目录下的代码

#### Scenario: 指定目录分析完成
- **WHEN** 指定目录分析流程执行完成
- **THEN** 在 `docs/understand/` 目录下生成该目录范围的 Markdown 理解文档

### Requirement: 分析结果整理为结构化文档
Skill SHALL 将 Understand-Anything 的原始 JSON 输出整理为人类可读的 Markdown 文档，保存到 `docs/understand/` 目录。

#### Scenario: 首次分析输出
- **WHEN** 项目首次执行分析（`docs/understand/` 目录不存在）
- **THEN** 创建 `docs/understand/` 目录，生成以下文档：
  - `overview.md` — 项目概览（语言、框架、结构、技术栈）
  - `modules.md` — 模块结构（各模块职责和依赖关系）
  - `domain-flows.md` — 领域流图（业务领域、流程、步骤）
  - `key-entities.md` — 关键实体（核心类、函数、接口及其关系）

#### Scenario: 重复分析输出
- **WHEN** 项目已存在 `docs/understand/` 目录且再次执行分析
- **THEN** 用新的分析结果覆盖已有文档文件

### Requirement: 分析耗时预估提示
Skill SHALL 在全项目分析前向用户提示预估耗时。

#### Scenario: 大型项目提示
- **WHEN** 项目源码文件数量超过 100 个且执行全量分析
- **THEN** 向用户提示 "项目文件较多，全量分析可能需要几分钟时间" 并确认是否继续
