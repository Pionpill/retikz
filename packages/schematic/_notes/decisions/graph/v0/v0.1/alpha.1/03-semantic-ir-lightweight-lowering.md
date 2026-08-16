# ADR-03：统一 GraphNode / GraphConnector 的 semantic IR 与轻量 lowering

- 状态：Accepted
- 决策日期：2026-08-15
- 关联：[alpha.1 roadmap](./roadmap.md) · [Graph alpha.1 ADR-01](./01-graph-package-family.md) · [Graph alpha.1 ADR-02](./02-graph-node-variants.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md)

## 背景

alpha.1 的四套节点入口重复表达同一份 Core Node authored surface，连接也容易复制 Core Path 的 routing / appearance 联合。LLM、工具和持久化数据需要的是 Graph 的 role 语义，而不是多个组件名或 lower 后的 shape。统一入口可以减少 schema、Definition、provider、adapter 和文档表面，同时保留 authored Tier 2 语义

## 决策

### GraphElementType

Graph 当前公开 discriminator 只有：

```ts
const GraphElementType = {
  GraphFrame: 'graphFrame',
  GraphNode: 'graphNode',
  GraphConnector: 'graphConnector',
} as const;
```

### GraphNode 使用 role

`GraphNode` 拥有一套 schema、IR、factory、Definition、provider 与 adapter。必填闭合 role 为：

```ts
type GraphNodeRole = 'terminal' | 'stage' | 'decision' | 'junction';
```

role 让 LLM 直接识别语义；它不要求从 Core shape、颜色或几何反推职责。role 提供默认 shape 与相关几何默认值，显式 `shape` 优先。GraphNode 每次只生成一个同 id Core Node，不产生 artifact、Scope、layout compiler 或 renderer 分支

### GraphConnector 使用 role 并复用 Core Path

`GraphConnector` 拥有一套 schema、IR、factory、Definition、provider 与 adapter。必填闭合 role 为：

```ts
type GraphConnectorRole = 'flow' | 'branch' | 'dependency' | 'feedback';
```

canonical JSON 只接受 Core Path Step `children`。factory、React 与 Vanilla 还可接受互斥 `way: WayDSL`，入口使用 Core `parseWay()` 归一。省略 `marks` 时补一个终点箭头，显式数组完整覆盖默认值

GraphConnector Definition 只移除 Graph namespace、Graph discriminator 与 role，输出一个同 id Core stroke Path。role 在 lowering 后丢弃，不复制到 Path `meta`、Scene primitive 或 artifact。Core Path 的 Step、target、label、stroke、fill、dash、line cap / join、transform 与诊断保持唯一真源

### 三入口 parity

直接 IR、React 与 Vanilla 必须表达相同的 GraphNode / GraphConnector canonical IR，并注入相同 Definition。adapter 只负责宿主 authoring 归一，不建立私有 schema、默认值、role registry、variant recipe 或路径 parser

## 行为与兼容性

- schema 只接受 `graphNode` / `graphConnector` 元素 discriminator，并严格拒绝缺失或未知 role；`terminal`、`stage`、`decision`、`junction` 仅作为 GraphNode role 值存在
- GraphNode 与 GraphConnector 均为 JSON-safe semantic IR，可被 LLM、工具和未来 Graph presentation 直接读取
- lower 后 Core Node / Path、Scene 与 renderer 不感知 Graph namespace、type、role、variant
- 旧独立组件、旧 package、旧 namespace、GraphConnector 平行 route surface 与兼容入口直接删除
- 这是 `0.x` breaking change，不提供 alias、migration、fallback 或新旧双轨

## 不在本 ADR 范围

- GraphFrame 的布局算法重写、自动布局与全局 routing
- GraphModel、GraphDocument、GraphGeometry、Flow、Editor 与交互状态
- 新的 Graph role registry、自定义元素 registry 或 renderer 分支
