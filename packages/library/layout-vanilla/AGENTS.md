# @retikz/layout-vanilla 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让无框架用户以 builder、adapter、SSR 或 mount 使用 Layout
- **拥有的契约**：Layout builders、adapter catalog、SSR / mount authoring
- **不拥有的能力**：Layout schema、solver、artifact、Core 编译、renderer 与 DOM 状态
- **输入与输出**：接收 `InputXxx` Layout inputs，构造 canonical Layout IR 并贡献 Layout Definitions
- **缺口流向**：布局行为进入 `@retikz/layout`；通用 Vanilla runtime 进入 `@retikz/vanilla`

## 约束

- builders 不保存 DOM、生命周期或 renderer 私有状态
