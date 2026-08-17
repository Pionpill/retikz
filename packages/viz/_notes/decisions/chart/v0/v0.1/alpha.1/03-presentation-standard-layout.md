# ADR-03：Chart authoring、canonical result 与有序 presentation

- 状态：Accepted（2026-08-12；替代本 ADR 先前的开放 presentation 草案）
- 决策日期：2026-08-11
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-02](./02-style-palette.md) · [Chart 总设计](../../../../../architecture/chart-design.md)
- 替代：本 ADR 先前的六 preset / 任意 child 草案，以及 ADR-02 中 caption / credit 作为首版公开 presentation token 的承诺；ADR-02 继续拥有四类保留 preset 的 token、merge 与 Plot theme 转发边界

## 背景与目标

Chart 同时服务需要完整 Grammar-of-Graphics 表达的作者和需要 typed recipe 的作者。两者最终都应形成同一个可序列化、可检查、可由 SVG / Canvas 执行的 Chart 结果。Chart-level presentation 与 Plot guide / label 分开，Plot 由 Layout 组合，再由 Standard 包装完整内容；本 ADR 冻结公开 authoring、canonical Chart 结果、React / Vanilla 归一规则与 presentation 顺序。

## 核心决策：基础 Chart 与 typed Chart 同构

公开 React authoring 提供两层同构组件：

```tsx
<Chart>{/* 完整 Plot authoring surface */}</Chart>

<ScatterChart />
<BubbleChart />
```

基础 `Chart` 直接承载完整 Plot authoring surface，再增加 Chart-owned presentation；不接受 `type`，也不嵌套显式 `Plot` child。每个 `XxxChart` 先把 type-first 输入解析为完整 IRPlot，再进入与基础 `Chart` 相同的 canonical Chart、presentation、inspection 和 runtime 主链。脱离 typed recipe 时使用基础 `Chart`，不提供 `<Chart type="scatter">`。

## Canonical `IRChart`

typed IRChart 保存稀疏高层意图；canonical `IRChart` 保存已完成 Plot recipe resolution 和 presentation authoring normalization 的完整执行输入，两者不进入同一个 `type` 判别 union：

```ts
type IRChart = {
  namespace: 'chart';
  type: 'chart';
  id?: string;
  chartThemeTokens?: IRChartThemeTokenOverrides;
  plot: IRPlot;
  presentation?: IRChartPresentation;
};

type IRChartPresentation = {
  children: Array<IRChartPresentationItem>;
};

type ChartPresentationPreset = 'title' | 'subtitle' | 'note' | 'source';
```

presentation item 只有一个 `kind: 'plot', key: 'chart.plot'` 的 Plot item，或 `kind: 'preset', key: chart.presentation.<preset>` 的 preset item；preset item 携带 `text: IRTextBlock`，可选 `font`、`textColor`、`align`、`lineHeight`、`maxTextWidth` 以及 Layout Flex item 的 `margin`、`basis`、`grow`、`shrink`、`min`、`max`、`alignSelf`。

`presentation.children` 必须恰好包含一个 Plot item，每个 preset 最多一次，数组顺序是 canonical 顺序和唯一真源；resolver 按 authored order 映射为 Layout Flex children，不按 preset 重新排序。默认 Flex 为 column、nowrap、start 对齐，row gap 使用 Chart theme gap。没有 `presentation` 时使用裸 Plot；显式 presentation 即使只有 Plot item 也形成 FlexLayout。`IRChart.id` 是包含 presentation 与 Plot body 的整图 identity，Plot-owned data、theme、transform、scale、coordinate / composition、mark、guide 与 meta 只保留在 `IRChart.plot` 中。所有 IR 由 strict schema 推导，禁止函数、ReactNode、class、renderer object 与显式 `undefined`。

canonical `IRChart` 是唯一进入 Core composite dispatch 的根，key 固定为 `chart.chart`；typed variant 在 Core compile 前归一为它，基础 Chart 直接构造它。provider 组合 `standard.surface`、可选 `layout.flexLayout` 与 `plot.plot`，不发布逐类型 Core provider。

## Presentation authoring 与默认值

基础与 typed Chart 都提供：

```ts
type ChartPresentationShorthandProps = {
  title?: string;
  subtitle?: string;
  note?: string;
  source?: string;
};
```

shorthand 不自动添加 `Source:`、`Note:` 或其它语言前缀，只有作者提供内容时才生成 item。默认顺序为 `title -> subtitle -> Plot -> note -> source`；该顺序只属于 authoring normalization，不进入 canonical `position` 字段。

React 提供 `ChartTitle`、`ChartSubtitle`、`ChartNote`、`ChartSource` 四个 headless marker，不提供 namespace、兼容别名、`ChartCaption`、`ChartCredit`、`ChartPlot` 或 `ChartItem`。marker 是直接 child，每类最多一个；`title` / `subtitle` 默认置于 Plot 前，`note` / `source` 默认置于 Plot 后。显式 marker 按 authored order 排列，并完整覆盖同名 shorthand；归一顺序是显式 top markers、剩余 top shorthand、Plot、显式 bottom markers、剩余 bottom shorthand。

marker children 首版只接受字符串、透明 Fragment 和 Core React `Text` marker；多个 `Text` 形成多行 TextBlock。普通 DOM element、数字、函数、事件 callback、任意 React component、空字符串和空 TextBlock 均非法。样式优先级为 Chart preset defaults < marker block-level props < Text line-level leaves；测量、换行与 renderer 输出由 Core 拥有。

Vanilla 使用 JSON-safe 的 `ChartPresentationAuthoringRecord`：包含 Flex item 字段、`preset`、可选 `position`、`text: string | IRTextBlock` 及文本样式字段。React 与 Vanilla 将 authoring records 交给同一个纯 normalizer；手写 canonical JSON 直接用 children 数组表达顺序，不消费 `position`。`create*` result 保留 `chart`、完整 dependency contribution 及显式根 `theme` / `themeStyles`，只有 `chart` 是 JSON-safe canonical IR；`renderChart` 在一次 Core compile 中合并 contribution 与调用方 definitions / theme styles，不为 SVG 二次 compile。

## 行为、失败语义与兼容性

- 基础 Chart 拒绝 `type` prop 和显式嵌套 Plot；typed Chart 必须先产生完整、通过 IRPlot schema 的 IRPlot
- marker 同类重复、非直接 child、空内容、非法 element、非法 Text authoring、Vanilla 重复 preset 或非法 position 均 fail-loud
- canonical presentation 恰好一个 Plot、每种 preset 最多一次、固定 key 且 authored order 保持不变
- 无 presentation 产生裸 Plot；显式 presentation 产生 FlexLayout；两者最终都进入 Standard Surface
- adapter 不提供 DOM-only title、CSS-only layout、renderer-only text 或静默忽略路径
- standalone Chart 的 themeStyles 配置其自行创建的 Layout；嵌入式 Chart 只消费父 Layout 的 Core Theme definitions，子级不私自登记 Core style
- Chart 包裹前后，主 Plot 的 semantic identity、domain payload、provenance、locator 与 lineage 保持连续

该契约在 `0.x` 直接替代先前开放六 preset、重复 preset、任意 `IRChild`、`ChartPlot` 与 `ChartItem` 的草案，并移除 caption / credit 的首版公开 token；不提供兼容别名、migration、fallback 或新旧双轨。

## 功能与包边界

`@retikz/chart` 拥有 `IRChart` schema、四类 preset、共享 normalizer、inspection、单一 `ChartDefinition` 与到 Layout / Standard 的确定性转换；`@retikz/chart-react` 拥有基础 `Chart` 与四个 marker；`@retikz/chart-vanilla` 拥有 `createChart`、`renderChart` 与 plain helper。Plot 拥有 IRPlot 和其领域语义，Layout 拥有 FlexLayout，Standard 只拥有 surface 包装，Core 拥有 TextBlock、Scene、identity 与 renderer-neutral spatial 基础。adapter 不复制这些 owner 的 schema、solver、lowering 或 renderer 行为。

## 最终实现结果与遗留边界

基础 `Chart` 与已实现的 typed Chart 在完整 IRPlot 形成后汇合为唯一 canonical `IRChart`，由单一 `chart.chart` provider 组合 Standard Surface、可选 Flex presentation 与唯一 Plot body。React marker、Vanilla plain record 与手写 JSON 共享 presentation normalizer；`position` 只参与 authoring，children 顺序是 canonical 真源。title、subtitle、source、note 在图内渲染，marker 可整体覆盖同名 shorthand。

caption、credit、任意 presentation child、inline TextRun、宿主工具栏与响应式状态仍不属于首版；Regression、Ranged Dot 与 Strip 的公开入口仍由各自 ADR 决定，不因本 ADR 自动获得实现。
