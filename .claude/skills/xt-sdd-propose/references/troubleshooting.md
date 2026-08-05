# xt-sdd-propose 常见问题与处理

本文档包含 `xt-sdd-propose` skill 的常见问题解答和降级处理方案。

## 常见问题

### Q: 用户没有明确功能描述

**现象**：用户说"我想加个功能"但没具体说明

**处理**：
1. 主动询问，每次只问一个关键问题
2. 避免一次性抛出多个问题
3. 使用 AskUserQuestion 引导用户明确需求

---

### Q: 多个方案难以选择

**现象**：需求有多种实现方案，难以取舍

**处理**：
1. 列出 2-3 个可行方案
2. 每个方案列出优缺点对比表
3. 给出推荐方案及理由
4. 使用 AskUserQuestion 确认选择

---

### Q: 需求范围过大

**现象**：一个需求涉及多个模块或复杂度高

**处理**：
1. 建议拆分为多个独立需求
2. 按优先级排序，先处理核心需求
3. 明确各需求的边界和依赖关系

---

### Q: 项目分析器检测不准

**现象**：自动推导的 compile_command 或 test_command 不适用

**处理**：
1. compile_command 做运行时验证
2. 环境问题（版本不匹配、依赖下载失败）→ **立即阻塞**，等待用户提供正确命令
3. 代码问题（已有代码编译错误）→ 命令本身可用，写入 profile，编译错误留到 apply 阶段

---

### Q: 空白项目（greenfield）处理

**现象**：项目为空，无法自动探测技术栈

**处理**：
1. 跳过自动探测
2. 在步骤 6 的需求确认中一并确认技术栈
3. 确认后补充 `sdd-project-profile.yaml`

---

## 降级方案

### OpenSpec CLI 不可用

**检测**：项目根目录没有 `openspec/` 目录

**处理**：
1. 提示用户运行：`npx @fission-ai/openspec init`
2. 等待用户完成初始化后继续

---

### Superpowers Skill 不可用

**检测**：尝试调用 `superpowers:writing-plans` 等 skill 失败

**处理**：
1. 提示用户："Superpowers skill 未安装，部分功能将降级为自包含模式。是否安装？`/plugin install superpowers@claude-plugins-official`"
2. 用户选择跳过 → 标记 `superpowers_available: false`
3. 相关功能使用自包含模式实现

---

### CodeGraph 不可用

**检测**：项目根没有 `.codegraph/` 目录，且 `codegraph` CLI 不可调用

**处理**：
1. 提示用户："建议运行 `/xt-codegraph-init` 初始化代码图谱，各阶段代码检索（定位符号、调用链、改动影响面）将显著提效。是否现在初始化？"
2. 用户选择初始化 → 调用 `xt-codegraph-init` skill，完成后继续
3. 用户选择跳过 → 流程继续，代码检索降级为 grep + read（仍可用，但 token 消耗更高）

---

### openspec-propose Skill 不可用

**检测**：Skill 调用失败

**降级方案**：
1. 运行 `npx @fission-ai/openspec new change "<变更名>"`
2. 运行 `openspec status --change "<变更名>" --json` 获取 build order
3. 对每个 artifact 运行：
   ```bash
   openspec instructions <artifact> --change "<变更名>" --json
   ```
4. 按指令用 Write 工具直接创建 artifact 文件

---

## Git 状态处理

### 仓库干净

**检测**：`git status --porcelain` 无输出

**处理**：直接进入下一步

---

### 仓库有脏状态

**检测**：`git status --porcelain` 有输出

**处理**：
1. 向用户展示未提交更改摘要
2. 使用 AskUserQuestion 询问是否先提交
3. 用户确认提交 → 自动生成中文 commit message，`git add` 具体文件后 commit
4. 用户选择不提交 → 记录状态，在脏状态下继续

---

## 项目分析器详细规则

### 构建命令映射表

| build_tool | compile_command（默认） | test_command（默认） |
|------------|------------------------|---------------------|
| maven | `mvn compile` | `mvn test` |
| gradle | `./gradlew compileJava` | `./gradlew test` |
| npm | `npm run build`（如果 script 存在） | `npm test`（如果 script 存在） |
| yarn | `yarn build`（如果 script 存在） | `yarn test`（如果 script 存在） |
| pnpm | `pnpm run build`（如果 script 存在） | `pnpm test`（如果 script 存在） |
| go | `go build ./...` | `go test ./...` |
| cargo | `cargo build` | `cargo test` |
| python | `null`（跳过编译） | `pytest`（如果安装了） |
| unknown | `null` | `null` |

### 编译约束自动提取

根据技术栈提取编译约束：

**编译型语言**（Java、TypeScript 等）：
- 添加"接口层和实现层分开定义在不同 Task 中会导致单独编译失败"等约束

**解释型语言**（Python 等）：
- compile_constraints 为空列表

### sdd-project-profile.yaml 结构

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
