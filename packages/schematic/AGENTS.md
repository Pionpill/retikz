# schematic 分组工作指南

本文件覆盖当前仍位于 `packages/schematic/` 的 Schematic 分组。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)。涉及 Schematic 能力归属时先读 [`Schematic 制图能力域设计`](../../notes/architecture/schematic-design.md) 与 [`Schematic Graph 完备设计`](_notes/architecture/schematic-graph-complete.md)。

## 分组职责

Schematic 是可复用图式语义、关系模型与算法布局的领域分组。它可以消费 Core / Math / Standard / Layout 的公开能力，但不得向这些底层包反向注入流程、UML、状态、Graph、Diagram 或 Editor 语义，也不得建立平行 IR、Scene、renderer 或布局底座。

当前落地的基础家族是 Graph。未来 `@retikz/diagram` 单向依赖 Graph，拥有自动布局、routing 与几何结果；它是实际的上层能力包，不是 Schematic 聚合入口。`flow` 是 Diagram 的具体布局类型或 preset，Graph editor adapter 继续由独立 roadmap / ADR 决定。

## 包家族

| 包                      | 解决的问题                             | 拥有                                                                                            | 不拥有                                             |
| ----------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `@retikz/graph`         | 提供通用关系数据与可独立绘制的图式呈现 | JSON-safe Graph IR、Graph resolve、authored geometry、Core Sugar、Tier 2 Definition 与 lowering | Diagram 自动布局、Editor、renderer                 |
| `@retikz/graph-react`   | 用 React 编写和运行 Graph              | JSX sugar、props → Graph 输入、React runtime 接线                                               | Graph schema、resolve、lowering、Layout、Core 语义 |
| `@retikz/graph-vanilla` | 用无框架 API 编写和运行 Graph          | builder、SSR / mount 编排、Vanilla runtime 接线                                                 | Graph schema、resolve、lowering、Layout、Core 语义 |

Graph 三包使用独立 release group `graph` 并保持 lockstep。当前 v0.1 只实现 Container、Entity、Relation 等元素 foundation；通用节点、关系、分组、端口模型与 Graph resolve 仍需后续 Graph milestone ADR。未来 `@retikz/diagram` package family 可以按兼容版本单向依赖 `@retikz/graph`；Graph 不反向依赖 Diagram、Editor 或 renderer。

## 分层与依赖

- `graph` 只依赖 `@retikz/core`、必要的 `@retikz/foundation` / `@retikz/math` 与 `@retikz/layout` 公开 capability，不得依赖 adapter、renderer、Viz、Diagram 或 Editor
- 正式、可持久化的 Graph 元素保留 semantic IR；lower target 复杂度只决定使用普通 expansion 还是 layout-aware Definition。没有独立持久化语义的便捷写法才直接输出 Core IR
- Graph 不复制 Layout FlexLayout、artifact、spacing、axis sizing、clip 或 geometry 算法；公共面不足时先在 Layout owner 冻结并实现最小 composition contract
- `graph-react` 只消费 `graph` 与 `@retikz/react`；`graph-vanilla` 只消费 `graph` 与 `@retikz/vanilla`
- public IR 必须 JSON-safe；ReactNode、DOM、renderer 资源和编辑器运行时状态不得进入 Graph schema
- Graph 拥有通用节点、关系、分组、端口、identity、authored geometry 与可复用图式呈现；流程、UML、状态等领域规则与执行语义留在上层
- Diagram 复用 Graph 数据，拥有布局意图、约束确定化、provider 编排、自动 routing 与布局结果；不得复制 Graph schema、presentation 或 Theme 契约

## 当前状态

Graph v0.1 alpha.1 建立三包与发布组，把 Standard alpha.3 已验证的逻辑图能力迁入当前 Schematic 分组，并统一为 `Container`、`Entity` 与 `Relation` 三类入口。`Entity.role` 区分节点语义，`Relation.role` 区分关系语义；alpha.3 撤回缺少真实场景验证的 Callout 完整契约。当前不保留旧组件、旧包、兼容别名或 fallback。

## 验证

结构化文件改动至少对三个受影响包分别运行 Prettier、ESLint、`tsc --noEmit` 与相关测试。公共契约迁移还需验证 Standard 不再导出旧能力、直接 IR / React / Vanilla 等价、docs 类型检查及 SVG / Canvas 可见行为。
