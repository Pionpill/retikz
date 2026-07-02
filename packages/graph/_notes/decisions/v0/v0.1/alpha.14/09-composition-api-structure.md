# ADR-09: Composition data structure and authoring API redesign

- 状态：Proposed
- 决策日期：2026-07-01
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md) · [ADR-04 shared scaffold tracks](./04-shared-scaffold-tracks.md) · [ADR-05 composition guides, axes, grid, spacing](./05-composition-guides-layout.md) · [ADR-08 React axis binding sugar](./08-react-axis-binding-sugar.md)

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

## 待决策点 🔾

- **React 组件命名**：本 ADR 保留当前 `<Scaffold>` / `<Track>` 主 API。文档标题继续叫“共享轨道”。`<TrackGroup>` 更贴近用户心智，但属于独立命名议题，避免和本轮数据结构迁移混在一起。
- **Vanilla API 形态**：本 ADR 只要求与 React authoring surface 同构，不强制 builder 链式命名。实现可以选择 object builder 或函数 builder，但输出必须是同一份 PlotSpec。

## DSL 表面

多 y 轴仍按用户看得见的 axis id 绑定，不要求用户手写内部 view / scale 名称：

```tsx
<Plot data={rows}>
  <Axis dimension="x" title="month" />
  <Axis id="sales" dimension="y" placement={{ kind: 'side', side: 'left' }} title="sales" grid />
  <Axis id="rate" dimension="y" placement={{ kind: 'side', side: 'right' }} title="rate" />

  <PathMark x="month" y="sales" yAxisId="sales" />
  <PathMark x="month" y="rate" yAxisId="rate" />
</Plot>
```

分面用结构组件表达，mark / axis 从 `<Facet>` 继承 arrangement context。默认逻辑写在组件上，而不是让用户手写生成后的 view id：

```tsx
<Plot data={rows}>
  <Facet
    id="salesByRegion"
    row={[{ field: 'market' }, { field: 'segment' }]}
    column={{ field: 'quarter' }}
    header={{ row: true, column: true }}
    resolve={{ scale: { y: 'synchronized' }, axis: { x: 'outer', y: 'outer' }, grid: { y: 'all' } }}
    spacing={{ panelGap: 8 }}
  >
    <Axis dimension="x" title="quarter" />
    <Axis dimension="y" title="sales" grid />
    <PathMark x="month" y="sales" />
    <PointMark x="month" y="sales" />
  </Facet>
</Plot>
```

共享轨道用 `<Scaffold>` 聚焦“在一套正交区域里放哪些 track”。每个 `<Track>` 是局部 view context，内部 mark / axis 自动绑定到该 track：

```tsx
<Plot data={rows}>
  <Scaffold
    id="lanes"
    coordinate={{ type: 'cartesian2D' }}
    sharedRoles={['x']}
    spacing={{ trackGap: 6 }}
    resolve={{ grid: { x: 'all' }, axis: { x: 'outer', y: 'local' } }}
  >
    <Track id="price" band={{ role: 'y', start: 0, end: 0.32 }}>
      <Axis dimension="y" title="price" />
      <PathMark x="date" y="price" />
    </Track>
    <Track id="drawdown" band={{ role: 'y', start: 0.36, end: 0.62 }}>
      <Axis dimension="y" title="drawdown" />
      <IntervalMark x="date" y="drawdown" />
    </Track>
    <Track id="volume" band={{ role: 'y', start: 0.66, end: 1 }}>
      <Axis dimension="y" title="volume" />
      <PointMark x="date" y="volume" />
    </Track>
  </Scaffold>
</Plot>
```

手写 PlotSpec 面向高级用户和 adapter 输出：

```ts
const spec = {
  type: 'plot',
  data: { reference: 'sales' },
  composition: {
    defaultView: 'main',
    views: [
      { id: 'main', coordinate: { type: 'cartesian2D' } },
      {
        id: 'rate',
        coordinate: { type: 'cartesian2D' },
        placement: { kind: 'overlay', target: 'main' },
      },
    ],
    arrangements: [
      {
        kind: 'facet',
        id: 'byRegion',
        view: 'main',
        row: [{ field: 'market' }, { field: 'segment' }],
        column: { field: 'quarter' },
        header: { row: true, column: true },
        resolve: { scale: { y: 'synchronized' }, axis: { x: 'outer', y: 'outer' }, grid: { y: 'all' } },
      },
    ],
    spacing: { panelGap: 8, axisGap: 8, labelGap: 6 },
  },
  marks,
  guides,
};
```

## 数据流

1. React / Vanilla adapter 收集 `<Axis>`、`<Mark>`、`<Facet>`、`<Scaffold>`、`<Track>` 的上下文。
2. adapter-only 字段包括已定义的 `xAxisId` / `yAxisId`，以及结构组件上下文产生的 `facetId` / `trackId` / `scaffoldId` 绑定。`<Facet>`、`<Scaffold>`、`<Track>` 通过上下文生成 `composition.views`、`composition.arrangements` 和 mark / guide 的 view binding。
3. `@retikz/plot` schema 校验 JSON-safe IR，不接受 ReactNode、函数、class 实例或 adapter-only sugar 字段。
4. lowering 先规范化单坐标 shorthand 为默认 `view`，再按 `arrangements` 生成 facet panels / tracks 的派生 view。
5. scale domain 收集阶段应用 `resolve.scale`；guide lowering 阶段应用 `resolve.axis` 与 `resolve.grid`；mark lowering 阶段只消费已经确定的 view binding。

## 测试设计

`packages/graph/plot/tests/composition/composition-structure.test.ts` 覆盖：

- `views_default_view_binding`：`defaultView` 指向已注册 view，mark / axis 省略绑定时使用该 view。
- `coordinate_and_composition_rejected`：顶层 `coordinate` 与 `composition` 同时出现时 fail-loud。
- `arrangement_facet_generates_panel_views`：`kind: 'facet'` 按 row / column 生成派生 panel view，并继承 `view` 的 coordinate。
- `arrangement_tracks_generates_track_views`：`kind: 'tracks'` 生成 track views，`sharedRoles` 与 `band.role` 校验正确。
- `resolve_scale_synchronized_uses_union_domain`：facet 或 track 下 `scale.y = 'synchronized'` 使用共同 domain，但保留独立 view identity。
- `resolve_axis_outer_outputs_outer_axes`：`axis.x = 'outer'` 在分面中只输出外侧轴。
- `axis_grid_true_uses_resolve_grid_target`：`Axis.grid = true` 时，`resolve.grid` 决定投放到 local / all / none。
- `axis_grid_selected_selector_targets_view_facet_track`：`Axis.grid = { applyTo: 'selected', select }` 可按 view、facet 或 track 精确投放。
- `legacy_fields_rejected`：`defaultScope`、`scopes`、`facets`、`scaffolds`、`layout`、`guidePolicy` 在新 schema 中拒绝。
- `generated_view_id_conflict_rejected`：facet / tracks 派生 view id 与显式 view 或彼此冲突时 fail-loud。
- `json_round_trip_composition_structure`：`views / arrangements / resolve / spacing` JSON round-trip 后等价。

`packages/graph/plot-react/tests/components/build-plot-spec/topology-binding.test.tsx` 覆盖：

- `<Facet>` 生成 `arrangements.kind = 'facet'`，children mark / axis 继承 facet context。
- `<Scaffold>` / `<Track>` 生成 `arrangements.kind = 'tracks'`，children mark / axis 继承 track context。
- `yAxisId` 生成 overlay views，不暴露 `__x` / `__y.*` 给用户。
- 同一个 mark 同时设置 `coordinateView` 与 `yAxisId` 时 fail-loud。

`packages/graph/plot-vanilla/tests/**` 覆盖与 React DSL 同构输出。

docs 验收：

- coordinate composition 文档用新 DSL 重写，不再出现 `__x`、`__y.default`、`defaultScope`、`scopes` 等内部术语。
- API 表按 `Facet`、`Scaffold`、`Track`、`composition.resolve`、`composition.spacing` 拆开说明。
- 双轴、分面、共享轨道各至少两个 demo，其中分面包含多层 header 和 synchronized scale。

## 影响

- ⚠️ BREAKING：删除旧 `composition.defaultScope`、`composition.scopes`、`composition.facets`、`composition.scaffolds`、`composition.layout`、`composition.guidePolicy` 字段。
- ⚠️ BREAKING：`coordinateScope` 命名改为 `coordinateView`。用户面对的是坐标视图，不再暴露 scope registry 心智。
- React 共享轨道组件继续使用 `<Scaffold>` / `<Track>`；`<TrackGroup>` 命名另行评估。
- `@retikz/plot` schema、normalization、lowering、locator provenance 均需要按新字段重写。
- locator / provenance / meta 中的 `coordinateScope` 同步改名为 `coordinateView`；旧 `scaffold` 字段改为 `arrangement`，并保留 `facet` / `track` 作为 arrangement-local provenance。旧 provenance 字段不在新 schema 输出中保留。
- `@retikz/plot-react` / `@retikz/plot-vanilla` 需要把 topology sugar 输出到新 PlotSpec。
- docs coordinate composition 页面需要整体重写。旧文档中的“共享 scaffold 与 track”应统一改成“共享轨道”，代码示例继续使用 `<Scaffold>` / `<Track>`。
- core IR 不需要修改；lowering 仍输出 core `Scope` / primitive。

## 不在本 ADR 范围

- 不设计 chart preset 或 `<Chart>` 高层封装。
- 不设计 tooltip / brush / linked highlighting。
- 不做 renderer-specific text measurement，也不解决复杂 label collision avoidance。
- 不做 dashboard / arbitrary layout / free inset。
- 不设计 legend resolve；本 ADR 只覆盖 position scale、axis、grid、facet / track header。
- 不保留旧字段 alias；如果必须支持迁移工具，另开 beta cleanup ADR。

---

## 实现契约（必填）🔾

### Level

本 ADR 自评 level：`red`。

原因：需要破坏性修改 `@retikz/plot` IR schema、composition normalization、lowering、adapter 输出、docs demo 和测试矩阵。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 改 | `composition.defaultView` | `z.string().min(1)` | 无 | 省略 view binding 时使用的默认坐标视图 id |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 改 | `composition.views` | `z.array(CoordinateViewSchema).min(1)` | 无 | Plot 内显式坐标视图注册表 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.arrangements` | `z.array(CompositionArrangementSchema).optional()` | 无 | facet / tracks 等坐标组合结构 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.resolve` | `CompositionResolveSchema.optional()` | 内置默认 | composition 级 scale / axis / grid 共享策略 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 改 | `composition.spacing` | `CompositionSpacingSchema.optional()` | 内置默认 | composition 级间距默认值 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `spacing.panelGap` / `trackGap` / `axisGap` / `labelGap` | `z.number().nonnegative().optional()` | 内置默认 | composition 间距，单位为 user units |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `spacing.padding.*` | `z.number().nonnegative().optional()` | 无 | composition 外侧 padding，单位为 user units |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `arrangements[].kind` | `z.literal('facet') \| z.literal('tracks')` | 无 | arrangement 判别字段 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `facet.header` | `{ row?: boolean; column?: boolean }` | `{}` | facet row / column header 开关 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `facet.viewIdTemplate` | `z.string().min(1).optional()` | `{arrangement}.panel.{row}.{column}` | facet 派生 view id 模板 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `tracks.header` | `{ track?: boolean }` | `{}` | track header 开关 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `tracks.viewIdTemplate` | `z.string().min(1).optional()` | `{arrangement}.track.{track}` | tracks 派生 view id 模板 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `tracks.tracks[].view` | `z.string().min(1).optional()` | 由模板生成 | 单个 track 的显式 view id |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 改 | `coordinateView` | `z.string().min(1).optional()` | `composition.defaultView` | mark 绑定到的坐标视图 id |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 改 | `axis.coordinateView` | `z.string().min(1).optional()` | `composition.defaultView` | axis guide 绑定到的坐标视图 id |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 改 | `axis.grid` | `z.union([z.boolean(), AxisGridSchema]).optional()` | 无 | axis 是否生成 grid，以及 selected selector 精确投放 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 删 | `defaultScope` / `scopes` / `facets` / `scaffolds` / `layout` / `guidePolicy` | 旧字段 | 无 | 不保留 alias |

字段名一经本 ADR 人工确认，后续实现不得自行改名；如需改名，回本 ADR 补条或新开 ADR。

### 文件 scope

- `packages/graph/plot/src/schemas/plot/schema.ts`
- `packages/graph/plot/src/schemas/plot/constants.ts`
- `packages/graph/plot/src/schemas/plot/types.ts`
- `packages/graph/plot/src/schemas/mark/schema.ts`
- `packages/graph/plot/src/schemas/guide/schema.ts`
- `packages/graph/plot/src/pipeline/**`
- `packages/graph/plot/src/features/guide/**`
- `packages/graph/plot/src/features/interaction/**`
- `packages/graph/plot/tests/composition/**`
- `packages/graph/plot-react/src/components/composition.tsx`
- `packages/graph/plot-react/src/components/build-plot-spec.ts`
- `packages/graph/plot-react/src/components/marks.tsx`
- `packages/graph/plot-react/src/components/guides.tsx`
- `packages/graph/plot-react/tests/**`
- `packages/graph/plot-vanilla/src/**`
- `packages/graph/plot-vanilla/tests/**`
- `apps/docs/src/contents/graph/grammar/coordinate/composition/**`
- `apps/docs/src/data/**`
- `apps/docs/src/i18n/**`
- `packages/graph/_notes/decisions/v0/v0.1/alpha.14/roadmap.md`

偏离白名单的改动需要回本 ADR 增补文件 scope，或新开 ADR。

### 测试象限

**Happy path**

- `composition_views_default_binding`：默认 view 正确绑定 mark / axis。
- `facet_arrangement_with_multilevel_header`：多层 row / column facet 生成分组 header。
- `tracks_arrangement_with_cartesian_lanes`：笛卡尔共享轨道生成多 track views。
- `axis_id_sugar_generates_overlay_views`：双轴 sugar 展开为 views + overlay placement。

**边界**

- `single_view_composition_equivalent_to_coordinate_shorthand`：单 view composition 与顶层 coordinate shorthand 等价。
- `zero_spacing_is_valid`：`panelGap/trackGap/axisGap/labelGap = 0` 合法。
- `resolve_omitted_uses_defaults`：省略 resolve 时使用推荐默认值。
- `synchronized_scale_single_panel_is_noop`：单 panel 下 synchronized 不改变输出。
- `negative_spacing_rejected`：spacing / padding 任一负数均被 schema 拒绝。

**错误路径**

- `legacy_composition_fields_rejected`：旧字段全部拒绝。
- `missing_default_view_rejected`：`defaultView` 引用不存在时报错。
- `duplicate_view_id_rejected`：重复 view id 报错。
- `invalid_arrangement_view_rejected`：facet arrangement 引用不存在 view 报错。
- `track_band_overlap_rejected`：同 role track band 重叠时报错。
- `generated_view_id_conflict_rejected`：派生 view id 与显式 view 或其他派生 view 重复时报错。
- `coordinate_view_and_axis_id_conflict_rejected`：mark 同时写 `coordinateView` 与 axis id sugar 报错。

**交互**

- `resolve_grid_respects_axis_grid_flag`：只有 `Axis.grid` 开启时才生成 grid，投放范围读 resolve。
- `axis_grid_selected_selector_survives_composition_rename`：ADR-07 的 selected selector 在新命名下可按 view / arrangement / facet / track 精确命中。
- `mixed_facet_and_tracks_arrangements_are_rejected`：同一 Plot 内暂不允许 facet arrangement 与 tracks arrangement 并列，避免未定义的组合层级被静默忽略；后续若要支持嵌套组合，需另行设计 arrangement 层级关系。
- `locator_provenance_uses_coordinate_view`：locator/provenance 输出 coordinateView、facet key、track key。
- `react_vanilla_manual_spec_parity`：React、Vanilla 与手写 PlotSpec 输出等价。

### 依赖的现有元素

- `PlotSpecSchema`（`packages/graph/plot/src/schemas/plot/schema.ts`）：破坏性重构 composition 字段。
- `CoordinateOperationSchema`：继续作为 view / tracks arrangement 的 coordinate 真源。
- `AxisGuideSchema`：继续由 axis 自己声明 `grid` 是否生成，并新增 / 重命名 view binding。
- mark schema：继续由 mark 声明绑定到哪个坐标视图。
- plot lowering pipeline：消费 normalized views / arrangements / resolve。
- core `Scope`：lowering 目标仍复用 core Scope，不新增 core IR 能力。
- React / Vanilla adapter：提供用户友好的结构组件和 axis id sugar，输出新 PlotSpec。
