# ADR-08：`CompileOptions.onWarn` 收集器——路径解析 silent fail → 显式 warning

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-14](./roadmap.md) · [core-design.md "core 错误信息原则"](../../../../../architecture/core-design.md)

> **范围**：把 path / position 编译里 20+ 处 silent `return null`（引用未定义节点 id / step < 2 / anchor 解析失败 / OffsetPosition / AtPosition / polar origin 解析失败等）补一道可观察通道——可选 `CompileOptions.onWarn` callback，不传时 dev 默认 `console.warn`、生产静默。保留"path 解析失败 path 消失"的现状行为，仅在沉默处补告警。

## 背景 / 约束

- 路径解析失败处 silent `return null`，调用方只 `if (result) push(...)`——任一失败 path 静默从 Scene 消失、控制台零信息。用户写 `<Path><Step to="bogusId"/></Path>` 整条 path 消失，是调试体验最差点之一。
- core-design.md 错误信息原则 "AI / LLM 一等公民、错误信息必须可调试"——silent fail 直接违背。

## 决策：引入可选 `onWarn` callback + 默认 dev `console.warn`

所有 silent `return null` 点前先调 `options.onWarn?.(warning)`；`onWarn` 不传时按 `process.env.NODE_ENV` 自动选 dev `console.warn` / production 静默。被否决的备选：(B) 默认 throw / 不可关 console.warn——可能破坏依赖"silent fail = path 该消失"的用户代码；(C) 不动——调试体验持续最差、违背 core-design.md。

理由：可选 callback = 完全非破坏（不传时行为等价 + dev 暴露问题）；`CompileWarning.code` 机器可读让用户可分支处理；`path` 字段 IR locator 让用户定位到具体 JSX child；不引入 throw 路径。

### 决策细节

- **`CompileWarning` 形态**（字面即决策）：`{ code; message; path }`，`code` 用 string union（`'UNRESOLVED_NODE_REFERENCE'` / `'PATH_TOO_SHORT'` / `'ANCHOR_RESOLUTION_FAILED'` / `'OFFSET_BASE_UNRESOLVED'` / `'POLAR_ORIGIN_UNRESOLVED'` / `'AT_TARGET_UNRESOLVED'` / `'RELATIVE_INITIAL_NO_PREV_END'` / `'TEXT_CHILD_NON_STRING'` / `'MULTIPLE_EDGE_LABELS'` …）**+ `string` fallback**——保扩展性，后续加新 code 不破坏调用方。完整 code 集与字段以代码为准。
- **`path` 字段用 jq-like IR locator**（`'children[3].path.children[1].to'`）让用户反推 JSX child。
- **dev 默认不带 stack trace**——`console.warn` 输出 `[retikz] <code> at <path>: <message>` 一行；要 stack 自己在 `onWarn` 里 `console.trace()`。
- **不加 `globalThis` hook**——API 表面最小；要 production 警告自传 `onWarn`。
- **`onWarn` 同步调用**，按 silent fail 发生顺序触发；`compileToScene(ir)` 与 `compileToScene(ir, {})` 等价。

## 不在本 ADR 范围

- `compileToScene` 主入口外的合法 fallback（如 `parseTargetSugar` 返回原 input）——不属 silent fail 范畴。
- builder 端 2 处 silent skip（non-string `<Text>` children / 多 `<EdgeLabel>` 取首）——builder 跑在 compile 之前、不在 compileToScene 链路，onWarn 不适用，另议。
- 错误信息 i18n——message 现阶段仅英文，留 v0.2+。

---

> **实现指针**：level `red`（动 `compileToScene` 公开 API：新增 `CompileWarning` type export + `CompileOptions.onWarn` 字段），非 breaking（superset 扩张 + 默认行为等价）。用户用法见文档站「参考 / 渲染 / 编译选项」。真源以代码为准——`CompileWarning` / `CompileOptions.onWarn` / 默认 warn dispatcher（`core/src/compile/compile.ts`，经 `core/src/index.ts` 导出），silent fail 点加 onWarn 调用在 `core/src/compile/path/` 与 `position`。测试见 `core/tests/compile/`（happy / 边界 dev-vs-prod / 多 warning 顺序）。完整原文（完整 code 列表 / DSL 示例 / 文件 scope）见本文件 git 历史。
