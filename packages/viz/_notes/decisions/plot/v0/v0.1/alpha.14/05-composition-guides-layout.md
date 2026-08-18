# ADR-05：composition guides, axes, grid, spacing

- 状态：Superseded
- 替代：[ADR-09](./09-composition-api-structure.md)；旧 guidePolicy / layout 已拆为 resolve、header 与 spacing
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md) · [ADR-04 shared scaffold tracks](./04-shared-scaffold-tracks.md)

## 背景

ADR-02～04 分别引入 facet panel、same-panel overlay 和 shared scaffold tracks。三者都会产生多个 coordinate scope，但 guide 和布局语义不同：facet 需要 panel gap、外侧统一轴或 per-panel 轴、panel label；overlay 需要同侧多轴 offset、grid 归属；track 需要 track gap、共享轴与局部轴取舍。

如果这些策略散落在 facet / overlay / track 各自 ADR 里，会出现三套 axis / grid / spacing 字段。ADR-05 统一收敛 composition 层的 guide policy 和 spacing policy，保证多 scope 图形在无文字测量前提下仍有稳定布局。

本 ADR 不试图做完整排版系统，不做自动 label 避让，也不做 dashboard layout。它只定义 plot 内坐标复合所需的最小可解释布局参数。

## 决策：composition.layout 与 composition.guidePolicy 统一管理 spacing 和 guide 策略

`IRPlot.composition` 新增 `layout` 与 `guidePolicy`。`layout` 管 panel / track / axis 的固定间距；`guidePolicy` 管 axes / grid / labels 在多 scope 下的默认行为。单个 `AxisGuide` 仍可通过 `coordinateScope`、`placement`、`grid` 覆盖具体轴。

```ts
const CompositionAxisPolicy = {
  PerScope: 'perScope',
  OuterShared: 'outerShared',
} as const;

const CompositionGridPolicy = {
  None: 'none',
  PerScope: 'perScope',
  Shared: 'shared',
} as const;

const CompositionFacetLabelPolicy = {
  None: 'none',
  RowColumn: 'rowColumn',
} as const;

const CompositionTrackLabelPolicy = {
  None: 'none',
  Inline: 'inline',
} as const;

type CompositionAxisPolicyValue = ValueOf<typeof CompositionAxisPolicy>;
type CompositionGridPolicyValue = ValueOf<typeof CompositionGridPolicy>;
type CompositionFacetLabelPolicyValue = ValueOf<typeof CompositionFacetLabelPolicy>;
type CompositionTrackLabelPolicyValue = ValueOf<typeof CompositionTrackLabelPolicy>;

type CompositionLayout = {
  panelGap?: number;
  trackGap?: number;
  axisGap?: number;
  labelGap?: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
};

type CompositionGuidePolicy = {
  axes?: CompositionAxisPolicyValue;
  grid?: CompositionGridPolicyValue;
  facetLabels?: CompositionFacetLabelPolicyValue;
  trackLabels?: CompositionTrackLabelPolicyValue;
};

type CoordinateComposition = {
  layout?: CompositionLayout;
  guidePolicy?: CompositionGuidePolicy;
};

type IRPlotAxisGuide = {
  title?: string;
};
```

规则：

1. `panelGap` 用于 facet panel 之间；`trackGap` 用于 scaffold tracks 之间；`axisGap` 用于同侧多个 axis；`labelGap` 用于 panel / track label 与 plot area 的距离。
2. 所有 gap 单位都是 user units，默认值由 lowering 给出，且不依赖文字测量。
3. `guidePolicy.axes = 'perScope'` 默认每个 scope 的 axis 独立渲染；`outerShared` 只渲染外侧共享轴，具体共享条件由 coordinate role / scale identity 判断。
4. `guidePolicy.grid = 'perScope'` 默认按 guide 所属 scope 绘制；`shared` 只绘制 target / scaffold 的共享 grid；`none` 禁用 composition 自动 grid，但显式 `guide.grid` 仍可开启。
5. `AxisGuide.title` 只声明文字内容，不触发自动测量；实际留白按 `axisGap` / `labelGap` 的保守估算。

理由：

1. spacing 是 composition 级概念，放在 facet / overlay / track 各自 schema 会造成重复。
2. policy 使用少量枚举，LLM 易生成、易解释，也避免 magic boolean 组合。
3. 明确“不测量文字”，保持 lowering 纯计算和 renderer-agnostic。
4. `AxisGuide.title` 放在 guide 上，因为 title 属于某根 axis，而不是 coordinate scope。

## 长期边界

- 不做自动文字测量和 label collision avoidance。
- 不做自由 dashboard layout、inset、legend packer。
- 不做复杂 axis title rotation / multi-line wrapping。
- 不做 renderer-specific text metrics。
