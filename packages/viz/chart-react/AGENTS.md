# @retikz/chart-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供基础 Chart、typed Chart、Chart presentation marker 的 React JSX authoring 与运行时接线
- **拥有的契约**：Chart / XxxChart React props、direct-child marker 识别、Core Text authoring 归一与 React 生命周期接线
- **不拥有的能力**：Chart recipe/resolver、Plot lowering、数据处理、跨 adapter dependency aggregation、dataset bridge、identity bypass、Standard Surface / Layout Flex、renderer
- **输入与输出**：接收完整 Plot authoring 或 typed Chart props/spec 与 React children，输出 canonical IRChart 和宿主 runtime contribution
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，自动依赖聚合与 identity 能力进入 Kernel adapter owner

## 公开 authoring 约束

- 根 `@retikz/chart-react` 只导出基础 `<Chart>`、`ChartTitle`、`ChartSubtitle`、`ChartNote`、`ChartSource` 与 Chart Theme provider。typed `<XxxChart>` 只从 family subpath 导出，例如 `@retikz/chart-react/point`；family subpath 同时 re-export 全部基础 API，不提供旧根入口兼容别名
- marker 必须是直接 child，Fragment 可透明展开；同类 marker 唯一并完整覆盖同名 shorthand
- marker children 首版只接受字符串、Fragment 与现有整行 `Text` authoring，不接受 DOM、任意 ReactNode 或 drawable presentation child
- spec 模式只把 presentation marker 作为额外 children 并保留显式 Plot id；DSL 模式把 marker 与 Plot declaration 分类，Plot runtime options 继续走正式 adapter contribution，不进入 canonical IR
- adapter 只把 JSX 转为 framework-neutral authoring records，并复用 `@retikz/chart` normalizer；不自行排序、补默认、实现 Flex 或 lower Plot
- 上游 dependency / surface / spatial gates 与产品实现完成前，包根继续保持当前关闭状态，不提前导出不可执行 API
