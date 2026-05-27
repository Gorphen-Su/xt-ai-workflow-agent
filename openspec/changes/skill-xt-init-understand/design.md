## Context

开发者在接手旧项目时，需要快速理解代码结构、业务领域和模块关系。Understand-Anything 是一个 Claude Code 插件（基于 skills），提供 `/understand`、`/understand-domain`、`/understand-diff` 等命令，能自动分析项目并生成知识图谱和领域流图。

当前项目（xt-ai-workflow-agent）是一个 skill 集合项目，技术栈为 markdown + yaml，无编译构建。本 skill 将作为项目级 skill 存放在 `.claude/skills/xt-init-understand/`。

**Understand-Anything 关键特性：**
- Claude Code 插件形式，通过 `/plugin install` 安装
- `/understand [path]` — 7 阶段管线扫描，输出 `.understand-anything/knowledge-graph.json`
- `/understand-domain` — 提取业务领域知识，输出 `.understand-anything/domain-graph.json`
- `/understand-diff` — Git 变更影响分析（增量更新基础）
- 输出目录固定为 `<project-root>/.understand-anything/`
- 需要 Node.js >= 22、pnpm >= 10、Python 3

## Goals / Non-Goals

**Goals:**
- 提供一键式项目理解命令 `/xt-init:understand`，自动完成依赖检查 → 分析 → 输出整理 → CLAUDE.md 集成
- 支持全项目分析和指定目录/模块两种范围
- 利用 `/understand-diff` 实现增量更新，避免每次全量扫描
- 将分析结果以结构化文档形式保存到 `docs/understand/`，便于人工查阅
- 自动更新 CLAUDE.md，让后续对话能自动引用理解文档

**Non-Goals:**
- 不替代 Understand-Anything 的核心分析能力，仅做编排和集成
- 不实现自定义分析算法或知识图谱渲染
- 不支持跨项目分析
- 不实现 Dashboard 启动（用户可自行使用 `/understand-dashboard`）

## Decisions

### D1: 输出策略 — 复制整理而非直接引用

**决定：** 将 Understand-Anything 的原始输出（`.understand-thing/` 下的 JSON）整理为 Markdown 文档保存到 `docs/understand/`。

**理由：**
- JSON 知识图谱不适合人工直接阅读
- Markdown 文档可被 AI 直接理解和引用
- 原始 JSON 保留在 `.understand-anything/` 供工具内部使用
- 替代方案：直接引用 JSON → 不可读，放弃

### D2: 增量更新基于 `/understand-diff` + Git 状态

**决定：** 调用 `/understand-diff` 获取变更影响分析，结合 `git diff --name-only` 定位受影响文件，仅重新整理相关文档。

**理由：**
- Understand-Anything 已内置 diff 影响分析能力
- 不需要自己实现文件变更检测逻辑
- 替代方案：自行解析 knowledge-graph.json 对比 → 复杂且重复造轮子，放弃

### D3: 分析范围通过参数控制

**决定：** `/xt-init:understand` 无参数时分析全项目；传入路径参数时只分析指定目录。

**理由：**
- 与 `/understand [path]` 的原生参数行为一致
- 用户无需学习新语法
- 替代方案：交互式选择目录 → 步骤繁琐，放弃

### D4: CLAUDE.md 集成采用追加引用块

**决定：** 在 CLAUDE.md 末尾追加一个 `## 项目理解文档` 区块，包含文档路径列表和查询指引。

**理由：**
- 不修改现有 CLAUDE.md 内容，只追加
- 引用块格式清晰，便于后续对话自动发现
- 替代方案：嵌入式分散引用 → 维护复杂，放弃

## Risks / Trade-offs

- **[Understand-Anything 安装失败]** → 检测到安装失败时提供手动安装命令和文档链接，不阻塞后续流程
- **[大型项目分析耗时过长]** → 支持指定目录缩小范围；全量分析时提示用户预估耗时
- **[JSON → Markdown 转换信息损失]** → 保留原始 JSON 文件引用链接，确保细节可追溯
- **[CLAUDE.md 冲突]** → 追加前检查是否已存在 `## 项目理解文档` 区块，存在则替换而非重复追加
- **[多平台适配]** → Understand-Anything 支持多平台安装，skill 需检测当前平台并选择正确的安装命令
