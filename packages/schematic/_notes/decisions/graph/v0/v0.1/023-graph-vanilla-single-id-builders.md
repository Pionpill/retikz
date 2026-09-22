---
description: Graph Vanilla builder 复用唯一领域 id，并将匿名运行时身份留在 Vanilla normalize
keywords: 'Graph、Vanilla、builder、id、InputEmbed、authoring'
---

# ADR-023：Graph Vanilla 的单一身份 Builder

- 状态：Accepted
- 决策日期：2026-09-22
- 关联：[Graph Source](./003-semantic-ir-lightweight-lowering.md) · [Entity](./007-entity-data-geometry.md) · [Relation](./008-relation-data-geometry.md) · [Graph context](./009-composable-graph-context.md) · [ADR-045](../../../../../../kernel/_notes/decisions/v0/v0.5/045-anonymous-input-embed-identity.md)

## 背景与目标

Graph Vanilla 的 builder 先接收一个 embed id，再在第二个对象中接收同样的领域 `id` 与已知 `type`。前者只是 Vanilla runtime 身份，后者才是 Graph Source / Core namespace 的语义身份；常用调用不得因这个实现差异重复声明。

目标是让 Graph、Group、Block、BlockHeader、BlockSection、BlockRow、Entity 与 Relation 的 Vanilla builder 都仅接收本领域字段，并保持 Direct IR、React 与 Vanilla 的同一 Source 契约。

## 决策

每个 Graph Vanilla builder 只接收一个领域 authoring 对象。builder 根据自身种类补充 Source discriminator，不要求作者重复 `type`。对象的显式 `id` 同时用作生成的 `InputEmbed` runtime identity；缺少该字段时，builder 不生成 Graph Source id，交由 Vanilla 产生匿名运行时身份。

Graph 不新增 id 字段、默认 id、namespace、endpoint lookup 或领域 registry。Relation 的 `source` / `target` 继续只引用显式发布到 Core namespace 的目标；匿名 Entity、Group 或 Block 不因 builder 自动身份而可被引用。

## 基础数据结构与公开契约

```ts
entity({
  id: 'client',
  role: 'participant',
  position: [96, 80],
  text: 'Client',
});

entity({
  role: 'event',
  position: [240, 80],
  text: 'Anonymous event',
});

relation({
  id: 'request',
  role: 'flow',
  source: 'client',
  target: 'service',
});
```

Builder input 不包含已知的 `type` 字段，也不包含独立的 embed id 参数。输出的 `InputEmbed` 仍由 `@retikz/vanilla` 拥有；Graph 不公开第二套 embed 模型。

## 行为、失败语义与兼容性

- 默认行为：具名 Graph 元素在 Source / Core namespace 与 Vanilla runtime 中复用同一 id；匿名元素只产生不持久化的 runtime identity
- 失败与诊断：Source id 的重复、Relation 未解析 target、namespace、anchor 与 boundary 继续由 Core 既有规则诊断；匿名运行时身份不改变这些诊断
- 兼容性 / breaking：删除 `entity(embedId, input)` 等旧双参数 builder，不保留别名、overload、fallback 或迁移层
- React / Vanilla 等价性：React API 不改变；同一具名或匿名领域 authoring 在两入口产生等价 Graph Source IR，React 的 JSX 收集继续复用 Vanilla normalize 与匿名 identity 规则
