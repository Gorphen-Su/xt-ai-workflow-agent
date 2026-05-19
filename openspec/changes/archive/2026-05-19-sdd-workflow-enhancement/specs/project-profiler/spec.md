## ADDED Requirements

### Requirement: 自动探测项目技术栈

系统 SHALL 在 sdd-explore 首次运行时（`openspec/sdd-project-profile.yaml` 不存在时）自动执行项目分析器，探测以下信息并写入 `openspec/sdd-project-profile.yaml`：

- languages：统计 src/、lib/、app/ 等源码目录下文件扩展名，取占比最高的 1-2 种
- frameworks：读取依赖配置文件（package.json、pom.xml、go.mod 等）提取关键框架名
- build_tool：检测根目录配置文件名（pom.xml → maven，package.json → npm，等）
- compile_command：根据 build_tool 自动推导
- test_command：根据 build_tool + 测试目录推导
- structure：检查子目录模式判断 monorepo / single-module
- has_ci：检查 CI 配置文件是否存在

#### Scenario: 首次运行时自动执行项目分析

- **WHEN** 用户运行 `/sdd:explore` 且 `openspec/sdd-project-profile.yaml` 不存在
- **THEN** 系统自动执行项目分析器，探测语言、框架、构建工具、编译/测试命令、项目结构、CI 配置，并将结果写入 `openspec/sdd-project-profile.yaml`

#### Scenario: 已有 profile 时跳过分析

- **WHEN** 用户运行 `/sdd:explore` 且 `openspec/sdd-project-profile.yaml` 已存在
- **THEN** 系统跳过项目分析步骤，直接读取现有 profile 进入后续流程

#### Scenario: 空白项目（greenfield）处理

- **WHEN** 项目分析器检测到项目为空白（无源码、无配置文件）
- **THEN** 系统跳过自动探测，在需求确认步骤中一并确认技术栈，确认后补充 `sdd-project-profile.yaml`

### Requirement: 编译命令运行时验证

系统 SHALL 在推导出 compile_command 后执行运行时验证，确认命令可用。

#### Scenario: 编译命令验证成功

- **WHEN** 项目分析器推导出 compile_command 并执行验证
- **THEN** 编译命令执行成功，将验证后的命令写入 `sdd-project-profile.yaml`

#### Scenario: 编译命令因环境问题失败

- **WHEN** compile_command 执行失败且原因为环境问题（JDK/Node 版本不匹配、依赖下载失败等）
- **THEN** 系统立即阻塞并报告，使用 AskUserQuestion 等待用户提供正确的命令后再继续

#### Scenario: 编译命令因代码问题失败

- **WHEN** compile_command 执行失败且原因为已有代码编译错误
- **THEN** 系统认为命令本身可用，写入 profile，编译错误留到 implement 阶段处理

#### Scenario: 无编译命令的项目

- **WHEN** 项目为纯解释型语言（如 Python）且无法推导 compile_command
- **THEN** compile_command 设为 null，跳过编译验证

### Requirement: 编译约束自动提取

系统 SHALL 在项目分析器完成后，根据技术栈自动提取编译约束写入 `sdd-project-profile.yaml` 的 `compile_constraints` 字段。

#### Scenario: 编译型语言项目提取约束

- **WHEN** 项目分析器检测到编译型语言（如 Java、TypeScript）
- **THEN** 自动提取编译约束，如"接口层和实现层分开定义在不同 Task 中会导致单独编译失败"

#### Scenario: 解释型语言项目无强制约束

- **WHEN** 项目分析器检测到解释型语言（如 Python）
- **THEN** compile_constraints 为空列表，不添加强制编译约束

### Requirement: profile 信息供后续阶段使用

系统 SHALL 让 sdd-plan、sdd-implement、sdd-verify 等后续阶段读取 `sdd-project-profile.yaml` 获取技术栈上下文。

#### Scenario: sdd-plan 使用 profile 上下文

- **WHEN** sdd-plan 执行 Bridge 转换
- **THEN** 读取 `sdd-project-profile.yaml`，将 compile_constraints 注入到任务拆分逻辑中

#### Scenario: sdd-implement 使用 compile_command

- **WHEN** sdd-implement 执行任务完成后的编译检查
- **THEN** 读取 `sdd-project-profile.yaml` 的 compile_command，如果非 null 则运行编译验证

#### Scenario: sdd-verify 使用 test_command

- **WHEN** sdd-verify 执行代码质量验证
- **THEN** 读取 `sdd-project-profile.yaml` 的 test_command，替代临时推导测试命令
