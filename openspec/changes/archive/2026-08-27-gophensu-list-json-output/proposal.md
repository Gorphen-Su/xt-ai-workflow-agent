# 变更提案：list 命令支持 --json 结构化输出

> - 卷宗：`2026-08-27-gophensu-list-json-output`
> - 类型：feature
> - 依据：[grill.md](grill.md)（共 6 项决策，0 项假设）

## Why

`xt-sdd-skills list` 当前仅有人类可读文本输出（含 kleur 着色码），自动化脚本无法安全消费（登记册关键问答：消费场景 = 脚本做版本巡检）。需要一条机器可读的结构化输出通道。

## What Changes

- 新增 `--json` flag：list 以美化 JSON 打印完整分发清单与 source/ref 元信息
- 结构化输出绕开彩色封装直写原始 stdout，可被 jq / CI 管道直接消费

## Impact — 能力域影响面

| Capability | 动作 | 说明 |
|------------|------|------|
| cli-installer | MODIFIED | R-cli-installer-006（清单查看命令）语义收窄为"默认文本模式契约"，补默认行为不变的场景 |
| cli-installer | ADDED | R-cli-installer-008（清单 JSON 输出模式）：载荷结构、序列化格式、纯净 stdout、退出码约定 |

## Non-goals — 非目标

- 不改变无 `--json` 时的任何现有输出（字节级行为保持）
- 不为 install/update 增加 --json（本次仅 list）
- 不引入参数解析库（argv.js 手写解析器维持现状架构）
