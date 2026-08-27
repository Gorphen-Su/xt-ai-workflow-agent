# 技术方案：list --json 双模输出

> - 卷宗：`2026-08-27-gophensu-list-json-output`
> - 关联提案：[proposal.md](proposal.md)

## 方案概述

argv 解析层放行 `--json` 布尔旗标；list 命令检测到该旗标时组装 `{source, ref, ...MANIFEST}` 载荷并经裸 `process.stdout.write` 打印两空格美化的 JSON，完全旁路 kleur 着色层。

## 技术权衡

| 决策点 | 备选 | 结论 | 理由（含被否选项死因） |
|--------|------|------|--------------------------|
| JSON 写出通道 | A. 经 logger.* 输出 / B. 裸 process.stdout.write | B | A 死因：logger 全员经 kleur 着色，ANSI 码混入 JSON 即破坏 jq 可消费性（登记册 #3 已裁决禁止色彩码） |
| --json 解析位置 | A. argv.js 统一 case / B. list 函数内部自行扫描 process.argv | A | B 死因：argv.js 对未知 flag 直接置 error 返回，穿透不到业务函数就被拦截（已核实 parseArgv default 分支）；统一入口也符合现有架构惯例 |
| 元信息携带方式 | A. 包裹对象 {source, ref, skills...} / B. 仅序列化 MANIFEST 三段 | A | 登记 #1 签署结论：巡检脚本需要版本锚点；B 无法定位来源与 ref |

## 代码探查结论

codegraph_explore + 直读核实（详见卷宗 grill.md 摘录节）：

- 触碰点一：`packages/cli/src/argv.js` — parseArgv 的 flag switch 需新增 `--json` case（result 增设 `json: false` 初值）
- 触碰点二：`packages/cli/src/commands/list.js` — 分支输出；现有 logger.info/detail 调用全部保留于文本分支
- 影响半径：MANIFEST 为 frozen 对象被 install/update/list 共享，本变更为只读消费，不影响其他调用方
- 测试盲区修复：list 目前 ⚠️ no covering tests，本次将新增 `__tests__/list.test.js` 首次建立保护

## 风险与缓解

| 风险 | 概率/影响 | 缓解手段 |
|------|-----------|----------|
| 未来误把 json 分支改走 logger 引入色彩码 | 低/高（破坏机器消费契约） | TDD 用例显式断言输出不含 `\x1b[` ANSI 序列 |
| payload 展开 MANIFEST 后未来增字段造成快照测试噪声 | 中/低 | 断言键集合而非全文深比较 |

## 任务分组依据

单组 01-json-output：四个触碰点聚拢在一个可独立验证单元（一组测试 + 两文件小改），不足拆两组。
