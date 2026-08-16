# ADR-09：Axis grid 来源与样式策略

- 状态：Accepted
- 决策日期：2026-07-04
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../../architecture/plot-design.md#39-guide)

## 背景

ADR-02 已经把 `grid` 收进 axis 的部件槽位，明确 grid 是 axis 的附属辅助线，而不是独立 guide type。当前 `grid` 的能力集中在两个方向：一是 `applyTo/select` 负责 composition / facet / track 投放；二是 `GuideLineStyleSchema` 负责整组 grid line 的基础线条样式。这个模型能覆盖常规“按 axis tick 画横 / 竖网格线”的需求，也让 grid 与 tick mark 使用同一 visible tick set，避免默认状态下两者不同步。

但 grid 仍有几个长期缺口。第一，grid source 完全绑定 axis visible tick set。多数图表确实希望 grid 与 tick 对齐，但也有常见场景需要更密的 grid、只画少量参考 grid，或者 axis tick label 抽稀后仍保留更细的网格。第二，major / minor grid 没有分层。数学习题图、工程图、时间序列背景网格常需要主网格和次网格拥有不同密度与透明度。第三，分类 / band scale 的 grid 只有默认中心位置，缺少画在 band 边界或 band 内比例位置的能力。第四，grid line 目前没有 `lineCap`，与 axis line 的基础线帽能力不对齐。

同类库通常会给 grid 单独留下 tick source、minor grid 或 band offset 入口。Vega axis 有 `gridScale` 以及 `gridCap` / `gridDash` / `gridOpacity` / `gridWidth` 等 grid 样式项；Chart.js grid 有 `offset`、`drawOnChartArea` 和 grid line 样式；Highcharts 提供 `gridLineWidth` 与 `minorGridLineWidth`；Matplotlib 的 `Axes.grid` 可按 `which: major | minor | both` 控制；Observable Plot 把 grid 作为 mark，允许显式给 ticks / interval 并独立放置。

资料来源：[Vega axes](https://vega.github.io/vega/docs/axes/)、[Chart.js axis styling](https://www.chartjs.org/docs/latest/axes/styling.html)、[Highcharts xAxis.gridLineWidth](https://api.highcharts.com/highcharts/xAxis.gridLineWidth)、[Matplotlib Axes.grid](https://matplotlib.org/stable/api/_as_gen/matplotlib.axes.Axes.grid.html)、[Observable Plot grid mark](https://observablehq.com/plot/marks/grid)。

## 决策：grid 增加独立 source、density、minor、bandPosition 与 lineCap

`grid` 继续是 axis 的子属性，默认行为不变：`grid: true` 使用 axis visible tick set 画一组主 grid line，样式使用内置默认或 theme/local line style。新增能力只在用户显式配置 object 字段时生效。

```ts
type AxisGrid = boolean | AxisGridOptions;

type AxisGridOptions = AxisGridProjection &
  AxisGridLineStyle & {
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
2. 主 grid 默认 `drawOpacity` 为 `0.15`，minor grid 默认更轻，为 `0.08`。
3. 当 minor tick 与 major tick 位置重合时，minor grid 应去重或跳过重合线，避免重复描边导致视觉加深。
4. `grid.applyTo/select` 仍只属于整个 grid 配置。minor grid 跟随同一个 projection target，不单独选择 facet / track。

理由：

1. `grid.ticks` 解决“axis tick 与背景网格不同密度”的需求，同时默认保持 grid 与 axis tick 同源。
2. `grid.minor` 用显式 `ticks` 避免隐式 minor tick 规则；未来 chart preset 可以基于 scale family 自动生成，但底层 IRPlot 保持可解释。
3. `bandPosition` 比布尔 `offset` 更通用，能表达 band 起点、中心、终点以及 0.25 / 0.75 等比例位置。
4. `lineCap` 与 axis line 能力对齐，且只复用 core Path 已有字段，不新增 renderer 语义。
5. 本 ADR 不定义局部 grid 层级字段；全局 layer / z-order 模型已由 ADR-12 定型。

## 最终形态

- `AxisGridLineStyleSchema`、`AxisGridComponentSchema` 与 `PlotAxisThemeSchema.grid` 覆盖 grid 的 source、density、minor、band position 与线条样式；theme 仍只接收视觉 token。
- cartesian 与 polar axis 支持 `grid.ticks`、`grid.density`、`grid.minor`、`grid.bandPosition` 与 `lineCap`；custom axis 不自动生成 grid。
- major / minor grid 分别生成 path，投影重合的 minor line 会跳过，避免重复描边。

全局 grid layer / z-order 由 ADR-12 负责。axis grid 独立 layer 覆盖、data-driven per-line style 与 custom coordinate grid surface 不在本 ADR 范围。

## 不在本 ADR 范围

- axis.grid.layer 覆盖。默认 grid 层级已由 ADR-12 固定；若要单独调整某条轴的 grid zIndex，需扩展 grid 自身的 layer 字段。
- data-driven / per-line style encoding，例如按 index 或 value 给不同 grid line 着色。
- reference line / reference band / alternate plot bands；这些应是独立 mark 或 reference guide，不塞进 axis grid。
- custom coordinate grid surface。
- 自动 minor tick 生成规则。底层 IRPlot 只接收显式 `grid.minor.ticks`；chart preset 可以后续生成该配置。
- grid label、grid interaction、hover highlight。
- 修改 core Path / renderer 契约。

---
