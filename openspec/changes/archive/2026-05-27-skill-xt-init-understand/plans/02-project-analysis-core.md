<!-- sdd change: skill-xt-init-understand -->

# 2. 项目分析核心流程

本分组实现项目分析的核心执行逻辑：参数解析、全量/指定范围分析、耗时预估。

## 任务清单

- [x] 2.1 实现全项目分析模式：调用 `/understand` + `/understand-domain`
  - Step: 在 SKILL.md 中编写全量分析执行区块
  - Step: 步骤 1 — 调用 `/understand` 命令（无路径参数），执行 7 阶段管线扫描
  - Step: 步骤 2 — 等待 `/understand` 完成，确认 `.understand-anything/knowledge-graph.json` 已生成
  - Step: 步骤 3 — 调用 `/understand-domain` 提取业务领域知识
  - Step: 步骤 4 — 等待 `/understand-domain` 完成，确认 `.understand-anything/domain-graph.json` 已生成
  - Step: 如任一步骤失败，向用户展示错误信息并询问是否重试

- [x] 2.2 实现指定目录/模块分析模式：调用 `/understand [path]`
  - Step: 在 SKILL.md 中编写指定范围分析区块
  - Step: 解析用户传入的路径参数（如 `src/auth`）
  - Step: 验证路径存在：使用 Glob 检查目录是否存在
  - Step: 调用 `/understand <path>` 只分析指定目录
  - Step: 确认分析输出已生成（`knowledge-graph.json` 包含指定目录内容）
  - Step: 路径不存在时提示用户并提供可用目录列表

- [x] 2.3 实现大型项目文件计数检测和耗时预估提示
  - Step: 在 SKILL.md 中编写文件计数检测逻辑
  - Step: 使用 Bash 命令统计源码文件数量（`find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.java" -o -name "*.go" \) | wc -l`）
  - Step: 文件数 > 100 时，使用 AskUserQuestion 提示"项目文件较多（N个），全量分析可能需要几分钟时间，是否继续？"
  - Step: 用户确认后继续，取消则退出

- [x] 2.4 实现参数解析（无参数 = 全量，有路径参数 = 指定范围）
  - Step: 在 SKILL.md 开头的"执行步骤"区块中编写参数解析逻辑
  - Step: 检查 SKILL 参数（ARGUMENTS 字段）：无参数 → 全量模式，有 `--update` → 增量模式，其他 → 视为路径参数
  - Step: 路径参数处理：去除前后空格，验证格式
  - Step: 根据参数类型路由到对应的分析流程（全量/指定范围/增量）
