# plot v0.1-alpha.15 Roadmap：Guide + Theme 主题样式

> 上游：[plot v0.1 roadmap](../roadmap.md)「Theme 主题样式」行。
> 主题：把 plot 的解释性结构收口：axis 的值域弹性、刻度策略、轴线 / 刻度 / 标签 / 网格 / 图例样式，以及全局 theme 的默认与覆盖规则。Interaction 不进入本 milestone，放到 v0.3 Interaction 能力线。

## 定位

alpha.15 不是单纯“换皮肤”。它是 plot v0.1 图形语法的最后一个 alpha，用来补齐 Guide 与 Theme 的长期契约：图应该能在不手调每个 mark 的情况下，给 axis 留出合理的值域空间，生成稳定可读的 tick / label / grid，并通过一套 JSON-safe theme 控制 axis、axis grid、legend、palette、typography 与背景。

当前实现里，连续位置 scale 的推断 domain 直接来自数据 extent；`nice` 只负责 d3 nice，不负责给孤立点或极值贴边场景留白。典型问题是只有一个点或一组点落在 cartesian2D 左下角时，数据点与 axis / plot 边界重合。这个问题不应靠 demo 手写 domain，也不应靠 chart preset 私自扩 range；它属于 plot guide / scale 的基础可读性。

本 milestone 同时收敛 guide 样式。现有 axis / grid / legend lowering 中有多处硬编码常量，例如 tick length、label gap、grid opacity、legend swatch / ramp 尺寸。alpha.15 要把这些变成可解释、可覆盖、可由 theme 驱动的语义，不再散落在 lowering 内部。

Theme 是横切能力，但不是交互系统。`hover`、`selected`、tooltip、brush、linked highlighting、事件回调、水合命中都不在本轮。v0.3 Interaction 能力线可以消费 alpha.5 / alpha.14 已经建立的 provenance / locator / scope identity，但不被 alpha.15 的半成品交互字段绑住。

## ADR 索引

| ADR | 主题 | 目标 | 状态 |
| --- | --- | --- | --- |
| ADR-01 | **axis domain padding and tick strategy** | 为连续 / 时间位置 scale 增加 domain 弹性、按 scale family 区分单值 domain 退化策略、tick 显式控制与 `nice` 顺序；解决点贴边和 tick 不可控问题 | Accepted |
| ADR-02 | **axis guide structure and style tokens** | 细化 line、ticks、tickLabels、title、grid 部件槽位的样式与几何 token；替换 guide lowering 中的硬编码常量 | Accepted |
| ADR-03 | **plot theme schema and merge priority** | 新增 JSON-safe `PlotSpec.theme`，定义 built-in theme、spec theme、guide local override 的合并顺序和默认 token 结构 | Accepted |
| ADR-04 | **legend, palette, and guide family theme** | 收敛 categorical / sequential / diverging palette、series / sector 默认配色、legend swatch / ramp / label / title 样式 | Accepted |

> 建议文件名：`01-axis-domain-tick-strategy.md`、`02-axis-guide-style.md`、`03-theme-schema-merge.md`、`04-legend-palette-guide-theme.md`。

## 依赖与顺序

1. **ADR-01 先行**：axis 的范围与 tick 是 guide 可读性的基础。Theme 只负责默认与样式，不能掩盖 scale domain 策略缺失。
2. **ADR-02 跟进**：axis / grid 的几何与文字样式需要明确 token，再由 ADR-03 挂到 theme。
3. **ADR-03 建 theme 总入口**：把 ADR-02 的视觉 token 与 ADR-04 的 legend / palette token 接进 `PlotSpec.theme`，并定义局部覆盖优先级；ADR-01 的 domain / tick 语义仍归 scale / guide，不归 theme。
4. **ADR-04 收口 legend / palette**：legend 的样式和 palette 消费 theme，总体依赖 ADR-03 的 merge 规则。

## 关键设计约束

- **axis domain 弹性属于 scale / guide 语义，不属于 demo hack**：不能要求用户每次为了避免点贴边手写 domain。
- **显式 domain 默认尊重用户**：用户给 `domain` 时默认不自动 padding；若需要 padding，必须显式配置。
- **推断 domain 默认可读**：省略 domain 时，连续 / 时间位置 scale 应有默认弹性策略，单点 domain 必须稳定扩展，避免所有值挤在一个边界或中心不可解释。
- **padding 与 nice 顺序固定**：默认顺序为 `infer extent -> domain padding -> nice`。ADR-01 可讨论显式 domain 的 opt-in 顺序，但最终必须写死。
- **range padding 不替代 domain padding**：range 是像素空间，domain padding 是数据语义空间。axis 贴边问题应优先在 domain 解决，分类 scale 的 band / point padding 仍保留在各自 scale 字段。
- **tick 是 guide family 语义的一部分**：`ticks.count` 只是 hint；本轮开放 `ticks.values` 与声明式 `tickLabels.format`，避免只有 count 无法控制关键刻度。Axis 与 legend ramp 必须复用同一 tick resolver。
- **受限 scale 必须守住 domain invariant**：log 只能正 domain；sqrt / radial 不能负；pow 在非整数指数时不能负。domain padding 与单值 fallback 不能把合法 domain 扩成非法 domain，family matrix 必须落到 shared domain resolver。
- **axis 部件分层明确**：line、ticks、tickLabels、title、grid 分开控制，不把所有外观和几何 token 塞进一个 `style` 对象；guide 文本统一复用 core `TextBlock` / `Font` 词汇，guide 线条统一复用 core path `stroke` / `strokeWidth` / `drawOpacity` / `dashPattern` 词汇，不另造平行文本或线条类型。
- **theme JSON-safe**：theme 只能包含 plain data、token、颜色串、数值、枚举。formatter 函数、DOM、ReactNode、renderer 对象不进 theme。
- **local override 胜过 theme**：用户在单个 Axis / Legend 上写的局部字段应覆盖 `PlotSpec.theme`；theme 覆盖 built-in visual default。scale 的 `domain` / `domainPadding` / `nice` / `ticks.values` 等语义字段不参与 theme 合并链。
- **三包 lockstep**：`@retikz/plot` 是 schema / lowering 真源；React / Vanilla 只提供等价 authoring 表面，不另造 theme 或 guide 语义。
- **Interaction 顺延到 v0.3**：不设计 hover / selected token，不实现 tooltip、selection、brush、event callback。

## ADR 草案要点

### ADR-01：axis domain padding and tick strategy

目标是让 axis 范围在默认情况下可读，同时保留显式控制能力。

设计倾向：

- 对连续位置 scale 增加 `domainPadding`，支持比例与两端分别配置：
  - `domainPadding: 0.05`
  - `domainPadding: { lower: 0.05, upper: 0.05 }`
- 本轮只做比例 padding，不做绝对值 padding；绝对 padding 若需要另开后续 ADR。
- 单值 domain 使用 `singleValueSpan` 或内置默认策略，避免 `[v, v]` 映射退化。具体默认与 log / sqrt / radial / pow 分支以 ADR-01 的 scale-family 表为准。
- `domainPadding` 与单值 fallback 必须按 scale family 分类：
  - linear / time / symlog 可跨零，按数值或时间 extent 扩展。
  - log 必须保持 `lower > 0`，单值 `v <= 0` 仍按既有 log 非法输入规则 fail-loud 或跳过，不为 padding 特判成可绘值。
  - sqrt / radial 必须保持 `lower >= 0`。
  - pow 在非整数 exponent 时必须保持 `lower >= 0`，整数 exponent 可跨零。
- 显式 `domain` 默认不 padding；显式想 padding 时同样可写 `domainPadding`。
- `nice` 顺序默认是 `infer extent -> padding -> nice`。
- tick 策略重新定义 `ticks.count` 的默认与边界，并开放：
  - `ticks.values`: 显式 tick 值列表。
  - `tickLabels.format`: 声明式格式引用或格式字符串，不接受函数。
- 时间 scale 的 padding 也要处理；如果比例 padding 对时间不直观，内部仍以 epoch ms 计算，但 docs 必须写清。

不在本 ADR 范围：分类 scale 的 band / point padding 重设计、自动 tick label 防重叠、文字测量驱动的 tick 抽稀。

### ADR-02：axis guide structure and component tokens

目标是把 axis / grid 的外观和局部几何从硬编码 lowering 常量变成明确的 guide 部件 token。

设计倾向：

- AxisGuide 增加可选局部部件槽位，字段名以 ADR-02 为准：

```ts
{
  line?: false | AxisLineOptions;
  ticks?: AxisTicksOptions;
  tickLabels?: false | AxisTickLabelsOptions;
  title?: string | AxisTitleOptions;
  grid?: boolean | AxisGridOptions;
}
```

- 独立 token：
  - line: stroke、strokeWidth、drawOpacity、dashPattern。
  - ticks: count、values、length、line stroke、line dashPattern。
  - tickLabels: format、gap、font、textColor、opacity、align、lineHeight、maxTextWidth、rotate、anchor。
  - title: TextBlock text、gap、font、textColor、opacity、align、lineHeight、maxTextWidth、rotate、anchor。
  - grid: applyTo/select、stroke、strokeWidth、drawOpacity、dashPattern。
- 共享 schema / resolver：
  - `GuideLineStyleSchema`: core path line vocabulary。
  - `GuideTextStyleSchema`: core text vocabulary。
  - `GuideTickSourceSchema` / `GuideTickLabelFormatSchema`: axis 与 legend ramp 共用 tick source / label format。
  - `resolveGuideTicks`: axis tick label、axis grid、legend ramp tick 的唯一 tick set 来源。
- 覆盖 cartesian / polar / ternary / custom axis。token 语义要按“轴线、刻度、标签、标题、网格”解释，而不是只按 screen x/y 解释。
- `placement` / `offset` 保留现有语义；部件 token 不改变 axis 放在哪。
- 现有硬编码常量如 `AXIS_TICK_LENGTH`、`AXIS_LABEL_GAP`、grid `drawOpacity: 0.15` 要有 theme token 对应项。

不在本 ADR 范围：自动 label collision avoidance、自动旋转、自动外边距测量。

### ADR-03：plot theme schema and merge priority

目标是定义 `PlotSpec.theme` 与 theme 默认层，给 guide / legend / palette 提供统一入口。

设计倾向：

- 新增 `PlotThemeSchema`，挂到 PlotSpec：

```ts
type PlotTheme = {
  background?: string;
  typography?: GuideTextStyle;
  axis?: PlotAxisTheme;
  legend?: PlotLegendTheme;
  palette?: PlotPaletteTheme;
};
```

- 合并顺序：

```text
built-in default theme
  < PlotSpec.theme
  < local guide / legend override
```

- Theme 不进入 core IR 原样传递；它在 lowering / guide 解析阶段被消费，最终落成 core Node / Path / Scope 的 style。
- `domainPadding`、`singleValueSpan`、`nice`、`ticks.count`、`ticks.values`、`tickLabels.format`、`title.text`、`grid.applyTo/select` 等 scale / guide 语义不属于 theme；theme 只能给视觉 token、局部几何 token、typography、palette、background 提供默认，axis grid 默认归 `theme.axis.grid`。
- Theme 实现必须有统一 `resolvePlotTheme` / `resolveAxisGuideTokens` / `resolveLegendGuideTokens`，局部覆盖只合并 token 字段，不合并 guide 语义字段。
- 默认主题应低调、可读、适合文档图；不引入品牌化大色彩。
- 暂不开放 theme registry / named theme registry；可以先保留内置 default + plain object override。若要 named theme，必须仍是 JSON-safe name + runtime registry，不把函数进 IR。

不在本 ADR 范围：dark mode 自动联动、CSS variable runtime 读取、interaction state token。

### ADR-04：legend, palette, and guide family theme

目标是把 legend 外观、palette 默认和 guide family 统一纳入 theme。

设计倾向：

- Palette token 至少覆盖：
  - `categorical`
  - `sequential`
  - `diverging`
  - `series`
  - `sector`
- 现有 ordinal / sequential / diverging / quantize / threshold / quantile color scale 默认方案应从 theme palette 读取，显式 scale `range` / `scheme` 优先级高于 theme。
- palette fallback 必须产出单一 `ResolvedPlotPalette`，mark 默认色、scale 默认 range / scheme、legend swatch / ramp 都消费同一 resolved palette。
- Legend token 至少覆盖：
  - swatch size
  - swatch gap
  - entry gap
  - title gap
  - ramp length
  - ramp thickness
  - title GuideTextStyle
  - label GuideTextStyle
  - 本轮不开放 legend frame / background / border；若实现发现必须画背景框，应回 ADR-04 修订。
- LegendGuide 的局部样式覆盖 theme legend token。
- Legend ramp 的 `ticks` / `tickLabels.format` 复用 guide tick source / label format；`style.label` 只控制文本样式，不控制格式。
- 不做自定义 legend item template / render 函数；深度自定义另立后续里程碑。

不在本 ADR 范围：legend hover 高亮、click filter、manual legend item template、HTML legend。

## 文件 scope 预估

后续各 ADR 可按自身范围细化，初步 scope 如下：

- `packages/viz/plot/src/schemas/scale/**`
- `packages/viz/plot/src/schemas/guide/**`
- `packages/viz/plot/src/schemas/plot/**`
- `packages/viz/plot/src/schemas/theme/**`（新建，若 ADR-03 采纳）
- `packages/viz/plot/src/providers/scale/**`
- `packages/viz/plot/src/features/guide/**`
- `packages/viz/plot/src/pipeline/**`
- `packages/viz/plot/src/contract/**`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot/tests/**`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/**`
- `apps/docs/src/modules/docs/data/**`

## 测试 case 规则

延续 plot alpha milestone 放宽口径：不硬凑每 ADR 9 个 case，但必须覆盖真实有意义的 accept / reject、数据断言、几何断言、默认值断言与三包表面等价性。

建议分布：

- **domain padding**：单点 x/y、全零、负值区间、跨零、显式 domain、显式 domain + padding、time domain、nice 顺序；log / sqrt / pow / radial 的 constrained domain 不能被 padding 扩成非法值。
- **tick strategy**：默认 `ticks.count`、显式 `ticks.count`、显式 `ticks.values`、非法 `ticks.values`、tick labels 与 grid 共用同一 tick set；legend ramp 与 axis 共用 tick resolver。
- **axis components**：line / ticks / tickLabels / title / grid token 各自落到 core Path / Node / Scope 的正确 style。
- **coordinate coverage**：cartesian2D、polar2D、ternary2D、custom axis 至少覆盖样式不丢失；几何断言按各坐标系裁剪。
- **theme merge**：built-in default、PlotSpec.theme、Axis local override、Legend local style 的优先级稳定；语义字段不进入 token merge。
- **legend / palette**：categorical series 默认色、sector 默认色、sequential / quantize / threshold / quantile / diverging 默认 scheme、显式 range / scheme 覆盖 theme；mark 与 legend 消费同一 `ResolvedPlotPalette`。
- **三包等价**：React / Vanilla authoring 表面生成的 PlotSpec 与手写 spec 等价。
- **docs demo**：单点散点留白、主题切换、axis/grid 样式、legend/palette 样式各至少一组。

## 本轮不做

- 不做 tooltip / hover / selection / brush / linked highlighting / event callback。
- 不做 hover / selected / active / disabled 等 interaction state token。
- 不做自动文字测量、tick label collision avoidance、自动旋转、自动抽稀。
- 不做 CSS runtime 变量读取、DOM theme provider、React context theme。
- 不做 chart preset；v0.2 `<Chart>` 可以消费本轮 theme，但不在本轮实现。
- 不做 HTML legend、自定义 legend render template、manual legend item template。
- 不做大数据 dashboard 的高频过滤 dataflow。

## 验收口径

alpha.15 封口时应满足：

- ADR-01～04 全部 Proposed -> Accepted，字段名、默认值、merge 顺序在 ADR 内固定。
- `@retikz/plot` 的连续 / 时间位置 scale 默认能避免单点或极值贴边；显式 domain 行为可预测。
- axis line、tick line、tick label、axis title、grid line 不再只能依赖 lowering 硬编码常量。
- `PlotSpec.theme` 能控制 axis、axis grid、legend、palette、typography、background 的默认样式。
- React / Vanilla 能等价暴露 theme 与 guide 局部样式，不绕开 PlotSpec。
- docs 至少覆盖：单点散点留白、axis/grid 样式、theme 切换、legend/palette 样式。
- roadmap 明确 Interaction 进入 v0.3 能力线，不与 alpha.15 混杂。
