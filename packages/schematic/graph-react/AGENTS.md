# @retikz/graph-react 工作指南

本文件覆盖 `packages/schematic/graph-react/`。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，Schematic 分组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 分组职责

Schematic 是可复用图式语义、关系模型与算法布局的领域分组。它可以消费 Core / Math / Standard / Layout 的公开能力，但不得向这些底层包反向注入流程、UML、状态、Graph、Diagram 或 Editor 语义，也不得建立平行 IR、Scene、renderer 或布局底座。

当前落地的基础家族是 Graph。未来 `@retikz/diagram` 单向依赖 Graph，拥有自动布局、routing 与几何结果；它是实际的上层能力包，不是 Schematic 聚合入口。`flow` 是 Diagram 的具体布局类型或 preset，Graph editor adapter 继续由独立 roadmap / ADR 决定。

## 包家族

| 包                      | 解决的问题                                | 拥有                                                                                                                    | 不拥有                                                |
| ----------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `@retikz/graph`         | 提供可组合关系语义与可选 Graph 局部上下文 | Graph / Group / Block / Entity / Relation IR、领域 resolve、Graph context、Core-compatible 字段、Definition 与 lowering | 成员数据库、geometry 模型、自动布局、Editor、renderer |
| `@retikz/graph-react`   | 用 React 编写和运行 Graph 语义元素        | Graph / Group / Block / Entity / Relation JSX sugar、React runtime 接线                                                 | Graph schema、resolve、lowering、Layout、Core 语义    |
| `@retikz/graph-vanilla` | 用无框架 API 编写和运行 Graph 语义元素    | Graph / Group / Block / Entity / Relation builder、normalize、SSR / mount 编排与 runtime 接线                           | Graph schema、resolve、lowering、Layout、Core 语义    |

Graph 三包使用独立 release group `graph` 并保持 lockstep。v0.1 已按 ADR-07～10 建立独立 Graph / Group / Entity / Relation composite。未来 `@retikz/diagram` package family 可以按兼容版本单向依赖 `@retikz/graph`；Graph 不反向依赖 Diagram、Editor 或 renderer。

## 分层与依赖

- `graph` 只依赖 `@retikz/core`、必要的 `@retikz/foundation` / `@retikz/math` 与 `@retikz/layout` 公开 capability，不得依赖 adapter、renderer、Viz、Diagram 或 Editor
- 正式、可持久化的 Graph 元素保留 semantic IR；lower target 复杂度只决定使用普通 expansion 还是 layout-aware Definition。没有独立持久化语义的便捷写法才直接输出 Core IR
- Graph 不复制 Layout FlexLayout、artifact、spacing、axis sizing、clip 或 geometry 算法；公共面不足时先在 Layout owner 冻结并实现最小 composition contract
- `graph-react` 只消费 `graph` 与 `@retikz/react`；`graph-vanilla` 只消费 `graph` 与 `@retikz/vanilla`
- public IR 必须 JSON-safe；ReactNode、DOM、renderer 资源和编辑器运行时状态不得进入 Graph schema
- Group、Block、BlockHeader、BlockSection、BlockRow、Entity 与 Relation 是可独立放入任意 Core 内容树的 semantic composite；Graph、Group、Block、BlockSection 与 BlockRow 组合完整 Core Scope surface。Group 只增加可见边界、caption 与 boundary labels 且不自动排列 authored children；Block 按声明顺序纵向排列任意 children，Header / Section / Row 只是可选组合，Cell 保持 Row-local Flex item
- `graph-react` 的 standalone Graph 复用 React Layout 建立 Scene，embedded Graph 只贡献局部 Scope；与 Scope 同名的 props 始终进入 Graph Source，host-only props 仅在 standalone 合法
- Relation endpoint 直接复用 Core NodeTarget 与 namespace，可以引用 Core 已公开寻址的 Node、Coordinate、resolved Scope 及下沉为这些 target 的上层 composite；Graph 不建立第二套 endpoint 或 lookup
- Graph、Group、Block、Entity 与 Relation 的 id 均为显式 authoring identity；省略时不得由 resolve、lowering 或 adapter 自动生成。Block、Section 与 Row 的显式 id 发布到当前 Core namespace，不自动添加 Block 前缀
- Diagram 复用 Graph 数据，拥有布局意图、约束确定化、provider 编排、自动 routing 与布局结果；不得复制 Graph schema、appearance 或 Theme 契约

## 当前状态

Graph v0.1 alpha.1 ADR-01～10 与 alpha.2 ADR-03 已形成 Accepted 的现行契约，alpha.2 ADR-01 已 Superseded，ADR-02 保持 Proposed。React JSX 分别归一到 Graph、Group、Block family、Entity 与 Relation Source IR；Block 接受任意 children，Header / Section / Row 独立嵌入，Cell 只在 Row 内组装一个 child。authoring 不保存 ReactNode、不创建默认 id，也不解释布局或 endpoint。

## 验证

结构化文件改动至少对三个受影响包分别运行 Prettier、ESLint、`tsc --noEmit` 与相关测试。公共契约迁移还需验证 Standard 不再导出旧能力、直接 IR / React / Vanilla 等价、docs 类型检查及 SVG / Canvas 可见行为。
