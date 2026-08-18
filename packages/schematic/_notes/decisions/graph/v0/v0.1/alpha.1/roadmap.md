# Graph v0.1 alpha.1 Roadmap

> 状态：进行中；ADR-01 至 ADR-06 为 Accepted，ADR-07 至 ADR-09 为 Proposed。关联：[Graph v0.1 roadmap](../roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 目标

建立可发布的 Graph package family，把图式语义从暂时的 Standard owner 迁入 Schematic Graph。首轮冻结 Entity、Relation 与 Container 三类 presentation element；后续在同一 milestone 统一三类成员的 `role → kind → predicate(params)`、variant、Theme selector、Definition / registry 与 data / geometry / presentation 边界，使当前元素 foundation 可以演进为工具、LLM、authored geometry 与未来 Diagram 共用的 Graph 数据模型

## ADR

| ADR                                            | 主题                                                            | 依赖                                                                     | 状态     |
| ---------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| [01](./01-graph-package-family.md)             | Graph package family、owner 与公共边界                          | Diagram design；Core composite contract                                  | Accepted |
| [02](./02-graph-node-variants.md)              | GraphNode role、variant 与 GraphFrame 继承                      | Core Node / color atom                                                   | Accepted |
| [03](./03-semantic-ir-lightweight-lowering.md) | GraphNode / GraphConnector semantic IR 与轻量 lowering          | ADR-01～ADR-02                                                           | Accepted |
| [04](./04-remove-callout.md)                   | 撤回 Callout 公共契约与完整闭环                                 | ADR-01、ADR-03                                                           | Accepted |
| [05](./05-graph-element-naming.md)             | Entity / Relation / Container 命名与 Graph 源码 owner 迁移      | ADR-01～ADR-04、Schematic Graph 完备设计                                 | Accepted |
| [06](./06-graph-entity-registry-theme.md)      | Graph 展示作用域、Entity role / variant registry 与领域主题     | ADR-01～ADR-05、Core Composite / Theme、Schematic Graph 完备设计         | Accepted |
| [07](./07-entity-data-geometry.md)             | Entity data、port、role / kind / predicate 与 authored geometry | ADR-05～ADR-06、Core Node / Theme、Schematic Graph 完备设计              | Proposed |
| [08](./08-relation-data-geometry.md)           | Relation data、端点 marker、语义扩展与 authored geometry        | ADR-05～ADR-07、Core Arrow、Standard Arrow、Schematic Graph 完备设计     | Proposed |
| [09](./09-container-data-presentation.md)      | Container containment data、展示复合与 geometry 分离            | ADR-05～ADR-08、Layout / Standard presentation、Schematic Graph 完备设计 | Proposed |

## 完成标准

- `@retikz/graph`、`@retikz/graph-react`、`@retikz/graph-vanilla` 形成独立 lockstep release group
- Graph 以 `Entity`、`Relation` 与 `Container` 作为三类 presentation element，不提供旧 Notation 包、旧公共名称或兼容别名
- Entity、Relation 与 Container 统一使用 `role → kind → predicate(params)` 表达由粗到细的规范语义，variant 表达独立视觉轴，meta 不参与语义、selector 或 presentation
- `IRGraph` 统一装配三类 data collections、按 identity 引用的 presentation inputs 与 authored geometry；旧任意 `children` 被递归受限的 decoration children 取代
- 三类成员分别拥有 Definition、registry、token 与 resolver，并通过同一 `GraphDefinitionOptions` 装配；不建立万能 registry、跨成员 token bag 或 adapter 私有默认
- Entity data 使用稳定 identity 与 port；authored / Diagram position、size 与 port placement 通过 Entity identity 对齐，shape 与 appearance 只由完整语义和 Theme scope 确定
- Relation data 使用稳定 endpoint、port、direction 与 endpoint marker 语义；支持 `none`、`forward`、`reverse`、`both`，authored / Diagram route 不复制关系语义
- 同一完整 Relation 语义与 Theme scope 使用一致 appearance；Graph 复用 Core arrow host 和 Standard 可扩展通用 marker definitions，predicate params 与 selector rules 可以细化空心、透明度、虚线等特征
- Container containment 以显式 member references 与无环 nesting 为真源；header、regions、Flex / shell 与 `entityVariant` 属于 presentation scope，不再充当 semantic membership
- 三类 presentation 都只消费 Canonical data 与唯一有效 geometry，并下沉为普通 Core / Layout / Standard 输入；Core、Scene 与 renderer 不感知 Graph role、kind、predicate 或 variant
- Entity、Relation、Container data record 不再作为 standalone Core composite；React / Vanilla convenience 必须归一为同一 Graph Source root
- 直接 IR、React 与 Vanilla 共享同一 Graph IR、Definition 与 lowering 路径
- docs、schema registry、release metadata 与 renderer-neutral 预览均以 Graph 路由和公开名称为真源
- ADR-07 至 ADR-09 只冻结 Graph data、resolve、presentation 与 authored / Diagram geometry 的长期边界；Workflow、State、UML 执行模型、Editor 与自动布局实现不在本阶段
