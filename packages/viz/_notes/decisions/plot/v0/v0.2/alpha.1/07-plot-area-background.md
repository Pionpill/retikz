# ADR-07：Plot background 限定为绘图区背景

- 状态：Proposed
- 决策日期：2026-08-10
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01：Plot 主题 token 所有权与 Chart 消费边界](./01-chart-layering.md) · [ADR-03：Plot 绘图边界与 Chart presentation 归属](./03-plot-presentation-boundary.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)
- Supersedes in part：ADR-01 中顶层 `IRPlotTheme.background` 与 `plot.surface.fill` 的公开名称；Plot theme owner、paint value contract 与 Chart 消费边界继续有效

## 背景与目标

Plot theme 已拥有绘图表面背景，但现有顶层 `background` 会覆盖整个 Plot 外框，把坐标轴标签区、图例预留区和 facet 间隙一并着色。该行为把 Plot 内部绘图区表面与上层 Chart canvas 混为同一层，无法表达常见的“只突出数据绘制区域”视觉语义。

本 ADR 把既有 `background` 收敛为 Plot area 背景：它只覆盖 coordinate、grid 与 mark 所在的有效绘图区，不承担 Chart canvas、presentation 或宿主容器背景。

## 决策：plotArea.fill 只填充每个有效 Plot area

`IRPlotTheme` 把顶层 `background` 收敛为 `plotArea.fill`，让 structured theme 与 `plot.area.fill` token 使用相同的职能层级。普通 Plot 使用其有效 Plot area；facet 为每个 panel 分别使用该 panel 的有效 Plot area。坐标轴标签区、图例预留区、facet header、panel gap 与 Plot 外围保持透明。

理由：

1. Plot 已在 lowering 中解析扣除 axis、legend 与布局预留后的有效 Plot area，无需新增几何或 renderer 能力
2. Chart 拥有完整图表 canvas 与 presentation，Plot background 扩张到外围会破坏两者的职责边界
3. 每个 facet panel 独立着色可以保持 panel identity、间隙和外部标签层级，不需要上层手动画背景节点

## 基础数据结构与公开契约

结构化 theme 继续使用既有字段：

```ts
type IRPlotTheme = Readonly<{
  plotArea?: Readonly<{
    fill?: IRPaintValue;
  }>;
}>;
```

对应 flat token 破坏性重命名为更准确的 Plot area 词汇：

```ts
const PlotThemeToken = {
  PlotAreaFill: 'plot.area.fill',
} as const;
```

`plotArea.fill` 与 `plot.area.fill` 是同一正式 Plot theme 叶子的结构化和 flat 表达，不增加第二套背景输入。`plotArea` 只承载绘图区视觉属性，不接纳 layout、padding 或 clip 等结构语义。

## 行为、失败语义与兼容性

- 默认行为：缺省或 `none` 时不生成可见背景，Plot area 保持透明
- 普通 Plot：背景只覆盖扣除 axis、legend 与 layout reserve 后的有效 Plot area
- facet：每个 panel 独立生成背景；panel gap、facet header 与 panel 外轴标签保持透明
- 层级：背景位于 grid、mark、axis 与 legend 之前，不遮挡绘图内容
- 失败与诊断：非法 paint 继续由现有 schema 拒绝；未知 token 继续 fail-loud
- 兼容性：顶层 `background`、`PlotSurfaceFill` 与 `plot.surface.fill` 直接删除，不保留 alias、双读或 fallback
- React / Vanilla 等价性：adapter 继续传递同一 JSON-safe IRPlot 与 token map，不新增 adapter 私有入口

## 功能与包边界

- 所属能力域与解决的问题：Visualization Complete 的 Theme 与 Plot lowering，解决 Plot area 表面如何稳定映射到 Core IR
- 主责包与协作包：`@retikz/plot` 拥有字段语义、token、preset、resolver 与 lowering；Core 执行生成的 renderer-neutral IR；Chart 拥有外围 canvas 与 presentation
- 拥有：普通 Plot 和 facet panel 的有效绘图区背景、透明默认值、theme cascade 与 source inspection
- 不拥有：Chart canvas、页面或容器 CSS 背景、renderer 私有清屏色、presentation surface
- 外部扩展与下游闭环：自定义 Plot style、local token 与结构化 `plotTheme` 继续经过同一 resolver、mapping 和 lowering 主链，SVG 与 Canvas 只执行最终 Core IR
- 不支持边界：本轮不增加 background border、pattern preset、圆形 polar surface 或多层 surface token

## 长期边界

- Chart canvas、title、subtitle、caption、source 或其它 presentation surface
- renderer 清屏色、宿主 CSS 背景与导出页面背景
- gradient、pattern、image 等新 paint 能力
- axis、legend、palette 或 typography 的其它主题行为
