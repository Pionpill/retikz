# ADR-12: Plot 元素层级与 zIndex 策略

- 状态：Accepted（已实现）
- 决策日期：2026-07-05
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

alpha.15 已经把 axis、grid、legend、plot labels 和 theme 的主要能力补齐，但层级关系仍主要依赖 lowering 里拼接数组的顺序：background -> grid -> marks -> axis -> labels -> legend。这个顺序当前可用，但它是隐式约定。一旦后续加入 facet header、annotation、reference band、interaction overlay、chart preset 默认样式或跨 view overlay，单靠“放在哪个数组后面”会让规则分散在多个 lowering 分支里，难以解释和覆盖。

Plot 当前的可见元素不止 mark 和 guide。mark 内部还有 datum label、path label 和 relation label；guide 里 axis 又拆成 grid layer 与 axis layer；plot-level `labels` 已经承载 title、caption、source、note 和 custom text；composition 会生成 facet panel 与 facet label；legend 在预留带里独立下沉。它们需要统一分类，否则容易把所有非数据元素都塞进 guide，或者把整图文案、facet header、legend 和 axis title 混成一个模糊的 decoration 概念。

core 已经提供了合适的底层能力：`IRScope.zIndex` 表示同父级元素之间的 stacking order，scope 本身作为一个整体排序单位；core compile 对同一父 scope 的 scene primitive 按 zIndex 升序稳定排序，相同 zIndex 保持 IR 顺序。因此 Plot 不应另造 renderer 层排序，也不应把层级语义绕过 core；Plot 应该在 lowering 到 core IR 时生成语义 scope，并给这些 scope 写入稳定的默认 zIndex。

现有 `mark.zIndex` 不能直接承担图层级排序。它是 mark style / channel 语义，可以字段绑定到 datum，也可能下沉到每个 core Node 或 Path。用户用它控制同一 mark 内点、线、关系路径的局部覆盖关系是合理的，但如果同时让它控制整个 mark layer 与 grid、axis、legend 的关系，会混淆 datum-level zIndex 和 layer-level zIndex。

## 决策：Plot lowering 生成语义 layer scope，并通过 core zIndex 排序

Plot 定义内部默认层级常量 `PlotLayerZIndex`，所有由 Plot lowering 生成的可见语义层都写入 core `zIndex`。root children 的声明顺序仍保持可读，但不再作为唯一层级来源。用户需要跨默认层级覆盖时，通过 JSON-safe 的 `layer.zIndex` 明确覆盖语义 layer 的 core zIndex；datum / path / node 级别的 `zIndex` 继续留给 mark 内部图元。

```ts
export const PlotLayerZIndex = {
  Background: -1000,
  Grid: -300,
  Mark: 0,
  Axis: 200,
  FacetLabel: 300,
  PlotLabel: 400,
  Legend: 500,
  Interaction: 900,
} as const;

type PlotLayer = {
  zIndex?: number;
};

type MarkOperation = {
  layer?: PlotLayer;
};

type AxisGuide = {
  layer?: PlotLayer;
};

type LegendGuide = {
  layer?: PlotLayer;
};

type PlotLabel = {
  layer?: PlotLayer;
};
```

默认层级固定如下：

| 默认 zIndex | 层 | 当前元素 |
|---:|---|---|
| -1000 | background | `plotBackgroundNode` |
| -300 | grid | axis major / minor grid scope |
| 0 | mark | point、path、interval、reference、relation、custom mark layer |
| 200 | axis | axis line、tick mark、tick label、axis title |
| 300 | facet label | facet row / column header |
| 400 | plot label | title、caption、source、note、custom text |
| 500 | legend | legend title、swatch、ramp、legend labels |
| 900 | interaction | hover、selection、brush、crosshair 等后续交互层预留 |

语义固定如下：

- `layer.zIndex` 是 layer scope 的绝对 core zIndex。省略时使用该元素所属语义层的默认值；相同 zIndex 继续保持同父级声明顺序。
- `mark.layer.zIndex` 只作用于 mark lowering 返回的外层 scope，不下传到 datum Node / Path。它与现有 `mark.zIndex` 不同：`mark.zIndex` 仍表示 mark 图元内部样式，可字段绑定；`mark.layer.zIndex` 表示整层排序，只能是 JSON-safe 常量。
- `axis.layer.zIndex` 同时覆盖该 axis 的 axis layer；grid 仍是 axis 的子语义层，默认使用 `Grid`。如果后续需要 axis grid 单独覆盖 zIndex，应扩展 `axis.grid.layer`，不复用 axis layer 的 zIndex。
- `legend.layer.zIndex` 作用于整个 legend scope。legend 内部 swatch / ramp / label 的相对顺序仍由 legend lowering 自己决定。
- `PlotLabel.layer.zIndex` 作用于该 label 所在的 plot label scope。首轮实现可以继续把多个 plot labels 放在同一个 label scope 内；只要任意 label 指定了不同 zIndex，lowering 必须拆成多个 label scope 或把 zIndex 下发到对应 node，保证用户覆盖生效。
- facet panel 内部继续遵循 grid -> marks -> axis 的语义层级；facet label 放在 panelScopes 之后，默认 zIndex 为 `FacetLabel`。
- `CoordinateViewPlacementSchema.overlay.zIndex` 保持局部排序语义：它只控制共享 overlay panel 内不同 coordinate view 的 mark layer 顺序，不允许越过 grid / axis / legend 等语义层。实现时可作为 mark layer 的 tie-breaker 或 mark 子排序键，不应直接映射为可跨层的 core zIndex。
- `plotAreaCarrier` 是透明 bbox / anchor 载体，不属于可见层级；不要为了解决视觉排序给它增加公开层级语义。

理由：

1. 复用 core `scope.zIndex` 可以让 Plot、core compile 和 renderer 的 stacking 语义保持一致，不需要 Plot 自己维护第二套排序协议。
2. 默认层级常量让 grid、mark、axis、plot labels、legend 的关系可解释、可测试，也方便 chart preset 后续按图表类型包装默认样式。
3. `layer.zIndex` 与现有 mark style `zIndex` 分离，避免 datum-level 控制和 layer-level 控制互相污染。
4. overlay view 的 zIndex 保持局部排序，能兼容当前“overlay view 只影响 mark 顺序、不跨过 axis / legend”的行为。

## 待决策点

无。reference band 默认放在 mark 层；如果 chart preset 希望 reference band 默认低于数据、reference line 默认高于数据，应在 chart preset 层通过 `layer.zIndex` 给出规则，不在 Plot 底层按 `mark.type` 写死。

## DSL 表面

普通用户无需配置：

```ts
{
  marks: [
    { type: 'interval', encoding: { x: 'month', y: 'sales' } },
    { type: 'path', encoding: { x: 'month', y: 'target' } }
  ],
  guides: [
    { type: 'axis', dimension: 'x', grid: true },
    { type: 'legend', channel: 'color' }
  ]
}
```

把参考区放到数据下方：

```ts
{
  type: 'reference',
  kind: 'region',
  layer: { zIndex: -100 },
  encoding: { x: 'x0', y: 'y0' },
  xTo: 'x1',
  yTo: 'y1'
}
```

把某个标注型 mark 放到 axis 上方：

```ts
{
  type: 'relation',
  source: { id: 'a' },
  target: { id: 'b' },
  layer: { zIndex: 250 }
}
```

把整图 note 放到 legend 上方：

```ts
{
  type: 'text',
  role: 'note',
  text: 'Draft',
  layer: { zIndex: 600 },
  placement: { kind: 'point', target: 'frame', x: 0.98, y: 0.04 }
}
```

## 测试设计

`packages/viz/plot/tests/features/layer/layer.test.ts` 覆盖默认层级、用户覆盖和 composition 场景。

`packages/viz/plot/tests/ir/plot.schema.test.ts`、`guide.schema.test.ts` 和 mark schema 相关测试覆盖 `layer.zIndex` 的 accept / reject。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- Plot lowering 输出的 core IR 会显式携带 layer scope zIndex；视觉默认顺序应与当前保持一致。
- `MarkOperation`、`AxisGuide`、`LegendGuide`、`PlotLabel` 新增可选 `layer.zIndex` 公开字段，属于用户可见 schema 变更，需要同步 React / Vanilla authoring 和 docs。
- 不修改 core IR；只消费 core 现有 `IRScope.zIndex`、`IRNode.zIndex`、`IRPath.zIndex`。
- 不改变 `mark.zIndex` 现有行为；它仍然是 mark 图元样式 / channel，不能替代 `mark.layer.zIndex`。
- 不改变 renderer；排序仍由 core compile 输出后的 scene primitive 顺序体现。

## 不在本 ADR 范围

- interaction hover / selected / brush / tooltip 层的实际实现。
- legend overflow、scroll、分页、浮层 tooltip 或 HTML legend。
- chart preset 针对 bar / line / scatter / reference band 的默认审美规则。
- renderer 层 DOM / Canvas compositing mode、portal、CSS stacking context。
- 自动根据 mark type 推断 reference underlay / annotation overlay。

---

## 实现契约

### Level

`yellow`

本 ADR 修改 plot schema、lowering、React authoring、测试和 docs；不修改 core IR，不修改 renderer。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/layer/schema.ts` | 加 | `PlotLayerSchema.zIndex` | `z.number().int().optional()` | 语义层默认值 | layer scope 的 core zIndex 覆盖 |
| `packages/viz/plot/src/schemas/mark/schema.ts` | 加 | `MarkOperation.layer` | `PlotLayerSchema.optional()` | `{ zIndex: PlotLayerZIndex.Mark }` | 整个 mark layer 的 stacking 覆盖 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisGuideSchema.layer` | `PlotLayerSchema.optional()` | `{ zIndex: PlotLayerZIndex.Axis }` | axis layer 的 stacking 覆盖 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `LegendGuideSchema.layer` | `PlotLayerSchema.optional()` | `{ zIndex: PlotLayerZIndex.Legend }` | legend layer 的 stacking 覆盖 |
| `packages/viz/plot/src/schemas/layout/schema.ts` | 加 | `PlotTextLabelSchema.layer` | `PlotLayerSchema.optional()` | `{ zIndex: PlotLayerZIndex.PlotLabel }` | plot text label layer 的 stacking 覆盖 |

说明：

- `PlotLayerSchema` 放在独立 `schemas/layer`，避免 `mark`、`guide`、`layout` 互相 import 造成循环。
- `PlotLayerZIndex` 放在 `schemas/layer/constants.ts`，作为公开常量可被 docs 和 chart preset 复用。
- schema `.describe(...)` 使用英文描述契约；中文摘要只写在本 ADR。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/_notes/decisions/v0/v0.1/alpha.15/12-plot-layer-zindex.md`
- `packages/viz/_notes/decisions/v0/v0.1/alpha.15/roadmap.md`
- `packages/viz/plot/src/schemas/layer/**`
- `packages/viz/plot/src/schemas/index.ts`
- `packages/viz/plot/src/schemas/mark/schema.ts`
- `packages/viz/plot/src/schemas/mark/types.ts`
- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/schemas/layout/schema.ts`
- `packages/viz/plot/src/schemas/layout/types.ts`
- `packages/viz/plot/src/pipeline/expand.ts`
- `packages/viz/plot/src/pipeline/guide/guide.ts`
- `packages/viz/plot/src/pipeline/decoration-layout.ts`
- `packages/viz/plot/src/providers/mark/shared/common.ts`
- `packages/viz/plot/src/providers/mark/registry.ts`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot/tests/**`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要回本 ADR 增补 scope 或另开 ADR。

### 测试象限

Happy path：

- `default_plot_layers_emit_stable_zindex`：background、grid、mark、axis、plot label、legend scope 输出默认 zIndex，顺序与默认视觉一致。
- `mark_layer_zindex_overrides_semantic_default`：mark 写 `layer.zIndex` 后，外层 mark scope 使用该值，datum node/path 不被批量写入该值。
- `guide_layer_zindex_overrides_axis_or_legend_scope`：axis / legend 写 `layer.zIndex` 后，对应 scope 使用该值，axis grid 仍保持 grid 默认层。
- `plot_label_layer_zindex_can_split_label_scope`：多个 plot labels 中只有一个覆盖 zIndex 时，lowering 能让该 label 的层级独立生效。

边界：

- `equal_layer_zindex_keeps_source_order`：多个 mark 或多个 labels 使用相同 zIndex 时保持声明顺序。
- `overlay_view_zindex_stays_inside_mark_band`：coordinate overlay `placement.zIndex` 只改变 mark layer 局部顺序，不把 overlay mark 提到 axis / legend 上方。
- `plot_area_carrier_has_no_visible_layer_semantics`：`plotAreaCarrier` 仍保持透明 bbox 载体，不进入默认层级常量断言。

错误路径：

- `layer_zindex_rejects_fractional_values`：`layer.zIndex: 1.5` 被 schema 拒绝。
- `layer_rejects_unknown_fields`：`layer` 对象出现 `mode` / `order` 等未定义字段被拒绝。

交互：

- `mark_style_zindex_and_layer_zindex_are_independent`：`mark.zIndex` 控制 mark 内部 Node / Path，`mark.layer.zIndex` 控制外层 scope，二者同时存在时互不覆盖。
- `facet_panel_preserves_internal_grid_mark_axis_layers`：facet panel 内部仍是 grid -> marks -> axis，facet label 默认在 panelScopes 上方。
- `legend_remains_top_layer_after_size_symbol_layout`：ADR-11 的 size legend symbol layout 与 legend scope zIndex 不互相影响。

### 依赖的现有元素

- `IRScope.zIndex`（`packages/kernel/core/src/schemas/scope/schema.ts`）：Plot lowering 写入 layer scope zIndex。
- core compile stable zIndex sort（`packages/kernel/core/src/compile/traversal.ts`）：同父级元素按 zIndex 升序稳定排序。
- `lowerGuide` / `lowerLegend`（`packages/viz/plot/src/pipeline/guide/guide.ts`）：为 grid、axis、legend scope 写入默认或覆盖 zIndex。
- `expandPlot`（`packages/viz/plot/src/pipeline/expand.ts`）：为 background、mark、facet label、plot label、legend 组织同父级 layer scope。
- `lowerPlotLabels`（`packages/viz/plot/src/pipeline/decoration-layout.ts`）：为 plot labels 支持 layer scope 拆分或 node-level zIndex。
- `lowerMark` / `attachMarkLayer`（`packages/viz/plot/src/providers/mark/**`）：保持 mark lowering 产物以 scope 为 layer 单位，并接入 `mark.layer.zIndex`。
