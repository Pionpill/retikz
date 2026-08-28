# ADR-08：Relation 语义封装与 Core Path 复用

- 状态：Accepted
- 决策日期：2026-08-22
- 修订日期：2026-08-23
- 关联：[Entity contract](./07-entity-data-geometry.md) · [Graph context](./09-composable-graph-context.md) · [Standard Shape 与 Marker](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.4/01-diagram-shapes-and-endpoint-markers.md)

## 背景与目标

Relation 是带稳定端点和 Graph 语义、最终下沉为一个 Core Path 的正式元素。它需要 role、kind、predicate、direction 与 endpoint marker 等领域契约，但 route、labels 和实例样式已经由 Core Path 表达，不需要再按 identity 拆分 geometry 与 presentation

本决策把端点、`role → kind → predicate(params)`、有效 direction、Core-compatible route、labels 和实例字段收敛到同一个 Relation record。Graph 不区分 authored route 与自动 route，也不拥有 routing 调度

## 决策

### 单一语义化 Path record

Relation 保存两个有序 Core `NodeTarget` endpoint。source / target 确定记录和 route 的稳定顺序；有效语义方向依次取显式 direction、kind refinement 或 role default，不从页面位置、Path 顺序、marker 或布局方向反推

Relation 可以独立出现在任意 Core 内容树。它直接保存 Core-compatible route、labels 与允许的 Path 实例字段，不保存 routing provider、布局状态、marker geometry 或 renderer 对象。省略 route 时生成 source → target 的直接 Core Path；需要普通无 Graph 语义的线时直接使用 Core Path

### role、kind、predicate 与 direction

role 表达主要关系家族，拥有允许 direction 及每个 direction 的完整 marker / dash 基础结构。kind 表达所属 role 下的稳定子类型，可以收窄 direction 并提供稀疏结构 delta；predicate 使用 JSON-safe params 表达可校验的精确含义，并可进一步解析结构 delta

role 与 kind 使用 `createOpenStringSchema(values)` 暴露内置词汇提示，同时接受任意非空白自定义 key。predicate 当前没有内置名称集合，使用普通非空白字符串。是否注册及语义组合是否合法只由 Relation resolver 判断

`RelationDirection` 是闭合词汇 `none | forward | reverse | both`。direction 只表达语义有向性，不等同于“哪端绘制箭头”；role / kind / predicate 负责把有效 direction 映射为确定的 source / target marker 和 dash

内置 role 的长期结构为：

| role             | default   | allowed                              | marker family |
| ---------------- | --------- | ------------------------------------ | ------------- |
| `association`    | `none`    | `none`、`forward`、`reverse`、`both` | kite          |
| `dependency`     | `forward` | `forward`                            | stealth       |
| `generalization` | `forward` | `forward`                            | normal        |
| `flow`           | `forward` | `forward`、`reverse`、`both`         | circle        |
| `influence`      | `forward` | `forward`、`reverse`、`both`         | square        |

`association.none` 两端无 marker；其它方向把同一 family 的实心 marker 放到对应 endpoint，`both` 放到两端。全部内置 role 的基础 path 为实线

内置 kind 的稳定 delta 为：

| kind                    | role             | direction      | 结构 delta                      |
| ----------------------- | ---------------- | -------------- | ------------------------------- |
| `uml.aggregation`       | `association`    | `none`         | source `openDiamond`，target 无 |
| `uml.composition`       | `association`    | `none`         | source `diamond`，target 无     |
| `uml.realization`       | `generalization` | 继承 `forward` | target `open`                   |
| `provenance.derivation` | `dependency`     | 继承 `forward` | target `openStealth`            |

Workflow 等上层语义通过同一 registry 注册自己的 kind / predicate。Graph 只保存、校验并确定通用关系语义，不执行条件、状态机或领域判断

### 结构、Theme 与实例覆盖

Relation 的结构与 appearance 分开解析：

```text
structure = role recipe
          > kind delta
          > predicate(params) delta

appearance = Graph Theme baseline 与有序 rules
           > 从外到内 graphTheme rules
           > Relation / label 显式 Core-compatible 字段
```

结构决定 marker family、marker existence 和规范 dash；Theme 只能改变颜色、线宽、opacity、marker paint 与 label appearance，不能增删 marker、切换 provider 或改变语义 direction。单个实例的 Path、marker 和 label 字段最终覆盖适用的默认值

Relation selector 可以匹配 role、kind、predicate name、Canonical params 与 direction。字段按 AND 匹配；params 使用递归子集匹配，并且必须同时声明 predicate name。规则按声明顺序执行，后匹配项逐字段覆盖先匹配项

### Core Path、Arrow 与 Standard 的边界

Relation route 是当前 Core 内容树坐标空间中的完整 Path step sequence；step 复用 Core variant，但不携带 label。Relation labels 直接复用 `GeometryLabel`，避免 route step 与 host labels 形成双入口

Graph 不解析 Position、不比较 route 与 endpoint 几何，也不复制 Core namespace 或 NodeTarget lookup。显式 route 的连通性由提供它的作者、Diagram 或 Editor 负责；Core compile 负责解析 route、NodeTarget、namespace、anchor 和 boundary

Relation 复用除明确冲突项外的完整 Core Path lower-facing surface：

- `route` 对应 Path children，`labels` 对应 Path label
- Graph `id`、meta、animations、zIndex、geometry 与 style 字段按 Core 语义透传
- 不开放 Path `kind`、`kindOptions`、`marks`、fill、fillOpacity 与 fillRule
- endpoint marker 由 Relation 结构拥有；开放 area path 或任意 mark 时直接使用 Core Path

Core 拥有 Arrow Definition、registry、marker host、path shrink、Scene 与诊断。Standard 提供可跨领域复用的 marker Definition。Graph 只贡献内置 recipe 实际使用的 provider；自定义 Definition 引用的 provider 必须由调用方显式注入

### Source 与 Definition 契约

```ts
type IRGraphRelation = Readonly<{
  namespace: 'graph';
  type: 'relation';
  id?: string;
  source: IRNodeTarget;
  target: IRNodeTarget;
  role: string;
  kind?: string;
  predicate?: IRGraphPredicateRef;
  direction?: RelationDirection;
  labels?: ReadonlyArray<IRGeometryLabel>;
  route?: ReadonlyArray<IRGraphRelationRouteStep>;
}> &
  Omit<IRPath, 'type' | 'kind' | 'kindOptions' | 'children' | 'label' | 'marks' | 'fill' | 'fillOpacity' | 'fillRule'>;
```

role Definition 必须覆盖全部 allowed directions；kind 的 allowed directions 必须是 role 的非空子集，default 必须属于最终集合。predicate callback 只接收通过自身 schema 的 Canonical params。三类 Definition 分别使用公开 define helper，并进入同一 `GraphDefinitionOptions`

Direct IR、React 与 Vanilla 构造同一个 Relation record。adapter 可以提供 way / builder sugar，但不维护私有 predicate、默认 direction、marker、routing 或错误分支

## 行为、失败语义与兼容性

- id、NodeTarget id、role、kind、predicate name 与 Definition description 必须是非空字符串；id 保持可选
- 未注册或不匹配的 role、kind、predicate，以及 params 校验失败，由 Relation resolver fail-loud
- direction 集合必须非空、无重复并包含 default；kind 只能收窄，不能扩大 role 允许集合
- recipe、delta、predicate callback 或最终 marker provider 非法时 fail-loud，不回退默认箭头
- 重复 Definition key 或不同对象争用同一 key fail-loud，不使用 last-wins 或全局注册
- route step 携带 label 字段时拒绝；省略 route 时生成直接连接
- Source、params、meta、labels 与 route 必须 JSON-safe
- 不根据 label、meta、stroke、marker、相邻 Entity、拓扑或 key 前缀猜测语义
- 旧 relation collections、Graph-only endpoint、presentation / geometry 和默认 terminal arrow 直接删除，不保留兼容路径

## 结果与边界

Relation 已成为同时承载 endpoint、Graph 语义与 Core Path 实例 surface 的单一 Source record，并通过统一 Definition、registry、Theme 和 lowering 主链产出普通 Core Path

自动 routing、显式 route 连通性和领域 predicate definitions 由 Diagram、作者或其它消费者负责。端口等待通用 endpoint 引用能力，不进入当前 Relation contract
