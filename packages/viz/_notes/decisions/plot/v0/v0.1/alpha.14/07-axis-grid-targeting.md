# ADR-07: axis-level grid targeting

- 状态：Superseded
- 替代：[ADR-09](./09-composition-api-structure.md)；grid targeting 保留，selector 与默认投放字段迁入最终 view / arrangement / resolve 模型
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

`AxisGuide.grid` 扩展为 `boolean | AxisGridConfig`：

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

type AxisGridConfig = {
  applyTo?: AxisGridApplyToValue;
  select?: GuideTargetSelector;
};

type IRPlotAxisGuide = {
  grid?: boolean | AxisGridConfig;
};

type CompositionGuidePolicy = {
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

| 旧写法                         | 新写法                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| `guidePolicy.grid: 'none'`     | 删除 axis 上的 `grid`，或写 `grid: false`                       |
| `guidePolicy.grid: 'perScope'` | `guidePolicy.gridPlacement: 'self'`，axis 写 `grid: true`       |
| `guidePolicy.grid: 'shared'`   | `guidePolicy.gridPlacement: 'sharedRole'`，axis 写 `grid: true` |
| 只让某个 track / facet 有 grid | axis 写 `grid: { applyTo: 'selected', select: ... }`            |

## 长期边界

- 不做 axis label collision avoidance、grid label 自动避让或 renderer text metrics。
- 不设计 grid 样式系统；样式仍沿用现有 guide/scene style。
- 不做 legend、tooltip、brush、linked highlighting。
- 不把 arbitrary predicate / callback 放进 selector；IR 必须保持 JSON-safe。
- 不设计跨 plot / dashboard 级联动 grid。
