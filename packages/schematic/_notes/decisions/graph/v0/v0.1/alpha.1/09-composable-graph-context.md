# ADR-09：Graph 可选上下文与可组合 Relation 引用

- 状态：Accepted
- 决策日期：2026-08-22
- 关联：[Graph alpha.1 roadmap](./roadmap.md) · [Entity contract](./07-entity-data-geometry.md) · [Relation contract](./08-relation-data-geometry.md)

## 背景与目标

Entity 与 Relation 可以独立下沉为 Core Node 与 Path，但旧 Graph Source 把它们限制为 Graph root 的直接成员，并由 Graph 建立 Entity identity 索引。这让 Graph 变成成员数据库，也阻止 Relation 连接普通 Core Node 或其它已经通过 Core namespace 发布引用几何的内容

Graph 的长期职责只是提供可选 `graphTheme` 与完整 Core Scope surface。它不应成为 Entity / Relation 的必需父节点，也不应复制 Core 的 identity、namespace、target lookup、样式级联和重复 id 诊断

## 决策

### Graph 是可选上下文薄壳

`IRGraph.children` 与 Core `IRChild` 同源，可以包含 Graph semantic composite、普通 Core 内容、Layout、Plot、Table 和其它已注册 composite。Graph 不维护成员白名单、集合、索引、membership 或 Graph-root 重复检查

Graph 组合完整 `IRScopeProps`，并原样下沉为一个 Core Scope。id、localNamespace、Core `theme`、transform、placement、default channels、resetStyle、zIndex、clip、boundingShape、meta 和 animations 保持 Core 的字段名、默认、继承与诊断。Graph 不自动建立 local namespace，也不生成默认 id

`graphTheme` 是 Graph 唯一新增的领域上下文，只影响 Entity / Relation。Graph 本身不拥有 child layout；独立渲染时由普通 Layout host 建立 Scene，嵌入已有 Scene 时只贡献该 Scope。width、height、viewBox、renderer、runtime 和 DOM props 属于 standalone host，不进入 Source IR

### Entity 与 Relation 是独立 composite

Entity 与 Relation 在任意接受 Core child 的位置都合法，不要求 Graph 祖先。两者使用自身 Definition、registry、resolver 与 lowering；没有 Graph 时使用当前位置 Core Theme 对应的 Graph Theme baseline

Graph、Entity 与 Relation 的 id 都保持可选。省略 id 时不生成 Source id、Core id 或内部 model identity；显式 id 才向 Core namespace 发布对应 lower target

### Graph Theme 传播边界

`graphTheme` 沿 schema 可见的 Source 内容树向 Entity / Relation 传播：

- 普通 Core Scope 不切断继承
- 嵌套 Graph / Group 按从外到内的顺序叠加显式 layer
- 带显式 Core `theme` 的 Scope、Graph 或 Group 建立新 baseline，并切断外层 `graphTheme`
- 第三方 composite 内部保持不透明，Graph 不猜测其生成内容

该上下文只存在于 lowering 的中间消费态，不进入 authored Source，不增加 Core context bag，也不改变普通 Core、Plot、Table 或 renderer。Entity / Relation 的显式 appearance 始终具有最高优先级

### Relation endpoint 复用 Core NodeTarget

Relation source 与 target 直接使用 `IRNodeTarget`，由 Core 按当前 namespace frame 解析 id、anchor、offset 与 boundary。可引用目标包括带 id 的 Node、Coordinate、resolved Scope，以及把 id 下沉为这些 Core target 的上层 composite

仅保存 provenance id、Path id、artifact key 或 spatial handle，但没有发布 Core NodeTarget 几何的内容，不自动成为 Relation endpoint。Graph 不建立第二套 target、handle 或 lookup，也不提前检查 endpoint 是否属于某个 Graph

省略 route 时 Relation 生成 source → target 的直接 Core Path；显式 route 是当前绘制几何的权威输入。Graph 不执行自动 routing、避障或 route 连通性校验

### Source 与 authoring

```ts
type IRGraph = IRScopeProps &
  Readonly<{
    namespace: 'graph';
    type: 'graph';
    graphTheme?: IRGraphThemeLayer;
    children?: ReadonlyArray<IRChild>;
  }>;
```

Direct IR、React 与 Vanilla 构造同一 Graph / Entity / Relation Source IR。adapter 可以提供 endpoint string、way、builder 或 JSX sugar，但必须在 normalize 边界收敛，不维护成员索引、默认 id、Theme 默认或 endpoint lookup

## 行为、失败语义与兼容性

- Graph children 接受任意合法 Core child；未知 composite 由 Core registry 诊断
- Graph Scope surface 完整沿用 Core 语义，不建立 Graph 专用默认或错误分支
- standalone Graph 建立一个 Scene，embedded Graph 只生成一个 Scope
- Entity / Relation 没有 Graph 祖先时仍可 resolve / lower
- 省略 id 不产生任何 identity；只有显式 id 参与 Core namespace
- Relation endpoint 使用 Core NodeTarget 的 lookup、anchor、boundary、offset 与诊断
- `theme` 保持 Core Theme 语义，`graphTheme` 只影响可见 Entity / Relation
- 旧 Graph-local `theme`、Graph-only endpoint、成员索引、隐式 Graph wrapper 和 Variant 轴直接删除，不保留 alias 或 fallback

## 结果

Graph 已收敛为可选 Scope / Theme context；Entity 与 Relation 是可独立组合的 semantic composite，所有 identity 和引用统一复用 Core namespace 与 NodeTarget
