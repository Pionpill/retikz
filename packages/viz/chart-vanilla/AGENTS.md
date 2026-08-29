# @retikz/chart-vanilla 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供 JSON-safe Chart Source 的无框架 authoring、精确 chartType factory、SSR 与运行时接线
- **拥有的契约**：`ChartInput`、逐 chartType `CreateXxxChartInput`、逐类型 normalizer、`createXxxChart`、presentation shorthand、宿主 panel 与具体 Chart provider contribution
- **不拥有的能力**：Chart recipe/schema/registry/resolve、Plot 数据处理与 lowering、Core compile、Standard Surface / Layout、identity、renderer 或 React children 语义
- **输入与输出**：接收已解析的精确 Source IR 或 typed authoring input 与数据集，输出精简 Source IR、Chart InputEmbed 输入和 provider contribution
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，Core dependency aggregation 与 compile 进入 Kernel adapter owner

## Source 与 normalize 边界

- `/point` 入口的具体 `createXxxChart` 从精确 typed input 推导 `type: 'point'` 与 `recipe.chartType`，并调用对应 normalizer；根入口只保留渲染与 InputEmbed 类型，不提供 generic `createChart`
- `normalizeXxx` 只组装 JSON-safe Source：`namespace: 'chart'`、稳定 family、根 `data` / `layout` / `presentation` / `theme` / `plotExtension` 与精确 `recipe.encodings` / `properties` / `marks`
- Chart encodings 直接使用具体 chartType 的 exact mapping；Vanilla 只展开 row / column 字段名 shorthand，aggregate、transform、scale与composition语义由 `@retikz/chart` 的 strict schema 和 Definition 消费
- presentation shorthand 只归一为固定 `title`、`subtitle`、`note`、`source` slots；属性构造顺序不改变语义，固定 presentation 顺序由 Chart resolver 负责
- Source IR 不包含 datasets、函数、Definition、provider、ReactNode、DOM 或 resolved `IRPlot`

## Runtime 与 SSR

- 具体 factory 将 `themeDefinitions` 与对应 chartType provider contribution 一并交给 InputEmbed；recipe / mark Definition 由具体 chartType 闭合，不作为平铺数组注入，也不进入 Source
- `lowerOptions` 只携带 Plot lowering 选项；Plot theme token 和 Plot fragment 仍由 Plot owner 消费
- `ChartInputEmbedAdapter` 只把 Source、数据集与 runtime 交给统一 Chart contribution，不实现 chartType 分发、Theme cascade、mark lowering 或 renderer 特判
- `renderChart()` 通过一次 Core compile 消费同一 `ChartAuthoringResult`；它不是独立的 recipe 或 Plot 执行路径
- 不保留 Base Chart、旧 `config`、根 `type: 'base'`、旧 Theme token 字段或兼容 alias
