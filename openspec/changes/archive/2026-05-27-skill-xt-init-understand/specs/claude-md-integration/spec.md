## ADDED Requirements

### Requirement: 自动更新 CLAUDE.md
Skill SHALL 在分析完成后，自动在项目根目录 CLAUDE.md 末尾追加项目理解文档的引用区块。

#### Scenario: 首次写入 CLAUDE.md
- **WHEN** 分析完成且 CLAUDE.md 中不存在 `## 项目理解文档` 区块
- **THEN** 在 CLAUDE.md 末尾追加以下内容：
  ```markdown
  ## 项目理解文档
  以下文档由 `/xt-init:understand` 自动生成，描述项目结构和领域知识。

  - `docs/understand/overview.md` — 项目概览
  - `docs/understand/modules.md` — 模块结构
  - `docs/understand/domain-flows.md` — 领域流图
  - `docs/understand/key-entities.md` — 关键实体

  查询项目代码时，可参考上述文档获取上下文。
  ```

#### Scenario: 更新已有 CLAUDE.md 区块
- **WHEN** 分析完成且 CLAUDE.md 中已存在 `## 项目理解文档` 区块
- **THEN** 替换该区块内容为最新的文档路径列表，不修改 CLAUDE.md 的其他部分

### Requirement: 引用内容准确性
Skill SHALL 确保 CLAUDE.md 中引用的文档路径与实际生成的文档文件一一对应。

#### Scenario: 文档文件完整
- **WHEN** 分析生成了全部 4 个文档文件（overview.md、modules.md、domain-flows.md、key-entities.md）
- **THEN** CLAUDE.md 中列出全部 4 个文档路径

#### Scenario: 部分文档生成失败
- **WHEN** 分析过程中某个文档生成失败
- **THEN** CLAUDE.md 中仅列出成功生成的文档路径，跳过失败的文档

### Requirement: CLAUDE.md 不破坏已有内容
Skill SHALL 在追加或替换引用区块时，确保不修改或删除 CLAUDE.md 中已有的其他内容。

#### Scenario: 已有丰富内容的 CLAUDE.md
- **WHEN** CLAUDE.md 已包含项目配置、规则等内容
- **THEN** 仅追加或替换 `## 项目理解文档` 区块，其他所有内容保持不变
