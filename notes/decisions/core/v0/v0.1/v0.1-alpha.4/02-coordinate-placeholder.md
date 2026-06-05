# ADR-02：`<Coordinate>` 占位节点的 IR 表达

- 状态：Accepted（已实现）
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../../roadmap.md) · [tikz-gap-analysis §3](../../../../../analysis/tikz-gap-analysis.md)

> **范围**：把 TikZ `\coordinate (m) at (3,2);`（命名一个点、不画图形、供相对定位 / path 端点引用）升为一等 IR 概念。

## 背景 / 约束

- alpha.3 无占位概念，"放个引用点"得 fake 空 Node（`stroke/fill=transparent`）：仍走 layoutNode 撑出不可见矩形并参与 viewBox 扩展；AI / codec 无法区分真 Node 与 fake 占位；用户心智从"点"绕到"不可见矩形"。

## 决策：独立 `IRChild` kind `'coordinate'`

`IRChild` discriminated union 从 2 项（node / path）扩到 3 项，coordinate 仅 `id`（必填）+ `position`（三形态同 Node）。编译期单独 case：不发 primitive、不扩 bbox，但注册进 nodeIndex 让 path / `at.of` 能命中。代码：`core/src/ir/coordinate.ts`、`core/src/compile/compile.ts`（Pass 1 分支）、`react/src/kernel/Coordinate.tsx`（第三个 kernel 组件，与 Node / Path 平级）。

设计细节（具体决策）：

- **nodeIndex 表示**：coordinate 复用 `NodeLayout`，构造 `shape:'rectangle'` + 0×0 矩形。`boundaryPoint` 在 0×0 rect 上恒返回中心，正合"占位无形状边界"——path 端点引用时贴中心、不外扩；零尺寸是 NodeLayout 本就允许的合法值，不污染类型、未来加字段也能跟着默认，无需拆 union。
- **不进 viewBox**：allPoints 只在 `type==='node'` 分支 push 4 角，coordinate 分支不 push——故含极远 coordinate 的场景 viewBox 与空场景一致（走空点集兜底）。

理由：

1. **Schema 字段最少**（id + position）——AI 生成 / 校验最简单。
2. **discriminator 正交**——`type` 一眼分 node / path / coordinate，三类各管自己。
3. **与现有体系对称**——polar `origin` / Step `to` / `at.of` 全经 nodeIndex 字符串引用，coordinate 加进 nodeIndex 即可。

### 被否决的选项

- **B：Node + `invisible: true` 标记**——Node 是给"有形状实体"的，invisible 让 fill/stroke/text/padding/shape 一堆字段无意义，schema 无法表达这种模式互斥；AI 反而更难分辨哪些字段该填。
- **C：仅 React DSL、不进 IR**——同 ADR-01 选项 B：丢失意图、codec 反推失败、core 无法独立知道占位语义。

## 不在本 ADR 范围

- coordinate 自身 anchor（`m.north`）：占位无形状边界，所有 anchor 退化为中心，不提供显式 anchor 语法。
- `\path[name path=...]` / `\path coordinate (...)` 等其它占位变体：留 v0.2+。

---

> **实现指针**：level `red`（动 `IRChild` union + compile）、addition-only 不影响现有功能。真源以代码为准——`core/src/ir/coordinate.ts`、Pass 1 coordinate 分支（`core/src/compile/compile.ts`）、`react/src/kernel/Coordinate.tsx`、builder/unbuilder coordinate 分支；测试在 `core/tests/`。完整原文（背景 / 选项 / nodeIndex layout 代码 / 测试清单）见本文件 git 历史。

> 🔖 封板压缩 commit `70d471b5`；压缩前完整施工蓝图 = `git show 70d471b5^:notes/decisions/core/v0/v0.1/v0.1-alpha.4/02-coordinate-placeholder.md`。
