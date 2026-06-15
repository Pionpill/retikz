# ADR-02：让 `<Plot>` 可被组合

- 状态：Accepted
- 决策日期：2026-06-13
- 关联：[alpha.10 roadmap](./roadmap.md) · [ADR-01](./01-plot-thin-container.md) · [plot-design](../../../../../architecture/plot-design.md) · [core scope-id-bbox](../../../../core/v0/v0.2/alpha.1/03-scope-id-bounding-box.md)

## 背景

多坐标信息图需要在同一张 SVG / Canvas 里放多张异质 plot，再叠加 core `<Node>` / `<Path>` 标注与连接线。旧 `<Plot>` 总是自建 `<Layout>`，每张图都是独立 svg；plot lowering 也只从全局 `width/height` 取尺寸，多个 plot 节点会同尺寸、同原点叠在一起。

core `<Layout>` 已经是组合容器，`Scope` 也已经提供 transform、id anchor 与 local namespace。因此 alpha.10 不新增 plot 级 `<Plots>` / `<Figure>` 容器，而是让薄 `<Plot>` 可以作为 Tier 2 子节点嵌入 core `<Layout>`。

## 决策

1. **PlotSpec 自描述尺寸**：`PlotSpec.width` / `height` 表示本面板尺寸；lowering 取值顺序为 `plot.width ?? lowerPlots.width ?? DEFAULT_WIDTH`（height 同理）。
2. **摆位由外层 Scope 承担**：plot 节点只描述「多大」，不描述「在哪」；`<Plot x/y>` 编译为外层 `Scope{transforms:[translate]}`。
3. **id 触发外部 anchor**：仅当 `PlotSpec.id` 存在时，lowering 输出外层非 local panel scope，并额外生成不可见矩形 carrier `<plotId>.plotArea`。无 id 时保持旧 root 结构。
4. **内部 id 仍封闭**：marks / axes / datum / series 继续在 `localNamespace: true` 内层 scope 中，避免污染父 frame。
5. **组合容器就是 core `<Layout>`**：`<Plot>` 在 `<Layout>` 外维持 standalone 行为；在 `<Layout>` 内不自建 svg，而是贡献 plot composite node、datasets 与 lowering factory。
6. **依赖 core-react 通用 embeddable 机制**：`Layout` / `buildIR` 需要收纳任意 Tier 2 子组件贡献的 `{ node, datasets, makeComposites }`。机制通用，不写死 plot。
7. **数据引用规则**：嵌入态默认 dataset ref = `id`；显式 `dataRef` 可让多张 plot 共享同一数据源；standalone 继续用 `__plot`。
8. **重复 id 遵循当前 core 语义**：同 frame duplicate id 不在 plot 层 fail-loud；由 core name stack 发 warning，并按当前 core 行为 last-wins。用户需要稳定 anchor 时仍应保持 panel id 唯一。

```tsx
<Layout width={800} height={360}>
  <Plot id="sales" x={40} y={40} width={300} height={220} data={rows}>
    <LineMark x="month" y="revenue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>

  <Plot id="mix" x={420} y={40} width={260} height={220} data={rows}>
    <BarMark x="month" y="revenue" />
  </Plot>

  <Path from={{ id: 'sales', anchor: 'east' }} to={{ id: 'mix', anchor: 'west' }} />
</Layout>
```

## Lowering 结构

```txt
// PlotSpec.id 存在
Scope { id: <plotId> }                         // 外部可见 panel bbox
  Scope { localNamespace: true, children: [...] } // 内部 marks / axes / datum id
  Node { id: '<plotId>.plotArea', shape: rectangle, visible: false }

// PlotSpec.id 不存在
Scope { localNamespace: true, children: [...] } // 旧结构，单图零回归
```

`<plotId>` 表示整面板 bbox anchor；`<plotId>.plotArea` 表示扣除 axis / legend 后的绘图区矩形。series / datum 级外部 anchor、相对摆位、布局托管、非矩形 panel bbox 留给后续 milestone。

## 影响

- **Plot IR**：新增 `PlotSpec.width` / `height`，additive。
- **Plot lowering**：per-node 尺寸 fallback；有 id 时 root 结构变为 panel scope + local content + plotArea carrier。
- **React API**：`<Plot>` 新增 `id` / `dataRef` / `x` / `y` / `width` / `height` 嵌入入口；`buildPlotSpec` options 同步支持 `id` / `width` / `height`。
- **Core React**：依赖可嵌入 Tier 2 子组件贡献机制；这是通用 core-react 能力，不新增 core IR schema。
- **Vanilla**：继续通过 core IR + `lowerPlots(datasets)` 组合，不新增必需 API。
- **文档**：Plot 页说明多面板组合、尺寸、摆位、anchor 与 `dataRef`。

## 实现契约

### Level

`red`

原因：涉及 PlotSpec schema、plot lowering root 结构、React `<Plot>` 嵌入行为，以及 core-react embeddable 机制。

### Schema 改动

| Schema | 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `PlotSpecSchema` | `width` | `z.number().finite().positive().optional()` | 否 | 面板本性宽；缺省回退全局 width，再回退默认宽 |
| `PlotSpecSchema` | `height` | `z.number().finite().positive().optional()` | 否 | 面板本性高；缺省回退全局 height，再回退默认高 |

不新增组合 IR schema。组合真源仍是 core IR；data 仍外置于 IR。

### 文件 Scope

- `packages/plot/plot/src/ir/plot.ts`：新增 `width` / `height`。
- `packages/plot/plot/src/lower/expand.ts`：per-node 尺寸 fallback；id-gated panel scope + plotArea carrier。
- `packages/plot/react/src/Plot.tsx`：支持嵌入态贡献、`id` / `dataRef` / `x` / `y`。
- `packages/plot/react/src/components/build-plot-spec.ts`：options 支持 `id` / `width` / `height`。
- `packages/core/react/src/kernel/**`：可嵌入 Tier 2 贡献机制。
- `packages/plot/plot/tests/**`、`packages/plot/react/tests/**`、`packages/core/react/tests/**`：覆盖 lowering、React 嵌入、core 贡献机制。
- `apps/docs/src/contents/plot/**`、`apps/docs/src/data/changelog.ts`：同步文档与 changelog。

### 测试矩阵

- `plot_node_size_drives_plotarea`：节点尺寸优先于全局尺寸。
- `size_fallback_to_global`：未写节点尺寸时回退全局尺寸。
- `no_id_root_unchanged`：无 id 时 root 结构保持旧行为。
- `panel_bbox_anchor_connectable`：`<plotId>` 可作为外部 Path target。
- `plotarea_carrier_precise`：`<plotId>.plotArea` 是精确绘图区矩形，不是 marks bbox。
- `plotarea_anchor_visible_across_localnamespace`：plotArea carrier 在 local namespace 外可被兄弟节点引用。
- `internal_ids_stay_sealed`：内部 datum / series id 不上浮。
- `embedded_plot_no_own_svg`：Layout 内 `<Plot>` 不生成独立 svg；Layout 外保持 standalone。
- `embedded_two_plots_no_crosstalk`：默认 ref = id 时两张 plot 不串数据。
- `embedded_data_ref_shared`：显式同名 `dataRef` 可共享数据源。
- `duplicate_panel_id_follows_core_semantics`：重复 panel id 由 core 发 warning 并沿用 last-wins 行为，不在 plot 层额外 throw。
