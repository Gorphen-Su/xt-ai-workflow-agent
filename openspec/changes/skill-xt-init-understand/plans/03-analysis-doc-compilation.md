<!-- sdd change: skill-xt-init-understand -->

# 3. 分析结果文档整理

本分组实现将 Understand-Anything 的 JSON 输出转换为结构化 Markdown 文档。

## 任务清单

- [x] 3.1 实现 JSON → Markdown 转换逻辑：从 `knowledge-graph.json` 生成 `docs/understand/overview.md`
  - Step: 在 SKILL.md 中编写文档生成区块
  - Step: 读取 `.understand-anything/knowledge-graph.json`，提取 `project` 字段（name、languages、frameworks、description）
  - Step: 提取 `layers[]` 字段获取架构分层信息
  - Step: 生成 `docs/understand/overview.md`，包含：项目名称、语言、框架、结构描述、架构分层
  - Step: 如果 `knowledge-graph.json` 不存在或为空，提示分析可能未完成

- [x] 3.2 生成 `docs/understand/modules.md`（模块结构和依赖关系）
  - Step: 从 `knowledge-graph.json` 提取 `nodes[]` 中 type 为 `module` 的节点
  - Step: 提取 `edges[]` 中 type 为 `imports`、`depends_on` 的边，构建模块依赖图
  - Step: 生成 Markdown 格式的模块文档：每个模块列出职责、导出项、依赖项
  - Step: 使用层级缩进或表格展示模块间的依赖关系

- [x] 3.3 生成 `docs/understand/domain-flows.md`（从 `domain-graph.json` 提取领域流图）
  - Step: 读取 `.understand-anything/domain-graph.json`
  - Step: 提取 domain 节点（`domain:<name>`），列出每个业务领域的实体和规则
  - Step: 提取 flow 节点（`flow:<name>`），展示每个流程的入口类型（http/cli/event/cron/manual）
  - Step: 提取 step 节点（`step:<flow>:<step>`），按权重排序展示流程步骤
  - Step: 生成 Markdown 格式的领域流图文档
  - Step: 如果 `domain-graph.json` 不存在，跳过此文档生成并在最终报告中注明

- [x] 3.4 生成 `docs/understand/key-entities.md`（关键类、函数、接口及其关系）
  - Step: 从 `knowledge-graph.json` 提取 `nodes[]` 中 type 为 `class`、`function`、`interface` 的节点
  - Step: 按连接度（edges 数量）排序，取前 20 个最关键的实体
  - Step: 为每个关键实体提取：名称、文件路径、签名、描述、被调用关系
  - Step: 生成 Markdown 格式的关键实体文档，包含实体摘要表和详细说明
  - Step: 包含实体间的关系图（使用文本描述或 Mermaid 语法）

- [x] 3.5 创建 `docs/understand/.analysis-meta.yaml` 记录分析元信息（commit hash、时间戳）
  - Step: 获取当前 Git commit hash（`git rev-parse HEAD`）
  - Step: 获取当前 ISO 8601 时间戳
  - Step: 判断分析范围（full 或 partial，基于参数和路径）
  - Step: 写入 `docs/understand/.analysis-meta.yaml`：
    ```yaml
    last_analyzed_commit: <commit-hash>
    last_analyzed_at: <ISO-8601-timestamp>
    analysis_scope: full | partial:<path>
    ```
  - Step: 后续增量更新时读取此文件作为基准
