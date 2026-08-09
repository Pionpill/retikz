# diagram 分组工作指南

本文件覆盖 `packages/diagram/`。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)。涉及 Diagram 能力归属时先读 [`Diagram 制图能力域设计`](../../notes/architecture/diagram-design.md) 与 [`Diagram Notation 完备设计`](_notes/architecture/diagram-notation-complete.md)。

## 分组职责

`diagram` 是可复用图式语义、关系模型与算法布局的领域分组。它可以消费 Core / Math / Standard 的公开能力，但不得向这些底层包反向注入流程、UML、状态、Graph 或 Editor 语义，也不得建立平行 IR、Scene、renderer 或布局底座。

当前落地的基础家族是 Notation。Graph、Flow 与 Graph editor adapter 只在各自 roadmap / ADR 确认后建包；目录分组不要求存在 `@retikz/diagram` 聚合包。

## 包家族

| 包                         | 解决的问题                         | 拥有                                                                   | 不拥有                                                |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `@retikz/notation`         | 提供可独立绘制的可复用图式语义元素 | JSON-safe schema、Core Sugar、Tier 2 composite、Definition 与 lowering | GraphModel、全局拓扑、自动布局、Editor、renderer      |
| `@retikz/notation-react`   | 用 React 编写和运行 Notation       | JSX sugar、props → Notation 输入、React runtime 接线                   | Notation schema、lowering、Standard layout、Core 语义 |
| `@retikz/notation-vanilla` | 用无框架 API 编写和运行 Notation   | builder、SSR / mount 编排、Vanilla runtime 接线                        | Notation schema、lowering、Standard layout、Core 语义 |

Notation 三包使用独立 release group `notation` 并保持 lockstep。未来 Graph 可以按兼容版本单向依赖 `@retikz/notation`；Notation 不反向依赖 Graph、Flow 或 Editor。

## 分层与依赖

- `notation` 只依赖 `@retikz/core`、必要的 `@retikz/math` 与 `@retikz/standard` 公开 capability，不得依赖 adapter、renderer、Viz、Graph、Flow 或 Editor
- Core Sugar 直接输出 Core IR；只有需要局部布局、target、artifact 或多图元 lowering 的语义才建立 Tier 2 composite
- Notation 不复制 Standard FlexLayout、artifact、spacing、axis sizing、clip 或 geometry 算法；公共面不足时先在 Standard owner 冻结并实现最小 composition contract
- `notation-react` 只消费 `notation` 与 `@retikz/react`；`notation-vanilla` 只消费 `notation` 与 `@retikz/vanilla`
- public IR 必须 JSON-safe；ReactNode、DOM、renderer 资源和编辑器运行时状态不得进入 Notation schema
- 流程、UML、状态等完整领域模型与执行语义留在上层；Notation 只提供可复用图式元素

## 当前状态

Notation v0.1 alpha.1 负责建立三包与发布组，并把 Standard alpha.3 的 LogicFrame、Terminal、Stage、Decision、Junction、Connector、Callout 迁入 Diagram。迁移不保留 Standard 转发或兼容别名；公开组件名和字段语义保持不变，canonical namespace 改为 Notation owner。

## 验证

结构化文件改动至少对三个受影响包分别运行 Prettier、ESLint、`tsc --noEmit` 与相关测试。公共契约迁移还需验证 Standard 不再导出旧能力、直接 IR / React / Vanilla 等价、docs 类型检查及 SVG / Canvas 可见行为。
