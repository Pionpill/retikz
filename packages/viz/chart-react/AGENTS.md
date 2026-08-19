# @retikz/chart-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供 Base Chart、逐类型精确 Chart、Chart presentation marker 的 React JSX authoring 与运行时接线
- **拥有的契约**：`ChartProps`、逐类型 `XxxChartProps`、direct-child marker 识别、Core Text authoring 归一与 React 生命周期接线
- **不拥有的能力**：Chart recipe/resolver、Plot lowering、数据处理、跨 adapter dependency aggregation、dataset bridge、identity bypass、Standard Surface / Layout Flex、renderer
- **输入与输出**：接收完整 Plot authoring 或某个精确 typed Chart props 与 React children，映射为 Chart Vanilla Input 并复用其 normalize，绑定后输出 `IRBaseChart` 和宿主 runtime contribution
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，自动依赖聚合与 identity 能力进入 Kernel adapter owner

## 公开 authoring 约束

- 根 `@retikz/chart-react` 只导出基础 `<Chart>`、`ChartTitle`、`ChartSubtitle`、`ChartNote`、`ChartSource` 与 Chart Theme provider。typed `<XxxChart>` 只从 family subpath 导出，例如 `@retikz/chart-react/point`；family subpath 不转发基础 API，也不提供旧根入口兼容别名
- 不导出 `InputChart`、Point union 或接受通用 `type` prop；每个组件只构造对应的精确 Vanilla Input
- marker 必须是直接 child，Fragment 可透明展开；同类 marker 唯一并完整覆盖同名 shorthand
- marker children 首版只接受字符串、Fragment 与现有整行 `Text` authoring，不接受 DOM、任意 ReactNode 或 drawable presentation child
- spec 模式只把 presentation marker 作为额外 children 并保留显式 Plot id；DSL 模式把 marker 与 Plot declaration 分类，Plot runtime options 继续走正式 adapter contribution，不进入 canonical IR
- Base 与 typed 组件共享同一个已绑定 Chart runtime adapter，但没有公开 Source IR union 或 Point 专属 adapter
- Base 与 typed 组件不得直接构造 Chart namespace、type、`plot` / `config` Source IR 外壳；必须调用 Chart Vanilla 的公开 normalize
- adapter 不自行实现 recipe、Flex 或 Plot lowering
