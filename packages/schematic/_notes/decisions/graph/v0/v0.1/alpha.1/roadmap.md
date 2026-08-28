# Graph v0.1 alpha.1 Roadmap

> 状态：进行中。ADR-01～10 均已 Accepted，Graph / Group / Entity / Relation 四类 Source composite 已按当前契约形成三入口与文档闭环。关联：[Graph v0.1 roadmap](../roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 目标

建立可发布的 Graph package family，以 Graph、Entity、Relation 与 Group 四类 JSON-safe Source composite 表达通用图式语义。Entity 与 Relation 在各自 record 中组合 Graph 语义和 Core lower-facing 实例字段，可以独立放入任意 Core 内容树；Graph 组合完整 Core Scope surface，并提供可选 `graphTheme`；Group 增加可嵌套的包含边界、框内 caption 与框周 labels，同时接受任意 Core child。Relation 引用复用 Core NodeTarget 与 namespace；Graph 不拥有成员集合、私有引用索引、geometry 数据模型、布局调度、Variant 视觉轴或按 identity 分离的 appearance 投影

## ADR

| ADR                                            | 主题                                                   | 依赖                                                | 状态                                   |
| ---------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- | -------------------------------------- |
| [01](./01-graph-package-family.md)             | Graph package family、owner 与公共边界                 | Diagram design；Core composite contract             | Accepted                               |
| [02](./02-graph-node-variants.md)              | 历史 GraphNode Variant 方案                            | Core Node / color atom                              | Superseded by ADR-06 breaking revision |
| [03](./03-semantic-ir-lightweight-lowering.md) | GraphNode / GraphConnector semantic IR 与轻量 lowering | ADR-01～ADR-02                                      | Accepted                               |
| [04](./04-remove-callout.md)                   | 撤回 Callout 公共契约与完整闭环                        | ADR-01、ADR-03                                      | Accepted                               |
| [05](./05-graph-element-naming.md)             | Entity / Relation 命名与 Graph 源码 owner 迁移         | ADR-01～ADR-04、Schematic Graph 完备设计            | Accepted                               |
| [06](./06-graph-entity-registry-theme.md)      | Graph 语义 registry 与 Theme style                     | ADR-01～ADR-05、Core Composite / Theme              | Accepted breaking revision             |
| [07](./07-entity-data-geometry.md)             | Entity 语义封装与 Core Node 复用                       | ADR-05～ADR-06、Core Node / Theme                   | Accepted                               |
| [08](./08-relation-data-geometry.md)           | Relation 语义封装与 Core Path 复用                     | ADR-05～ADR-07、Core Arrow / Path、Standard Arrow   | Accepted                               |
| [09](./09-composable-graph-context.md)         | Graph 可选上下文与可组合 Relation 引用                 | ADR-06～ADR-08、Core child / NodeTarget / namespace | Accepted                               |
| [10](./10-group-composition.md)                | Group 通用包含、caption 与边界 labels                  | ADR-09、Core Scope / Node label、Layout、Surface    | Accepted                               |

## 完成标准

- `@retikz/graph`、`@retikz/graph-react`、`@retikz/graph-vanilla` 形成独立 lockstep release group
- Graph、Entity 与 Relation 是三类独立 semantic composite，不提供旧公共名称、Graph-only declaration marker、隐式 Graph wrapper 或兼容别名
- `IRGraph` 的 `children` 直接接受完整 Core `IRChild`，root 组合完整 Core `IRScopeProps` 并额外拥有 `graphTheme`；Graph 不维护 semantic member 白名单、集合、索引、membership 或 Variant 默认传播
- Entity / Relation 可以放入任意 Core 内容树并独立 resolve / lower；没有 Graph 祖先时使用当前位置 Core Theme 与 Graph 内置默认
- Graph、Entity、Relation 省略 id 时均不生成 Source id、Core id 或内部模型 identity；只有显式 id 才参与 Core namespace
- 删除 `geometry.entities / relations`、`presentation.entities / relations` 与空 root `presentation` wrapper；同一成员的 identity、语义、内容和 lower-facing 实例字段不再拆分后重组
- Entity 通过排除 role-owned 结构字段复用完整 Core Node instance surface；role definition 直接持有 shape、boundary、padding、cornerRadius 与基础 minimum size，kind / predicate 提供 selector 语义轴，Theme rules 提供 appearance 默认，Entity 显式 appearance 最终覆盖
- Relation 把 Core NodeTarget source / target、direction、route、labels 与获准的 Core Path instance surface 放在同一 record；endpoint 可以引用 Core 已公开寻址的 Node、Coordinate、resolved Scope 及下沉为这些 target 的上层 composite，不建立 Entity-only lookup
- Relation 省略 route 时下沉为 source → target 的直接 Core Path；显式 route 继续是完整 Core route，Graph 不实现自动 routing
- 每个 Tier 2 lower target 默认继承其完整 lower-facing surface；任何 Graph 收窄都必须在对应 ADR 中按字段说明 owner、原因与替代入口
- 语义 resolve 允许暂缺绘制字段，供分析、Diagram 或 Editor 消费；请求 lowering 时缺少所选 Core / Layout target 的必需字段必须 fail-loud
- 作者、Diagram、Editor 或其它消费者负责计算位置、尺寸与显式 route，并写入同一字段；Graph 不记录来源、不合并候选、不定义调度优先级。端口或其它局部连接点不进入本 milestone
- Entity / Relation 分别拥有 Definition、registry、token 与 resolver，并与 Graph 通过同一 `GraphDefinitionOptions` 装配；内置与自定义复用同一路径，不建立万能 registry、Variant registry、Theme `roleRecipes` 或 adapter 私有默认
- Graph Theme style 使用与 Core / Viz 同名的 style selection：Graph 包只维护 Neutral baseline，Docs 通过公开 Definition 注入 Academic、Vibrant、Clean reference styles；旧 `fill` / `mixed` 的视觉意图分别迁入 Vibrant / Clean，不再作为 Source 值
- React 提供 `GraphThemeProvider` 并与 Core / Plot / Table Provider 组合，用于 standalone Graph；embedded Graph / Entity / Relation 与 Vanilla 继续显式传递 Graph Theme definitions。Docs 复用现有 Preview Theme selector，由 Preview host 显式注入 embedded definitions，不新增 Graph 专用选择状态
- 直接 IR、React 与 Vanilla 共享同一 Graph / Group / Entity / Relation Source IR、Definition、resolve 与 lowering；JSX / builder 只提供 authoring sugar
- Graph React standalone 复用 Layout 建立 Scene；嵌入外层 Layout / Scene 时只贡献局部 Graph Scope。与 Core Scope 同名的 properties 在两种模式下都属于 `IRGraph`，standalone-only host props 不进入 Source IR
- Graph context 穿透普通 Core Scope；显式 Core `theme` 的 Scope / Graph 切断外层 `graphTheme`，第三方 composite 内部保持不透明
- Group children 与 Core `IRChild` 同源并可嵌套；Group 不建立 Graph-only child grammar、成员索引或隐式 namespace，也不拥有 children 自动布局
- Group 完整复用 Core Scope surface，外框复用 Standard Surface，caption 只负责框内 title / description 的上下位置与局部排列；外围 labels 直接复用 Core `NodeLabelSchema` / `IRNodeLabel`，不定义 Graph 专属 position、boundary、placement 或几何算法
- Group caption 与 Surface 形成 allocation bounds；边界 labels 只扩展 visual bounds。Group identity 对应 Surface 外框，label 不改变 Relation 连接 Group 时使用的边界
- docs、schema registry、release metadata 与 renderer-neutral 预览以最小 authored IR 为真源，不把 parse / resolve 后的 Canonical 结果冒充用户输入
- Workflow、State、UML 执行模型、Diagram 自动布局、Editor session 与 renderer 不在本 milestone 的 Graph owner 范围
