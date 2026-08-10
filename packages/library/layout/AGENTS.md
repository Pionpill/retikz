# @retikz/layout 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：提供宿主无关的领域无关容器排版、约束求解、placement、artifact 与 inspection
- **拥有的契约**：Flex / Grid / Overlay schema、Definition、solver、factory、artifact、根入口、`/compose` 与 `/inspect`
- **不拥有的能力**：Core proposal / probe / replay 协议、renderer、算法布局、GraphModel、领域解析、React / Vanilla 生命周期
- **输入与输出**：接收 JSON-safe Layout IR 与 Core layout-aware context，输出普通 Core Scene contribution 和 typed artifact
- **缺口流向**：通用执行协议进入 Core；数学底座进入 Math；authoring 进入对应 adapter；领域模型进入消费包；算法布局进入独立算法能力

## 约束

- canonical namespace 仅为 `layout`
- `/compose` 只导出跨 owner 稳定的无副作用组合能力，不导出私有中间状态或缓存
- `/inspect` 是可选入口，根入口不得静态加载 `@retikz/inspect`
- 第三方布局继续使用 Core CompositeDefinition，不建立 Layout 专用 registry
