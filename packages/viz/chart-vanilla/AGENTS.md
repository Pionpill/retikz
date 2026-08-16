# @retikz/chart-vanilla 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供基础 Chart、typed Chart 与有序 presentation 的无框架 authoring、SSR 和运行时接线
- **拥有的契约**：`createChart`、typed `createXxxChart` helper、plain presentation records、Vanilla runtime contribution 与 SSR convenience
- **不拥有的能力**：Chart recipe/resolver、Plot lowering、数据处理、跨 adapter dependency aggregation、dataset bridge、identity bypass、Standard Surface / Layout Flex、renderer
- **输入与输出**：接收完整 IRPlot 或 typed Chart plain input 与数据，输出 canonical IRChart 和宿主 runtime contribution
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，自动依赖聚合与 identity 能力进入 Kernel adapter owner

## 公开 authoring 约束

- 根 `@retikz/chart-vanilla` 只导出基础 `createChart` 与 `renderChart`。typed `createXxxChart` helper 只从 family subpath 导出，例如 `@retikz/chart-vanilla/point`；family subpath 同时 re-export 全部基础 API，不提供旧根入口兼容别名
- 基础 helper 与 typed helper 共享 title / subtitle / note / source shorthand 和有序 plain presentation records
- plain record 的 text 只接受 string 或 JSON-safe Core TextBlock，不接受 React authoring object
- plain records 的 position 只用于 top / bottom authoring normalization；canonical IR 只保留最终 children 顺序
- 同类 preset 唯一并完整覆盖同名 shorthand；空内容、重复 preset 与非法 position fail-loud
- adapter 只构造 framework-neutral authoring input 并复用 `@retikz/chart` normalizer；不自行排序、补默认、实现 Flex 或 lower Plot
- 上游 dependency / surface / spatial gates 与产品实现完成前，包根继续保持当前关闭状态，不提前导出不可执行 API
