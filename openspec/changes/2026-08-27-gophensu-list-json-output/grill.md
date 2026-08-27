# 挖掘纪要：list 命令支持 --json 结构化输出

> - 卷宗：`2026-08-27-gophensu-list-json-output`
> - 日期：2026-08-27
> - 参与者：gophensu / Claude（流程试点）
> - 变更类型分诊：**feature**（新增性为；list 行为从"仅人类可读"扩展为双模输出）
> - 开放问题状态：已清零（2026-08-27 用户签署）

## 决策登记册（强制必填）

| # | 问题 | 结论 | 影响 R-ID | 状态 |
|---|------|------|-----------|------|
| 1 | --json 打印什么结构？ | 结论：含元信息包裹 `{ source, ref, skills, templates, commands }`，机器消费者同时获得分发内容与版本锚点 | R-cli-installer-008（拟新增） | 结论 |
| 2 | 压缩单行还是缩进美化？ | 结论：`JSON.stringify(payload, null, 2)` 两空格美化，人眼 diff 与 Git 审计友好 | R-cli-installer-008 | 结论 |
| 3 | json 通道是否允许 ANSI 色彩码混入？ | 结论：禁止。结构化输出必须可被 jq/管道安全消费，绕开 kleur 封装直写 `process.stdout.write` | R-cli-installer-008 | 结论 |
| 4 | 无 --json 时旧行为是否受影响？ | 结论：零变化。MODIFIED 不动语义，仅扩一条新 Requirement 承载双模 | R-cli-installer-006 | 结论 |
| 5 | 失败分支契约？ | 结论：list 为纯本地只读命令（源码注释自证"纯本地、不联网"），无错误场景；--json 与默认模式退出码均恒为 0 | R-cli-installer-006/008 | 结论 |
| 6 | json 是否包含文本模式未展示的 templates 明细字段？ | 结论：是。json 目标受众是机器消费，披露 MANIFEST 完整字段属于契约改进而非泄漏；文本模式保持现状不动 | R-cli-installer-008 | 结论 |

## 开放问题清单

（无——#1/#2 已于 2026-08-27 由用户裁决并移入登记册，其余全部结论态或闭环。）

## 关键问答摘录

**需求来源原文（试点虚构设定）**：「xt-sdd-skills list 支持一下 --json 吧，脚本要用它做版本巡检」——消费场景 = 自动化脚本机器读取，这直接支撑 #3/#6 的结论。

### 代码侦察记录（codegraph_explore + 直读核实）

- [list.js](../../../packages/cli/src/commands/list.js) 头部注释自证「纯本地、不联网」；现输出全部经 `logger.*`（kleur 着色）
- [argv.js](../../../packages/cli/src/argv.js) 为手写解析器，`default:` 分支对未知 flag 直接置 error 返回 → `--json` 必须显式新增 case，否则现状下该 flag 根本传不进任何命令
- `MANIFEST`(manifest.js) 为 frozen 三段对象 skills/templates/commands；`DEFAULT_SOURCE/DEFAULT_REF` 同文件导出
- 测试盲区：`list` 命令当前 ⚠️ no covering tests（codegraph blast-radius 标注），本次将首次为其建立测试保护
