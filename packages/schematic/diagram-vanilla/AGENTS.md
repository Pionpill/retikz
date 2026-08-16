# @retikz/diagram-vanilla 工作指南

本文件覆盖 `packages/schematic/diagram-vanilla/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责

`@retikz/diagram-vanilla` 长期负责把无框架、TypeScript-only 的 Diagram authoring input 归一为 `@retikz/diagram` 公共 Source IR，并复用 `@retikz/vanilla` 的 runtime、SSR 与 mount 接线。

本包不拥有 Diagram schema、resolve、provider、layout、routing、geometry result 或 Scene 语义，也不重新定义 Graph 数据。所有持久化契约和领域行为留在 `@retikz/diagram`，通用运行时行为留在 `@retikz/vanilla`。

## 输入与输出

长期输入是类型明确的 Vanilla authoring input，长期输出是与 direct JSON 和 React 等价的 Diagram Source IR。具体 Input 类型与 `normalizeXxx` 入口必须由 Diagram roadmap / ADR 确认后建立。

当前包仅完成发布与构建初始化，公共根导出保持为空；不得在 authoring 设计确认前添加 builder、normalize、runtime shim 或 fallback。

## 验证

结构化文件改动至少运行 Prettier、ESLint、`tsc --noEmit`、包测试与 build。公开 authoring 能力建立后还必须验证 direct IR 与 React parity。
