---
name: xt-sdd-propose
description: xt-sdd 需求探索阶段 — 项目分析器、需求澄清、方案讨论、调用 openspec-propose 生成 proposal.md，初始化 sdd-state.yaml，强制用户确认。当用户说"探索需求"、"需求澄清"、"规格生成"、使用 /xt-sdd:propose 时触发。
---

# xt-sdd 需求探索阶段

xt-sdd 规格驱动开发的第一阶段：项目分析、需求澄清、方案讨论、产出 proposal.md 和初始化 sdd-state.yaml。

## 铁律

1. **此阶段 MUST NOT 编写任何生产代码或实现计划**
2. **阶段完成 MUST 要求用户确认，MUST NOT 自动跳过**
3. **MUST 先检查 Git 状态和依赖，不能跳过**

## 执行步骤

### 步骤 0：前置条件检查

1. 检查 OpenSpec CLI 是否可用（检查项目根目录是否有 `openspec/` 目录）
   - 没有 → 提示用户：`npx @fission-ai/openspec init`
2. 检查 Superpowers skill 是否可用（尝试检查 `superpowers:writing-plans` 等 skill）
   - 可用 → 标记 `superpowers_available: true`
   - 不可用 → 提示用户："Superpowers skill 未安装，部分功能将降级为自包含模式。是否安装？`/plugin install superpowers@claude-plugins-official`"
   - 用户选择跳过 → 标记 `superpowers_available: false`
3. 检查 CodeGraph 是否可用（检查项目根是否有 `.codegraph/` 目录，或 `codegraph` CLI 是否可调用）
   - 可用 → 后续各阶段优先用 `codegraph_explore`（MCP）/ `codegraph explore`（CLI）检索代码，替代 grep + read 整文件
   - 不可用 → 提示用户："建议运行 `/xt-codegraph-init` 初始化代码图谱，各阶段代码检索（定位符号、调用链、改动影响面）将显著提效。是否现在初始化？"
     - 用户选择初始化 → 调用 `xt-codegraph-init` skill，完成后继续
     - 用户选择跳过 → 流程继续，代码检索降级为 grep + read（仍可用，但 token 消耗更高）
4. 将 superpowers_available 状态写入 sdd-state.yaml（步骤 5 创建时）

### 步骤 1：Git 状态前置检查

1. 运行 `git status --porcelain` 检查未提交更改
2. 运行 `git diff --stat` 查看更改概况
3. **仓库干净** → 直接进入步骤 2
4. **仓库有脏状态**：
   - 向用户展示未提交更改摘要
   - 使用 AskUserQuestion 询问是否先提交
   - 用户确认提交 → 自动生成中文 commit message，`git add` 具体文件后 commit
   - 用户选择不提交 → 记录状态，在脏状态下继续

更新 sdd-state.yaml checkpoint: git-checked

### 步骤 2：项目分析器（仅首次运行）

如果 `openspec/sdd-project-profile.yaml` 不存在，执行项目分析器。

#### 2a. 探测项目技术栈

| 检测项 | 检测方式 | 默认值 |
|--------|---------|--------|
| **languages** | 统计 `src/`、`lib/`、`app/` 等源码目录下文件扩展名，取占比最高 1-2 种 | `[]` |
| **frameworks** | 读取 `package.json` 的 dependencies/devDependencies、`pom.xml` 的 `<dependencies>`、`go.mod` 的 require 等 | `[]` |
| **build_tool** | 根目录配置文件：`pom.xml`→maven，`build.gradle`/`build.gradle.kts`→gradle，`package.json`→npm/yarn/pnpm（看 lock 文件），`go.mod`→go，`Cargo.toml`→cargo，`pyproject.toml`→python | `unknown` |
| **compile_command** | 根据 build_tool 自动推导（见下方映射表） | `null` |
| **test_command** | 根据 build_tool + 测试目录推导（见下方映射表） | `null` |
| **structure** | 检查子目录模式：有 `modules/`/`packages/`/多个 `pom.xml`/`go.work` → monorepo；否则 → single-module | `single-module` |
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

1. **项目特有参数检测**：检查项目配置文件中是否需要额外参数（Maven settings.xml、Gradle properties、npm .npmrc）
2. **执行编译命令**：运行调整后的 compile_command（如果非 null）
3. **成功**：确认命令可用，写入 profile
4. **失败且为环境问题**（版本不匹配、依赖下载失败等）：**立即阻塞**，等待用户提供正确命令
5. **失败且为代码问题**（已有代码编译错误）：命令本身可用，写入 profile，编译错误留到 apply 阶段
6. **test_command**：不强制运行，但检查 test framework 是否安装

#### 2d. 编译约束自动提取

根据技术栈提取编译约束：
- 编译型语言（Java、TypeScript 等）：添加"接口层和实现层分开定义在不同 Task 中会导致单独编译失败"等约束
- 解释型语言（Python 等）：compile_constraints 为空列表

#### 2e. 空白项目（greenfield）处理

空项目跳过自动探测，在步骤 4 的需求确认中一并确认技术栈，确认后补充 profile。

#### 2f. 写入 sdd-project-profile.yaml

分析完成后写入 `openspec/sdd-project-profile.yaml`：

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

如果 `sdd-project-profile.yaml` 已存在，跳过分析器，直接读取。

更新 sdd-state.yaml checkpoint: profiler-done

### 步骤 3：确定变更名称

1. 检查用户是否提供了模块名参数（如 `/xt-sdd:propose user-auth 登录功能`）
2. 提供了 → 按 `YYYY-MM-DD-<模块>-<子模块(可选)>-<功能>` 格式生成目录名
3. 未提供 → 从需求描述中推导模块名和功能名，生成目录名
4. 命名规则：当天日期前缀 + kebab-case

### 步骤 4：创建变更目录

1. 运行 `openspec new change "<change-name>"` 创建变更目录
2. 确认目录创建成功

### 步骤 5：初始化 sdd-state.yaml

在变更目录下创建 `sdd-state.yaml`：

```yaml
version: 1
change: <change-name>

phase: propose
checkpoint: entered

phase_checkpoints:
  propose: entered
  plan: null
  apply: null
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

metrics:
  git_baseline:
    start_sha: null
    start_time: null
    end_sha: null
    end_time: null
    dirty: false
```

**git_baseline 初始化操作：**

1. 执行 `git rev-parse HEAD` 获取当前 commit SHA
2. 执行 `git status --porcelain` 检查工作区是否干净
3. 将获取的数据填入 sdd-state.yaml 的 git_baseline 段：
   - `git_baseline.start_sha` ← `git rev-parse HEAD` 的输出
   - `git_baseline.start_time` ← 当前 ISO 8601 时间戳
   - `git_baseline.dirty` ← 工作区干净则为 `false`，有未提交更改则为 `true`
4. 使用 Edit 工具更新 sdd-state.yaml 文件中对应字段

### 步骤 6：探索与需求澄清

> 若 CodeGraph 可用（步骤 0 检测），优先用 `codegraph explore <需求关键词>` 围绕需求收集相关符号与调用链，作为方案讨论与 proposal 的事实依据，替代 grep + read 扫码。详见 [CodeGraph × xt-sdd 提效指南 · propose](.claude/skills/xt-codegraph-init/references/codegraph-xt-sdd.md#propose需求探索)。

1. 与用户讨论需求，每次只问一个关键问题
2. 提出 2-3 个可行方案，每个方案列出优缺点，给出推荐方案及理由
3. 使用 AskUserQuestion 确认方案选择

如果是空白项目且步骤 2 跳过了项目分析，在此步骤中一并确认技术栈，确认后补充 `sdd-project-profile.yaml`。

更新 sdd-state.yaml checkpoint: requirements-confirmed

### 步骤 7：调用 openspec-propose 生成规格文档

调用原生 `openspec-propose` skill，通过 CLI 创建变更并生成所有 artifacts。

**做法：**

1. 宣布："调用 openspec-propose 生成规格文档"
2. 使用 Skill 工具调用 `openspec-propose`，args 格式：
   ```
   Change name: <变更名>. Description: [项目: {languages} + {frameworks}, 构建: {build_tool}] <需求描述>
   ```
3. `openspec-propose` 会自动执行：创建变更目录、按依赖顺序生成 proposal.md、design.md、specs/、tasks.md
4. 等待完成后验证 `openspec/changes/<变更名>/` 下所有 artifacts 已生成且非空
5. **覆盖 openspec-propose 的执行建议**：完成后忽略 "Run /opsx:apply" 建议，宣布 "回到 xt-sdd 流程"

**降级方案：** 如果 `openspec-propose` skill 不可用：
1. 运行 `npx @fission-ai/openspec new change "<变更名>"`
2. 运行 `openspec status --change "<变更名>" --json` 获取 build order
3. 对每个 artifact 运行 `openspec instructions <artifact> --change "<变更名>" --json`
4. 按指令用 Write 工具直接创建 artifact 文件

更新 sdd-state.yaml checkpoint: openspec-generated

### 步骤 8：阶段完成确认

使用 AskUserQuestion 展示 proposal.md 摘要，提供三个选项：
- **A. 通过，进入下一阶段**：更新 sdd-state.yaml（phase_checkpoints.propose: done, phase: propose, checkpoint: done），提示运行 `/xt-sdd:plan`
- **B. 不通过，需要修改**：回到步骤 6，根据反馈修改
- **C. 暂停，稍后继续**：保存进度到 sdd-state.yaml，退出

## sdd-state.yaml 结构规范

每个变更目录下的 `sdd-state.yaml` 包含以下字段：

```yaml
version: 1
change: <变更名>

# 当前阶段和检查点
phase: propose | plan | apply | verify | archive
checkpoint: <当前阶段的细粒度检查点>

# 每个阶段的检查点记录
phase_checkpoints:
  propose: <检查点或 null>
  plan: <检查点或 null>
  apply: <检查点或 null>
  verify: <检查点或 null>
  archive: <检查点或 null>

# Superpowers 可用性
superpowers_available: true | false

# 任务列表（plan 阶段填充）
tasks:
  - id: 1
    description: <任务描述>
    status: pending | in_progress | completed | failed
    updated: <ISO 8601 时间戳，仅在状态变更时更新>
    test_result: <pass/fail + 一句话，非长描述>
    checkpoint: null | red | green | refactor | complete

# 审查计数器
review_counters:
  global_review_rounds: 0
  task_retries: {}

# 级联回退信息
cascade:
  last_affected_phase: null
  invalidated_from: null
  reason: null
  preserved_tasks: []

# Git 基线追踪
git_baseline:
  start_sha: <propose 阶段的 commit SHA>
  start_time: <ISO 8601 时间戳>
  end_sha: <archive 阶段的 commit SHA>
  end_time: <ISO 8601 时间戳>
  dirty: <true 或 false，propose 时工作区是否干净>
```

### 各阶段 checkpoint 定义

**propose 阶段：**
- `entered` — 刚进入
- `git-checked` — Git 状态已检查
- `profiler-done` — 项目分析器完成
- `requirements-confirmed` — 需求已确认
- `openspec-generated` — openspec-propose 已完成
- `done` — 用户确认通过

**plan 阶段：**
- `entered` — 刚进入
- `design-generated` — design.md 已生成
- `specs-generated` — specs/ 已生成
- `tasks-generated` — tasks.md 已生成
- `plan-generated` — 实现计划已生成
- `quality-reviewed` — 质量审查完成
- `done` — 用户确认通过

**apply 阶段：**
- `entered` — 刚进入
- `task-N-complete` — 任务 N 完成
- `all-tasks-complete` — 所有任务完成
- `done` — 用户确认通过

**verify 阶段：**
- `entered` — 刚进入
- `doc-sync-done` — 文档同步检查完成
- `code-quality-done` — 代码质量验证完成
- `compliance-done` — 规范合规检查完成
- `code-reviewed` — 代码审查完成
- `done` — 用户确认通过

**archive 阶段：**
- `entered` — 刚进入
- `consistency-verified` — 归档前验证完成
- `specs-synced` — specs 同步完成
- `archived` — 归档完成
- `done` — 用户确认通过

## 断点恢复

重新运行时，读取 sdd-state.yaml 的 checkpoint 和实际文件状态：

| checkpoint | 实际文件状态 | 恢复到 |
|-----------|-------------|--------|
| `entered` | 无活跃变更目录 | 步骤 1（Git 检查） |
| `git-checked` | 无活跃变更目录 | 步骤 3（确定变更名） |
| `profiler-done` | 无活跃变更目录 | 步骤 4（创建变更目录） |
| `requirements-confirmed` | 变更目录存在但 proposal.md 不存在 | 步骤 7（调用 openspec-propose） |
| `openspec-generated` | proposal.md 存在 | 步骤 8（阶段完成确认） |
| `done` | proposal.md 存在 | 出口到 plan 阶段 |

**状态文件缺失时的降级**：如果没有 sdd-state.yaml，检查变更目录下是否有 proposal.md 来判断进度。

## 并发变更路由

当 `openspec/changes/` 下有多个活跃变更时（**仅扫顶层目录，排除 `openspec/changes/archive/` 归档子目录**）：
1. 扫描各变更目录的 sdd-state.yaml
2. 如果有变更的 phase 为 propose → 优先选择（继续当前阶段）
3. 如果有多个 → 使用 AskUserQuestion 让用户选择
4. 如果用户明确指定变更名 → 以用户意图为准

## 常见问题

- "用户没有明确功能描述"：主动询问，每次只问一个关键问题
- "多个方案难以选择"：列出优缺点对比表，给出推荐及理由
- "需求范围过大"：建议拆分为多个独立需求
- "项目分析器检测不准"：compile_command 做运行时验证，环境问题立即阻塞
