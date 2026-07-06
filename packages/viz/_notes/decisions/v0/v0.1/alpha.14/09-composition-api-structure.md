# ADR-09: Composition data structure and authoring API redesign

- 状态：Accepted
- 决策日期：2026-07-01
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md) · [ADR-04 shared scaffold tracks](./04-shared-scaffold-tracks.md) · [ADR-05 composition guides, axes, grid, spacing](./05-composition-guides-layout.md) · [ADR-08 React axis binding sugar](./08-react-axis-binding-sugar.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/graph/_notes/decisions/v0/v0.1/alpha.14/09-composition-api-structure.md`

## 完工摘要

- `PlotSpec.composition` 已收敛为 `defaultView` / `views` / `arrangements` / `spacing` / `resolve`，旧 `defaultScope` / `scopes` / `facets` / `scaffolds` / `layout` / `guidePolicy` 不再作为 schema 字段接受。
- mark 与 axis 的底层绑定字段统一为 `coordinateView`；React / Vanilla DSL 继续提供 `xAxisId` / `yAxisId`、`facetId`、`trackId`、`scaffoldId` 等更贴近用户心智的糖，并在输出 PlotSpec 前展开。
- facet、overlay 多轴、共享轨道、grid targeting、locator / provenance 与文档 demo 已按同一 composition 结构对齐；多层 facet label 与 synchronized scale 也纳入当前实现。
- ADR-01～08 的概念决策已实现，但字段命名与公开结构以本 ADR 为准；后续不得继续扩展旧结构。

## 背景

alpha.14 已经把 facet、same-panel 多轴、shared scaffold tracks、grid targeting 和多层 facet label 串到同一套 `composition` 机制上。实现证明这条路线可行，但文档和 demo 迭代也暴露出一个更根本的问题：当前 `composition` 数据结构能表达能力，却不够适合作为长期公开 API。

当前结构把多类职责放在同一个对象里：`scopes/defaultScope` 是坐标实例注册表，`facets/scaffolds` 是组合拓扑生成器，`layout` 是排版间距，`guidePolicy` 是 axis / grid / label 策略。用户在 React DSL 中通常通过 `<Axis>`、`<Mark>`、`<Facet>`、`<Track>` 表达意图，但编译后的 IR 暴露的是 `scope`、`__x`、`__y.default`、`guidePolicy` 这类更接近内部实现的概念。

对比常见图表系统，Recharts 的多轴 API 强调“mark 绑定到某个 axis id”；ggplot 的 facet API 强调“按 row / column 分面，并选择 fixed / free scale”；Vega-Lite 把 view composition 与 `resolve.scale/axis/legend` 拆开。它们的共同点不是字段完全一致，而是把“图怎么分组”和“比例尺/坐标轴是否共享”分开解释。

retikz 仍然需要比这些库更底层：它要同时覆盖 cartesian、polar、自定义坐标、shared tracks、overlay scopes，并保持 JSON-safe IR。问题不在于是否保留 `composition` 这个顶层概念，而在于它内部应该从“功能累加容器”重构为“坐标视图 + 组合结构 + resolve 策略”的稳定模型。

本 ADR 不考虑底层兼容性。旧字段可以破坏性删除，不保留 alias。目标是让下一版实现和文档围绕新的心智模型收敛，而不是继续在当前 `facets/scaffolds/layout/guidePolicy` 上追加字段。

## 决策：保留 `composition` 顶层，但重构为 views + arrangements + resolve + spacing

`PlotSpec.composition` 继续作为 Plot 内坐标复合的唯一入口，但内部字段破坏性重命名和分层：

- `composition.scopes` 改为 `composition.views`，表示可被 mark / guide 引用的坐标视图。
- `composition.defaultScope` 改为 `composition.defaultView`，表示省略绑定时使用的默认坐标视图。
- `composition.facets` 与 `composition.scaffolds` 合并为 `composition.arrangements`，用 `kind` 区分 `facet` 与 `tracks`。
- `composition.layout` 改为 `composition.spacing`，只表达 composition 级间距默认值。
- `composition.guidePolicy` 删除，拆成 `composition.resolve`、arrangement 级 `header` 和 axis 自身字段。
- `grid` 是否生成仍由 `AxisGuide.grid` 决定；`resolve.grid` 只决定 `grid: true` 的默认投放范围。

```ts
type CoordinateViewId = string;

type CoordinateViewPlacement =
  | { kind: 'root' }
  | { kind: 'overlay'; target: CoordinateViewId; zIndex?: number }
  | { kind: 'slot'; arrangement: string; slot: string };

type CoordinateViewSpec = {
  id: CoordinateViewId;
  coordinate: CoordinateOperation;
  placement?: CoordinateViewPlacement;
  meta?: JsonObject;
};

type ScaleResolveMode = 'shared' | 'independent' | 'synchronized';
type AxisResolveMode = 'local' | 'outer' | 'none';
type GridResolveMode = 'local' | 'all' | 'none';

type GridTargetSelector = {
  view?: CoordinateViewId | Array<CoordinateViewId>;
  facet?: { arrangement?: string; row?: FacetPanelValue; column?: FacetPanelValue };
  track?: { arrangement?: string; id?: string };
};

type AxisGridSpec = {
  applyTo?: GridResolveMode | 'selected';
  select?: GridTargetSelector;
};

type CompositionResolveSpec = {
  scale?: Record<string, ScaleResolveMode>;
  axis?: Record<string, AxisResolveMode>;
  grid?: Record<string, GridResolveMode>;
};

type CompositionSpacingSpec = {
  panelGap?: number;
  trackGap?: number;
  axisGap?: number;
  labelGap?: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
};

type FacetArrangementSpec = {
  kind: 'facet';
  id: string;
  view: CoordinateViewId;
  row?: FacetDimensionInput;
  column?: FacetDimensionInput;
  empty?: FacetEmptyPolicyValue;
  header?: { row?: boolean; column?: boolean };
  resolve?: CompositionResolveSpec;
  spacing?: Pick<CompositionSpacingSpec, 'panelGap' | 'labelGap'>;
  viewIdTemplate?: string;
};

type TrackArrangementSpec = {
  kind: 'tracks';
  id: string;
  coordinate: CoordinateOperation;
  sharedRoles: Array<string>;
  frame?: ScaffoldFrameModeValue;
  tracks: Array<{
    id: string;
    view?: CoordinateViewId;
    band: { role: string; start: number; end: number };
    order?: number;
    coordinate?: CoordinateOperation;
  }>;
  header?: { track?: boolean };
  resolve?: CompositionResolveSpec;
  spacing?: Pick<CompositionSpacingSpec, 'trackGap' | 'labelGap'>;
  viewIdTemplate?: string;
};

type CompositionArrangementSpec = FacetArrangementSpec | TrackArrangementSpec;

type CoordinateCompositionSpec = {
  defaultView: CoordinateViewId;
  views: Array<CoordinateViewSpec>;
  arrangements?: Array<CompositionArrangementSpec>;
  resolve?: CompositionResolveSpec;
  spacing?: CompositionSpacingSpec;
};

type AxisGuideSpec = {
  grid?: boolean | AxisGridSpec;
  coordinateView?: CoordinateViewId;
};
```

规则：

1. `views` 只负责坐标视图身份、坐标操作和显式 placement；不承载 facet / track 生成器配置。
2. `arrangements` 只负责“如何生成或组织多个局部视图”；facet 和 tracks 都是 arrangement，不再有并列的 `facets` / `scaffolds` 顶层字段。
3. `resolve` 只负责共享策略。`scale` 表达 position role 的 domain / scale 共享方式；`axis` 表达轴绘制层级；`grid` 只表达 `Axis.grid = true` 时的默认投放范围。
4. 精确 grid 目标仍属于 `AxisGuide.grid`。`grid: true` 使用 `resolve.grid`；`grid: { applyTo: 'selected', select }` 可以按 `view`、`facet` 或 `track` 精确投放。ADR-07 的 selector 能力不得在本次重构中丢失，只把旧 selector 名称迁移到 `view` / `arrangement`。
5. `spacing` 只负责数值间距，单位统一为 user units，所有数值必须是非负数。局部 arrangement 的 `spacing` 覆盖 composition 默认值。
6. facet label 不再叫 `facetLabels`。它是 header，不是 guide policy；用 `header: { row: true, column: true }` 表达。
7. track label 同理属于 arrangement header；首版仅保留 `header.track` 的开关，不做复杂样式。
8. `resolve` 按“composition 默认值 -> arrangement 覆盖值”的顺序深合并，同一个 role 的 arrangement 配置优先。
9. `scale.shared` 表示多个派生 view 共用同一个 scale identity 与 domain；`scale.independent` 表示每个派生 view 使用独立 scale identity 与独立 domain；`scale.synchronized` 表示每个派生 view 保留独立 scale identity，但 domain 使用参与视图的 union domain。首版 `synchronized` 只做 union domain，不包含 zero，不提供 domain 子配置。
10. `resolve.scale` 省略时，facet position roles 默认 `shared`；tracks 中 `sharedRoles` 默认 `shared`，track band role 默认 `independent`；overlay axis binding 中被绑定的 secondary role 默认 `independent`，其他 role 默认 `shared`。
11. `resolve.axis` 省略时，facet 和 tracks arrangement 默认 `outer`，overlay views 默认 `local`。`resolve.grid` 省略时，facet 和 tracks arrangement 默认 `all`，overlay views 默认 `local`。
12. 顶层 `coordinate` 仍可作为单坐标 shorthand。只要出现 `composition`，`coordinate` 不得同时出现。

派生 view id 规则：

1. explicit `composition.views[].id` 是用户可引用的稳定 id；所有派生 view 在 normalization 后也必须进入同一 registry。
2. facet panel 默认 view id 为 `{arrangementId}.panel.{rowKey}.{columnKey}`。`rowKey` / `columnKey` 来自对应 facet value tuple 的 canonical JSON key；缺失方向使用 `_`。`viewIdTemplate` 可覆盖默认模板，支持 `{arrangement}`、`{row}`、`{column}`、`{panel}` 占位符。
3. tracks 默认 view id 为 `{arrangementId}.track.{trackId}`。单个 `tracks[].view` 可显式覆盖该 track 的 view id；`viewIdTemplate` 可作为 arrangement 级默认模板，支持 `{arrangement}`、`{track}` 占位符。
4. 派生 view id 与 explicit view id 冲突、同一 arrangement 内重复生成、或模板缺少必要占位导致重复时，schema normalization / build 阶段必须 fail-loud。
5. 手写 PlotSpec 的 mark / axis 可以引用派生 view id；React / Vanilla DSL 中 `<Facet>` 和 `<Track>` children 默认绑定到当前派生 view，不要求用户手写该 id。

理由：

1. `views / arrangements / resolve` 分别对应“有什么坐标视图”“这些视图如何组合”“共享策略是什么”，比旧 `composition` 大对象更容易解释。
2. `arrangements.kind` 给后续 matrix、inset、小倍图变体留扩展位，不再为每个结构新增一个顶层数组字段。
3. `resolve` 与 Vega-Lite 心智接近，但保留 retikz 的 coordinate role 模型，可覆盖 cartesian、polar 和 custom coordinate。
4. `header` 从 guide policy 中拆出来后，多层 facet label 分组更自然，后续可以加 formatter / style，而不污染 axis / grid 策略。
5. 删除 alias 能防止 docs、schema、adapter 同时维护两套写法。0.x 阶段应优先把长期模型修正到位。


## 数据流

1. React / Vanilla adapter 收集 `<Axis>`、`<Mark>`、`<Facet>`、`<Scaffold>`、`<Track>` 的上下文。
2. adapter-only 字段包括已定义的 `xAxisId` / `yAxisId`，以及结构组件上下文产生的 `facetId` / `trackId` / `scaffoldId` 绑定。`<Facet>`、`<Scaffold>`、`<Track>` 通过上下文生成 `composition.views`、`composition.arrangements` 和 mark / guide 的 view binding。
3. `@retikz/plot` schema 校验 JSON-safe IR，不接受 ReactNode、函数、class 实例或 adapter-only sugar 字段。
4. lowering 先规范化单坐标 shorthand 为默认 `view`，再按 `arrangements` 生成 facet panels / tracks 的派生 view。
5. scale domain 收集阶段应用 `resolve.scale`；guide lowering 阶段应用 `resolve.axis` 与 `resolve.grid`；mark lowering 阶段只消费已经确定的 view binding。

## 不在本 ADR 范围

- 不设计 chart preset 或 `<Chart>` 高层封装。
- 不设计 tooltip / brush / linked highlighting。
- 不做 renderer-specific text measurement，也不解决复杂 label collision avoidance。
- 不做 dashboard / arbitrary layout / free inset。
- 不设计 legend resolve；本 ADR 只覆盖 position scale、axis、grid、facet / track header。
- 不保留旧字段 alias；如果必须支持迁移工具，另开 beta cleanup ADR。
