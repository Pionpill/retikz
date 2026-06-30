# ADR-05：composition guides, axes, grid, spacing

- 状态：Proposed
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md) · [ADR-03 same-panel multi-axis overlay](./03-same-panel-multi-axis.md) · [ADR-04 shared scaffold tracks](./04-shared-scaffold-tracks.md)

## 背景

ADR-02～04 分别引入 facet panel、same-panel overlay 和 shared scaffold tracks。三者都会产生多个 coordinate scope，但 guide 和布局语义不同：facet 需要 panel gap、外侧统一轴或 per-panel 轴、panel label；overlay 需要同侧多轴 offset、grid 归属；track 需要 track gap、共享轴与局部轴取舍。

如果这些策略散落在 facet / overlay / track 各自 ADR 里，会出现三套 axis / grid / spacing 字段。ADR-05 统一收敛 composition 层的 guide policy 和 spacing policy，保证多 scope 图形在无文字测量前提下仍有稳定布局。

本 ADR 不试图做完整排版系统，不做自动 label 避让，也不做 dashboard layout。它只定义 plot 内坐标复合所需的最小可解释布局参数。

## 决策：composition.layout 与 composition.guidePolicy 统一管理 spacing 和 guide 策略

`PlotSpec.composition` 新增 `layout` 与 `guidePolicy`。`layout` 管 panel / track / axis 的固定间距；`guidePolicy` 管 axes / grid / labels 在多 scope 下的默认行为。单个 `AxisGuide` 仍可通过 `coordinateScope`、`placement`、`grid` 覆盖具体轴。

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

type CompositionLayoutSpec = {
  panelGap?: number;
  trackGap?: number;
  axisGap?: number;
  labelGap?: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
};

type CompositionGuidePolicySpec = {
  axes?: CompositionAxisPolicyValue;
  grid?: CompositionGridPolicyValue;
  facetLabels?: CompositionFacetLabelPolicyValue;
  trackLabels?: CompositionTrackLabelPolicyValue;
};

type CoordinateCompositionSpec = {
  layout?: CompositionLayoutSpec;
  guidePolicy?: CompositionGuidePolicySpec;
};

type AxisGuideSpec = {
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

## 待决策点 🔻

- **`outerShared` 的最小语义**：本草案仅在 facet / track 中对同 scale identity 的共享 role 使用外侧轴；不同 scale 即使同 role 也不合并。
- **默认 guidePolicy**：本草案倾向 `{ axes: 'perScope', grid: 'perScope' }`，更显式、更少惊喜。docs demo 可展示如何切到 outerShared。
- **label 文本来源**：本草案不新增 facet/track title schema，只定义 policy。facet label 默认来自 facet value，track label 默认来自 track id；后续可扩展 format/title。
- **axis title 是否纳入本 ADR**：本草案纳入 `AxisGuide.title`，因为多轴 review 时没有 title 很难解释左右轴含义。

## DSL 表面

facet 外侧共享轴：

```ts
const spec = {
  type: 'plot',
  data,
  scales,
  composition: {
    defaultScope: 'root',
    scopes: [{ id: 'root', coordinate: { type: 'cartesian2D' } }],
    facets: [{ id: 'region', column: { field: 'region' }, scales: { roles: { y: 'shared' } } }],
    layout: { panelGap: 18, axisGap: 8, labelGap: 6 },
    guidePolicy: { axes: 'outerShared', grid: 'shared', facetLabels: 'rowColumn' },
  },
  guides: [
    { type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'bottom' }, title: 'Month' },
    { type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'left' }, title: 'Revenue' },
  ],
};
```

overlay 双轴标题：

```ts
const spec = {
  type: 'plot',
  data,
  scales,
  composition: {
    defaultScope: 'temp',
    scopes: [
      { id: 'temp', coordinate: { type: 'cartesian2D', y: 'temp' } },
      { id: 'rain', coordinate: { type: 'cartesian2D', y: 'rain' }, placement: { kind: 'overlay', target: 'temp' } },
    ],
    layout: { axisGap: 10 },
  },
  guides: [
    { type: 'axis', dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' }, title: 'Temperature' },
    { type: 'axis', dimension: 'y', coordinateScope: 'rain', placement: { kind: 'side', side: 'right' }, title: 'Rainfall' },
  ],
};
```

## 测试设计

`packages/graph/plot/tests/composition/composition-guides-layout.test.ts` 覆盖：

- facet panel gap 改变 panel bbox，且不影响数据投影顺序。
- trackGap 改变 track band 间距。
- axisGap 让同侧多轴 offset 稳定递增。
- guidePolicy outerShared 在 shared scale facet 中只输出外侧 axis。
- independent scale facet 下 outerShared 不合并 axis。
- grid none / perScope / shared 三种策略输出不同 grid layer。
- AxisGuide.title 输出稳定 label node / meta。
- 无文字测量下长 title 不改变 layout 计算路径，只进入 label 文本。
- JSON round-trip 保留 layout / guidePolicy。

## 影响

- `PlotSpec.composition` 新增 layout / guidePolicy。
- `AxisGuideSchema` 新增 title。
- layout 计算需要把 facet panel、overlay axis、track band 的 gap 统一纳入。
- guide lowering 需要区分 guide policy 与单 guide 显式字段。
- docs 需要一页解释 perScope / outerShared / shared grid 的区别。

## 不在本 ADR 范围

- 不做自动文字测量和 label collision avoidance。
- 不做自由 dashboard layout、inset、legend packer。
- 不做复杂 axis title rotation / multi-line wrapping。
- 不做 renderer-specific text metrics。

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。

原因：扩展 PlotSpec / AxisGuide schema，并影响 lowering 布局和 guide 输出。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.layout` | `CompositionLayoutSchema.optional()` | 内置默认 | composition 级 spacing 配置 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `layout.panelGap` | `z.number().nonnegative().optional()` | 内置默认 | facet panel 间距 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `layout.trackGap` | `z.number().nonnegative().optional()` | 内置默认 | scaffold track 间距 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `layout.axisGap` | `z.number().nonnegative().optional()` | 内置默认 | 同侧 axis 间距 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `layout.labelGap` | `z.number().nonnegative().optional()` | 内置默认 | panel / track / axis label 间距 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `layout.padding` | `BoxPaddingSchema.optional()` | 无 | composition 外侧 padding |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `CompositionAxisPolicy` | `as const` value object + `z.enum(CompositionAxisPolicy)` | 无 | axes policy 枚举：perScope / outerShared |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `CompositionGridPolicy` | `as const` value object + `z.enum(CompositionGridPolicy)` | 无 | grid policy 枚举：none / perScope / shared |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `CompositionFacetLabelPolicy` | `as const` value object + `z.enum(CompositionFacetLabelPolicy)` | 无 | facet label policy 枚举 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `CompositionTrackLabelPolicy` | `as const` value object + `z.enum(CompositionTrackLabelPolicy)` | 无 | track label policy 枚举 |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 加 | `composition.guidePolicy` | `CompositionGuidePolicySchema.optional()` | `{ axes: 'perScope', grid: 'perScope' }` | 多 scope guide 默认策略 |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 加 | `axis.title` | `z.string().optional()` | 无 | axis title 文本 |

### 文件 scope

- `packages/graph/plot/src/schemas/plot/schema.ts`
- `packages/graph/plot/src/schemas/guide/schema.ts`
- `packages/graph/plot/src/pipeline/layout.ts`
- `packages/graph/plot/src/pipeline/expand.ts`
- `packages/graph/plot/src/features/guide/**`
- `packages/graph/plot/tests/composition/composition-guides-layout.test.ts`
- `packages/graph/plot/tests/lower/guide.test.ts`
- `apps/docs/src/contents/graph/**`（文档阶段）

### 测试象限

**Happy path**：

- `facet outer shared axes`：shared scale facet 只输出外侧轴。
- `overlay side axis gap`：左右轴按 `placement.kind = 'side'` / gap 放置。
- `track gap layout`：trackGap 改变 band 间距。

**边界**：

- `zero gaps`：gap=0 合法且布局稳定。
- `long axis title`：长 title 不触发布局测量。
- `policy omitted`：默认 perScope 行为与旧 guide 输出兼容。

**错误路径**：

- `negative gap rejected`：负 gap schema 拒绝。
- `outerShared incompatible scale`：不同 scale identity 不合并轴。
- `axis placement conflict`：同 placement key offset 冲突 fail-loud 或稳定自动 offset。

**交互**：

- `facet overlay guides`：facet panel 内 overlay 双轴按 guidePolicy 输出。
- `scaffold shared grid`：scaffold tracks 共享 grid 策略正确。
- `json round trip layout`：layout / guidePolicy JSON round-trip 等价。

### 依赖的现有元素

- ADR-02 facet panel bbox。
- ADR-03 axis placement / overlay scope。
- ADR-04 scaffold track band。
- `lowerGuide` / guide feature：扩展 title 和 placement gap。
- `pipeline/layout.ts`：统一 spacing 常量。
