# ADR-14：Plot Source 默认片段与 Axis 规则

- 状态：Proposed
- 决策日期：2026-09-05
- 主责：Plot，目标版本 0.2.0-alpha.1
- 关联：[alpha.1 roadmap](./roadmap.md) · [Core 默认协议](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.4/05-theme-source-fragments.md) · [Plot 绘图区背景](./07-plot-area-background.md) · [Axis 主题作用域](./08-axis-theme-token-rules.md) · [Axis grid 端点默认](./10-axis-grid-theme-domain-endpoints.md) · [Chart Source 默认片段](../../../../chart/v0/v0.1/alpha.1/15-theme-source-fragments.md)

## 背景与目标

当前 Plot 把同一组默认值拆成 flat token、token rule 与结构化 `plotTheme`。Chart 还要把这三种输入转发给 Plot。字段、值域和覆盖粒度已经由 Plot area、Axis、Legend、palette、scale 与 lowering 定义，却被另一套 vocabulary 再次描述，导致来源诊断和跨 owner 组合都依赖映射。

Axis 的 dimension 差异确实需要条件默认，但它不应变成通用规则平台，也不能借 Theme 增删 guide。palette 中的 `sector` 只在旧 token 解析、inspection 与测试中往返，实际 scale、mark 与 lowering 没有消费者；保留它会把未成立的能力写入公开契约。

本决策让 Plot 用稀疏的 Source-shaped 默认片段表达视觉默认，用独立且严格限于已有 Axis 的规则表达 dimension 差异，并让 Chart 只转发 Plot 的公开片段。

## 决策：默认片段复用 Plot Source，规则只覆盖已有 Axis

`plotDefaults` 是 Plot 正式视觉 Source 的稀疏投影。它只选择已经由 Plot 消费的 `plotArea`、`typography`、`axis`、`legend` 与 `palette` 字段，并复用它们的字段名、值域和覆盖粒度。`plotArea` 只允许 `fill`；`axis` 只允许 line、ticks、tickLabels、title 与 grid 的既有视觉默认；`legend` 只允许既有 Legend visual style；palette 只允许 `categorical`、`series`、`sequential`、`diverging` 与 `shape`。

`plotDefaults` 不包含 width、height、layout、clip、tick source、count、values、interval、density、grid projection、minor grid、composition selector、band position、Legend channel、scale、position、orient 或任何 mark / guide 创建语义。它也不包含 `palette.sector`。Sector 的历史几何继续由 interval 在坐标 frame 中投影，不建立未被消费的 sector palette 或替代算法。

公开关系为：

```ts
type IRPlotDefaults = Readonly<{
  plotArea?: Readonly<{ fill?: IRPaintValue }>;
  typography?: IRGuideTextStyle;
  axis?: IRPlotAxisDefaults;
  legend?: IRLegendGuideStyle;
  palette?: Readonly<{
    categorical?: IRPlotColorPalette;
    series?: IRPlotColorPalette;
    sequential?: IRColorSchemeName;
    diverging?: IRColorSchemeName;
    shape?: IRPlotShapePalette;
  }>;
}>;

type IRPlotAxisRule = Readonly<{
  select: Readonly<{ dimension: string | ReadonlyArray<string> }>;
  axis: NonNullable<IRPlotDefaults['axis']>;
}>;

type IRPlot = Readonly<{
  plotDefaults?: IRPlotDefaults;
  plotRules?: ReadonlyArray<IRPlotAxisRule>;
}>;
```

`select.dimension` 接受一个非空开放字符串，或非空、无重复项的字符串数组。规则只匹配已经存在且 dimension 相同的 Axis；`axis` 至少包含一个允许的视觉默认；同一来源中按声明顺序应用，后规则覆盖前规则的同名 Axis 默认。规则不会创建 Axis、Legend、tick、grid 或 mark，也不会改变 scale、tick source、projection、composition 或 guide layout。

具名 Plot style definition 与内置 Neutral 继续使用既有 definition / registry 解析机制，但产生 `defaults` 与 `rules` 两个独立片段。内置与自定义 definition 走同一 registry、解析与诊断链路。Direct Plot 可以给出 `plotDefaults` 和 `plotRules`；Chart 只经 `plotExtension` 转发这两个 Plot-owned 输入，并只把自己的 Definition `plotDefaults` 作为一个 Plot 默认来源交给 Plot 消费。Chart 不复制 palette vocabulary、合并、rule resolver 或 resolved 结果。

## 级联、可见结果与诊断

Plot 先从 Core 当前 `style` / `mode` 建立 mode-aware Neutral，再由匹配的 Plot style definition 生成 `defaults` 与 `rules`。Chart 嵌入时，Chart Definition 的 Plot defaults 随后进入同一 Plot resolver；最后应用作者 `plotDefaults`、`plotRules` 与正式 Axis、Legend、scale、mark 配置。

每个来源内部都先应用 `typography`，再应用 Axis / Legend 专用默认和匹配的 Axis rule。因而较晚来源的全局 typography 可以覆盖较早来源的 Axis 或 Legend 专用文字值；同一来源的专用值可以再覆盖该来源的 typography。单个 Axis 或 Legend 的显式字段始终最高优先级。palette 数组整体替换，保留数组顺序、长度和值；显式 scale `range` 或 `scheme`、显式 mark color 与 guide 配置继续按各自正式 Source 契约优先。

默认和规则只能为已有对象补充允许的视觉字段。省略的 Axis、Legend 或 mark 保持省略，空片段不产生覆盖，合法 `0`、`false` 和允许的空值保留。inspection 必须按真实来源区分 Neutral、有效 style、Chart forwarding 与作者 Plot Source，并能显示有效 palette 与 Axis rule 来源；不得根据值相等猜测来源。

未知字段、旧 token / `plotTheme` 输入、非法 palette、无效 selector、缺少 style definition 与 definition base 环都在现有 Plot schema、registry 或 resolver 的真实路径上明确失败。不存在对旧入口的 alias、双读、自动迁移或 renderer fallback。

这是 `0.x` breaking migration：删除 `plotThemeTokens`、`plotThemeTokenRules`、`plotTheme` 以及无消费者的 `plot.palette.sector`。React、Vanilla 与 Direct IR 表达同一个 JSON-safe Plot Source；adapter 不维护平行 Theme 或 rule 输入。
