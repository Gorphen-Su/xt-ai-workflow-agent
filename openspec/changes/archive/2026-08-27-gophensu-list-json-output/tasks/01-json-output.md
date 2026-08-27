# 任务组 01：json-output

> - 卷宗：`2026-08-27-gophensu-list-json-output`
> - 覆盖 Requirement：R-cli-installer-008, R-cli-installer-006
> - 本组完成判定：`cd packages/cli && npm test` 全绿（含新增 list.test.js）

## 微步骤

每步一个 checkbox。标 [TDD] 的步骤 MUST 先写失败测试并亲眼看到失败输出，再写实现转绿。

- [x] [TDD] 新建 `packages/cli/src/__tests__/list.test.js`：用例 A 断言 `list({json:true})` 的 stdout 可 `JSON.parse`、顶层五键、无 ANSI——此刻运行必须红（--json 尚未存在）✅ 红证据：两用例均 `SyntaxError: Unexpected token 'A', "Available "...`
- [x] [TDD] 用例 B：templates 条目含 src/dst/mode 三字段——红（同上）
- [x] `argv.js`：parseArgv 结果增设 `json: false`，switch 新增 `--json` case 放行（含与其它 flag 组合）
- [x] `list.js`：`options.json` 为真时组装 `{ source, ref, skills, templates, commands }`（source/ref 取 options 或 DEFAULT_*），`process.stdout.write(JSON.stringify(payload, null, 2) + '\n')` 返回；文本分支原样保留——绿 ✅
- [x] [TDD] 用例 C：默认模式（无 json 旗标）输出包含 Skills:/Commands:/Templates 章节关键词与 `.claude/commands/` 前缀——防零漂移 ✅（钉住测试，出生即绿属预期：守护冻结基线而非驱动新行为，见测试内注释）
- [x] 全组回归：`cd packages/cli && npx vitest run` 通过（覆盖矩阵 R-006/R-008 双向满格验证点）✅ 全量 10 文件 78 测试全绿
- [x] 提交：`[2026-08-27-gophensu-list-json-output] feat(cli): list 支持 --json 结构化输出` —— 本组一批

## 备注

用例 C 由驱动型调整为钉住型（出生即绿）：其契约对象是"现状零漂移"而非新行为，无法也不应制造红色失败；已在测试注释中声明定位。

### 审计整改段（2026-08-27 代码审查裁决 With fixes 后当场处置）

- [x] Important#1 argv 接线真空 → argv.test.js 补 `--json` 单独/组合放行钉住（出生即绿型接线保护）
- [x] Important#1 端到端真空 → cli.test.js 新增 `list --json` 子进程用例（exit0+stderr 空+五键+ref 尊重 --tag）与 FORCE_COLOR=1 真彩色进程 ANSI 纯净性证明
- [x] Important#2 帮助文本遗漏 → help.js Global options 增补 `--json  list only — …` 行，cli.test 钉住发现路径
- [x] Minor#3 序列化格式显式断言（换行结尾 + 二级缩进键行）
- [x] Minor#4 用例 C 章节顺序 indexOf 递增断言
- [x] Minor#5 ANSI 纯净性改为真彩色子进程内证明
- [x] Minor#6/#8 options.json 真值风格注释、浅拷贝前瞻性注释落码
- [x] Minor#7 ref 生效值传播锁定（并入端到端用例断言）
- 整改后全量：10 文件 82 测试全部通过
