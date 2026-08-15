# @retikz/graph-vanilla 工作指南

本文件覆盖 `packages/diagram/graph-vanilla/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Diagram 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 分组职责

`diagram` 是可复用图式语义、关系模型与算法布局的领域分组。它可以消费 Core / Math / Standard / Layout 的公开能力，但不得向这些底层包反向注入流程、UML、状态、Graph 或 Editor 语义，也不得建立平行 IR、Scene、renderer 或布局底座。

当前落地的基础家族是 Graph。Graph、Flow 与 Graph editor adapter 只在各自 roadmap / ADR 确认后建包；目录分组不要求存在 `@retikz/diagram` 聚合包。

## 包家族

| 包                         | 解决的问题                         | 拥有                                                             | 不拥有                                           |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| `@retikz/graph`         | 提供可独立绘制的可复用图式语义元素 | JSON-safe semantic IR、Core Sugar、Tier 2 Definition 与 lowering | GraphModel、全局拓扑、自动布局、Editor、renderer |
| `@retikz/graph-react`   | 用 React 编写和运行 Graph       | JSX sugar、props → Graph 输入、React runtime 接线             | Graph schema、lowering、Layout、Core 语义     |
| `@retikz/graph-vanilla` | 用无框架 API 编写和运行 Graph   | builder、SSR / mount 编排、Vanilla runtime 接线              | Graph schema、lowering、Layout、Core 语义     |

Graph 三包使用独立 release group `graph` 并保持 lockstep。未来 Flow 或其它 Diagram 上层包可以按兼容版本单向依赖 `@retikz/graph`；Graph 不反向依赖 Flow、Editor 或 renderer。

## 分层与依赖

- `graph` 只依赖 `@retikz/core`、必要的 `@retikz/foundation` / `@retikz/math` 与 `@retikz/layout` 公开 capability，不得依赖 adapter、renderer、Viz、Graph、Flow 或 Editor
- 正式、可持久化的 Graph 元素保留 semantic IR；lower target 复杂度只决定使用普通 expansion 还是 layout-aware Definition。没有独立持久化语义的便捷写法才直接输出 Core IR
- Graph 不复制 Layout FlexLayout、artifact、spacing、axis sizing、clip 或 geometry 算法；公共面不足时先在 Layout owner 冻结并实现最小 composition contract
- `graph-react` 只消费 `graph` 与 `@retikz/react`；`graph-vanilla` 只消费 `graph` 与 `@retikz/vanilla`
- public IR 必须 JSON-safe；ReactNode、DOM、renderer 资源和编辑器运行时状态不得进入 Graph schema
- 流程、UML、状态等完整领域模型与执行语义留在上层；Graph 只提供可复用图式元素

## 当前状态

Graph v0.1 alpha.1 建立三包与发布组，把 Standard alpha.3 已验证的逻辑图能力迁入 Diagram，并统一为 `GraphFrame`、`GraphNode` 与 `GraphConnector` 三类入口。`GraphNode.role` 区分节点语义，`GraphConnector.role` 区分关系语义；alpha.3 撤回缺少真实场景验证的 Callout 完整契约。当前不保留旧组件、旧包、兼容别名或 fallback。

## 验证

结构化文件改动至少对三个受影响包分别运行 Prettier、ESLint、`tsc --noEmit` 与相关测试。公共契约迁移还需验证 Standard 不再导出旧能力、直接 IR / React / Vanilla 等价、docs 类型检查及 SVG / Canvas 可见行为。
