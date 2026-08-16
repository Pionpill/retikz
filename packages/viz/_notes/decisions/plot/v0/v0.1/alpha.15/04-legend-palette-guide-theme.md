# ADR-04：Legend、palette 与 guide family theme

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.9 Guide](../../../../../architecture/plot-design.md#39-guide)

## 背景

Legend 是 guide family 的另一半。alpha.8 已经让 legend 能表达离散 swatch、连续 ramp、分箱、size / opacity / shape 等通道，但 legend 几何和默认配色仍散落在 lowering 常量与 scale 默认里。alpha.15 的 Theme 不能只覆盖 axis；否则图的解释性结构仍然分裂。

当前 IRPlot 有根级 `colors`，ordinal color scale 会把它作为默认 palette；连续色带使用 scheme 字段或内置默认。随着 `IRPlot.theme.palette` 引入，需要明确 `colors`、theme palette、显式 scale `range` / `scheme` 的优先级，避免同一张图因为入口不同得到不同颜色。

Legend 外观同样需要分槽位 token：swatch size、entry gap、title gap、ramp length / thickness、title / label typography。它们应该通过 theme 提供默认，也允许单个 LegendGuide 本地覆盖。Legend title / label 的文本样式复用 ADR-02 的 `GuideTextStyleSchema`，title 内容复用 core `TextBlockSchema`。自定义 legend item template、HTML legend、交互筛选不属于静态 GoG v0.1 收口范围。

## 决策：palette 进入 theme，显式 scale 优先，LegendGuide 增加本地 style override

`PlotTheme.palette` 固定为 plot 默认配色入口，覆盖 categorical / series / sector / sequential / diverging 等用途。显式 scale `range` / `scheme` 优先级最高；theme palette 次之；现有 `IRPlot.colors` 作为兼容 shorthand，只在 categorical / series 对应槽位省略时参与默认；内置 palette 兜底。

```text
ordinal categorical = explicit range ?? theme.palette.categorical ?? IRPlot.colors ?? built-in categorical
series color        = theme.palette.series ?? theme.palette.categorical ?? IRPlot.colors ?? built-in categorical
sector color        = theme.palette.sector ?? theme.palette.categorical ?? IRPlot.colors ?? built-in categorical
sequential scheme   = explicit range/scheme ?? theme.palette.sequential ?? built-in sequential
quantize scheme     = explicit range/scheme ?? theme.palette.sequential ?? built-in sequential
threshold scheme    = explicit range/scheme ?? theme.palette.sequential ?? built-in sequential
quantile scheme     = explicit range/scheme ?? theme.palette.sequential ?? built-in sequential
diverging scheme    = explicit range/scheme ?? theme.palette.diverging ?? built-in diverging
```

LegendGuide 新增 `style?: LegendGuideStyle`，字段覆盖 `theme.legend`。Legend style 控制 layout token 和文字 / swatch 外观，不改变 legend 绑定的 channel、scale、position、orient、tick source。

Palette 必须先按同一条 fallback 链解析；color scale provider、无 color encoding 的 series 默认色、sector 默认色和 legend swatch / ramp 都消费同一份解析结果。

Legend ramp 的 tick 语义复用 ADR-01 / ADR-02 的 guide tick vocabulary。LegendGuide root 使用 `ticks?: GuideTickSource` 表达 ramp tick source，使用 `tickLabels?: false | GuideTickLabelFormat` 表达 ramp tick label 开关与格式；离散 legend 忽略 tick source，但仍可用 `tickLabels: false` 隐藏条目标签。`style.label` 只控制文字样式，不控制格式。

```ts
const spec = {
  theme: {
    palette: {
      categorical: ['#2563eb', '#dc2626', '#16a34a'],
      sequential: 'viridis',
      diverging: 'rdbu',
      sector: ['#0ea5e9', '#f97316', '#84cc16'],
    },
    legend: {
      swatchSize: 12,
      entryGap: 8,
      label: { font: { size: 11 }, textColor: '#4b5563' },
      title: { font: { size: 12 }, textColor: '#111827' },
    },
  },
  guides: [
    {
      type: 'legend',
      channel: 'color',
      style: { rampLength: 120 },
    },
  ],
};
```

理由：

1. Palette 是 theme 的核心部分，不能继续只靠根级 `colors` 表达。
2. 显式 scale range / scheme 必须保持最高优先级，因为它是用户对具体编码的直接声明。
3. `colors` 保留为 shorthand 可降低迁移成本，但新文档应引导用户使用 `theme.palette`。
4. Legend 本地 style 与 Axis 本地 style 对称，guide family 的覆盖模型一致。

## 不在本 ADR 范围

- HTML legend、自定义 legend item render/template。
- Legend hover 高亮、click filter、selection state。
- Legend frame / background / border。
- CSS variable palette、runtime dark mode palette switch。
- 新增 color scheme registry；现有 `options.colorSchemes` 继续用于 scale `scheme` 名解析。

---
