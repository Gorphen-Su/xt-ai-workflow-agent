# CodeGraph × xt-sdd 提效指南

CodeGraph 把代码库索引为本地知识图谱后，Claude Code 在 xt-sdd 各阶段可用以下 MCP 工具替代 `grep + read`，精准查询符号与关系，显著降低 token 消耗。本文档按 xt-sdd 阶段（openspec 规格驱动 + superpowers 执行）给出用法。

## 目录

- [工具速查](#工具速查)
- [xt-sdd 各阶段用法](#xt-sdd-各阶段用法)
  - [propose（需求探索）](#propose需求探索)
  - [plan（方案设计）](#plan方案设计)
  - [apply（TDD 实现）](#applytdd-实现)
  - [verify（验证回归）](#verify验证回归)
  - [fix（Bug 修复）](#fixbug-修复)
- [何时更新索引](#何时更新索引)

## 工具速查

> v1.1.1 起 Claude Code 注册 codegraph MCP 后，**MCP 只暴露 2 个工具**：`codegraph_explore`
> 与 `codegraph_node`。其余能力是 **CLI 子命令**（在终端或 Bash 工具里用）。下表第二列
> 标注了每种能力的可用形式。刚注册 MCP 需**重启会话**才会出现 MCP 工具。

| 能力 | 可用形式 | 用途 | 典型场景 |
|------|---------|------|---------|
| 区域探索 | `codegraph_explore`（MCP）/ `codegraph explore`（CLI） | 相关符号源码 + 调用链 + 影响半径一次拿 | 陌生模块、根因定位、改动前摸底（**首选**） |
| 单符号详情 | `codegraph_node`（MCP）/ `codegraph node`（CLI） | 取单个符号签名/源码 + caller/callee trail | 看签名、定义位置，免读整文件 |
| 符号搜索 | `codegraph query`（CLI） | 按名/类型搜索符号 | 定位函数/类/方法 |
| 文件结构 | `codegraph files`（CLI） | 索引到的文件骨架 | 了解项目布局 |
| 反向调用 | `codegraph callers`（CLI） | 谁调用了某符号 | 评估改动影响面 |
| 正向调用 | `codegraph callees`（CLI） | 某符号调用了谁 | 理解上下游依赖 |
| 影响范围 | `codegraph impact`（CLI） | 改动某符号的波及面 | 重构/修改前评估 |
| 受影响测试 | `codegraph affected`（CLI） | 受变更影响的测试 | 精准回归 |
| 索引健康 | `codegraph status`（CLI） | 符号数/文件数/时间戳 | 排查索引是否过期 |

## xt-sdd 各阶段用法

### propose（需求探索）

传统：反复 `grep + read` 扫结构，token 消耗大。

CodeGraph 做法：
- `codegraph files` / `codegraph_explore <入口模块>` —— 一次拿到项目骨架与关系图，写 proposal 前快速建立全局认知
- `codegraph explore <需求关键词>` —— 围绕需求收集相关符号，作为 proposal 的事实依据

纪律契合：propose 阶段禁止写代码；codegraph 只读查询，天然合规。

### plan（方案设计）

传统：手动追依赖，易漏改。

CodeGraph 做法：
- `codegraph impact <待改符号>` —— 列出所有受影响节点，直接写进 `design.md` 的「影响范围」与 `tasks.md` 的任务拆分
- `codegraph callers` / `codegraph callees` —— 澄清上下游耦合，决定改动边界
- `codegraph explore <入口>` —— 验证设想的调用链是否成立，支撑技术方案

### apply（TDD 实现）

传统：`read` 整个文件找符号，token 多。

CodeGraph 做法：
- `codegraph query <符号名>` —— 精准定位，拿到 `file:line`
- `codegraph_node <符号>` —— 取签名 / 类型，避免读整文件
- `codegraph explore <当前任务>` —— 让 subagent 或 inline TDD 带着精准上下文动手，减少无谓探索

纪律契合：apply 阶段不改规格；codegraph 只读查询，不触碰规格文档。

### verify（验证回归）

传统：跑全量测试，慢。

CodeGraph 做法：
- `codegraph affected <变更文件...>` —— 只跑受本次改动影响的测试，回归又快又准
- `codegraph status` —— 确认索引未过期，避免基于旧索引下结论

### fix（Bug 修复）

传统：追调用链定位根因，反复试错。

CodeGraph 做法：
- `codegraph explore <报错入口>` —— 一次返回调用链与影响半径，快速锁定根因
- `codegraph impact <修复点>` —— 评估修复是否会波及其他调用方，避免引入新问题

## 何时更新索引

### 自动同步机制

CodeGraph 使用**后台 daemon** 进行自动文件监听和同步：

- **Daemon 进程**：`codegraph install` 后启动后台进程，持续监听项目文件变化（可通过 `codegraph daemons` 查看运行状态）
- **OS 原生事件**：使用操作系统的文件监听 API，实时感知文件变更
- **自动触发**：当文件被修改、添加或删除时，daemon 自动更新图谱
- **防抖处理**：短暂安静窗口后批量处理，提高效率
- **无需手动**：正常开发过程中无需手动同步，daemon 自动保持索引最新

### 手动检测方法

| 检查方法 | 用途 | 命令 |
|---------|------|------|
| **轻量级检查** | 查看索引时间戳和统计 | `codegraph status` |
| **查询验证** | 验证查询结果与实际代码一致 | `codegraph query <已知符号>` |
| **强制重建** | 完全重建索引（最后手段） | `codegraph index --force` |

### 工作流集成

在 xt-sdd 各阶段中：

- **apply 阶段**：代码修改后，如查询结果可疑，运行 `codegraph status` 检查索引时间戳
- **verify 阶段**：运行 `codegraph affected` 前，确保索引最新（daemon 已自动处理，无需额外操作）
- **切换分支后**：大量文件变更，建议运行 `codegraph index --force` 重建索引

### 常见场景

| 场景 | 处理方法 |
|------|---------|
| 正常代码修改 | daemon 自动同步，无需操作 |
| 切换 Git 分支 | 检查 `codegraph status`，必要时 `index --force` |
| 查询结果可疑 | 先 `status` 检查，必要时 `index --force` |
| Daemon 未运行 | 重启会话或 `codegraph install` |
