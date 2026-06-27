# ADR-05: Path dash pattern 命名对齐 TikZ

- 状态：Accepted（已实现）
- 决策日期：2026-05-14
- 关联：[v0.1-beta.2 plan TODO-5](./roadmap.md) · [TikZ actions](https://tikz.dev/tikz-actions)

> **范围**：把虚线字段从 SVG/CSS 命名 `strokeDasharray: string` 改为 TikZ 术语 `dashPattern: Array<number>`（公开 IR 字段 + React `<Path>` / `<Draw>` prop + Scene primitive 字段），SVG join 下沉到 renderer。

## 背景 / 约束

- `strokeDasharray` 直接来自 SVG / CSS `stroke-dasharray`，与 TikZ 术语不一致；核对 TikZ / PGF manual 后，TikZ 用 `dash pattern` 描述虚线模式。
- 对照：`lineCap` / `lineJoin` 已与 TikZ `line cap` / `line join` 一致、`fillRule: 'nonzero' | 'evenodd'` 语义可接受，唯 `strokeDasharray` 偏离。
- beta 是公开 API 冻结前最后命名窗口；保留 `strokeDasharray` 会把 SVG/CSS 术语固定进核心 DSL。

## 决策：`strokeDasharray` 改名为 `dashPattern: Array<number>`

公开 IR 字段、React `<Path>` / `<Draw>` prop、Scene primitive 字段同步改为 `dashPattern: Array<number>`；renderer 内部把数组 join 成 SVG `strokeDasharray` attribute（`strokeDasharray={p.dashPattern?.join(' ')}`）。代码：`core/src/ir/path/path.ts`、`core/src/primitive/{path,rect,ellipse}.ts`、`react/src/kernel/Path.tsx`、`react/src/sugar/Draw.tsx`。

理由：

1. `dashPattern` 更接近 TikZ 术语，且不暴露 SVG attribute 名。
2. beta 允许 breaking rename，rc 后不应再改公开字段。
3. `dashPattern -> strokeDasharray` 的 `join(' ')` 应在 renderer（core Scene → SVG attribute 的边界）内完成。

决策细节（具体决策）：

- 不保留 `strokeDasharray` alias。
- Node 当前已有 `dashArray` 字段：**保留字段名**以减少改名面积，但同步把值从 `string` 改为 `Array<number>`；文档不得称其为「SVG 原生逃生口」。
- `lineCap` / `lineJoin` / `fillRule` 保持不变。

### 被否决的选项

- **B：仅文档改成 TikZ 解释、字段保留 `strokeDasharray`** —— 迁移成本低，但公开 API 继续保留 SVG/CSS 命名。
- **C：用 `dashArray`** —— 项目中 Node 已有 `dashArray`，但 TikZ manual 更接近 `dash pattern`，且 `dashArray` 容易和 SVG dash array 语义绑定。

## 不在本 ADR 范围

- 统一 Node `dashArray` 与 Path `dashPattern` 的字段名差异（本 ADR 接受二者并存，仅对齐值类型为 `Array<number>`）。
- 改变 SVG renderer 实际输出的 `stroke-dasharray` attribute。

---

> **实现指针**：level `red`（公开 IR 字段 / React prop / Scene primitive 字段 rename + 值类型 string → `Array<number>`；渲染结果不变，SVG adapter 内部负责 join）。真源以代码为准——`IRPath.dashPattern`（`core/src/ir/path/path.ts`）、`PathPrim` / `RectPrim` / `EllipsePrim` 的 `dashPattern`（`core/src/primitive/{path,rect,ellipse}.ts`）、React prop（`react/src/kernel/Path.tsx` / `react/src/sugar/Draw.tsx`）、SVG join（`react/src/render/renderPrim.tsx`）。测试在 `core/tests/` 与 `react/tests/`。完整原文（实现契约 / Schema 改动表 / 测试象限 10 case）见本文件 git 历史。

> 🔖 封板压缩 commit `f3282d91`；压缩前完整施工蓝图 = `git show f3282d91^:notes/decisions/core/v0/v0.1/beta.2/05-path-dash-pattern-naming.md`。
