---
name: sdd-explore
description: SDD 探索阶段 — 项目分析器 + 需求澄清与方案讨论，产出 proposal.md 和 sdd-state.yaml，前置 Git 状态检查和 Superpowers 依赖检查，强制用户确认。当用户说"探索需求"、"需求澄清"、使用 /sdd:explore 时触发。
---

# SDD 探索阶段

SDD 规格驱动开发的第一阶段：项目分析、探索需求、澄清歧义、确认方案、产出 proposal.md 和 sdd-state.yaml。

## 铁律

1. **此阶段 MUST NOT 编写任何生产代码**
2. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**
3. **必须先检查 Git 状态，不能跳过**

## 执行步骤

### 步骤 0：前置条件检查

1. 检查 Superpowers skill 是否可用（尝试调用 `superpowers:writing-plans` 或检查 brainstorming 等 skill）
2. **如果 Superpowers 可用**：标记为 `superpowers_available: true`，后续阶段可调用 Superpowers skill
3. **如果 Superpowers 不可用**：
   - 使用 AskUserQuestion 提示用户："Superpowers skill 未安装，部分功能（writing-plans、subagent 执行、代码审查）将降级为自包含模式。是否安装？"
   - 用户选择安装 → 提示：`/plugin install superpowers@claude-plugins-official`
   - 用户选择跳过 → 标记为 `superpowers_available: false`，继续以降级模式运行
4. 将 superpowers_available 状态写入 sdd-state.yaml（在步骤 4 创建时）

### 步骤 1：Git 状态前置检查

1. 运行 `git status --porcelain` 检查是否有未提交的更改
2. 运行 `git diff --stat` 查看更改概况
3. **如果仓库是干净的**：直接进入步骤 2
4. **如果仓库有脏状态**：
   a. 向用户展示当前未提交的更改摘要
   b. 使用 AskUserQuestion 询问："当前仓库有未提交的更改（列出文件）。是否要先提交？"
   c. 用户确认提交 → 运行 `git diff` 查看完整更改，自动生成简洁的中文 commit message，执行 `git add`（添加具体文件，不使用 `git add -A`）和 `git commit`
   d. 用户选择不提交 → 记录当前状态，在脏状态下继续

更新 sdd-state.yaml checkpoint: git-checked

### 步骤 2：项目分析器（仅首次运行）

如果 `openspec/sdd-project-profile.yaml` 不存在，执行项目分析器：

#### 2a. 探测项目技术栈

| 检测项 | 检测方式 | 默认值 |
|--------|---------|--------|
| **languages** | 统计 `src/`、`lib/`、`app/` 等源码目录下文件扩展名，取占比最高的 1-2 种 | `[]` |
| **frameworks** | 读取 `package.json` 的 dependencies/devDependencies、`pom.xml` 的 `<dependencies>`、`go.mod` 的 require 等提取关键框架名 | `[]` |
| **build_tool** | 检测根目录配置文件：`pom.xml` → maven，`build.gradle`/`build.gradle.kts` → gradle，`package.json` → npm/yarn/pnpm（看 lock 文件），`go.mod` → go，`Cargo.toml` → cargo，`pyproject.toml` → python | `unknown` |
| **compile_command** | 根据 build_tool 自动推导（见下方"构建命令映射"表） | `null` |
| **test_command** | 根据 build_tool + 测试目录推导（见下方"构建命令映射"表） | `null` |
| **structure** | 检查子目录模式：有 `modules/`/`packages/`/多个 `pom.xml`/`go.work` → `monorepo`；否则 → `single-module` | `single-module` |
| **has_ci** | 检查 `.github/workflows/`、`.gitlab-ci.yml`、`Jenkinsfile`、`azure-pipelines.yml` 等 | `false` |

#### 2b. 构建命令映射

| build_tool | compile_command（默认） | test_command（默认） |
|------------|------------------------|---------------------|
| maven | `mvn compile` | `mvn test` |
| gradle | `./gradlew compileJava` | `./gradlew test` |
| npm | `npm run build`（如果 script 存在） | `npm test`（如果 script 存在） |
| go | `go build ./...` | `go test ./...` |
| cargo | `cargo build` | `cargo test` |
| python | `null`（跳过编译） | `pytest`（如果安装了） |
| unknown | `null` | `null` |

#### 2c. 编译命令运行时验证

1. **项目特有参数检测**（在执行命令之前）：检查项目配置文件中是否有需要额外传入的参数（Maven settings.xml、Gradle properties、npm .npmrc）
2. **执行编译命令**：运行调整后的 compile_command（如果非 null）
3. **成功**：确认命令可用，写入 profile
4. **失败且为环境问题**（JDK/Node 版本不匹配、依赖下载失败等）：**立即阻塞并报告**，使用 AskUserQuestion 等待用户提供正确的命令
5. **失败且为代码问题**（已有代码编译错误）：命令本身可用，写入 profile，编译错误留到 implement 阶段处理
6. **test_command**：不强制运行，但检查 test framework 是否安装

#### 2d. 编译约束自动提取

根据技术栈提取编译约束：
- 编译型语言（Java、TypeScript 等）：添加"接口层和实现层分开定义在不同 Task 中会导致单独编译失败"等约束
- 解释型语言（Python 等）：compile_constraints 为空列表

#### 2e. 空白项目（greenfield）处理

如果是空项目（无源码、无配置），跳过自动探测。在步骤 4 的需求确认中一并确认技术栈，确认后补充 profile。

#### 2f. 写入 sdd-project-profile.yaml

分析完成后，将结果写入 `openspec/sdd-project-profile.yaml`：

```yaml
version: 1
profiled_at: <ISO 8601 时间戳>

languages: [<检测到的语言>]
frameworks: [<检测到的框架>]
build_tool: <构建工具>
compile_command: <编译命令或 null>
test_command: <测试命令或 null>
structure: <monorepo 或 single-module>
has_ci: <true 或 false>

compile_constraints:
  - <约束1>
  - <约束2>
```

如果 `sdd-project-profile.yaml` 已存在，跳过项目分析器，直接读取现有 profile。

更新 sdd-state.yaml checkpoint: requirements-confirmed

### 步骤 3：确定变更名称

1. 检查用户是否提供了模块名参数（如 `/sdd:explore user-auth 登录功能`）
2. 如果提供了模块名：按 `YYYY-MM-DD-<模块>-<子模块(可选)>-<功能>` 格式生成目录名
3. 如果未提供：从需求描述中推导模块名和功能名，生成目录名
4. 命名规则：
   - 使用当天日期作为前缀
   - 模块名从用户参数或需求描述中提取，转为 kebab-case
   - 功能名从需求描述中推导，转为 kebab-case
   - 示例：`2026-05-15-user-auth-login`

### 步骤 4：创建变更目录

1. 运行 `openspec new change "<change-name>"` 创建变更目录
2. 确认目录创建成功
3. 在变更目录下创建初始 `sdd-state.yaml`：

```yaml
version: 1
change: <change-name>

phase: explore
checkpoint: entered

phase_checkpoints:
  explore: entered
  plan: null
  implement: null
  verify: null
  archive: null

superpowers_available: <true 或 false>

tasks: []

review_counters:
  global_review_rounds: 0
  task_retries: {}

cascade:
  last_affected_phase: null
  invalidated_from: null
  reason: null
  preserved_tasks: []
```

### 步骤 5：探索与需求澄清

1. 与用户讨论需求，每次只问一个关键问题
2. 提出 2-3 个可行方案，每个方案列出优缺点，给出推荐方案及理由
3. 使用 AskUserQuestion 确认方案选择
4. 将确认的方案写入 proposal.md

如果是空白项目且步骤 2 跳过了项目分析，在此步骤中一并确认技术栈，确认后补充 `sdd-project-profile.yaml`。

### 步骤 6：产出 proposal.md

在变更目录下创建 proposal.md，包含：
- **Why**：为什么需要这个变更
- **What Changes**：具体变更内容列表
- **Capabilities**：新增的能力（每个能力对应一个 specs/ 文件）
- **Impact**：影响的代码、API、依赖、系统

更新 sdd-state.yaml checkpoint: proposal-created

### 步骤 7：阶段完成确认

使用 AskUserQuestion 展示 proposal.md 摘要，提供三个选项：
- **A. 通过，进入下一阶段**：更新 sdd-state.yaml（phase: explore checkpoint: done, plan checkpoint: entered），提示用户可以运行 `/sdd:plan`
- **B. 不通过，需要修改**：回到步骤 5，根据用户反馈修改 proposal.md
- **C. 暂停，稍后继续**：保存当前进度到 sdd-state.yaml，退出

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 checkpoint，然后检查实际文件状态：

| checkpoint | 实际文件状态 | 恢复到 |
|-----------|-------------|--------|
| `entered` | 无活跃变更目录 | 步骤 1（git-checked） |
| `git-checked` | 无活跃变更目录 | 步骤 3（确定变更名称） |
| `requirements-confirmed` | 变更目录不存在 | 步骤 4（创建变更目录） |
| `requirements-confirmed` | 变更目录存在但 proposal.md 不存在 | 步骤 5（需求澄清） |
| `proposal-created` | proposal.md 存在 | 步骤 7（阶段完成确认） |
| `done` | proposal.md 存在 | 出口到 plan 阶段 |

**状态文件缺失时的降级**：如果没有 sdd-state.yaml，检查变更目录下是否有 proposal.md 来判断进度。

## 向后兼容

如果变更目录中存在 `task-status.md` 但没有 `sdd-state.yaml`：
1. 使用 AskUserQuestion 提示用户："检测到旧格式的 task-status.md，建议迁移到 sdd-state.yaml。是否自动迁移？"
2. 用户确认后，从 task-status.md 提取阶段进度和任务状态，生成 sdd-state.yaml
3. 迁移后删除 task-status.md

## 常见问题

- "用户没有明确的功能描述"：主动询问，每次只问一个关键问题
- "多个方案难以选择"：列出优缺点对比表，给出推荐及理由
- "需求范围过大"：建议拆分为多个独立需求
- "项目分析器检测结果不准"：compile_command 做运行时验证，环境问题立即阻塞等用户确认
