# @retikz/graph-react 工作指南

本文件覆盖 `packages/schematic/graph-react/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 分组职责

Schematic 是可复用图式语义、关系模型与算法布局的领域分组。它可以消费 Core / Math / Standard / Layout 的公开能力，但不得向这些底层包反向注入流程、UML、状态、Graph、Diagram 或 Editor 语义，也不得建立平行 IR、Scene、renderer 或布局底座。

当前落地的基础家族是 Graph。未来 `@retikz/diagram` 单向依赖 Graph，拥有自动布局、routing 与几何结果；它是实际的上层能力包，不是 Schematic 聚合入口。`flow` 是 Diagram 的具体布局类型或 preset，Graph editor adapter 继续由独立 roadmap / ADR 决定。

## 包家族

| 包                      | 解决的问题                                | 拥有                                                                                                    | 不拥有                                                |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `@retikz/graph`         | 提供可组合关系语义与可选 Graph 局部上下文 | Graph / Entity / Relation IR、领域 resolve、Graph context、Core-compatible 字段、Definition 与 lowering | 成员数据库、geometry 模型、自动布局、Editor、renderer |
| `@retikz/graph-react`   | 用 React 编写和运行 Graph 语义元素        | Graph / Entity / Relation JSX sugar、React runtime 接线                                                 | Graph schema、resolve、lowering、Layout、Core 语义    |
| `@retikz/graph-vanilla` | 用无框架 API 编写和运行 Graph 语义元素    | Graph / Entity / Relation builder、normalize、SSR / mount 编排与 runtime 接线                           | Graph schema、resolve、lowering、Layout、Core 语义    |

Graph 三包使用独立 release group `graph` 并保持 lockstep。v0.1 已按 ADR-07～08 完成 Entity / Relation 单 record Source IR；ADR-09 正在把两者改为独立 composite，并把 Graph 收敛为可选上下文。未来 `@retikz/diagram` package family 可以按兼容版本单向依赖 `@retikz/graph`；Graph 不反向依赖 Diagram、Editor 或 renderer。

## 分层与依赖

- `graph` 只依赖 `@retikz/core`、必要的 `@retikz/foundation` / `@retikz/math` 与 `@retikz/layout` 公开 capability，不得依赖 adapter、renderer、Viz、Diagram 或 Editor
- 正式、可持久化的 Graph 元素保留 semantic IR；lower target 复杂度只决定使用普通 expansion 还是 layout-aware Definition。没有独立持久化语义的便捷写法才直接输出 Core IR
- Graph 不复制 Layout FlexLayout、artifact、spacing、axis sizing、clip 或 geometry 算法；公共面不足时先在 Layout owner 冻结并实现最小 composition contract
- `graph-react` 只消费 `graph` 与 `@retikz/react`；`graph-vanilla` 只消费 `graph` 与 `@retikz/vanilla`
- public IR 必须 JSON-safe；ReactNode、DOM、renderer 资源和编辑器运行时状态不得进入 Graph schema
- Entity 与 Relation 是可独立放入任意 Core 内容树的 semantic composite；Graph 组合完整 Core Scope surface，并额外提供局部 `graphTheme`，不维护成员集合、私有 identity 索引、Graph-only child grammar 或隐式 local namespace
- `graph-react` 的 standalone Graph 复用 React Layout 建立 Scene，embedded Graph 只贡献局部 Scope；与 Scope 同名的 props 始终进入 Graph Source，host-only props 仅在 standalone 合法
- Relation endpoint 直接复用 Core NodeTarget 与 namespace，可以引用 Core 已公开寻址的 Node、Coordinate、resolved Scope 及下沉为这些 target 的上层 composite；Graph 不建立第二套 endpoint 或 lookup
- Graph、Entity 与 Relation 的 id 均为显式 authoring identity；省略时不得由 resolve、lowering 或 adapter 自动生成
- Diagram 复用 Graph 数据，拥有布局意图、约束确定化、provider 编排、自动 routing 与布局结果；不得复制 Graph schema、appearance 或 Theme 契约

## 当前状态

Graph v0.1 alpha.1 已完成 ADR-01～08，ADR-09 为 Proposed。目标契约是 Graph、Entity 与 Relation 三个独立 Source composite：React JSX 分别归一到对应 Source IR，不创建 Graph-only declaration marker、隐式 Graph wrapper、默认 id、appearance 或 geometry wrapper。

## 验证

结构化文件改动至少对三个受影响包分别运行 Prettier、ESLint、`tsc --noEmit` 与相关测试。公共契约迁移还需验证 Standard 不再导出旧能力、直接 IR / React / Vanilla 等价、docs 类型检查及 SVG / Canvas 可见行为。
