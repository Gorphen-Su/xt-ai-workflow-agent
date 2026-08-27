# xt-sdd2 工作流可执行方案

> - 日期：2026-08-27
> - 状态：共识定稿（用户已最终确认）
> - 来源：grilling 盘问收敛的全部裁决（2026-08-27 对话记录）
> - 定位：本文件为导航级摘要；正式实现时以各 skill 文件与模板为准

## 一、定位：唯一流程包

| 决策 | 内容 |
|------|------|
| 终局形态 | **无分流、无双轨**：目标项目直接安装 `xt-sdd2-skills`，装的即是唯一流程；旧 xt-sdd 不再随新包分发 |
| 历史工件 | 曾用旧流程的仓库，其遗留 change 目录**原地保留**，定义为「项目演变的历史证据层」——追溯的过去时，只读不覆写 |
| 目录归属 | 安装后 `openspec/` 目录由 xt-sdd2 独占维护 |
| 包名 | `xt-sdd2-skills`（已确认） |

## 二、核心对象：档案卷宗 Dossier

一次变更 = 一个从模糊输入到契约合入的完整证据链卷宗。

```
openspec/changes/YYYY-MM-DD-<作者缩写>-<slug>/   # 卷宗 ID 即目录名，创建前扫描去重
├── grill.md      # ①挖掘纪要：头部决策登记册(强制)+关键问答摘录+开放问题清单
├── proposal.md   # ②为什么改 + 能力域影响面
├── specs/        # ③需求 delta（ADDED/MODIFIED/REMOVED）──评审冻结──▶ 契约基线
├── design.md     # ④技术权衡（引用 codegraph 探查结论）
├── tasks.md      # ⑤薄索引：分组清单简表（兼容 openspec CLI 工件识别）
├── tasks/        #    NN-<分组名>.md 微步骤 checkbox 详情
└── audit.md      # ⑦审计报告（audit 阶段产物）

land 后：delta 合入 openspec/specs/<capability>/spec.md，
        卷宗 mv 至 changes/archive/YYYY-MM-DD-<原ID>/（OpenSpec 官方归档自带日期戳）
```

要点：

- **状态真相** = 官方 `openspec status --json` + 卷宗文件本身。不自造 state.yaml；断点恢复 = 重读卷宗。
- **对话短命**：工件落盘即忘，控制 token 消耗。
- **事实依据**（已核查 vendored OpenSpec skills）：原生变更名不含日期序号；日期戳在归档 mv 时盖上；Requirement 无原生编号系统——编号体系为本流程自定义层。

## 三、五命令管线（每张审计凭证对应一条命令）

```
①interview ──▶ ②draft ──[PR 评审=freeze]──▶ ③execute ──▶ ④audit ──[PR]──▶ ⑤land
   │             │                              │             │
 grilling       OpenSpec                     superpowers    code-review
 出证据         delta 起草                    TDD 循环       三方闭环校验
```

### 环节属主表（防三工具闭环重复）

定则：**一个生命周期环节只有一个属主工具**，重复能力降级为被属主调用的子程序，禁用清单明文写入各 SKILL.md。

| 命令 | 属主工具 | 关键行为 |
|------|------|------|
| `interview` | **grilling**（禁用 openspec-explore / brainstorming 于需求侧） | 开场分诊 feature/bug/chore；bug 型收敛为复现步骤+根因假设+修复边界三必答题；产出 grill.md；开放问题清零或显式降级为假设 |
| `draft` | **OpenSpec CLI**（剥离其自带澄清轮次，输入取 grill.md） | 建 change 目录、生成 proposal+deltas+design+tasks 索引；`validate --strict`；**并发软锁预警**：扫描活动 change 能力域重叠并输出警告；结束即开 PR 请求契约评审 |
| （freeze 门禁） | 人 | PR 合并 = 契约基线冻结，此后 spec 变更必须开新卷宗 |
| `execute` | **superpowers:test-driven-development**（tasks.md 仅作驱动清单） | 按分组连续执行微步骤，分组批量提交，commit 前缀 `[<change-id>]`，每任务标注覆盖 R-ID |
| `audit` | **verification-before-completion + requesting-code-review** | 测试运行证据；机器校验三方闭环（R-ID ↔ task ↔ commit），缺口即 fail；产出 audit.md（面向人）：校验结果+测试证据摘录+review 结论+遗留风险 |
| `land` | **openspec archive** | delta 合入主库（合并冲突=语义对撞仲裁点）、归档卷宗、开 land PR |

### 附属命令

`/xt-sdd2:sow`（一次性冷启动）：扫码库反推初版 `specs/` 主库骨架，每条 requirement 打 `[SOURCE:反推][DRAFT]` 低信任旗标。

## 四、强制约束（铁律）

1. 所有功能/修复/改造出码前必须有已冻结的契约 delta——**main 直推一律禁止**
2. 单人仓库可在安装后显式声明降级模式：PR 以本地确认对话代替，门禁产物一样不少
3. 每个 Requirement 编号 `R-<CAP>-NNN`（capability 域内序号，无中央注册表）；两人并行同 capability 的合并冲突即语义对撞仲裁点
4. 无 audit 报告不得 land；未通过闭环校验的缺口必须整改或显式登记为已知风险
5. 不设 fix/quick 独立快道——快存在分诊后的自动快速通过里，不存在门禁豁免里
6. 不设 CHANGELOG 台账——变更史 = `git log openspec/specs/` + PR 链接，一切可再生信息不做手工维护

## 五、配置与文档位置治理

- **技术栈/命令载体**：单一事实源 `openspec/project.md`，机器约束（test_command 等）嵌 YAML frontmatter，frontmatter 装不下再升级出第二文件
- **收口规则**：流程工件全在卷宗内；长篇设计/ADR 放 `docs/designs/` 且须从 design.md 反链；调研纪要放 `docs/explores/`；CLAUDE.md 只写导航不写内容；代码检索一律 codegraph

## 六、落地路线图（建议次序）

1. 在本仓库编写五个 skill 文件 + sow + 卷宗工件模板（grill/proposal/delta/design/tasks/audit）
2. 本仓库挂牌试点吃自己的狗粮，跑一个真实变更验证管线
3. 打包独立 npm 包发布，附 README 使用说明与挂牌示例

## 附：关键取舍备忘（为什么这样定）

- 终局为何无双轨 → 用户最终裁决：分发形态决定了流程唯一性——装什么包就用什么流程；旧工件自然降级为历史证据层，无需任何隔离机关
- 双轨方案曾阶段性存在（按项目类型分轨挂牌），因分发载体收紧为单包而整体作废
- 为何 freezing 走 PR → 评审以 spec 为准必须落成 Git 动作才有审计痕迹
- 为何用作者缩写而非日递增序号 → 多人分支下日序号必撞且 git 可能静默共存；缩写顺带解决卷宗责任人标识
- 为何无中央 Requirement 注册表 → 注册表本身是漂移点，让合并冲突把语义对撞逼上台面
- 为何不继承旧小窗口机关 → 新流程状态外置卷宗后对话天然变短，机关复杂度收益比反转；痛点实证后再回补
