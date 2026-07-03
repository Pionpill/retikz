# ADR-07: axis-level grid targeting

- 状态：Accepted（实现字段以 ADR-09 为准）
- 决策日期：2026-06-29
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md) · [ADR-04 shared scaffold tracks](./04-shared-scaffold-tracks.md) · [ADR-05 composition guides layout](./05-composition-guides-layout.md) · [ADR-06 scope provenance surface](./06-scope-provenance-surface.md)

## 背景

ADR-05 把 `composition.guidePolicy.grid` 设计成 `none | perScope | shared`。实现和文档 demo 走到 shared scaffold tracks 后暴露了一个职责混合问题：`Axis.grid` 看起来像“这个轴是否画 grid”，但 `composition.guidePolicy.grid` 又像“组合后是否画 grid”。例如 x 轴声明 `grid: true`，`guidePolicy.grid: 'shared'` 时，用户自然会期待共享 scaffold 的上方 track 也出现 grid；当前实现却只会把已经生成的 grid 做合并或去重，不会为其它 track 自动生成 grid。

更复杂的需求也不能用全局枚举描述：一个复合图里 x 轴对应 channel `a`，y 轴有 `b` / `c` 两套 scale，用户可能只希望 `b` 有 grid，`c` 没有；facet 和 shared scaffold 都会遇到类似问题。全局的 `local | shared | allTracks | allFacets` 只能表达统一策略，不能表达“只投放到这几个 facet / track / scope”。

因此需要把职责重新切开：

1. `Axis.grid` 是 grid 是否存在的唯一声明。
2. composition 只负责把 axis 产生的 tick/grid 投放到哪些 scope / facet panel / track。
3. 需要 JSON-safe 的 selector，允许 axis 精确选择 grid 的目标。

## 决策：grid 归 Axis，composition 只给默认投放策略

废弃 ADR-05 中 `composition.guidePolicy.grid` 的“是否画 grid”语义，改为 `composition.guidePolicy.gridPlacement`。`gridPlacement` 只作为 `Axis.grid: true` 或 `Axis.grid: {}` 时的默认投放策略，不会创建 grid，也不会关闭显式 axis grid。

`AxisGuide.grid` 扩展为 `boolean | AxisGridSpec`：

```ts
const AxisGridApplyTo = {
  Self: 'self',
  SharedRole: 'sharedRole',
  Selected: 'selected',
} as const;

const CompositionGridPlacement = {
  Self: 'self',
  SharedRole: 'sharedRole',
} as const;

type FacetScalar = string | number | boolean | null;

type GuideTargetSelector = {
  scopes?: Array<string>;
  facet?: {
    id?: string;
    row?: Array<FacetScalar>;
    column?: Array<FacetScalar>;
  };
  track?: {
    scaffold?: string;
    id?: Array<string>;
  };
};

type AxisGridSpec = {
  applyTo?: AxisGridApplyToValue;
  select?: GuideTargetSelector;
};

type AxisGuideSpec = {
  grid?: boolean | AxisGridSpec;
};

type CompositionGuidePolicySpec = {
  axes?: CompositionAxisPolicyValue;
  gridPlacement?: CompositionGridPlacementValue;
  facetLabels?: CompositionFacetLabelPolicyValue;
  trackLabels?: CompositionTrackLabelPolicyValue;
};
```

规则：

1. `grid: false` 或省略 `grid` 表示该 axis 不产生 grid。composition 不得替它产生 grid。
2. `grid: true` 等价于 `grid: { applyTo: composition.guidePolicy.gridPlacement ?? 'self' }`。
3. `applyTo: 'self'` 只投放到 axis 所属 `coordinateScope` 或默认 scope。
4. `applyTo: 'sharedRole'` 投放到与该 axis 的 dimension / scale identity / coordinate role 匹配的共享区域：
   - facet：匹配的全部 panel 内生成 grid；需要缩小到部分 panel 时使用 `applyTo: 'selected'`。
   - shared scaffold：匹配的 scaffold tracks 都生成 grid。
   - overlay：匹配同一 panel 内共享 role 的 overlay scope。
5. `applyTo: 'selected'` 必须提供 `select`，只投放到 selector 命中的目标。
6. `select.scopes` 按 coordinate scope id 匹配。
7. `select.facet` 按 facet id、row value、column value 匹配 panel；row / column 都给出时取交集。
8. `select.track` 按 scaffold id 与 track id 匹配；`id` 为空数组非法。
9. selector 命中 0 个目标、命中目标不支持该 axis dimension、或 `selected` 缺少 `select`，都 fail-loud。
10. `guidePolicy.axes` 只影响 axis layer 的合并和外侧取舍，不影响 grid 生成。`axes: 'outerShared'` 不能吞掉已经声明的 per-panel / per-track grid。

这是 breaking schema change：`composition.guidePolicy.grid` 从 alpha.14 schema 中移除，不保留 `none | perScope | shared` 别名。迁移关系为：

| 旧写法 | 新写法 |
| --- | --- |
| `guidePolicy.grid: 'none'` | 删除 axis 上的 `grid`，或写 `grid: false` |
| `guidePolicy.grid: 'perScope'` | `guidePolicy.gridPlacement: 'self'`，axis 写 `grid: true` |
| `guidePolicy.grid: 'shared'` | `guidePolicy.gridPlacement: 'sharedRole'`，axis 写 `grid: true` |
| 只让某个 track / facet 有 grid | axis 写 `grid: { applyTo: 'selected', select: ... }` |

## DSL 表面

PlotSpec / Vanilla builder / React 都复用同一个 `AxisGridSpec`。Vanilla 的 `plotBuilder(config).axis(...)` 仍然直接接收 `Guide` 对象，不新增 builder-only sugar。

共享 scaffold 的 x grid 覆盖所有 track：

```ts
const spec = {
  type: 'plot',
  composition: {
    defaultScope: 'incidents',
    guidePolicy: { axes: 'outerShared', gridPlacement: 'sharedRole' },
  },
  guides: [
    {
      type: 'axis',
      dimension: 'x',
      coordinateScope: 'incidents',
      grid: true,
    },
  ],
};
```

只给 `load` track 画 y grid：

```ts
const spec = {
  type: 'plot',
  guides: [
    {
      type: 'axis',
      dimension: 'y',
      coordinateScope: 'load',
      grid: {
        applyTo: 'selected',
        select: {
          track: { scaffold: 'ops', id: ['load'] },
        },
      },
    },
  ],
};
```

只给 facet 的 `metric = "b"` panel 画 grid：

```ts
const spec = {
  type: 'plot',
  guides: [
    {
      type: 'axis',
      dimension: 'y',
      grid: {
        applyTo: 'selected',
        select: {
          facet: { id: 'metricByRegion', row: ['b'] },
        },
      },
    },
  ],
};
```

React 只把同一对象透传到 `Axis`：

```tsx
<Axis
  dimension="y"
  coordinateScope="load"
  grid={{
    applyTo: 'selected',
    select: { track: { scaffold: 'ops', id: ['load'] } },
  }}
/>
```

Vanilla builder 与手写 PlotSpec 等价：

```ts
const spec = plotBuilder({
  data,
  scales,
  composition,
})
  .axis({
    type: 'axis',
    dimension: 'x',
    grid: { applyTo: 'sharedRole' },
  })
  .build();
```

## 影响

- `@retikz/plot` 的 guide schema、composition guide policy、guide lowering、grid target resolution 都需要调整。
- `@retikz/plot-react` 的 `AxisProps.grid` 类型从 boolean 扩展为 `boolean | AxisGridSpec`。
- `@retikz/plot-vanilla` 不新增方法，但 builder 输入类型会随 `Guide` 更新。
- docs 需要更新 coordinate composition 页面，把“grid 是否生成”解释为 axis 责任，把“shared / selected 投放”解释为 composition 责任。
- ADR-05 的 `grid none / perScope / shared` 测试需要改写为 axis-level grid targeting 测试。

## 不在本 ADR 范围

- 不做 axis label collision avoidance、grid label 自动避让或 renderer text metrics。
- 不设计 grid 样式系统；样式仍沿用现有 guide/scene style。
- 不做 legend、tooltip、brush、linked highlighting。
- 不把 arbitrary predicate / callback 放进 selector；IR 必须保持 JSON-safe。
- 不设计跨 plot / dashboard 级联动 grid。

---

## 实现契约（必填）

### Level

本 ADR 自评 level：`red`。

原因：它修改 public PlotSpec / Guide schema、React props、Vanilla builder 输入类型，并改变 composition guide lowering 的核心语义。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/plot/constants.ts` | 删/改 | `CompositionGridPolicy` | 删除 `none/perScope/shared` | 无 | 不再由 composition 决定是否生成 grid |
| `packages/graph/plot/src/schemas/plot/constants.ts` | 加 | `CompositionGridPlacement` | `as const` value object + `z.enum(...)` | 无 | axis grid 的默认投放策略 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 改 | `composition.guidePolicy.grid` | 删除 | 无 | 旧 grid policy 移除 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.guidePolicy.gridPlacement` | `CompositionGridPlacementSchema.optional()` | `'self'` | `Axis.grid: true` 的默认投放策略 |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 加 | `AxisGridApplyTo` | `self/sharedRole/selected` | 无 | axis grid 投放模式 |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 加 | `GuideTargetSelector` | object schema | 无 | scope / facet / track 目标选择器 |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 改 | `axis.grid` | `z.union([z.boolean(), AxisGridSchema]).optional()` | `false` | axis 是否生成 grid 以及投放目标 |
| `packages/graph/plot-react/src/components/guides.tsx` | 改 | `AxisProps.grid` | `boolean \| AxisGridSpec` | `undefined` | React 透传 axis grid targeting |
| `packages/graph/plot-vanilla/src/plot-builder.ts` | 间接改 | `axis(guide)` | `Guide` 更新后自然接收新 grid spec | 无 | Vanilla 与 PlotSpec 等价 |

### 文件 scope

- `packages/graph/plot/src/schemas/plot/constants.ts`
- `packages/graph/plot/src/schemas/plot/schema.ts`
- `packages/graph/plot/src/schemas/guide/schema.ts`
- `packages/graph/plot/src/pipeline/expand.ts`
- `packages/graph/plot/src/features/guide/**`
- `packages/graph/plot/src/features/composition/**`（若实现时已有拆分）
- `packages/graph/plot/tests/composition/composition-guides-layout.test.ts`
- `packages/graph/plot/tests/lower/guide.test.ts`
- `packages/graph/plot-react/src/components/guides.tsx`
- `packages/graph/plot-react/tests/**`
- `packages/graph/plot-vanilla/src/plot-builder.ts`
- `packages/graph/plot-vanilla/tests/**`
- `apps/docs/src/contents/graph/grammar/coordinate/composition/**`

### 测试象限

**Happy path**

- `axis_grid_true_uses_self_default`：`grid: true` 且无 `gridPlacement` 时只生成本 scope grid。
- `shared_scaffold_grid_spans_all_tracks`：x axis `grid: { applyTo: 'sharedRole' }` 覆盖同 scaffold 下所有匹配 tracks。
- `selected_track_grid_targets_only_named_track`：selector 只命中 `load` track，`incidents` track 没有 y grid。

**边界**

- `grid_false_overrides_shared_default`：composition `gridPlacement: 'sharedRole'` 时，axis `grid: false` 不生成 grid。
- `grid_empty_object_uses_composition_default`：`grid: {}` 按 `guidePolicy.gridPlacement` 投放。
- `facet_row_column_selector_intersection`：row 和 column 同时给出时只命中交集 panel。

**错误路径**

- `selected_grid_without_selector_rejected`：`applyTo: 'selected'` 缺少 `select` 时 schema 或 normalization fail-loud。
- `grid_selector_matches_no_target_rejected`：selector 命中 0 个 scope / panel / track 时 fail-loud。
- `grid_selector_dimension_mismatch_rejected`：目标不支持该 axis dimension / role 时 fail-loud。

**交互**

- `outer_shared_axes_do_not_suppress_panel_grids`：`axes: 'outerShared'` 仍保留每个 facet panel 的 grid。
- `react_vanilla_plot_spec_axis_grid_equivalence`：React / Vanilla 生成的 PlotSpec 与手写 PlotSpec 等价。
- `grid_provenance_carries_target_scope`：grid layer meta/provenance 带上实际 target scope / facet / track。

### 依赖的现有元素

- ADR-01：coordinate scope id、default scope、guide binding、composition registry。
- ADR-02：facet panel key、row / column value、panel bbox。
- ADR-04：shared scaffold id、track id、shared role / local band。
- ADR-05：composition layout gap、axis layer policy、label policy；本 ADR 修正其中 grid policy。
- ADR-06：provenance / locator 需要能区分 grid 的实际 target scope。
