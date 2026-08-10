# @retikz/layout-react 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让 React 用户以 JSX 使用 Layout 容器和可选检查能力
- **拥有的契约**：React props、LayoutItem authoring、静态 contribution 与 React inspection 接线
- **不拥有的能力**：Layout schema、solver、artifact、Core 编译、renderer 与领域语义
- **输入与输出**：接收 React props / children，构造 canonical Layout IR 并贡献 Layout Definitions
- **缺口流向**：布局行为进入 `@retikz/layout`；通用 React runtime 进入 `@retikz/react`；检查协议进入 `@retikz/inspect`

## 约束

- ReactNode 仅存在于 authoring 边界，进入 Layout IR 前必须转换为 JSON-safe `IRChild`
- 根入口不加载可选 Inspector；检查 authoring 只从 `/inspect` 导出
