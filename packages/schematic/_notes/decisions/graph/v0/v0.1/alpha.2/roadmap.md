# Graph v0.1 alpha.2 Roadmap

> 状态：已完成；关联：[Graph v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](../alpha.1/roadmap.md) · [alpha.2 ADR-01](./01-semantic-ir-lightweight-lowering.md)

## 目标

收敛 Graph 的节点与连接入口：GraphNode 和 GraphConnector 各自只保留一套 schema、factory、Definition、provider、React 组件与 Vanilla adapter，通过闭合 role 传达 Tier 2 语义，并在 lowering 后复用 Core Node / Path

## ADR

| ADR | 主题 | 状态 |
| --- | --- | --- |
| [01](./01-semantic-ir-lightweight-lowering.md) | GraphNode / GraphConnector semantic IR 与轻量 lowering | Accepted |

## 完成标准

- GraphElementType 只包含 `graphFrame`、`graphNode`、`graphConnector`
- GraphNode 的 role 为 `terminal`、`stage`、`decision`、`junction`
- GraphConnector 的 role 为 `flow`、`branch`、`dependency`、`feedback`
- GraphConnector 的 `way` 只存在于作者输入，canonical JSON 只保存 `children`
- direct IR、React、Vanilla 进入同一 factory / Definition / Core compile 主链
- role 与 variant 在 lower 后不泄漏到 Core Node、Path、Scene 或 renderer
- 删除旧的独立节点组件、旧 discriminator、平行连接 surface 和兼容层
