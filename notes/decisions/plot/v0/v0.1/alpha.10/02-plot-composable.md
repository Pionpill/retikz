# ADR-02：让 `<Plot>` 可被组合

- 状态：Accepted
- 决策日期：2026-06-13
- 关联：[alpha.10 roadmap](./roadmap.md) · [ADR-01](./01-plot-thin-container.md) · [plot-design](../../../../../architecture/plot-design.md) · [core scope-id-bbox](../../../../core/v0/v0.2/alpha.1/03-scope-id-bounding-box.md)

## 背景（塑造决策的硬约束）

- 多坐标信息图需在同一张 SVG / Canvas 里放多张异质 plot，并叠加 core `<Node>` / `<Path>` 标注与连接线。
- 旧 `<Plot>` 总是自建 `<Layout>`、每张图独立 svg；lowering 只从全局 `width/height` 取尺寸，多个 plot 节点会同尺寸、同原点叠在一起。
- core `<Layout>` 已是组合容器，`Scope` 已提供 transform、id anchor 与 local namespace；因此不新增 plot 级 `<Plots>` / `<Figure>` 容器，而是让薄 `<Plot>` 作为 Tier 2 子节点嵌入 core `<Layout>`。

## 决策

1. **PlotSpec 自描述尺寸**：`PlotSpec.width` / `height` 表示本面板尺寸；lowering 取值顺序为 `plot.width ?? lowerPlots.width ?? DEFAULT_WIDTH`（height 同理）。additive，不新增组合 IR schema，组合真源仍是 core IR，data 仍外置于 IR。
2. **摆位由外层 Scope 承担**：plot 节点只描述「多大」，不描述「在哪」；`<Plot x/y>` 编译为外层 `Scope{transforms:[translate]}`。
3. **id 触发外部 anchor**：仅当 `PlotSpec.id` 存在时，lowering 输出外层非 local panel scope，并额外生成不可见矩形 carrier `<plotId>.plotArea`。无 id 时保持旧 root 结构（单图零回归）。
4. **内部 id 仍封闭**：marks / axes / datum / series 继续在 `localNamespace: true` 内层 scope 中，避免污染父 frame。
5. **组合容器就是 core `<Layout>`**：`<Plot>` 在 `<Layout>` 外维持 standalone 行为；在 `<Layout>` 内不自建 svg，而是贡献 plot composite node、datasets 与 lowering factory。
6. **依赖 core-react 通用 embeddable 机制**：`Layout` / `buildIR` 收纳任意 Tier 2 子组件贡献的 `{ node, datasets, makeComposites }`。机制通用，不写死 plot，不新增 core IR schema。
7. **数据引用规则**：嵌入态默认 dataset ref = `id`；显式 `dataRef` 可让多张 plot 共享同一数据源；standalone 继续用 `__plot`。
8. **重复 id 遵循当前 core 语义**：同 frame duplicate id 不在 plot 层 fail-loud；由 core name stack 发 warning，并按当前 core 行为 last-wins。用户需要稳定 anchor 时应保持 panel id 唯一。

### 定稿数据结构

```txt
// PlotSpec 新增字段（additive）
width?:  z.number().finite().positive()  // 面板本性宽；缺省回退全局 width，再回退默认宽
height?: z.number().finite().positive()  // 面板本性高；缺省回退全局 height，再回退默认高
```

### 定稿 lowering 结构

```txt
// PlotSpec.id 存在
Scope { id: <plotId> }                            // 外部可见 panel bbox
  Scope { localNamespace: true, children: [...] } // 内部 marks / axes / datum id
  Node { id: '<plotId>.plotArea', shape: rectangle, visible: false }

// PlotSpec.id 不存在
Scope { localNamespace: true, children: [...] }   // 旧结构，单图零回归
```

`<plotId>` 表示整面板 bbox anchor；`<plotId>.plotArea` 表示扣除 axis / legend 后的精确绘图区矩形（非 marks bbox），在 local namespace 外可被兄弟节点引用。

## 代价

- Plot lowering root 结构有 id / 无 id 两种形态。
- React `<Plot>` 同时承载 standalone 与嵌入两套行为。
- 嵌入能力依赖 core-react embeddable 机制先行落地。

## 被否决的选项

- **新增 plot 级 `<Plots>` / `<Figure>` 容器**：core `<Layout>` 已是组合容器、`Scope` 已提供 transform 与 id anchor，再造一层平行容器违背「组合真源是 core IR」。
- **写死 plot 的 Layout 收纳逻辑**：应做通用 Tier 2 贡献机制，避免 core-react 耦合具体子组件。

## 不在本 ADR 范围 / 未来兼容性

- series / datum 级外部 anchor、相对摆位、布局托管、非矩形 panel bbox 留给后续 milestone。
- 重复 panel id 的 plot 层 fail-loud 策略未定，当前沿用 core last-wins 语义。

## 实现指针

- IR / lowering：`@retikz/plot`（`PlotSpec.width/height`、id-gated panel scope + plotArea carrier）。
- React 嵌入：`@retikz/plot-react`（`<Plot>` `id` / `dataRef` / `x` / `y` / `width` / `height`、`buildPlotSpec` options）+ core-react embeddable 机制。
- 文档：Plot 页（多面板组合、尺寸、摆位、anchor 与 `dataRef`）。
- 测试：`@retikz/plot` / `@retikz/plot-react` / `@retikz/core-react` 覆盖 lowering、React 嵌入与 core 贡献机制。

> 🔖 本文件压缩前完整施工蓝图 = `git show 13765be7:notes/decisions/plot/v0/v0.1/alpha.10/02-plot-composable.md`（封板全文）。
