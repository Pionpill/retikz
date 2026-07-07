# ADR-12: Plot 元素层级与 zIndex 策略

- 状态：Accepted（已实现）
- 决策日期：2026-07-05
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../../architecture/plot-design.md#39-guide)

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

## 不在本 ADR 范围

- interaction hover / selected / brush / tooltip 层的实际实现。
- legend overflow、scroll、分页、浮层 tooltip 或 HTML legend。
- chart preset 针对 bar / line / scatter / reference band 的默认审美规则。
- renderer 层 DOM / Canvas compositing mode、portal、CSS stacking context。
- 自动根据 mark type 推断 reference underlay / annotation overlay。

---

> **实现指针**：本 ADR 已随 plot v0.1-alpha.15 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show plot-v0.1.0-alpha.15:packages/viz/_notes/decisions/v0/v0.1/alpha.15/12-plot-layer-zindex.md`。
