# xt-init-understand

帮助开发者快速理解和探索项目代码。自动调用 Understand-Anything 插件分析项目结构，生成结构化的理解文档，并集成到 CLAUDE.md 供后续对话引用。

Base directory for this skill: 项目根目录

## 触发条件

当用户输入 `/xt-init-understand`、`/xt-init-understand [path]` 或 `/xt-init-understand --update` 时触发。

## 参数

| 参数 | 说明 |
|------|------|
| 无参数 | 全量分析整个项目 |
| `<path>` | 只分析指定目录（如 `src/auth`） |
| `--update` | 增量更新模式，基于 Git diff 只重新分析变更部分 |

## 执行步骤

### 步骤 1：环境依赖检测

检测 Understand-Anything 的运行环境依赖。

1. 运行 `node --version` 检查 Node.js 版本（需要 >= 22）
2. 运行 `pnpm --version` 检查 pnpm 版本（需要 >= 10）
3. 运行 `python3 --version` 或 `python --version` 检查 Python 3 是否安装
4. 如果任何依赖缺失：
   - 向用户列出具体缺失项
   - 提供安装建议（如 `nvm install 22`、`npm install -g pnpm`、`pyenv install 3`）
   - 阻塞后续流程，直到依赖就绪
5. 全部满足 → 继续步骤 2

### 步骤 2：插件安装检测

检测 Understand-Anything 插件是否已安装。

1. 检查插件目录是否存在：
   - 运行 `ls ~/.claude/plugins/understand-anything/ 2>/dev/null || ls ~/.claude/plugins/understand-thing/ 2>/dev/null`
   - 或检查是否能找到 `/understand` 命令
2. **已安装** → 跳过安装，继续步骤 3
3. **未安装** → 执行安装：

   **Claude Code 平台（默认）**：
   - 执行 `/plugin marketplace add Lum1104/Understand-Anything`
   - 安装后重新检测确认
   - 安装失败时提供文档链接：https://github.com/Lum1104/Understand-Anything/blob/main/READMEs/README.zh-CN.md

   **非 Claude Code 平台（Cursor、VS Code Copilot、Windsurf 等）**：
   - macOS/Linux：`curl -fsSL https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.sh | bash`
   - Windows PowerShell：`iwr -useb https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.ps1 | iex`
   - 使用 AskUserQuestion 询问用户是否已手动安装完成
   - 完成后继续步骤 3

### 步骤 3：参数解析与路由

解析用户传入的参数，决定执行模式。

1. **无参数** → 全量分析模式（步骤 4a）
2. **`--update`** → 增量更新模式（步骤 4c）
3. **其他参数（视为路径）** → 指定目录分析模式（步骤 4b）
   - 去除参数前后空格
   - 验证路径存在：使用 Bash `ls -d <path>` 检查
   - 路径不存在时提示用户并退出

### 步骤 4a：全项目分析

对整个项目执行完整分析。

1. **文件计数检测**：
   - 运行 `find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.tsx" -o -name "*.jsx" -o -name "*.vue" -o -name "*.rb" -o -name "*.php" -o -name "*.rs" -o -name "*.kt" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" | wc -l`
   - 文件数 > 100 时，使用 AskUserQuestion 提示"项目源码文件较多（N 个），全量分析可能需要几分钟时间，是否继续？"
   - 用户取消则退出

2. **执行代码扫描**：
   - 调用 `/understand` 命令
   - 等待完成，确认 `.understand-anything/knowledge-graph.json` 已生成
   - 失败时提示错误并询问是否重试

3. **执行领域分析**：
   - 调用 `/understand-domain` 命令
   - 等待完成，确认 `.understand-anything/domain-graph.json` 已生成
   - 失败时提示但继续（领域分析为可选）

4. → 跳转步骤 5（文档整理）

### 步骤 4b：指定目录分析

只分析用户指定的目录。

1. **验证路径**：
   - 使用 Bash `ls -d <path>` 确认目录存在
   - 不存在时提示用户，列出项目顶层目录供参考，退出

2. **执行分析**：
   - 调用 `/understand <path>` 命令
   - 等待完成，确认输出已生成
   - 失败时提示错误并询问是否重试

3. → 跳转步骤 5（文档整理）

### 步骤 4c：增量更新

基于 Git diff 检测变更，只重新分析受影响部分。

1. **读取分析基准**：
   - 读取 `docs/understand/.analysis-meta.yaml`（如果存在）
   - 提取 `last_analyzed_commit` 字段
   - 文件不存在或字段为空 → 提示"未找到上次分析记录，将执行全量分析"并使用 AskUserQuestion 确认
   - 用户确认 → 切换到步骤 4a（全量分析）
   - 用户拒绝 → 退出

2. **检测变更**：
   - 运行 `git diff <last_analyzed_commit>..HEAD --name-only` 获取变更文件列表
   - 无变更 → 提示"项目代码未变更，无需更新"并退出

3. **执行影响分析**：
   - 调用 `/understand-diff` 获取变更影响分析
   - 解析输出，提取受影响的模块和节点列表

4. **局部更新文档**：
   - 根据影响分析结果，确定需要更新的文档段落
   - 只重新整理受影响部分的 Markdown 文档
   - 保留未受影响部分的内容不变

5. → 跳转步骤 5（文档整理）

### 步骤 5：文档整理

将 Understand-Anything 的 JSON 输出转换为结构化 Markdown 文档。

1. **创建输出目录**：
   - 运行 `mkdir -p docs/understand`

2. **生成 overview.md**（项目概览）：
   - 读取 `.understand-anything/knowledge-graph.json`
   - 提取 `project` 字段：name、languages、frameworks、description
   - 提取 `layers[]` 字段获取架构分层
   - 生成 Markdown：项目名称、语言列表、框架列表、结构描述、架构分层概述
   - 使用 Write 工具写入 `docs/understand/overview.md`
   - 如果 JSON 不存在或为空，提示分析可能未完成

3. **生成 modules.md**（模块结构）：
   - 从 `knowledge-graph.json` 的 `nodes[]` 中提取 type 为 `module` 的节点
   - 从 `edges[]` 中提取 type 为 `imports`、`depends_on` 的边
   - 生成 Markdown：每个模块列出职责描述、导出项、依赖模块
   - 使用层级缩进或表格展示模块依赖关系图
   - 写入 `docs/understand/modules.md`

4. **生成 domain-flows.md**（领域流图）：
   - 读取 `.understand-anything/domain-graph.json`
   - 如果文件不存在，跳过此文档并在最终报告中注明
   - 提取 domain 节点（`domain:<name>`）：列出实体、业务规则、跨域交互
   - 提取 flow 节点（`flow:<name>`）：展示入口类型（http/cli/event/cron/manual）
   - 提取 step 节点（`step:<flow>:<step>`）：按 weight 排序展示流程步骤
   - 生成 Markdown 领域流图文档
   - 写入 `docs/understand/domain-flows.md`

5. **生成 key-entities.md**（关键实体）：
   - 从 `knowledge-graph.json` 提取 type 为 `class`、`function`、`interface` 的节点
   - 按连接度（关联 edges 数量）排序，取前 20 个最关键实体
   - 每个实体列出：名称、文件路径、签名、描述、调用关系
   - 生成 Markdown 关键实体文档
   - 写入 `docs/understand/key-entities.md`

6. **记录分析元信息**：
   - 运行 `git rev-parse HEAD` 获取当前 commit hash
   - 获取当前 ISO 8601 时间戳
   - 根据参数判断分析范围（full 或 partial:<path>）
   - 写入 `docs/understand/.analysis-meta.yaml`：
     ```yaml
     last_analyzed_commit: <commit-hash>
     last_analyzed_at: <ISO-8601-timestamp>
     analysis_scope: full | partial:<path>
     ```

### 步骤 6：CLAUDE.md 集成

将分析结果路径写入项目 CLAUDE.md。

1. **检查已有区块**：
   - 读取项目根目录 CLAUDE.md
   - 使用 Grep 搜索 `## 项目理解文档` 标题
   - 找到 → 更新模式（步骤 6b）
   - 未找到 → 首次写入模式（步骤 6a）

2. **步骤 6a：首次写入**：
   - 检查 `docs/understand/` 下实际存在的文件
   - 只引用成功生成的文档
   - 在 CLAUDE.md 末尾追加两个空行和引用区块：
     ```markdown

     ## 项目理解文档
     以下文档由 `/xt-init-understand` 自动生成，描述项目结构和领域知识。

     - `docs/understand/overview.md` — 项目概览
     - `docs/understand/modules.md` — 模块结构
     - `docs/understand/domain-flows.md` — 领域流图
     - `docs/understand/key-entities.md` — 关键实体

     查询项目代码时，可参考上述文档获取上下文。
     ```
   - 使用 Edit 工具追加，不修改已有内容

3. **步骤 6b：更新已有区块**：
   - 定位 `## 项目理解文档` 区块的起止位置（到下一个 `##` 或文件末尾）
   - 检查 `docs/understand/` 下实际存在的文件
   - 使用 Edit 工具替换整个区块内容为最新路径列表
   - 确保区块只出现一次

### 步骤 7：完成报告

向用户展示分析结果摘要。

1. 列出生成的文档文件及其路径
2. 注明哪些文档生成失败（如有）
3. 提示"分析完成。文档保存在 `docs/understand/` 目录下，已集成到 CLAUDE.md。"
4. 提示增量更新命令：`/xt-init-understand --update`
