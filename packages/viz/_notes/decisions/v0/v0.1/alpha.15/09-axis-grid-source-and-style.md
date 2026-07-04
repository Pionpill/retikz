# ADR-09：Axis grid 来源与样式策略

- 状态：Accepted
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-02 已经把 `grid` 收进 axis 的部件槽位，明确 grid 是 axis 的附属辅助线，而不是独立 guide type。当前 `grid` 的能力集中在两个方向：一是 `applyTo/select` 负责 composition / facet / track 投放；二是 `GuideLineStyleSchema` 负责整组 grid line 的基础线条样式。这个模型能覆盖常规“按 axis tick 画横 / 竖网格线”的需求，也让 grid 与 tick mark 使用同一 visible tick set，避免默认状态下两者不同步。

但 grid 仍有几个长期缺口。第一，grid source 完全绑定 axis visible tick set。多数图表确实希望 grid 与 tick 对齐，但也有常见场景需要更密的 grid、只画少量参考 grid，或者 axis tick label 抽稀后仍保留更细的网格。第二，major / minor grid 没有分层。数学习题图、工程图、时间序列背景网格常需要主网格和次网格拥有不同密度与透明度。第三，分类 / band scale 的 grid 只有默认中心位置，缺少画在 band 边界或 band 内比例位置的能力。第四，grid line 目前没有 `lineCap`，与 axis line 的基础线帽能力不对齐。

同类库通常会给 grid 单独留下 tick source、minor grid 或 band offset 入口。Vega axis 有 `gridScale` 以及 `gridCap` / `gridDash` / `gridOpacity` / `gridWidth` 等 grid 样式项；Chart.js grid 有 `offset`、`drawOnChartArea` 和 grid line 样式；Highcharts 提供 `gridLineWidth` 与 `minorGridLineWidth`；Matplotlib 的 `Axes.grid` 可按 `which: major | minor | both` 控制；Observable Plot 把 grid 作为 mark，允许显式给 ticks / interval 并独立放置。

资料来源：[Vega axes](https://vega.github.io/vega/docs/axes/)、[Chart.js axis styling](https://www.chartjs.org/docs/latest/axes/styling.html)、[Highcharts xAxis.gridLineWidth](https://api.highcharts.com/highcharts/xAxis.gridLineWidth)、[Matplotlib Axes.grid](https://matplotlib.org/stable/api/_as_gen/matplotlib.axes.Axes.grid.html)、[Observable Plot grid mark](https://observablehq.com/plot/marks/grid)。

## 决策：grid 增加独立 source、density、minor、bandPosition 与 lineCap

`grid` 继续是 axis 的子属性，默认行为不变：`grid: true` 使用 axis visible tick set 画一组主 grid line，样式使用内置默认或 theme/local line style。新增能力只在用户显式配置 object 字段时生效。

```ts
type AxisGrid = boolean | AxisGridOptions;

type AxisGridOptions = AxisGridProjection & AxisGridLineStyle & {
  ticks?: GuideTickSource;
  density?: AxisTickDensity;
  bandPosition?: number;
  minor?: false | AxisMinorGridOptions;
};

type AxisMinorGridOptions = AxisGridLineStyle & {
  ticks: GuideTickSource;
  density?: AxisTickDensity;
  bandPosition?: number;
};

type AxisGridLineStyle = GuideLineStyle & {
  lineCap?: PathLineCap;
};
```

语义固定如下：

- `grid.ticks`：主 grid 的可选独立 tick source。省略时复用 axis visible tick set；提供时按 `GuideTickSourceSchema` 解析出 grid candidate ticks，再由 `grid.density` 抽稀。
- `grid.density`：主 grid 的可选抽稀策略，复用 `AxisTickDensitySchema`。省略时不额外抽稀；如果 `grid.ticks` 也省略，则主 grid 与 axis visible tick set 完全一致。
- `grid.minor`：次网格线配置。`false` 关闭；对象形态必须提供 `ticks`，避免实现私自猜测 minor tick 生成规则。minor grid 不影响 axis tick mark、tick label 或 major grid。
- `grid.bandPosition`：band / category 位置上的 grid 比例位置。`0` 表示 band 负方向边界，`0.5` 表示 band 中心，`1` 表示 band 正方向边界；默认 `0.5`，即保持当前行为。连续 / time / point scale 的 `bandwidth` 为 0 时该字段无效果。
- `lineCap`：主 grid 与 minor grid 都支持 `PathLineCapSchema`。它只控制 grid line 的端点线帽，不改变 axis line 或 tick line。

主 grid 和 minor grid 的关系：

1. 两者分别产生各自 grid line Path，允许拥有不同样式。
2. 主 grid 默认 `drawOpacity` 沿用当前内置 `0.15`；minor grid 默认应更轻，例如 `0.08`，具体数值在实现时落到 shared 常量或 theme default。
3. 当 minor tick 与 major tick 位置重合时，minor grid 应去重或跳过重合线，避免重复描边导致视觉加深。
4. `grid.applyTo/select` 仍只属于整个 grid 配置。minor grid 跟随同一个 projection target，不单独选择 facet / track。

理由：

1. `grid.ticks` 解决“axis tick 与背景网格不同密度”的需求，同时默认保持 grid 与 axis tick 同源。
2. `grid.minor` 用显式 `ticks` 避免隐式 minor tick 规则；未来 chart preset 可以基于 scale family 自动生成，但底层 PlotSpec 保持可解释。
3. `bandPosition` 比布尔 `offset` 更通用，能表达 band 起点、中心、终点以及 0.25 / 0.75 等比例位置。
4. `lineCap` 与 axis line 能力对齐，且只复用 core Path 已有字段，不新增 renderer 语义。
5. 不把层级放进本 ADR，避免局部 grid API 先于全局 layer / z-order 模型定型。

## 待决策点

无。grid 层级、z-order、独立 grid mark / reference band 和 data-driven grid style 后续单独讨论。

## DSL 表面

主 grid 使用固定间隔，不跟随 axis label 抽稀：

```tsx
<Axis
  dimension="x"
  ticks={{ density: { kind: 'sample', maxCount: 6 } }}
  grid={{
    ticks: { interval: { kind: 'number', step: 10, anchor: 0 } },
    stroke: '#cbd5e1',
    drawOpacity: 0.35,
  }}
/>
```

主 / 次网格线：

```tsx
<Axis
  dimension="y"
  grid={{
    ticks: { interval: { kind: 'number', step: 10 } },
    strokeWidth: 1,
    minor: {
      ticks: { interval: { kind: 'number', step: 2 } },
      strokeWidth: 0.5,
      drawOpacity: 0.08,
    },
  }}
/>
```

分类轴在 band 边界画 grid：

```tsx
<Axis
  dimension="x"
  grid={{
    bandPosition: 0,
    lineCap: 'butt',
  }}
/>
```

Vanilla builder 暴露同名 plain object；所有字段必须 JSON-safe，不接受函数、ReactNode、DOM 节点或 renderer 对象。

## 测试设计

`packages/viz/plot/tests/ir/guide.schema.test.ts` 覆盖 schema accept / reject。

`packages/viz/plot/tests/features/guide/guide.test.ts` 覆盖 cartesian grid source、bandPosition、lineCap 与 major / minor 输出。

`packages/viz/plot/tests/features/guide/polar-guide.test.ts` 覆盖 polar angular spoke / radial ring 的独立 grid ticks 与 minor grid。

`packages/viz/plot/tests/theme/theme.test.ts` 覆盖 theme axis grid 只接收样式 token，不接收 source / density / minor / bandPosition。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `AxisGridComponentSchema` 新增 `ticks`、`density`、`bandPosition`、`minor` 和 `lineCap`。
- `AxisGridSchema` 继续只描述 projection，不承载样式或 tick source；如实现发现该 schema 没有外部用途，可以保留但不扩大。
- `GuideLineStyleSchema` 不全局增加 `lineCap`；只为 axis grid 新建或内联扩展 `AxisGridLineStyleSchema`，避免 tick line、legend grid 等不相关槽位自动获得 lineCap。
- `resolveGuideTicks` / `resolveVisibleGuideTicks` 需要能被 grid 独立调用，且错误信息应能指出是 axis grid source 出错。
- guide lowering 需要为主 grid 和 minor grid 分别生成 Path，并按 coordinate type 复用 cartesian line、polar spoke/ring、ternary iso-line 的几何生成逻辑。
- `custom axis` 暂时仍不生成 grid；若实现要补 custom grid，必须扩展本 ADR 或另开 ADR，因为 custom coordinate 需要 frame normal / projection surface 规则。
- theme axis grid 仍只提供视觉默认：`stroke`、`strokeWidth`、`drawOpacity`、`dashPattern`、`dashOffset`、`lineCap`。theme 不接收 `ticks`、`density`、`minor`、`bandPosition`、`applyTo/select`。
- React / Vanilla authoring 只透传同名 PlotSpec 字段，不新增 adapter-only API。
- docs 需要更新 axis guide API 表、grid 示例和 theme 说明。
- 不触碰 core IR；plot 只消费 core Path 的 line style、dash offset 与 lineCap。

## 实现记录

2026-07-04 已落地首轮实现：

- `AxisGridLineStyleSchema`、`AxisGridComponentSchema` 与 `PlotAxisThemeSchema.grid` 已按本 ADR 扩展；theme 仍只接收视觉 token，不接收 source / projection 字段。
- `lowerGuide` 已支持 cartesian、polar angular、polar radial、ternary 的 `grid.ticks`、`grid.density`、`grid.minor`、`grid.bandPosition` 与 `lineCap`；custom axis 仍按本 ADR 维持不生成 grid。
- major / minor grid 分别生成 path；minor 与 major 投影重合的位置会跳过，minor 默认 `drawOpacity` 为 `0.08`。
- 文档轴页面已新增网格来源 demo，并更新 `grid` API 表。

后续如果要把 grid layer / z-order、data-driven per-line style 或 custom coordinate grid surface 纳入能力，需要另开 ADR。

## 不在本 ADR 范围

- grid layer / z-index / draw order。该能力等待全局 layer 模型统一讨论。
- data-driven / per-line style encoding，例如按 index 或 value 给不同 grid line 着色。
- reference line / reference band / alternate plot bands；这些应是独立 mark 或 reference guide，不塞进 axis grid。
- custom coordinate grid surface。
- 自动 minor tick 生成规则。底层 PlotSpec 只接收显式 `grid.minor.ticks`；chart preset 可以后续生成该配置。
- grid label、grid interaction、hover highlight。
- 修改 core Path / renderer 契约。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 plot guide schema、theme schema 边界、grid tick resolution 和 guide lowering；不修改 core IR，不修改 package 顶层公共入口。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisGridLineStyleSchema` | `GuideLineStyleSchema.extend({ lineCap?: PathLineCapSchema })` | — | axis grid 线条样式，包含 core path lineCap |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `AxisMinorGridSchema` | `{ ticks: GuideTickSourceSchema; density?: AxisTickDensitySchema; bandPosition?: number; ...AxisGridLineStyle }` | `false` | 次网格线的 tick source、抽稀和样式 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisGridComponentSchema.ticks` | `GuideTickSourceSchema.optional()` | 复用 axis visible tick set | 主 grid 独立 tick source |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisGridComponentSchema.density` | `AxisTickDensitySchema.optional()` | all | 主 grid tick 抽稀策略 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisGridComponentSchema.bandPosition` | `z.number().finite().min(0).max(1).optional()` | `0.5` | band scale 上的 grid 位置比例 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisGridComponentSchema.minor` | `z.union([z.literal(false), AxisMinorGridSchema]).optional()` | `false` | 次网格线配置 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 改 | `AxisGridComponentSchema.lineCap` | `PathLineCapSchema.optional()` | core path 默认 | 主 grid line cap |
| `packages/viz/plot/src/schemas/theme/schema.ts` | 改 | `PlotAxisThemeSchema.grid.lineCap` | `PathLineCapSchema.optional()` | core path 默认 | theme 级 grid line cap |

refinement：

- `grid.bandPosition` 与 `grid.minor.bandPosition` 必须在 `[0, 1]`。
- `grid.minor` 对象必须提供 `ticks`；不支持 `minor: true`。
- `grid.ticks` 与 `grid.density` 合法组合；`density` 可作用于 axis visible tick set 或 grid 独立 tick source。
- `theme.axis.grid` 不接收 `ticks`、`density`、`minor`、`bandPosition`、`applyTo`、`select`。
- `grid.applyTo/select` 规则保持不变：`applyTo:'selected'` 必须有 `select`，非 selected 不允许 `select`。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/schemas/theme/schema.ts`
- `packages/viz/plot/src/providers/theme/theme.ts`
- `packages/viz/plot/src/providers/scale/shared/**`
- `packages/viz/plot/src/pipeline/guide/guide.ts`
- `packages/viz/plot/src/pipeline/expand.ts`
- `packages/viz/plot/tests/ir/guide.schema.test.ts`
- `packages/viz/plot/tests/features/guide/**`
- `packages/viz/plot/tests/theme/**`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/grammar/guide/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要先扩展本 ADR 的文件 scope 或新开 ADR。

### 测试象限

**Happy path**：

- `grid_ticks_interval_lowers_independent_lines`：axis tick label 抽稀但 `grid.ticks.interval` 更密，grid line 数量按 grid source。
- `grid_density_samples_grid_source`：`grid.ticks.values` 很多 + `grid.density.sample`，主 grid line 数量受 `maxCount` / `minGap` 控制。
- `minor_grid_lowers_second_path_with_minor_style`：major 与 minor 产生两个 Path，minor 使用自己的 opacity / dash / strokeWidth。
- `grid_line_cap_lowers_to_path`：`grid.lineCap` 出现在 grid Path 上。
- `band_position_moves_category_grid_to_boundary`：band scale 下 `bandPosition:0` / `0.5` / `1` 改变 grid 坐标。

**边界**：

- `grid_true_preserves_axis_visible_ticks`：`grid:true` 行为与当前一致，使用 axis visible tick set。
- `grid_density_without_grid_ticks_samples_axis_visible_ticks`：只写 `grid.density` 时，对 axis visible tick set 再抽稀。
- `band_position_noops_for_continuous_scale`：连续 scale 的 `bandPosition` 不改变坐标。
- `minor_grid_skips_major_overlaps`：minor tick 与 major tick 重合时不重复画同位置线。

**错误路径**：

- `minor_grid_requires_ticks`：`grid.minor:{}` schema 拒绝。
- `minor_true_rejected`：`grid.minor:true` schema 拒绝。
- `invalid_band_position_rejected`：`bandPosition < 0` 或 `> 1` schema 拒绝。
- `theme_grid_rejects_source_fields`：theme axis grid 的 `ticks` / `density` / `minor` / `bandPosition` / `applyTo` / `select` schema 拒绝。
- `grid_tick_source_mismatch_fails_loud`：time interval 用在 numeric scale 或 category interval 用在 continuous scale 时抛清晰错误。

**交互**：

- `grid_endpoint_policy_does_not_hide_grid_by_default`：axis arrow endpoint 隐藏 tick mark 时，grid source 默认仍按 visible tick set / grid source 规则，不受 tick mark endpoint hiding 误伤。
- `polar_major_and_minor_grid_keep_spoke_or_ring_shape`：polar angular 仍画 spoke，polar radial 仍画 ring，major/minor 只影响数量和样式。
- `ternary_major_and_minor_grid_keep_iso_line_shape`：ternary 仍按等值线生成 major/minor grid。
- `composition_apply_to_projects_major_and_minor_together`：`applyTo/select` 选中的 facet / track 同时收到 major 和 minor grid。

### 依赖的现有元素

- `AxisGridComponentSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——扩展 grid source、minor、bandPosition 与 lineCap。
- `GuideTickSourceSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——作为主 grid 与 minor grid 的独立 tick source。
- `AxisTickDensitySchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——复用 tick visible sampling 语义，避免另造 grid density。
- `PathLineCapSchema`（`@retikz/core`）——作为 grid lineCap 的字段来源。
- `resolveGuideTicks` / `resolveVisibleGuideTicks`（`packages/viz/plot/src/providers/scale/shared`）——为 grid 独立 tick source 与 density 提供解析。
- `PositionScale.bandwidth`（`packages/viz/plot/src/contract`）——实现 `bandPosition` 时用于从 band center 推导边界 / 比例位置。
- `lowerGuide` 的 cartesian / polar / ternary grid lowering（`packages/viz/plot/src/pipeline/guide/guide.ts`）——为 major/minor grid 生成 core Path。
- `resolveAxisGuideTokens`（`packages/viz/plot/src/providers/theme/theme.ts`）——合并 grid 视觉默认，但不得合并 source / projection 字段。
