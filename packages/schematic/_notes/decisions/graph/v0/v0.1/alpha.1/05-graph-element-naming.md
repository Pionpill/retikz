# ADR-05：Graph 元素采用 Entity / Relation 命名

- 状态：Accepted
- 决策日期：2026-08-16
- 修订说明：本 ADR 只冻结 Entity / Relation 命名。Variant 相关历史迁移由 ADR-06 的 2026-08-23 breaking revision 删除，不构成现行契约

## 背景与目标

Graph 当前首批元素名称带有 `Graph` 领域前缀。包本身已经提供 Graph 语境，前缀在 React、Vanilla、schema、factory 与 Definition 中重复表达 owner，且把实现名称固定成“Graph 的某种图元”而不是图内部可组合的功能单元。此次迁移将名称收敛为 `Entity`、`Relation`，保留 Graph 作为包、namespace 与类型集合的 owner 语境

目标是让 direct IR、React、Vanilla、目录 owner、schema registry 与 docs 使用同一套短而准确的公共名称，同时不改变任何既有图式行为

## 决策

### 公共元素与 discriminator

Graph 的首批两个元素固定为：

```ts
const GraphType = {
  Entity: 'entity',
  Relation: 'relation',
} as const;
```

`namespace: 'graph'` 保持不变。`Entity` 与 `Relation` 分别保留节点和关系线语义；GraphType 是唯一的 Graph 顶层 discriminator 集合

### 公共契约

- `GraphNode` 迁移为 `Entity`，包括 schema、IR、factory、Definition、provider、role 与 React / Vanilla authoring
- `GraphConnector` 迁移为 `Relation`，包括 schema、IR、factory、Definition、provider、role 与 React / Vanilla authoring
- `GraphElementType` 迁移为 `GraphType`

### Owner 边界

Graph 内部只保留 `entity`、`relation` 与 `shared` 三个 owner。Entity / Relation 专属契约归各自 owner；shared 只保留 Graph namespace 与 GraphType 等真正跨 owner 的词汇。旧名称不提供 re-export、alias 或 shim

### 兼容性与边界

这是 `0.x` 阶段的 breaking naming migration。旧名称、旧 discriminator、旧 adapter kind、旧 docs route 与旧 schema registry 标识直接删除，不提供 deprecated export、migration、fallback 或双轨输入。Graph release group、包名、namespace、字段语义、默认值、lowering、Layout composition 与 renderer-neutral 输出保持不变
