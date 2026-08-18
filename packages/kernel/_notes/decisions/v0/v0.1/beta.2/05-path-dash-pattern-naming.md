# ADR-05: Path dash pattern 命名对齐 TikZ

- 状态：Accepted（已实现）
- 决策日期：2026-05-14
- 关联： · [TikZ actions](https://tikz.dev/tikz-actions)

> **目标**：把虚线字段从 SVG/CSS 命名 `strokeDasharray: string` 改为 TikZ 术语 `dashPattern: Array<number>`（公开 IR 字段 + React `<Path>` / `<Draw>` prop + Scene primitive 字段），SVG join 下沉到 renderer。

## 背景 / 约束

- `strokeDasharray` 直接来自 SVG / CSS `stroke-dasharray`，与 TikZ 术语不一致；核对 TikZ / PGF manual 后，TikZ 用 `dash pattern` 描述虚线模式。
- 对照：`lineCap` / `lineJoin` 已与 TikZ `line cap` / `line join` 一致、`fillRule: 'nonzero' | 'evenodd'` 语义可接受，唯 `strokeDasharray` 偏离。
- beta 是公开 API 冻结前最后命名窗口；保留 `strokeDasharray` 会把 SVG/CSS 术语固定进核心 DSL。

## 决策：`strokeDasharray` 改名为 `dashPattern: Array<number>`

公开 IR 字段、React `<Path>` / `<Draw>` prop、Scene primitive 字段同步改为 `dashPattern: Array<number>`；renderer 内部把数组 join 成 SVG `strokeDasharray` attribute（`strokeDasharray={p.dashPattern?.join(' ')}`）。

理由：

1. `dashPattern` 更接近 TikZ 术语，且不暴露 SVG attribute 名。
2. beta 允许 breaking rename，rc 后不应再改公开字段。
3. `dashPattern -> strokeDasharray` 的 `join(' ')` 应在 renderer（core Scene → SVG attribute 的边界）内完成。

决策细节（具体决策）：

- 不保留 `strokeDasharray` alias。
- Node 当前已有 `dashArray` 字段：**保留字段名**以减少改名面积，但同步把值从 `string` 改为 `Array<number>`；文档不得称其为「SVG 原生逃生口」。
- `lineCap` / `lineJoin` / `fillRule` 保持不变。

## 长期边界

- 统一 Node `dashArray` 与 Path `dashPattern` 的字段名差异（本 ADR 接受二者并存，仅对齐值类型为 `Array<number>`）。
- 改变 SVG renderer 实际输出的 `stroke-dasharray` attribute。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：正文所列公开契约变更按 breaking 迁移；其余默认行为、失败语义与公开契约以正文为准。
