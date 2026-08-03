# ADR-02：Axis guide 部件槽位与样式 token

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../../architecture/plot-design.md#39-guide)

## 背景

当前 axis / grid lowering 中存在多处硬编码常量，例如 `AXIS_TICK_LENGTH`、`AXIS_LABEL_GAP`、grid `drawOpacity: 0.15`，以及 legend swatch / ramp 尺寸。硬编码在早期闭环阶段可以接受，但 alpha.15 要把 Guide + Theme 收口为长期契约，否则用户只能通过改源码或等待 theme 才能调整 axis 可读性。

Axis 不是一条线。完整 axis 至少包含 axis line、tick line、tick label、axis title 和可选 grid line。它们既有视觉样式，也有会影响布局的几何 token，例如 tick length、label gap、title gap。把这些字段全部塞进 `style` 会让“style 只管外观，不改变 guide 结构或几何”的边界变模糊。

Guide 的几何还要跨 cartesian、polar、ternary、自定义坐标系成立。因此 token 名称必须围绕“轴线 / 刻度 / 标签 / 标题 / 网格”定义，不能绑定到 screen x/y，也不能只为笛卡尔坐标写特例。

## 决策：AxisGuide 使用部件槽位，而不是统一 `style` 袋子

AxisGuide 增加顶层部件槽位：`line`、`ticks`、`tickLabels`、`title`、`grid`。每个槽位既承载该部件的语义开关，也承载该部件自身的视觉和局部几何 token。

```ts
const yAxis = {
  type: 'axis',
  dimension: 'y',
  title: { text: 'Revenue', gap: 14, font: { size: 12 }, textColor: '#202124' },
  line: { stroke: '#202124', strokeWidth: 1 },
  ticks: {
    count: 6,
    length: 5,
    line: { stroke: '#202124' },
  },
  tickLabels: {
    format: '.2f',
    gap: 6,
    font: { size: 11 },
    textColor: '#3c4043',
  },
  grid: {
    applyTo: 'plotArea',
    stroke: '#dadce0',
    strokeWidth: 1,
    drawOpacity: 0.7,
  },
};
```

字段 shorthand 固定如下：

- `title: string` 等价于 `{ text: string }`。
- `tickLabels: false` 表示不渲染 tick label；对象形态表示渲染并覆盖默认。
- `line: false` 表示不渲染 axis line；对象形态表示渲染并覆盖默认。
- `grid: true` 表示开启默认 grid；`grid: false` 或省略表示不渲染 grid；对象形态表示开启 grid 并覆盖默认。
- `ticks` 不使用 boolean shorthand，因为 tick source 还要供 tick label 与 grid 复用；隐藏 tick line 时写 `ticks: { line: false }`。

`placement`、`offset`、`dimension`、`coordinateView` 仍是 AxisGuide 的结构语义字段，不进入任何部件槽位。`ticks.count` / `ticks.values` 是 tick source 语义；`ticks.length`、`tickLabels.gap`、`title.gap`、`grid.stroke` 等是部件 token。Theme 复用同一套部件名作为默认值入口，但只提供视觉和局部几何 token 默认，不提供 `ticks.count`、`ticks.values`、`tickLabels.format`、`title.text`、`grid.applyTo`、`grid.select` 这类内容或语义字段默认。

Guide 文本统一使用 core 文本 vocabulary：内容使用 `TextBlockSchema`，字体使用 `FontSchema`，文本样式使用 `textColor` / `opacity` / `align` / `lineHeight` / `maxTextWidth`。Plot 不直接暴露完整 `NodeSchema`，因为 guide layout 必须控制 position、shape、padding、minimum size、label 等 Node 字段；但 title / tick label / legend label 的文本内容和文本样式必须与 core Node 文本保持同名同义。

Guide 线条样式同样复用 core path vocabulary：`GuideLineStyleSchema` 只包含 `stroke`、`strokeWidth`、`drawOpacity`、`dashPattern`、`dashOffset`。IRPlotSpec schema 不新增 `dash` 这类平行 shorthand；如果 React / Vanilla 以后需要更短 authoring，可以在 adapter 入参层转换成 IRPlotSpec 的 `dashPattern` / `dashOffset`。

Guide tick 语义跨 axis 与 legend ramp 共用：`GuideTickSourceSchema` 拥有 `count` / `values`，`GuideTickLabelFormatSchema` 拥有 `format`，两者共同生成统一的 tick values 与 labels。Axis 的 `tickLabels` 只在此基础上追加 layout 和 text style。

理由：

1. Axis 的部件本来就是 guide 结构的一部分，不只是 style；顶层槽位比 `style.xxx` 更贴近真实模型。
2. `title: string | { text, ... }` 只用于有文本内容的部件，shorthand 克制且 LLM 友好。
3. `ticks`、`tickLabels`、`grid` 分开后，tick source、tick line、tick label、grid line 的职责更清楚。
4. Theme 可以直接提供 `theme.axis.line/ticks/tickLabels/title/grid` 的视觉和几何默认，不需要维护一套不同的 style 词汇。

## 不在本 ADR 范围

- `IRPlotSpec.theme` 的入口与 merge priority；由 ADR-03 处理。
- legend / palette token；由 ADR-04 处理。
- 自动文字测量、tick label 防重叠、自动旋转、自动抽稀。
- 新增 reference line / reference band guide。
- Interaction state style，例如 hover / selected axis。

---
