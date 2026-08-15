# ADR-03：GraphNode role 语义（历史验证）

- 状态：Superseded（由 [Graph alpha.1 ADR-01](../../../../../../../diagram/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 取代；2026-08-15）
- 决策日期：2026-08-01；2026-08-08 简化为 Core Node sugar
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01](./01-logic-diagram-profile.md) · [ADR-02](./02-headless-logic-frame.md)
- 后继：[Graph alpha.1 ADR-01](../../../../../../../diagram/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 已把四个 Core Node sugar 统一迁入 `GraphNode.role`；迁移不改变其 Core Node 等价语义

## 背景与目标

流程图和架构图需要少量稳定的逻辑词汇：流程起止、处理步骤、条件分支和分叉/汇合点。Core `Node` 已经拥有位置、文本、shape、padding、minimumSize、boundary 与样式等完整能力；语义单元不应复制 Node 的布局或渲染机制

## 决策

四个公开组件都是 Core `Node` 的语义 sugar：

```ts
type TerminalInput = Omit<NodeInput, 'shape'> & { id: string };
type StageInput = Omit<NodeInput, 'shape'> & { id: string };
type DecisionInput = Omit<NodeInput, 'shape'> & { id: string };
type JunctionInput = Omit<NodeInput, 'shape'> & { id: string };
```

canonical 输出统一为 `IRNode`，顶层 `type` 始终为 `'node'`。不再有 `namespace`、独立 semantic discriminator、`content`、`appearance`、`role`、`category`、Definition、layout compile 或 artifact。所有 Node props 继续按 Core 契约工作；文本可以直接写字符串，也可以使用 `<Text>`

每个 Schema 通过英文 `.describe(...)` 声明逻辑职责：

| 单元     | 固定 shape                                                      | 职责                    | 默认值                                            |
| -------- | --------------------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| Terminal | rectangle，cornerRadius `1_000_000`（由 Core clamp 为 capsule） | flow start/end          | minimum `48 × 24`，padding `{ x: 12, y: 6 }`      |
| Stage    | rectangle，cornerRadius `8`                                     | process/action          | padding `8`                                       |
| Decision | `diamond`，宽高比 `1.8`                                         | condition/branch        | padding `{ x: 3, y: 2 }`                          |
| Junction | `circle`                                                        | fork/merge/continuation | minimum `8 × 8`，padding `0`，fill `currentColor` |

`shape` 是组件私有固定值，Schema 和 adapter 都拒绝/覆盖替换 shape；其它 Node style 与 geometry props 可以正常覆盖。Terminal 的 capsule 使用 Core rectangle shape，Core 几何会按最终尺寸 clamp 半径

## 跨宿主 authoring

- Standard factory 解析对应 Schema，返回 `IRNode`
- React 组件把自身 props 与字符串或 `<Text>` children 交给 Core `Node` builder，再用对应 Schema 归一
- Vanilla `terminal`、`stage`、`decision`、`junction` builder 直接返回 `IRNode`，使用调用方传入的原始 id；它们不需要 adapter 或 Definition
- GraphFrame、GraphConnector、Callout 仍按各自 ADR 保留 composite / adapter；它们可以把 GraphNode 当作普通 Core child

三种 authoring 面的 GraphNode 输出必须保持 JSON 等价，renderer 不增加逻辑专有分支。Node 的位置和布局由 Core 负责；GraphFrame 若需要分组布局，复用既有 FlexLayout lowering

## 失败语义与边界

- 空 `id`、缺失 `position`、非法 Core Node 字段或非法固定 shape fail-loud
- 语义单元不拥有 graph store、执行条件、outcome、端口、连接集合、拓扑验证或自动布局
- Connector / Callout 只引用 Node 的 authored `id`，关系语义不写回 Node

## 包边界

- Standard：四个语义 Schema、factory、类型别名和默认 shape
- Standard React：React Node sugar 与 `<Text>` children 归一
- Standard Vanilla：直接 Node builder
- Core：Node schema、文本、shape、boundary、布局与 Scene
- GraphFrame / GraphConnector / Callout：各自 composite 能力，不由 GraphNode 复制

## 验证策略

- Schema：四种固定 shape、默认值、职责 describe、Node props 和错误输入
- Factory：输出 `type: 'node'`、无 namespace/appearance/content、JSON 可序列化
- React：字符串 children、`<Text>` children、与 Core Node 等价、无 semantic Definition
- Vanilla：builder 直接返回 Node、保留原始 id、无 semantic adapter
- Integration：GraphNode 可作为 GraphFrame、GraphConnector、Callout 的普通 Core child

## 不在本 ADR 范围

- GraphFrame 的区域布局与 artifact
- Connector / Callout 的 routing、placement、leader 与 artifact
- Process、Class、Data 等领域 recipe 或 graph/workflow 模型
