# schematic 分组工作指南

本文件覆盖当前仍位于 `packages/schematic/` 的 Schematic 分组。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)。涉及 Schematic 能力归属时先读 [`Schematic 制图能力域设计`](../../notes/architecture/schematic-design.md) 与 [`Schematic Graph 完备设计`](_notes/architecture/schematic-graph-complete.md)。

## 分组职责

Schematic 是可复用图式语义、关系模型与算法布局的领域分组。它可以消费 Core / Math / Standard / Layout 的公开能力，但不得向这些底层包反向注入流程、UML、状态、Graph、Diagram 或 Editor 语义，也不得建立平行 IR、Scene、renderer 或布局底座。

Diagram 单向依赖 Graph，拥有布局意图、routing 与几何结果；Flow 是 Diagram 的具体 drawing core，不是 Schematic 聚合入口。Editor 能力由独立 roadmap / ADR 决定。

## 包家族

| 包                        | 解决的问题                                | 拥有                                                                                                                    | 不拥有                                                               |
| ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `@retikz/graph`           | 提供可组合关系语义与可选 Graph 局部上下文 | Graph / Group / Block / Entity / Relation IR、领域 resolve、Graph context、Core-compatible 字段、Definition 与 lowering | 成员数据库、geometry 模型、自动布局、Editor、renderer                |
| `@retikz/graph-react`     | 用 React 编写和运行 Graph 语义元素        | Graph / Group / Block / Entity / Relation JSX sugar、React runtime 接线                                                 | Graph schema、resolve、lowering、Layout、Core 语义                   |
| `@retikz/graph-vanilla`   | 用无框架 API 编写和运行 Graph 语义元素    | Graph / Group / Block / Entity / Relation builder、normalize、SSR / mount 编排与 runtime 接线                           | Graph schema、resolve、lowering、Layout、Core 语义                   |
| `@retikz/diagram`         | 组合完整 Diagram 并提供 Flow drawing core | Presentation / Frame / Diagram Theme、Flow Source、布局意图、自动布局、routing、Graph materialization 与 artifact       | Graph semantic、Core / Layout / Standard primitive、renderer、Editor |
| `@retikz/diagram-react`   | JSX authoring                             | React 宿主与 Diagram Vanilla Input 接线                                                                                 | 领域 normalization、Scene、renderer                                  |
| `@retikz/diagram-vanilla` | 无框架 authoring                          | Input → Diagram Source、SSR / mount 接线                                                                                | 领域 resolve、布局和渲染                                             |

Graph 三包按 `graph` release group 保持 lockstep；Diagram 家族按兼容版本消费 Graph。具体输入、输出及缺口流向见就近包指南。

## 验证

工具链和默认验证范围沿用[根验证策略](../../AGENTS.md#验证策略)。仅当公共契约影响多种入口时，扩大到相关包并核对 direct IR / React / Vanilla 等价；影响可见输出时检查受影响的 SVG / Canvas 行为及双语文档。迁移 Standard 能力时检查旧导出已移除。
