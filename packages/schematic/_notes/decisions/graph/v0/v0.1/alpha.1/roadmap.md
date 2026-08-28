# Graph v0.1 alpha.1 Roadmap

> 状态：已完成。ADR-01～10 均已 Accepted 或 Superseded，Graph / Group / Entity / Relation 已形成 Direct IR、React、Vanilla、Definition、resolve、lowering 与文档闭环。关联：[Graph v0.1 roadmap](../roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md)

## 目标

建立独立 Graph package family，以四类 JSON-safe Source composite 表达通用图式语义：

- Graph：可选 Core Scope 与 `graphTheme` 上下文
- Group：可嵌套的可见包含边界、caption 与 boundary labels
- Entity：Graph 语义与 Core Node lower-facing surface
- Relation：Graph 语义、Core NodeTarget endpoints 与 Core Path lower-facing surface

Graph 不拥有成员数据库、私有引用索引、平行 geometry / appearance model、自动 layout / routing、Variant 视觉轴、Editor session 或 renderer

## ADR

| ADR                                            | 长期决策                               | 状态                                   |
| ---------------------------------------------- | -------------------------------------- | -------------------------------------- |
| [01](./01-graph-package-family.md)             | Graph package family 与 owner 边界     | Accepted                               |
| [02](./02-graph-node-variants.md)              | 撤销 GraphNode Variant 视觉轴          | Superseded by ADR-06 breaking revision |
| [03](./03-semantic-ir-lightweight-lowering.md) | Graph Source IR 与 Core lowering       | Accepted                               |
| [04](./04-remove-callout.md)                   | 撤回 Callout 公共契约                  | Accepted                               |
| [05](./05-graph-element-naming.md)             | Graph / Group / Entity / Relation 命名 | Accepted                               |
| [06](./06-graph-entity-registry-theme.md)      | Graph 语义 registry 与 Theme style     | Accepted breaking revision             |
| [07](./07-entity-data-geometry.md)             | Entity 语义封装与 Core Node 复用       | Accepted                               |
| [08](./08-relation-data-geometry.md)           | Relation 语义封装与 Core Path 复用     | Accepted                               |
| [09](./09-composable-graph-context.md)         | 可选 Graph context 与 Core NodeTarget  | Accepted                               |
| [10](./10-group-composition.md)                | Group 包含、caption 与 boundary labels | Accepted                               |

## 已交付边界

- 三个 Graph 包组成独立 lockstep release group，四类 composite 共用 Graph namespace 和 provider 主链
- Graph / Group children 与 Core `IRChild` 同源；Entity / Relation 可以独立 resolve / lower
- Graph、Group、Entity 与 Relation 的 id 均可省略，且 adapter 不生成默认 id
- Entity 与 Relation 分别复用 Core Node / Path lower-facing surface；结构由语义 Definition 拥有，appearance 由 Theme 与实例字段级联
- Relation endpoint 统一复用 Core NodeTarget 与 namespace；省略 route 时生成直接连接
- Graph Theme 只影响可见 Entity / Relation，显式 Core `theme` 建立新的 baseline
- Group 复用 Core Scope、Standard Surface、Layout 与 Core Node labels，不拥有 child layout 或 routing
- 旧 GraphFrame、GraphNode、GraphConnector、Callout、Container、Variant、成员集合和 Graph-only endpoint 不保留兼容路径
- Workflow、State、UML 执行模型、Diagram 自动布局、端口、Editor session 与 renderer 不属于本 milestone
