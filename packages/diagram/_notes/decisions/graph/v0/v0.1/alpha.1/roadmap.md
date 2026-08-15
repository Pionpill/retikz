# Graph v0.1 alpha.1 Roadmap

> 状态：已完成；ADR-01 与 ADR-02 为 Accepted。关联：[Graph v0.1 roadmap](../roadmap.md) · [Diagram Graph 完备设计](../../../../../architecture/diagram-graph-complete.md) · [Diagram 制图能力域设计](../../../../../../../../notes/architecture/diagram-design.md)

## 目标

建立可发布的 Graph package family，把图式语义从暂时的 Standard owner 迁入 Diagram Graph。首轮只冻结三类共享元素：`GraphNode`、`GraphConnector` 与 `GraphFrame`。GraphNode 与 GraphConnector 保留 authored Graph IR，分别轻量下沉为 Core Node 与 Core stroke Path；GraphFrame 复用 Layout 的布局组合能力

## ADR

| ADR | 主题 | 依赖 | 状态 |
| --- | --- | --- | --- |
| [01](./01-graph-package-family.md) | Graph package family、owner 与公共边界 | Diagram design；Core composite contract | Accepted |
| [02](./02-graph-node-variants.md) | GraphNode role、variant 与 GraphFrame 继承 | Core Node / color atom | Accepted |

## 完成标准

- `@retikz/graph`、`@retikz/graph-react`、`@retikz/graph-vanilla` 形成独立 lockstep release group
- Graph 只导出 `GraphNode`、`GraphConnector` 与 `GraphFrame` 三类语义元素，不提供旧 Notation 包或兼容别名
- GraphNode 使用单一 schema、factory、Definition、provider 与 adapter，通过闭合 `role` 区分 `terminal`、`stage`、`decision` 与 `junction`
- GraphConnector 使用单一 schema、factory、Definition、provider 与 adapter，通过闭合 `role` 区分 `flow`、`branch`、`dependency` 与 `feedback`
- GraphNode 与 GraphConnector 的 role 在 lowering 后丢弃，Core Node / Path、Scene 与 renderer 不感知 Graph 语义
- GraphFrame 的 `graphNodeVariant` 只继承到后代 GraphNode，不影响外壳、divider、GraphConnector 或兄弟分支
- 直接 IR、React 与 Vanilla 共享同一 Graph IR、Definition 与 lowering 路径
- docs、schema registry、release metadata 与 renderer-neutral 预览均以 Graph 路由和公开名称为真源
- GraphModel、GraphDocument、GraphGeometry、Flow、Editor 与自动布局不在本阶段实现
