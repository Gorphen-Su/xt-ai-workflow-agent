## 1. Skill 骨架与依赖检查

- [ ] 1.1 创建 `.claude/skills/xt-init-understand/SKILL.md` 基础骨架，定义 skill 名称、描述、触发条件和参数
- [ ] 1.2 实现环境依赖检测逻辑（Node.js >= 22、pnpm >= 10、Python 3）
- [ ] 1.3 实现 Understand-Anything 插件安装状态检测逻辑
- [ ] 1.4 实现 Claude Code 平台自动安装流程（`/plugin marketplace add`）
- [ ] 1.5 实现非 Claude Code 平台的手动安装指引

## 2. 项目分析核心流程

- [ ] 2.1 实现全项目分析模式：调用 `/understand` + `/understand-domain`
- [ ] 2.2 实现指定目录/模块分析模式：调用 `/understand [path]`
- [ ] 2.3 实现大型项目文件计数检测和耗时预估提示
- [ ] 2.4 实现参数解析（无参数 = 全量，有路径参数 = 指定范围）

## 3. 分析结果文档整理

- [ ] 3.1 实现 JSON → Markdown 转换逻辑：从 `knowledge-graph.json` 生成 `docs/understand/overview.md`
- [ ] 3.2 生成 `docs/understand/modules.md`（模块结构和依赖关系）
- [ ] 3.3 生成 `docs/understand/domain-flows.md`（从 `domain-graph.json` 提取领域流图）
- [ ] 3.4 生成 `docs/understand/key-entities.md`（关键类、函数、接口及其关系）
- [ ] 3.5 创建 `docs/understand/.analysis-meta.yaml` 记录分析元信息（commit hash、时间戳）

## 4. 增量更新

- [ ] 4.1 实现 `--update` 参数解析和增量更新模式入口
- [ ] 4.2 实现分析基准点读取（`.analysis-meta.yaml` 的 `last_analyzed_commit`）
- [ ] 4.3 实现调用 `/understand-diff` 获取变更影响分析
- [ ] 4.4 实现受影响模块的文档局部更新逻辑
- [ ] 4.5 实现无基准时的降级为全量分析逻辑

## 5. CLAUDE.md 集成

- [ ] 5.1 实现检测 CLAUDE.md 中是否已有 `## 项目理解文档` 区块
- [ ] 5.2 实现首次追加区块逻辑（在 CLAUDE.md 末尾追加引用）
- [ ] 5.3 实现更新已有区块逻辑（替换而非重复追加）
- [ ] 5.4 实现部分文档生成失败时的路径过滤逻辑
