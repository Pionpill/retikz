# ADR-07：`_builder.ts` `as` cast 收敛到边界、`parseTargetSugar` 参数窄化

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-13](./roadmap.md) · [AGENTS.md "不允许 `as any`"](../../../../../../AGENTS.md)

> **范围**：把 builder 里散布的 60 处 `props.X as <Type>` cast 收敛到每个 Kernel 组件一处顶层 cast，子函数走类型化 `buildXxxFromProps(props: XxxProps)` 签名——字段 rename / 加字段时 TS 帮抓所有点。cast 是结构性必要（`Children.forEach` 给 `unknown`），目标是控制 cast 个数与位置、不是消灭。

## 背景 / 约束

- builder 全文 60 处 `props.X as <Type>`：根因是 React `Children.forEach` 给的 `child.props` 是 `unknown`，需按"this is a Node / Path child"约定 narrow 后读字段。当前写法 100% 信任调用方 props 类型正确，**IR 类型错位时编译期不报错、到 zod 才暴露**。
- 60 处累积起来：字段 rename TS 不抓；引入新 prop 易 cast 错（`as string` 写成 `as number` 不报错）；AI 子 Agent 改 builder 极易顺手加新 cast 而非走类型化路径。

## 决策：cast 一次性收敛到顶层 + 子函数走类型化签名

每个 Kernel 组件一个 `buildXxxFromProps(props: XxxProps): IRChild` 入口（`Children.forEach` 分支里 `child.props as XxxProps` 仅此一处顶层 cast），子函数体内无 cast、字段 rename 时 TS 帮抓所有点。被否决的备选：(B) 保留 60 处 cast——字段 rename / 加字段漏改不报错；(C) 用 zod parse 替代 cast 做双重防御——运行时性能开销，且 zod 已在 `compileToScene` 入口跑一次、再加一道是重复防御。

理由：顶层 cast 一处 + 子函数类型化签名是 TS 社区标准做法，可读可维护；不引入运行时开销；子函数类型化签名也是 ADR-06 字段表互锁的前提。

### 决策细节

- **顶层 cast 不抽 helper**——只省 3-5 处样板、价值有限；保留每个组件分支显式 cast 一次。
- **typed helper 命名**：`buildNodeFromProps` / `buildPathFromProps` / `buildStepFromProps` / `buildEdgeLabelFromProps` / `buildCoordinateFromProps` / `buildTextFromProps`（6 个 Kernel + Sugar 组件）。
- **unbuilder 方向同步审计** cast，含在本 ADR scope。

## 不在本 ADR 范围

- **`parseTargetSugar` 参数窄化**（`unknown` → `IRTarget | string`）——本里程碑未落地，签名仍 `input: unknown` + 边界 `as IRTarget`；窄化为延后项。
- `parseTargetSugar` 之外的 parsers cast 审计（`parseWay` 已是良好类型化签名）。
- 引入运行时 zod parse 双重防御（选项 C）——性价比不够。

---

> **实现指针**：level `yellow`、非 breaking（仅类型严谨度收敛，零行为 / 零公开 API 变化，cast 是编译期）。真源以代码为准——6 个 `buildXxxFromProps` typed helper（`react/src/kernel/builder.ts`），同步审计的 `react/src/kernel/unbuilder.ts`。守门靠既有 builder / unbuilder / Draw 测试 + ADR-04 round-trip + `tsc --noEmit`。完整原文（cast 收敛示例 / 文件 scope / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `ea674f3f`；压缩前完整施工蓝图 = `git show ea674f3f^:notes/decisions/core/v0/v0.1/beta.1/07-builder-cast-narrow.md`。
