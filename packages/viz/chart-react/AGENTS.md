# @retikz/chart-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：在公开 Chart type 后提供 React JSX authoring 与运行时接线
- **拥有的契约**：未来的 Chart React props、children declaration 适配与 React 生命周期接线
- **不拥有的能力**：Chart recipe/resolver、Plot lowering、数据处理、跨 adapter dependency aggregation、dataset bridge、identity bypass、Standard/Flex layout、renderer
- **输入与输出**：未来接收 Chart props/spec 与 React children，输出 Chart IR 和宿主 runtime contribution；ADR-01 期间入口必须为空
- **缺口流向**：Chart 语义进入 `@retikz/chart`，Plot 语义进入 `@retikz/plot`，自动依赖聚合与 identity 能力进入 Kernel adapter owner

## ADR-01 约束

- 不公开 `<Chart>`、helper、type 或 runtime adapter
- 不注册或聚合 Chart、Plot、Standard definitions，不合并 datasets
- 不调用 Plot lowering，不绕过宿主 identity 校验，不引入 Standard/Flex 行为
