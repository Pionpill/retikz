# @retikz/diagram-react 工作指南

本文件覆盖 `packages/schematic/diagram-react/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责

`@retikz/diagram-react` 长期负责把 Diagram JSX、props 与 React lifecycle 调度为 `@retikz/diagram-vanilla` 的共享 authoring input，并复用 `@retikz/react` 的宿主协议与 runtime 接线。

本包不拥有 Diagram schema、resolve、provider、layout、routing、geometry result 或 Scene 语义，也不直接重建 Source IR builder、session 或 renderer 编排。ReactNode、DOM 与组件生命周期不得进入 Diagram 持久化 IR。

## 输入与输出

长期输入是 React JSX 与 props，长期输出是交给 Diagram Vanilla 的类型化 authoring input。具体组件、props、adapter 与 hydration 契约必须由 Diagram roadmap / ADR 确认后建立，并与 direct JSON、Vanilla 表达同一语义。

当前包仅完成发布与构建初始化，公共根导出保持为空；不得在 authoring 设计确认前添加组件、adapter、runtime shim 或 fallback。

## 源码组织与导出

- `src/_diagram/` 只承载多个具体 Diagram React 组件共享的 authoring、host、provider 与 runtime 接线，不拥有领域 schema 或 normalization
- `flow`、`tree` 等具体图类型直接使用 `src/<type>/` 一级 owner，并只消费同名 Diagram Vanilla Input 与公共 React 接线；只创建已经实现的类型
- 包根只导出共享 React 能力，不聚合具体图类型；当前 authoring 设计形成前继续保持为空
- 每个具体图类型通过 `package.json` 的显式 `./<type>` subpath 导出，并与 Diagram、Diagram Vanilla 的同名入口保持对称；不使用 wildcard exports 或空入口

## 验证

结构化文件改动至少运行 Prettier、ESLint、`tsc --noEmit`、包测试与 build。公开 authoring 能力建立后还必须验证 direct IR、Vanilla、SSR 与 hydration parity。
