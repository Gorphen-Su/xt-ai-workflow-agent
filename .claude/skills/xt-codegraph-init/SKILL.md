---
name: xt-codegraph-init
description: 项目级别一键初始化 CodeGraph 代码知识图谱。检测并全局安装 @colbymchenry/codegraph CLI，注册 Claude Code 的 MCP，在当前项目执行 codegraph init -i 建立本地代码索引，让后续对话通过 codegraph_explore（MCP）/ codegraph explore（CLI）精准检索代码，替代反复 grep+read 整文件、大幅降低 token 消耗。当用户说"初始化 codegraph"、"代码图谱"、"建立代码索引"、"代码检索效率"、"codegraph"、使用 /xt-codegraph-init 时触发。
---

# xt-codegraph-init — CodeGraph 项目初始化

为当前项目一键接入 CodeGraph：把代码库索引成本地知识图谱并暴露为 Claude Code 的 MCP 工具。接入后 Claude 通过结构化查询获取符号、调用链、改动影响，而非读取整个文件，显著降低 token 消耗与探索耗时。

Base directory for this skill: 项目根目录

## 为什么用 CodeGraph

CodeGraph 把代码库预索引为本地知识图谱（100% 本地运行，支持 19+ 编程语言）。接入后 Claude Code 获得一组 MCP 工具，直接查询符号与关系：

- 官方基准：减少 ~94% 工具调用、~77% 探索耗时
- `codegraph_explore`（MCP 主力）一次拿到符号源码 + 调用链 + 影响半径，陌生模块/根因定位/改动前摸底首选
- `codegraph impact`（CLI）一次看清改动影响范围，避免漏改
- `codegraph affected`（CLI）精准回归——只跑受影响测试

## 触发条件

- 用户说"初始化 codegraph"、"代码图谱"、"建立代码索引"、"提高代码检索效率"、"codegraph"
- 用户使用 `/xt-codegraph-init`

## 执行步骤

### 步骤 1：确定项目根目录

以当前工作目录为准，或向上查找 `.git` 作为项目根。后续所有 `codegraph` 命令均在该目录执行。

### 步骤 2：运行幂等安装与初始化脚本

执行：

```bash
bash .claude/skills/xt-codegraph-init/scripts/ensure-codegraph.sh <项目根>
```

脚本幂等完成（可重复运行，已就绪则跳过）：

1. 检测 Node.js / npm，缺失则报错并提示安装
2. 检测 `codegraph` CLI → 缺失则 `npm install -g @colbymchenry/codegraph`
3. 检测 `.codegraph` 目录 → 缺失则 `codegraph init -i`（初始化 + 全量索引）
4. 打印 `codegraph status`

**Windows 注意**：`npm install -g` 若因权限失败，提示用户用管理员终端重试，或先 `npm config set prefix ~/.npm-global` 再把对应 bin 加入 PATH。脚本退出码：`0` 成功、`1` 依赖缺失、`2` 安装或索引失败——非 0 时按提示修复后重跑。

### 步骤 3：注册 Claude Code MCP（一次性机器级）

脚本只装 CLI 与建索引；要让 Claude Code 真正能调用 codegraph 工具，还需注册 MCP（每台机器一次）：

```bash
codegraph install --target=claude --yes
```

- 可重复执行，重复运行只会刷新配置
- 这一步会修改 Claude Code 的全局 MCP 配置（outward-facing 操作），首次执行前向用户说明一句即可
- 回退方式：`codegraph uninstall`

### 步骤 4：验证

1. 运行 `codegraph status`，确认符号数 / 文件数 / 语言非空
2. 抽查：`codegraph files` 看文件结构，或 `codegraph query <某核心符号>` 看能否命中
3. 若步骤 3 刚注册 MCP，**提示用户重启当前 Claude Code 会话**——重启后 Claude 才能看到 `codegraph_*` 系列工具

### 步骤 5：把代码检索优先规则写入项目 CLAUDE.md

CodeGraph 的价值取决于「后续会话真的优先用它」。索引就绪后，向**目标项目根**的 `CLAUDE.md` 注入一段自包含的检索规则区块，让未来每次对话都默认走 codegraph 而非 grep+read。

用 **Grep + Edit** 完成幂等注入（不要用 shell sed/echo——目标项目 CLAUDE.md 结构各异，Edit 更稳）：

1. 用 Grep 在 `<项目根>/CLAUDE.md` 搜索 `<!-- xt-codegraph-init: begin -->`，按下文四分支执行
2. 写入的区块内容固定为下方「规则区块模板」，整段（含 begin/end 标记）一次性处理

**规则区块模板**（begin/end 之间为 skill 管理区，升级时整段替换）：

<!-- xt-codegraph-init: begin -->
## 代码检索优先级（CodeGraph）

本项目已接入 CodeGraph 本地代码知识图谱。检索代码时遵守以下优先级：

- **代码检索强制优先**：理解或定位代码（函数/类/方法、调用链、改动影响面）时，必须先用 `codegraph_explore`（MCP 工具，重启会话后可用）或 `codegraph explore <query>`（CLI）获取符号源码 + 调用链 + 影响半径，禁止先 `grep + read` 整个文件——一次调用即可拿到结构化结果，显著降低 token 消耗。
- **检索例外（用 Grep / Read）**：查 `.md` 文档内容、`specs/` 下的规格 yaml、配置文件等**非代码**内容时用 Grep/Read——这类内容不在 CodeGraph 符号索引内（索引仅覆盖 JS/TS 等代码文件）。
- **索引维护**：CodeGraph daemon 后台自动监听文件变化并同步索引。如查询结果可疑或切换分支后，运行 `codegraph status` 检查时间戳，或 `codegraph index --force` 重建。详见 skill 文档"索引维护"章节。
<!-- xt-codegraph-init: end -->

**注入逻辑（四分支）**：

- **分支 a（无 CLAUDE.md）**：创建文件，内容 = 完整模板（含标记），不编造其他标题/骨架。文件保留一个尾随换行。
- **分支 b（有文件、无 begin 标记）**：追加前先 Grep 标题文本 `## 代码检索优先级（CodeGraph）`——若已存在且无 begin 标记，向用户提示「将在末尾追加受管区块，建议手动删除旧的无标记标题」**但不擅自删除**；随后在文件末尾追加模板（先补一个空行分隔）。
- **分支 c（有 begin + end）**：用 Edit 把 begin 行到 end 行（含）整段替换为最新模板（old_string=旧整段、new_string=新模板，不逐行改），其余内容不动。
- **分支 d（有 begin 缺 end——标记损坏）**：从 begin 行起删到下一个 `## ` 标题前或文件末尾，再按分支 b 追加完整模板；完成后提示用户「检测到旧标记不完整，已重建区块」。

> begin/end 之间是 skill 管理区，请勿手动编辑；如需自定义检索规则，请在区块外另起标题。目标项目已有等效检索规则时可保留或手动去重，本区块用标记自管。

### 步骤 6：完成报告

向用户展示：

- 安装方式（全局新装 / 已存在跳过）
- 索引统计（符号数、文件数、语言）
- MCP 注册状态 + 是否需要重启会话
- CLAUDE.md 规则区块：状态（已写入/已更新/已跳过/已重建）+ 路径 `<项目根>/CLAUDE.md`；区块用 begin/end 标记，未来 skill 升级规则文案会自动整段替换，不污染手写内容
- 后续在 xt-sdd 流程中如何用 codegraph 提效 → 阅读 [references/codegraph-xt-sdd.md](references/codegraph-xt-sdd.md)

## 日常维护（无需重跑本 skill）

- 增量更新索引：`codegraph sync`（MCP server 运行时会自动 sync）
- 重建全量索引：`codegraph index --force`（大改或切换分支后）
- 从项目移除：`codegraph uninit`（加 `--force` 跳过确认）

## 索引维护

### 自动同步机制

CodeGraph 使用**后台 daemon** 进行自动文件监听和同步：

- **Daemon 进程**：`codegraph install` 后启动后台进程（可通过 `codegraph daemons` 查看运行状态）
- **OS 原生事件**：使用操作系统的文件监听 API（Windows、macOS、Linux），实时感知文件变更
- **自动触发**：当文件被修改、添加或删除时，daemon 自动更新图谱
- **防抖处理**：短暂安静窗口后批量处理，提高效率
- **无需手动**：正常开发过程中无需手动同步，daemon 自动保持索引最新

**检查 daemon 状态**：
```bash
codegraph daemons        # 查看运行中的 daemon 进程
codegraph status         # 查看索引状态和时间戳
```

### 手动检测方法

当怀疑索引过期时，可使用以下方法检测：

1. **轻量级检查**（推荐）：
   ```bash
   codegraph status
   ```
   查看索引时间戳和统计信息，判断是否需要更新

2. **查询结果验证**：
   - 运行 `codegraph query <已知符号>` 或 `codegraph explore <概念>`
   - 如果结果与实际代码不符 → 索引可能过期

3. **强制重建**（最后手段）：
   ```bash
   codegraph index --force
   ```
   完全重建索引，耗时较长但确保最新

### 常见场景处理

| 场景 | 处理方法 | 说明 |
|------|---------|------|
| **正常代码修改** | 无需操作 | Daemon 自动同步索引 |
| **切换 Git 分支** | 检查 `codegraph status` | 大量文件变更后可能需要 `codegraph index --force` |
| **查询结果可疑** | 先 `status` 检查，必要时 `index --force` | 确保查询基于最新代码 |
| **Daemon 未运行** | 重启会话或 `codegraph install` | Daemon 会随会话启动，意外停止时重装 MCP |
| **索引损坏** | `codegraph index --force` | 重建全量索引修复损坏 |

### 故障排查

**问题：查询结果与实际代码不符**
- 检查 daemon 是否运行：`codegraph daemons`
- 检查索引时间戳：`codegraph status`
- 必要时重建索引：`codegraph index --force`

**问题：daemon 进程意外停止**
- 重新安装 MCP：`codegraph install --target=claude`
- 重启 Claude Code 会话

**问题：索引一直显示"building"**
- 检查是否有锁定文件：`codegraph unlock <项目路径>`
- 删除 `.codegraph/index.lock` 手动解锁

**问题：索引大小异常增长**
- 可能是大项目或大量生成文件，正常现象
- 如怀疑损坏，运行 `codegraph index --force` 重建

### 工作流集成建议

在 xt-sdd 各阶段中，代码修改后 CodeGraph 会自动同步。为确保查询准确性：

- **apply 阶段**：代码修改后，如查询结果可疑，运行 `codegraph status` 检查
- **verify 阶段**：运行 `codegraph affected` 前，确保索引最新（daemon 已自动处理）
- **切换分支后**：运行 `codegraph index --force` 重建索引

## 注意事项

- 首次全量索引大项目可能需要数分钟，属正常现象
- codegraph 完全本地运行，不上传代码
- 与 `xt-init-understand`（Understand-Anything 插件）互补：understand 生成结构化文档供阅读，codegraph 提供实时查询工具供 Claude 调用，两者可共存
- 在 xt-sdd 各阶段（propose / plan / apply / verify / fix）如何用 codegraph 提效，详见 [references/codegraph-xt-sdd.md](references/codegraph-xt-sdd.md)

ARGUMENTS: 可选，项目根目录路径。无参数 = 当前目录
