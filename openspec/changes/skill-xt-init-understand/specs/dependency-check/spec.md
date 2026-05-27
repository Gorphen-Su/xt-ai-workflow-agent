## ADDED Requirements

### Requirement: 检测 Understand-Anything 插件安装状态
Skill SHALL 在执行任何分析之前，检测 Understand-Anything 插件是否已安装且可用。检测方式为检查插件目录（`~/.claude/plugins/understand-thing/` 或等效路径）是否存在。

#### Scenario: 插件已安装
- **WHEN** 用户调用 `/xt-init:understand` 且 Understand-Anything 插件已安装
- **THEN** 跳过安装步骤，直接进入分析阶段

#### Scenario: 插件未安装
- **WHEN** 用户调用 `/xt-init:understand` 且 Understand-Anything 插件未安装
- **THEN** 自动执行安装流程，安装完成后继续

### Requirement: 自动安装 Understand-Anything 插件
Skill SHALL 自动检测当前 AI 编码平台（Claude Code / Cursor / Windsurf 等），并使用对应的安装命令安装 Understand-Anything。默认平台为 Claude Code。

#### Scenario: Claude Code 平台安装
- **WHEN** 检测到当前平台为 Claude Code
- **THEN** 执行 `/plugin marketplace add Lum1104/Understand-Anything` 安装插件

#### Scenario: 非 Claude Code 平台
- **WHEN** 检测到当前平台非 Claude Code（如 Cursor、VS Code Copilot）
- **THEN** 提供对应平台的安装命令并引导用户手动安装

#### Scenario: 安装失败
- **WHEN** 自动安装过程失败（网络问题、权限不足等）
- **THEN** 向用户展示安装文档链接和手动安装命令，询问是否继续或退出

### Requirement: 检测运行环境依赖
Skill SHALL 检查 Understand-Anything 的运行环境依赖：Node.js >= 22、pnpm >= 10、Python 3。

#### Scenario: 环境依赖满足
- **WHEN** Node.js >= 22、pnpm >= 10、Python 3 均已安装
- **THEN** 继续执行分析

#### Scenario: 环境依赖缺失
- **WHEN** 任何一个运行环境依赖未满足
- **THEN** 向用户列出缺失的依赖及安装方式，阻塞分析流程直到依赖就绪
