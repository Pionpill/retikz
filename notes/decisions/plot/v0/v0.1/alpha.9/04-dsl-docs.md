# ADR-04：三包 DSL + 文档露出（cartesian1D / polar1D / ternary2D 表面 + 端到端验收）

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot-design §3.5 CoordinateSystem](../../../../../architecture/plot-design.md) · 依赖：[ADR-01](./01-coordinate-frame-roles.md) / [ADR-02](./02-cartesian1d.md) / [ADR-03](./03-ternary2d.md)（IR + lowering 全就位）· 前身：[alpha.4 ADR-05 bindings-dsl](../alpha.4/05-bindings-dsl.md)

## 背景

ADR-01~03 把 cartesian1D / polar1D / ternary2D 的 IR + lowering 落齐，但只在 `@retikz/plot` 核心内部——React `<Plot>` / vanilla builder / 文档站还无法用。沿 alpha.4 的 milestone 粒度 lockstep（坐标系在 DSL 层有意义须等 coordinate + encoding 角色 + guide 都就位，集中本 ADR 收口），本 ADR 把新坐标系 + 角色化位置通道露出到三包用户表面 + 文档并端到端验收，alpha.9 才「可交付」。

## 决策

**(1) React 表面**：`CoordinateInput` 扩 `'cartesian1D'` | `{ type:'cartesian1D', orientation? }` | `'polar1D'` | `{ type:'polar1D', radius?, startAngle?, endAngle? }` | `'ternary2D'`（字符串 + 对象双形态，同 polar2D）。`PointMarkProps` 的 x/y 转**可选**（承 ADR-01）+ 加 `a?` / `b?` / `c?`（承 ADR-03）。buildPlotSpec 按 coordinate 组装角色 encoding，缺必填角色 / 误用通道（cartesian 给 a/b/c）**全交 lowering fail-loud**，React 不重复校验。guide：`<Axis dimension="a"|"b"|"c" />`（三角轴）、cartesian1D 复用 `<Axis />`。

**(2) vanilla**：对等表面，字段派生自 core IR 类型，不手维护第二份。

**(3) 文档**：`grammar/coordinate` 页加 cartesian1D（rug / timeline）+ polar1D（环形 / 周期）+ ternary2D（三元散点）章节 + demo + 总览补行；双语并行；顺带提「guide dimension 须匹配坐标系」（修 cross-review P2）。

**(4) 端到端验收**：rug / timeline / 三元散点经 `<Plot>` 真渲染出 SVG；三包 tsc + 测试 + lint 全绿。

> 起草期决策点已定：cartesian1D **字符串 + 对象双形态**（默认 horizontal 用字符串、需垂直用对象，同 polar2D）；通道误用（cartesian 给 a/b/c、ternary 给 x/y）**全交 lowering fail-loud**、React 不重复校验，文档讲清各坐标系用哪组通道；**不新增 rug/timeline/ternary 专用 sugar 组件**——直接 `<PointMark>` × `coordinate`（rug = point 在 cartesian1D 的俗名，符合「同 mark × 坐标系」理念），文档用「rug」作 demo 标题。

## 影响

- **lowering / IR**：无（ADR-01~03 已落）；本 ADR 仅表面 + 文档。
- **对外 API**：`coordinate="cartesian1D"|"polar1D"|"ternary2D"`、`PointMark` x/y 可选 + a/b/c props——纯新增（x/y 从必填转可选是放宽，不破既有 cartesian/polar 用法）。

## 不在本 ADR 范围

- 新坐标系的 IR / lowering → [ADR-01](./01-coordinate-frame-roles.md)~[03](./03-ternary2d.md)。
- cartesian1D/ternary 的 line/area/interval 表面 → 对应坐标系 ADR 顺延（mark 矩阵 point 为主）。
- rug/timeline/ternary 专用 sugar 组件 → 不做（直接 point × 坐标系）。
- 自定义坐标系文档升级为独立分组 → [ADR-05](./05-coordinate-chart-frame.md) 下游落地 1–2 个真例子后、需求驱动（见 [v0.1 roadmap backlog](../roadmap.md)）。

## 实现指针

最终形态见 `packages/plot/react/src/components/buildPlotSpec.ts`（`CoordinateInput` + a/b/c 组装）、`src/components/marks.tsx`（`PointMarkProps` x/y 可选 + a/b/c）、`packages/plot/vanilla/src/renderPlot.ts`（对等表面）、`apps/docs/src/contents/plot/grammar/coordinate/`（rug / polar1d / ternary demo）；测试 `packages/plot/react/tests/components/buildPlotSpec.test.tsx`。

> 🔖 本文件压缩前完整施工蓝图 = `git show 329fb8b7:notes/decisions/plot/v0/v0.1/alpha.9/04-dsl-docs.md`（封板全文）。
