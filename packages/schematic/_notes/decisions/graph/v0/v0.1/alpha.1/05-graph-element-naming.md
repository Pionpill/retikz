# ADR-05：Graph 元素采用 Graph / Group / Entity / Relation 命名

- 状态：Accepted
- 决策日期：2026-08-16
- 修订日期：2026-08-28
- 关联：[Graph package family](./01-graph-package-family.md) · [Graph semantic Source IR](./03-semantic-ir-lightweight-lowering.md) · [Group contract](./10-group-composition.md)

## 背景与目标

Graph package 已经提供领域语境，`GraphNode` 与 `GraphConnector` 的重复前缀不能准确表达图内部的语义单元，也会让 schema、Definition、factory、React 与 Vanilla 名称冗长。当前能力还包含可选 Graph 上下文和可见 Group 边界，需要一套能直接推断职责的稳定名称

## 决策

Graph 顶层 discriminator 统一为：

```ts
const GraphType = {
  Graph: 'graph',
  Group: 'group',
  Entity: 'entity',
  Relation: 'relation',
} as const;
```

- `Graph` 表示可选的 Graph-local Scope / Theme context
- `Group` 表示可嵌套、具有可见边界的内容分组
- `Entity` 表示带 Graph 实体语义并下沉为 Core Node 的记录
- `Relation` 表示带 Graph 关系语义、Core NodeTarget endpoints 并下沉为 Core Path 的记录

`GraphNode` 迁移为 `Entity`，`GraphConnector` 迁移为 `Relation`；迁移覆盖 schema、IR、factory、Definition、provider、registry、React / Vanilla authoring、Docs 和 adapter identity。Graph / Group 直接使用与 discriminator 相同的公共名称

`GraphType` 是 Graph Source composite 的唯一顶层判别集合。Entity / Relation 专属契约归各自 owner；Graph / Group 专属上下文和组合契约归各自 owner；shared 只保留 namespace、GraphType 与真正跨 owner 的词汇

## 行为与兼容性

- `namespace: 'graph'` 保持不变，包名与 release group 不变
- Graph、Group、Entity 与 Relation 的字段、默认、resolve 与 lower target 由各自后续 ADR 冻结
- 旧 GraphElementType、GraphFrame、GraphNode、GraphConnector、旧 discriminator、adapter kind、Docs route 与 schema registry id 直接删除
- 这是 `0.x` breaking naming migration，不提供 re-export、alias、shim、fallback 或双轨输入

## 结果

Direct IR、React、Vanilla、Definition、registry 与 Docs 已统一使用 Graph / Group / Entity / Relation。名称分别对应可选上下文、可见包含、实体和关系，不再把历史组件结构泄漏为长期公共词汇
