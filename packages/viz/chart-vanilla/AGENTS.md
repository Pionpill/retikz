# @retikz/chart-vanilla 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供 Base Chart、逐类型精确 Chart 与有序 presentation 的无框架 authoring、SSR 和运行时接线
- **拥有的契约**：Base 与逐类型 `InputXxx` / `normalizeXxx`、`createChart`、逐类型 `createXxxChart`、plain presentation records、已绑定 Chart runtime adapter、Vanilla contribution 与 SSR convenience
- **不拥有的能力**：Chart recipe/resolver、Plot lowering、数据处理、跨 adapter dependency aggregation、dataset bridge、identity bypass、Standard Surface / Layout Flex、renderer
- **输入与输出**：接收完整 Plot authoring 或某个精确 typed Chart plain input 与数据，输出 `IRBaseChart` 和宿主 runtime contribution
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，自动依赖聚合与 identity 能力进入 Kernel adapter owner

## 公开 authoring 约束

- 根 `@retikz/chart-vanilla` 只导出 Base `InputChart` / `normalizeChart`、`createChart`、`renderChart` 与共享 runtime API。typed `InputXxxChart` / `normalizeXxxChart` / `createXxxChart` 只从 family subpath 导出；family subpath 不转发基础 API
- 不导出 `InputPointChart`、typed union 或通用 `type` factory
- 基础 helper 与 typed helper 共享 title / subtitle / note / source shorthand 和有序 plain presentation records
- plain record 的 text 只接受 string 或 JSON-safe Core TextBlock，不接受 React authoring object
- plain records 的 position 只用于 top / bottom authoring normalization；canonical IR 只保留最终 children 顺序
- 同类 preset 唯一并完整覆盖同名 shorthand；空内容、重复 preset 与非法 position fail-loud
- 每个工厂调用对应 normalize 组装 Source IR，再直接调用匹配 recipe `bind`；运行时只在内部适配器中消费已绑定 Chart
- adapter 不自行实现 recipe、Flex 或 Plot lowering
