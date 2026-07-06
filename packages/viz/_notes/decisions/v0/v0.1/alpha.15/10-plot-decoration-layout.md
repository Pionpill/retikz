# ADR-10：Plot decoration 空间布局与 placement 策略

- 状态：Accepted（首轮实现）
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-05 到 ADR-09 已经补齐 axis line、ticks、tick labels、title 和 grid 的局部 placement / layout 能力。当前 `axis.title.placement` 可以沿 axis baseline 使用 core `GeometryLabelPosition` 关键字或 `0..1` 比例，`title.layout` 也预留了 `reserveSpace`、`avoidTickLabels` 和 `overflow` 等策略。但这些能力仍停留在 axis 内部：它们无法统一解决图表总标题、subtitle、caption、source note、legend、facet header、track header、annotation text 与 axis guide 之间的空间竞争。

现有 `packages/viz/plot/src/shared/layout.ts` 使用 margin convention 估算 plot area：按 x/y 轴、tick label 和 legend reserve 推导四边 margin。这个模型足够早期简单图，但长期风险明显。第一，它只知道少数内置对象，不知道更多文案或后续 annotation。第二，它把“占位”和“摆放”揉进 margin 估算，难以解释某个模块为什么挤压 plot area。第三，cartesian / polar / ternary 各自有独立估算函数，局部修补容易产生不同坐标系下的规则漂移。

同类开源项目大多将 placement 与空间占位分层处理。Vega / Vega-Lite 让 axis、legend、title 通过 orient、anchor、offset、padding、minExtent / maxExtent 等字段参与布局；Chart.js 有全局 `layout.autoPadding`，可为可见元素自动留白；Highcharts 的 axis title 区分 `align`、`offset`、`margin` 和 `reserveSpace`；ECharts 的 grid / legend / title 多数通过 top/right/bottom/left 与 containLabel 协作，但复杂场景仍常需要用户手动调 grid；Matplotlib `constrained_layout` 会为 tick labels、axis labels、titles、legends、colorbars 等 decoration 自动预留空间。

资料来源：[Vega axes](https://vega.github.io/vega/docs/axes/)、[Vega-Lite title](https://vega.github.io/vega-lite/docs/title.html)、[Chart.js layout](https://www.chartjs.org/docs/latest/configuration/layout.html)、[Chart.js scale title](https://www.chartjs.org/docs/latest/axes/labelling.html)、[Highcharts axis title](https://api.highcharts.com/highcharts/xAxis.title)、[ECharts axis](https://apache.github.io/echarts-handbook/en/concepts/axis/)、[Matplotlib constrained layout](https://matplotlib.org/stable/users/explain/axes/constrainedlayout_guide.html)。

## 决策：用 LayoutClaim 统一 decoration 占位与定位

Plot 新增一套全局 decoration layout 模型。公开 PlotSpec 只暴露 JSON-safe 的 `layout` 和 `labels`；guide、legend、axis title、facet / track header 等已有槽位不搬家，而是在 lowering 期间统一转换成内部 `LayoutClaim`。layout solver 只负责“测量、占位、定位、避让”，不负责决定 axis tick source、scale domain、legend 数据项或 mark 几何。

```ts
type PlotLayout = {
  mode?: 'auto' | 'fixed';
  autoPadding?: boolean;
  padding?: BoxPadding;
  maxIterations?: number;
  collision?: {
    strategy?: 'none' | 'shift' | 'hide';
    padding?: number;
  };
};

type PlotLabel =
  | {
      type: 'text';
      id?: string;
      role?: 'title' | 'caption' | 'note' | 'source' | 'custom';
      text: TextBlock;
      placement?: LayoutPlacement;
      reserveSpace?: boolean;
      priority?: number;
      overflow?: 'allow' | 'hide' | 'flush' | 'shift' | 'ellipsis';
    } & GuideTextStyle;

type LayoutPlacement =
  | {
      kind: 'side';
      target?: 'frame' | 'plotArea' | 'view';
      view?: string;
      side: 'top' | 'right' | 'bottom' | 'left';
      placement?: GeometryLabelPositionValue | number;
      padding?: number;
      shift?: { along?: number; normal?: number };
      anchor?: 'auto' | 'start' | 'center' | 'end';
    }
  | {
      kind: 'point';
      target?: 'frame' | 'plotArea' | 'view';
      view?: string;
      x: number;
      y: number;
      anchor?: 'auto' | 'start' | 'center' | 'end';
    };

type LayoutClaim = {
  id: string;
  owner: 'plot' | 'view' | 'axis' | 'legend' | 'mark' | 'annotation';
  reserveSpace: boolean;
  priority: number;
  placement: LayoutPlacement;
  avoid: Array<'plotArea' | 'axis' | 'tickLabels' | 'legend' | 'decoration' | 'marks'>;
  measure(context: LayoutMeasureContext): LayoutBox;
  place(context: LayoutPlaceContext): PositionedLayoutBox;
};
```

语义固定如下：

- `PlotSpec.layout` 是全局空间布局策略。`mode:'auto'` 表示 decoration 参与自动占位与避让；`mode:'fixed'` 表示只使用显式 `padding` / `margin` 类输入，不根据 decoration 反向收缩 plot area。省略时默认 `auto`。
- `layout.autoPadding` 控制 visible decoration 是否能自动扩大外侧 padding。省略为 `true`；设为 `false` 时仍会定位 decoration，但不会因为 decoration 自动改变 plot area。
- `layout.padding` 替代零散 margin override，作为 frame 到可用布局区域的外层留白。已有 `composition.spacing.padding` 保留为 composition 内部 spacing，不能承担整图 title / caption 的外层占位。
- `layout.maxIterations` 限制 layout solver 的稳定迭代次数，默认 `3`。实现必须确定性运行，不能依赖 renderer 回调、DOM 测量或随机数。
- `layout.collision` 只处理 decoration 之间的剩余冲突。默认先 shift，失败后按低优先级 hide；精确出版用户可以设为 `{ strategy:'none' }`。
- `labels` 放静态整图文案：title、caption、note、source。它们不绑定 scale 或 datum。axis title / tick label 继续放 guide；legend title 继续放 legend；数据标签继续放 mark；带数据锚点、leader line、callout 的注释后续放 annotation，不塞进 `labels`。
- `LayoutPlacement.kind:'side'` 表示沿某个矩形边放置，`placement` 复用 core `GeometryLabelPosition` 或 `0..1` 比例。这个模型覆盖 plot title、caption、source note、legend side band 和普通外侧文案。
- `LayoutPlacement.kind:'point'` 表示不参与边带栈排的绝对比例定位。`x/y` 是目标 frame 内的归一化比例，适合水印、角标或用户精确摆放的说明文字；默认 `reserveSpace:false`。
- axis title 不新增另一套 placement 关键字。它继续使用 ADR-08 的 `title.placement`，但 lowering 会转换成相同的 `LayoutClaim`，从而能和 plot title、legend、caption 一起参与空间求解。

布局求解采用分阶段算法，不引入通用 constraint solver：

1. 规范化 composition / coordinate view，得到初始 frame。
2. 解析 scale、guide token、legend token 和 decoration token，收集第一轮 `LayoutClaim`。
3. 用 estimate-based text measurement 计算每个 claim 的 `LayoutBox`。本轮不使用 renderer 真实测量。
4. 按 target + side 分桶，使用稳定顺序栈排 side bands：外层 title / caption 类 decoration、legend、axis group、axis title / tick label band。
5. 根据 reserve 结果收缩 plot area / view frame，并重新生成 coordinate frame 与 scale range。
6. 重新 lower guide / legend / labels；若新测量尺寸改变外侧 reserve，则最多迭代到 `maxIterations`。
7. 对无法通过 reserve 解决的 overlay 冲突应用 `collision`：按 `priority` 从高到低保留，低优先级对象 shift / hide / overflow。

默认优先级：

| 对象 | owner | 默认 priority | reserveSpace |
|---|---|---:|---|
| plot title | plot | 900 | true |
| subtitle | plot | 850 | true |
| caption / source | plot | 700 | true |
| legend | legend | 650 | true |
| axis title | axis | 600 | true |
| tick labels | axis | 550 | true |
| annotation / custom note | annotation | 400 | false |
| watermark / point decoration | plot | 100 | false |

理由：

1. `LayoutClaim` 让所有可见 decoration 先声明“我要多大、放在哪、是否占位、优先级是多少”，再由统一 solver 计算空间，避免各模块继续手写 margin。
2. 公开 schema 保持 JSON-safe；测量和 placement 都在 plot lowering 内部完成，不把函数、DOM、renderer 对象放进 IR。
3. `side + placement` 复用 core path label 的关键字心智模型，同时比单纯 `top/right/bottom/left` 更能表达沿边的起点、终点和比例位置。
4. 文案按所有权放置：scale-bound 归 guide，datum-bound 归 mark / annotation，plot-level static text 归 labels，避免 `guide` 成为所有文本的垃圾桶。
5. 分阶段边带布局比通用 constraint solver 更可测、更确定，也更适合当前 alpha 阶段的实现复杂度。

## 待决策点

无。真实 renderer text measurement、复杂 connector / callout annotation、legend item 自适应换行和通用 layer / z-order 另开 ADR。

## 实现状态

2026-07-04 首轮实现已完成：

- `PlotSpec.layout`、`PlotSpec.labels`、`theme.labelText` 和独立 `schemas/layout/**` 已落地。
- lowering 已支持 Plot 级 text decoration、role 默认 placement、side / point placement、frame / plotArea target、自动 reserve、`mode:'fixed'` / `autoPadding:false`、主题文本样式合并和 decoration IR scope 输出。
- `computePlotArea`、`computePolarCoordinate`、`computeTernaryFrame` 已能消费 layout reserve；显式 `margin` 仍逐边覆盖自动预留。
- React DSL 已支持 `<TitleLabel>` / `<CaptionLabel>` 子组件调度，内容可来自 `text` prop、普通 children 或 core `<Text>` styled line；Vanilla builder 已透传 layout / labels；axis 文档已补整图文案 demo。

本轮未完成完整内部 `LayoutClaim` solver：legend、axis title、tick label、facet / track header 还没有统一转换为 claim；`target:'view'` 在 lowering 中保留 fail-loud；collision / overflow 字段先作为 schema 语义入口，后续在统一 solver 中实现。

## DSL 表面

React DSL 用组件声明整图标题和说明：

```tsx
<Plot layout={{ autoPadding: true }}>
  <TitleLabel placement={{ kind: 'side', side: 'top', placement: 'midway', padding: 8 }} font={{ size: 18, weight: 600 }}>
    Monthly Revenue
    <Text opacity={0.65} font={{ size: 12 }}>Internal view</Text>
  </TitleLabel>
  <CaptionLabel placement={{ kind: 'side', side: 'bottom', placement: 'at-end', padding: 6 }} opacity={0.7}>
    Source: internal billing data
  </CaptionLabel>
</Plot>
```

JSON / Vanilla 表面使用同名 `labels` 字段：

```ts
const labels = [
  {
    type: 'text',
    role: 'title',
    text: ['Monthly Revenue', 'Internal view'],
    placement: { kind: 'side', side: 'top', placement: 'midway', padding: 8 },
    font: { size: 18, weight: 600 },
  },
  {
    type: 'text',
    role: 'caption',
    text: 'Source: internal billing data',
    placement: { kind: 'side', side: 'bottom', placement: 'at-end', padding: 6 },
    opacity: 0.7,
  },
];
```

角标不参与占位：

```tsx
<Plot
  labels={[
    {
      type: 'text',
      role: 'note',
      text: 'Preliminary',
      reserveSpace: false,
      placement: { kind: 'point', target: 'plotArea', x: 0.98, y: 0.02, anchor: 'end' },
    },
  ]}
/>
```

用户需要精确出版排版时关闭自动占位：

```tsx
<Plot
  layout={{
    mode: 'fixed',
    padding: { top: 32, right: 16, bottom: 28, left: 40 },
    collision: { strategy: 'none' },
  }}
/>
```

Vanilla builder 暴露同名 plain object；React adapter 通过 `<TitleLabel>` / `<CaptionLabel>` 归一化为 `PlotSpec.labels`，不把内部 decoration 词汇暴露成组件名。

## 测试设计

`packages/viz/plot/tests/ir/plot.schema.test.ts` 覆盖 layout / labels schema accept / reject。

`packages/viz/plot/tests/features/layout/layout.test.ts` 覆盖 LayoutClaim 收集、side band reserve、priority collision 与 deterministic iteration。

`packages/viz/plot/tests/features/guide/guide.test.ts` 覆盖 axis title / tick labels 转换为 layout claim 后仍保持现有几何语义。

`packages/viz/plot/tests/features/legend/legend.test.ts` 覆盖 legend reserve 与 plot title / axis band 的栈排顺序。

`packages/viz/plot/tests/theme/theme.test.ts` 覆盖 theme 只能给 label 文本样式默认，不接收 text / placement / priority。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `PlotSpecSchema` 新增 `layout` 与 `labels`，用于整图静态 label 和空间布局策略。
- 新增 layout vocabulary：`LayoutPlacement`、`LayoutClaim`、`LayoutBox`、`PositionedLayoutBox`。公开 schema 只暴露 JSON-safe 的 placement / layout options；内部 claim 类型放在 `pipeline/layout` 或 `shared/layout` 的合理边界内。
- 现有 `computePlotArea` / `computePolarCoordinate` / `computeTernaryFrame` 需要逐步迁移为 layout solver 的消费者或兼容 wrapper，不能再作为所有 spacing 的单一入口。
- `axis.title.layout`、`tickLabels.layout`、legend reserve、facet / track header 后续都要通过 `LayoutClaim` 汇入同一布局阶段。
- theme 可以为 label text 提供字体、颜色、透明度等视觉默认，但不能提供 `text`、`placement`、`priority` 或 `reserveSpace`。
- docs 需要新增空间布局 / labels 段落，并在 axis guide 文档中说明 axis title 的 placement 会参与全局布局。
- 不修改 core IR；plot 只消费 core `TextBlockSchema`、`FontSchema`、`GeometryLabelPosition` 与 Node / Scope lowering 能力。

## 不在本 ADR 范围

- renderer 真实文本测量。当前仍用 deterministic estimate；未来可加 compile option measurement hook，但不能进入 IR。
- 文本 ellipsis / wrap 的完整排版算法。本 ADR 只预留 `overflow:'ellipsis'` 语义，首轮实现可先 fail-soft 或按 `hide/flush/shift` 子集落地。
- 数据绑定 annotation、leader line、pin、callout、connector。
- legend item 的自动换行、分栏、滚动。
- 通用 layer / z-index / draw order。本 ADR 只处理空间布局；绘制顺序仍按现有 guide / mark 规则或后续 layer ADR 处理。
- HTML / DOM overlay 文案。
- chart preset 默认规则。preset 可消费本 PlotSpec 能力，但不在本 ADR 实现。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 plot root schema、layout pipeline、guide / legend lowering 的空间占位流程和 docs；不修改 core IR，不修改包顶层公共入口。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/plot/schema.ts` | 加 | `PlotSpecSchema.layout` | `PlotLayoutSchema.optional()` | `{ mode:'auto', autoPadding:true }` | 整图 decoration 空间布局策略 |
| `packages/viz/plot/src/schemas/plot/schema.ts` | 加 | `PlotSpecSchema.labels` | `z.array(PlotLabelSchema).optional()` | `[]` | 整图静态文案和 label 列表 |
| `packages/viz/plot/src/schemas/plot/schema.ts` 或新 `schemas/layout/schema.ts` | 加 | `PlotLayoutSchema.mode` | `z.enum(['auto', 'fixed']).optional()` | `auto` | 自动占位或固定布局模式 |
| `packages/viz/plot/src/schemas/plot/schema.ts` 或新 `schemas/layout/schema.ts` | 加 | `PlotLayoutSchema.autoPadding` | `z.boolean().optional()` | `true` | decoration 是否能自动扩大外侧留白 |
| `packages/viz/plot/src/schemas/plot/schema.ts` 或新 `schemas/layout/schema.ts` | 加 | `PlotLayoutSchema.padding` | `BoxPaddingSchema.optional()` | `{}` | 整图 frame 外层留白 |
| `packages/viz/plot/src/schemas/plot/schema.ts` 或新 `schemas/layout/schema.ts` | 加 | `PlotLayoutSchema.maxIterations` | `z.number().int().positive().max(5).optional()` | `3` | layout 稳定迭代次数上限 |
| `packages/viz/plot/src/schemas/plot/schema.ts` 或新 `schemas/layout/schema.ts` | 加 | `PlotLayoutSchema.collision` | `{ strategy?: enum; padding?: number }` | `{ strategy:'shift', padding:0 }` | decoration 剩余冲突处理策略 |
| `packages/viz/plot/src/schemas/layout/schema.ts` | 加 | `LayoutPlacementSchema` | `side | point` discriminated union | 见 role 默认 | decoration 相对 frame / plotArea / view 的位置 |
| `packages/viz/plot/src/schemas/layout/schema.ts` | 加 | `PlotLabelSchema` | `{ type:'text'; id?; role?; text; placement?; reserveSpace?; priority?; overflow?; ...GuideTextStyle }` | role-aware | 静态整图文案 label |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 加 | `PlotThemeSchema.labelText` | `GuideTextStyleSchema.optional()` | 继承 typography | label 文本默认样式 |

refinement：

- `labels[].type` 首轮只允许 `'text'`；未来新增 image / custom label 需另开 ADR 或扩展本 ADR。
- `LayoutPlacement.kind:'side'` 的 `placement` 为 core `GeometryLabelPosition` 或 `[0,1]` 比例数值；`view` 只有在 `target:'view'` 时合法。
- `LayoutPlacement.kind:'point'` 的 `x/y` 必须在 `[0,1]`；默认 `reserveSpace:false`。
- `layout.maxIterations` 上限为 `5`，避免错误配置导致 layout 过慢。
- `theme.labelText` 不接收 `text`、`placement`、`reserveSpace`、`priority`、`overflow`。
- `role:'title'` / `'caption'` / `'source'` 可提供默认 side / priority / reserveSpace；显式 `placement` 与 `priority` 覆盖 role default。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/plot/schema.ts`
- `packages/viz/plot/src/schemas/layout/**`
- `packages/viz/plot/src/schemas/theme/schema.ts`
- `packages/viz/plot/src/schemas/index.ts`
- `packages/viz/plot/src/shared/layout.ts`
- `packages/viz/plot/src/shared/**`
- `packages/viz/plot/src/pipeline/layout/**`
- `packages/viz/plot/src/pipeline/guide/guide.ts`
- `packages/viz/plot/src/pipeline/**`
- `packages/viz/plot/src/providers/theme/theme.ts`
- `packages/viz/plot/tests/ir/plot.schema.test.ts`
- `packages/viz/plot/tests/features/layout/**`
- `packages/viz/plot/tests/features/guide/**`
- `packages/viz/plot/tests/features/legend/**`
- `packages/viz/plot/tests/theme/**`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/grammar/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要先扩展本 ADR 的文件 scope 或新开 ADR。

### 测试象限

**Happy path**：

- `plot_title_reserves_top_band`：`labels[{ role:'title' }]` 默认位于 top / midway，并收缩 plot area。
- `source_note_reserves_bottom_end_band`：`role:'source'` 默认 bottom / at-end，且不会覆盖 x tick labels。
- `side_placement_reuses_geometry_label_position`：`placement:'at-start' | 'midway' | 'at-end'` 与 `0 | 0.5 | 1` 等价。
- `point_decoration_does_not_reserve_space`：`kind:'point'` 文案绘制在 plotArea 内部，不改变 plot area。
- `legend_axis_and_title_stack_on_same_side`：同 side 上 title、legend、axis band 使用稳定栈排顺序。

**边界**：

- `fixed_layout_keeps_plot_area_from_auto_reserve`：`layout.mode:'fixed'` 时 decoration 不自动扩大外侧 padding。
- `auto_padding_false_places_without_reserve`：`autoPadding:false` 时仍生成 decoration node，但不收缩 plot area。
- `max_iterations_stops_with_deterministic_result`：复杂 title / legend / axis 组合在固定迭代次数内输出稳定 IR。
- `role_default_can_be_overridden`：`role:'title'` 显式写 `side:'bottom'` / `priority` 时使用用户配置。

**错误路径**：

- `point_placement_rejects_out_of_range_ratio`：`x/y < 0` 或 `> 1` schema 拒绝。
- `side_placement_rejects_out_of_range_ratio`：side placement 数值比例超出 `[0,1]` schema 拒绝。
- `view_target_requires_known_view`：`target:'view'` 引用不存在 view 时 lowering fail-loud。
- `theme_label_rejects_semantic_fields`：theme labelText 拒绝 text / placement / priority 等结构字段。
- `max_iterations_rejects_large_value`：`maxIterations > 5` schema 拒绝。

**交互**：

- `axis_title_claim_preserves_existing_axis_title_geometry`：axis title 经 LayoutClaim 后仍保持 ADR-08 placement / shift / orientation 语义。
- `tick_label_layout_feeds_axis_band_measure`：ADR-07 旋转 / hide 后的 tick labels 影响 axis band reserve。
- `polar_layout_uses_same_claim_pipeline`：polar angular labels、legend 和 title 通过同一 claim pipeline 占位。
- `ternary_layout_uses_same_claim_pipeline`：ternary 三边 labels 与 plot title 不重叠。
- `decoration_collision_hides_lower_priority_claim`：空间不足且 collision hide 时，高 priority title 保留，低 priority note 隐藏或标记不可见。

### 依赖的现有元素

- `BoxPaddingSchema`（`packages/viz/plot/src/schemas/plot/schema.ts`）——复用四边 padding 语义，必要时下沉到 layout schema。
- `GuideTextStyleSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——作为 text decoration 的文本样式字段来源。
- `TextBlockSchema` / `FontSchema`（`@retikz/core`）——作为 decoration 文本内容和字体契约。
- `GeometryLabelPosition`（`@retikz/core`）——作为 side placement 的沿边位置关键字来源。
- `computePlotArea` / `computePolarCoordinate` / `computeTernaryFrame`（`packages/viz/plot/src/shared/layout.ts`）——迁移为 layout solver 的兼容 wrapper 或底层 helper。
- `AxisTitleSchema` / `AxisTickLabelsSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——现有 guide 文本转换为内部 `LayoutClaim`。
- `LegendGuideSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——legend reserve 转换为内部 `LayoutClaim`。
- `resolveAxisGuideTokens` / theme resolver（`packages/viz/plot/src/providers/theme/theme.ts`）——为 decoration 文本样式提供 theme default，同时保持 semantic fields 不进 theme。
- `lowerGuide` 与 plot lowering pipeline（`packages/viz/plot/src/pipeline/**`）——收集 claim、求解 frame、再下沉为 core Scope / Node / Path。
