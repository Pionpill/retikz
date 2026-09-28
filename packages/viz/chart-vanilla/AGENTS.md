# @retikz/chart-vanilla 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供 JSON-safe Chart Source 的无框架 authoring、精确 chartType 编写节点、SSR 与运行时接线
- **拥有的契约**：逐 chartType `XxxChartInputEmbedProps`、`xxxChart`、`XxxChartInputEmbedAdapter` 与精确 normalizer、presentation shorthand、宿主 panel 与具体 Chart provider contribution
- **不拥有的能力**：Chart recipe/schema/registry/resolve、Plot 数据处理与 lowering、Core compile、Standard Surface / Layout、identity、renderer 或 React children 语义
- **输入与输出**：接收已解析的精确 Source IR 或 typed authoring input 与数据集，输出标准 InputEmbed；adapter 在场景处理时生成精简 Source IR 和 provider contribution
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，Core dependency aggregation 与 compile 进入 Kernel adapter owner

## Source 与 normalize 边界

- `/point` 入口的具体 `xxxChart` 只保存 typed input 和具体 adapter kind；对应 adapter 推导 `type: 'point'` 与 `recipe.chartType` 并调用精确 normalizer；根入口只保留渲染与 InputEmbed 类型，不提供 generic `createChart`
- `normalizeXxx` 只组装 JSON-safe Source：`namespace: 'chart'`、稳定 family、根 `data` / `layout` / `presentation` / `theme` / `coordinate` / `plotExtension` 与精确 `recipe.encodings` / `properties` / `marks`
- `InputChartCoordinate` 复用 Plot Vanilla 的对象 contract，并接受开放坐标系名；字符串只归一为 `{ type }`，对象配置与显式 `0` 原样进入 Source
- Chart encodings 直接使用具体 chartType 的 exact mapping；Vanilla 只展开 row / column 字段名 shorthand，aggregate、transform、scale与composition语义由 `@retikz/chart` 的 strict schema 和 Definition 消费
- presentation shorthand 只归一为固定 `title`、`subtitle`、`note`、`source` slots；属性构造顺序不改变语义，固定 presentation 顺序由 Chart resolver 负责
- Source IR 不包含 datasets、函数、Definition、provider、ReactNode、DOM 或 resolved `IRPlot`

## Runtime 与 SSR

- 具体 adapter 从 InputEmbed props 中消费 `themeDefinitions` 并组装对应 chartType provider contribution；recipe / mark Definition 由具体 chartType 闭合，不作为平铺数组注入，也不进入 Source
- `lowerOptions` 只携带 Plot lowering 选项；Plot theme token 和 Plot fragment 仍由 Plot owner 消费
- 逐类型 `XxxChartInputEmbedAdapter` 只把规范化 Source、数据集与 runtime 交给统一 Chart contribution，不实现 chartType 分发、Theme cascade、mark lowering 或 renderer 特判
- `renderChart()` 消费标准 InputEmbed 与显式 adapters，通过一次 Core compile 生成 SVG 和编译结果；它不是独立的 recipe 或 Plot 执行路径
- 不保留 Base Chart、旧 `config`、根 `type: 'base'`、旧 Theme token 字段或兼容 alias
