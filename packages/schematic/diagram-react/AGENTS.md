# @retikz/diagram-react 工作指南

本文件覆盖 `packages/schematic/diagram-react/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责

`@retikz/diagram-react` 长期负责把 Diagram JSX、props 与 React lifecycle 调度为 `@retikz/diagram-vanilla` 的共享 authoring input，并复用 `@retikz/react` 的宿主协议与 runtime 接线。

本包不拥有 Diagram schema、resolve、provider、layout、routing、geometry result 或 Scene 语义，也不直接重建 Source IR builder、session 或 renderer 编排。ReactNode、DOM 与组件生命周期不得进入 Diagram 持久化 IR。

## 输入与输出

长期输入是 React JSX 与 props，长期输出是交给 Diagram Vanilla 的类型化 authoring input。具体组件、props、adapter 与 hydration 契约必须由 Diagram roadmap / ADR 确认后建立，并与 direct JSON、Vanilla 表达同一语义。

当前包仅完成发布与构建初始化，公共根导出保持为空；不得在 authoring 设计确认前添加组件、adapter、runtime shim 或 fallback。

## 验证

结构化文件改动至少运行 Prettier、ESLint、`tsc --noEmit`、包测试与 build。公开 authoring 能力建立后还必须验证 direct IR、Vanilla、SSR 与 hydration parity。
