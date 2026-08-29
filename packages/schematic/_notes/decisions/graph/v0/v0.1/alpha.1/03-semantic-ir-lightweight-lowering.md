# ADR-03：Graph semantic Source IR 与 Core lowering

- 状态：Accepted
- 决策日期：2026-08-15
- 修订日期：2026-08-28
- 关联：[Graph package family](./01-graph-package-family.md) · [Entity 命名](./05-graph-element-naming.md) · [Entity contract](./07-entity-data-geometry.md) · [Relation contract](./08-relation-data-geometry.md) · [Graph context](./09-composable-graph-context.md) · [Group contract](./10-group-composition.md)

## 背景与目标

Graph 语义需要在持久化、LLM / 工具处理和跨 adapter 交换时保留，但 Core、Scene 与 renderer 不应解释 Graph 的 role、kind、predicate、direction 或 grouping 词汇。Graph Source 因此只保存领域事实与适用的 Core lower-facing 字段，并在 Graph owner 的 Definition / resolve / lowering 边界消费领域语义

## 决策

### Source discriminator 与持久化边界

Graph Source 使用 `namespace: 'graph'` 和 `GraphType` 的 `graph | group | entity | relation` 四个 discriminator。四类对象均由严格 schema 校验并保持 100% JSON-safe；函数、ReactNode、DOM、renderer resource、layout solver state 与 Editor session 不进入 Source IR

`Graph` 与 `Group` 的 children 直接复用 Core `IRChild`，不建立 Graph-only child union。Entity / Relation 可以独立出现在任意 Core 内容树，也可以作为 Graph / Group 后代

### Entity 与 Relation 的语义 lowering

Entity 保存开放 `role`、可选 `kind` / `predicate` 与非结构性 Core Node instance surface。role Definition 拥有 shape、boundary、padding、cornerRadius 与基础 minimum size；Graph Theme 提供 appearance 默认；实例字段最终覆盖同名 appearance。请求 lowering 时缺少 Core Node 必需 position 必须 fail-loud

Relation 保存开放 `role`、可选 `kind` / `predicate`、有效 `direction`、两个 Core NodeTarget endpoint，以及 Core Path-compatible route、labels 与未冲突的实例字段。role / kind / predicate 决定 marker / dash 结构，Graph Theme 提供 appearance 默认；省略 route 时生成 source 到 target 的直接 Core Path，显式 route 原样交给 Core compile 解析

Entity 与 Relation 分别只下沉为一个普通 Core Node / Path。Graph discriminator 与领域语义不复制到 Scene primitive、renderer payload 或平行 artifact

### Graph 与 Group 的上下文 lowering

Graph 下沉为一个保留完整 Scope surface 的 Core Scope，并把 `graphTheme` 只投影给 Source tree 中可见的 Entity / Relation。Group 组合 Scope、Surface、Layout caption 与 Core Node labels，形成一个可引用的外框和任意 authored body；它同样只把 `graphTheme` 投影给可见的 Entity / Relation 后代

Graph 与 Group 使用 Core layout-aware composite contract，是为了在同次 compile 中保留 Scope / Surface allocation、child replay 与 Group label host 几何；这不表示 Graph 拥有独立 Layout solver 或 Scene

### 三入口 parity

Direct IR、React 与 Vanilla 构造同一 Graph / Group / Entity / Relation Source IR，并注入同一 provider closure。adapter 可以把 JSX children、文本或 way builder 归一为 Source 字段，但不得维护私有 schema、默认 id、registry、Theme、route parser 或错误分支

## 行为、失败语义与兼容性

- 四类 id 均可省略，省略时不生成 Source id、Core id 或内部 model identity
- 未知 discriminator、未知字段和非法 JSON 在 schema 边界拒绝；未注册语义 key 与 provider 在 owner resolver / registry fail-loud
- Relation endpoint 的重复 id、不可见 namespace、未知 target、anchor 与 boundary 继续使用 Core NodeTarget 诊断
- Graph / Group 不收集 member，不建立 membership、Entity-only lookup 或隐式 local namespace
- Core、Scene、SVG 与 Canvas 不新增 Graph discriminator、role、Theme token 或 renderer 分支
- 旧 GraphFrame / GraphNode / GraphConnector、Graph-only route / label / endpoint、presentation / geometry wrapper 与 Variant 输入直接删除，不保留兼容路径

## 结果

四类 Source composite 已通过同一 schema、Definition、resolve、lowering 与 provider 主链落到 Core。Entity / Relation 保留可独立处理的语义记录，Graph / Group 提供可选上下文和可见包含，而所有 renderer 继续只消费普通 Scene
