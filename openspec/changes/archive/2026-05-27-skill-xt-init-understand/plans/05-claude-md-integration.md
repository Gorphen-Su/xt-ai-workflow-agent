<!-- sdd change: skill-xt-init-understand -->

# 5. CLAUDE.md 集成

本分组实现分析完成后自动更新项目 CLAUDE.md 的逻辑。

## 任务清单

- [x] 5.1 实现检测 CLAUDE.md 中是否已有 `## 项目理解文档` 区块
  - Step: 在 SKILL.md 中编写 CLAUDE.md 集成区块
  - Step: 读取项目根目录的 CLAUDE.md 文件
  - Step: 使用 Grep 搜索 `## 项目理解文档` 标题
  - Step: 找到 → 标记为"更新模式"（任务 5.3）
  - Step: 未找到 → 标记为"首次写入模式"（任务 5.2）

- [x] 5.2 实现首次追加区块逻辑（在 CLAUDE.md 末尾追加引用）
  - Step: 构建引用区块内容：
    ```markdown
    ## 项目理解文档
    以下文档由 `/xt-init:understand` 自动生成，描述项目结构和领域知识。

    - `docs/understand/overview.md` — 项目概览
    - `docs/understand/modules.md` — 模块结构
    - `docs/understand/domain-flows.md` — 领域流图
    - `docs/understand/key-entities.md` — 关键实体

    查询项目代码时，可参考上述文档获取上下文。
    ```
  - Step: 在 CLAUDE.md 文件末尾追加两个空行 + 引用区块
  - Step: 使用 Edit 工具追加，确保不破坏已有内容

- [x] 5.3 实现更新已有区块逻辑（替换而非重复追加）
  - Step: 定位 CLAUDE.md 中 `## 项目理解文档` 区块的起止位置
  - Step: 识别区块结束位置（下一个 `##` 二级标题或文件末尾）
  - Step: 使用 Edit 工具替换整个区块内容为最新的文档路径列表
  - Step: 确保 CLAUDE.md 中 `## 项目理解文档` 区块只出现一次

- [x] 5.4 实现部分文档生成失败时的路径过滤逻辑
  - Step: 检查 `docs/understand/` 下实际生成的文件（overview.md、modules.md、domain-flows.md、key-entities.md）
  - Step: 只将成功生成的文件路径写入 CLAUDE.md 引用区块
  - Step: 跳过未生成的文件（如 domain-flows.md 未生成则不列出）
  - Step: 在最终报告中注明哪些文档生成失败
