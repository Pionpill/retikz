# ADR-05：Logic Diagram 跨 adapter authoring 与内部 recipe

- 状态：Superseded（由 [Graph alpha.1 ADR-01](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 取代；2026-08-15）
- 决策日期：2026-08-01；2026-08-08 同步 semantic Node 简化
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01](./01-logic-diagram-profile.md) · [ADR-02](./02-headless-logic-frame.md) · [ADR-03](./03-semantic-logic-nodes.md) · [ADR-04](./04-connector-and-callout.md)
- 后继：[Graph alpha.1 ADR-01](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 已把直接 IR、React、Vanilla 与 docs owner 一并迁入 Graph package family

## 决策

alpha.3 的运行时 composite 能力只有：

```ts
GraphFrameDefinition;
ConnectorDefinition;
CalloutDefinition;
```

GraphNode 按 ADR-03 是 Core Node sugar，不参与独立 Definition 注入、composite registry、artifact collection 或 runtime adapter aggregation。直接 IR 只注入实际使用的 GraphFrame、GraphConnector、Callout Definition

## React authoring

GraphNode 以 Core Node props 为输入，`id` 与 `position` 必填，字符串 children 和 `<Text>` children 由 Core Node builder 处理。GraphFrame 的 header/section marker 仍只服务 authoring；GraphConnector 和 Callout 继续通过 plain props / children 表达自己的 composite 输入

```tsx
<GraphNode id="validate" role="stage" position={[0, 0]}>Validate</GraphNode>
<GraphNode id="accepted" role="decision" position={[120, 0]}><Text>Accepted?</Text></GraphNode>
```

adapter 不写入 ReactNode，不复制 Core layout，不为 GraphNode 生成 definition。GraphFrame、GraphConnector、Callout adapter 继续按各自能力贡献 definition

## Vanilla 与直接 IR authoring

语义 Vanilla builder 直接返回 canonical `IRNode`，调用方传入的 id 原样保留：

```ts
const step = stage('validate', { position: [0, 0], text: 'Validate' });
// step.type === 'node'; step.id === 'validate'
```

`graphFrame`、`graphConnector`、`callout` 仍使用 Vanilla embed 与 adapter，因为它们需要 runtime composite lowering。所有宿主必须保持同一 Core Node JSON 形态

## 内部 recipe

docs 可以组合：

- Process：GraphFrame + GraphNode + GraphConnector
- Class：GraphFrame header/sections + Core Nodes
- Data：GraphNode + GraphConnector

recipe 只使用公开 GraphFrame、Core Node、GraphConnector 和 Callout；不导出 Process/Class/Data，不注册新的 composite type，不增加 recipe schema 或 registry

## 责任与边界

- Standard 拥有三种 composite Definition 及四种 semantic Node Schema/factory
- Standard React/Vanilla 只做宿主 authoring sugar，不建立平行 IR 或 layout
- Core 拥有 Node、shape、text、boundary、layout 和 Scene
- docs 拥有内部 recipe，不把 recipe 变成 package API

## 验证策略

- semantic Node：Schema、factory、React/Vanilla JSON parity 与固定 shape
- composite：Definition 注入、adapter 聚合、缺失 Definition 诊断与 Core Scene
- docs：双语页面、preview、API mapping 和 recipe 不泄漏到 package public surface

## 不在本 ADR 范围

- GraphFrame、GraphConnector、Callout 的独立 schema、lowering 与 artifact
- 领域 workflow、graph store、自动布局与执行模型
