# ADR-19：以 qualified spatial handle sidecar 保持 Composite 空间透明

- 状态：Proposed
- 决策日期：2026-08-11
- 关联：[v0.5 roadmap](../roadmap.md) · [alpha.2 roadmap](./roadmap.md) · [Core Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Attached Space Composition](../../../../../../../notes/architecture/attached-space-composition.md) · [能力完备性与模块边界](../../../../../../../notes/architecture/capability-design.md) · [Chart ADR-03](../../../../../../viz/_notes/decisions/chart/v0/v0.1/alpha.1/03-presentation-standard-layout.md)

## 背景与目标

Core 已有 compile occurrence、runtime semantic owner、primitive topology、layout probe / replay 与 observation origin / final provenance。这些能力可以解释“谁生成了哪些 primitive”以及一次 compile 内的展开路径，却没有公开、JSON-safe、renderer-neutral 的语义空间索引。Plot 当前可以用透明 Node carrier 让部分 plotArea 几何进入既有 Core target 路径，但这种绘制辅助物不能成为 view、track、facet panel、axis region、series、datum 等工具链空间的唯一真源。

Chart、Table panel、dashboard composition 和 inspection 需要在外层 composite 包裹、Layout 排列、Standard Surface 与 Scope transform 后继续定位内部空间。如果 Chart 把 Plot lowering 成只有整体 bbox 的黑盒，或由 React / SVG DOM 反推内部区域，就会丢失 Plot 的 identity、domain payload、locator 与 provenance。若各领域各自发布不兼容的 handle registry，则跨 namespace 组合仍无法查询。

本 ADR 的目标是让 composite 在自身局部坐标声明语义矩形 handle，由 Core 在最终 occurrence、Scope 与 replay transform 收敛后发布 qualified world-space sidecar；查询通过闭合 selector vocabulary 完成，Scene 与 renderer 保持不变。

## 决策：Core 发布与 CompileResult 同 revision 的 spatial handle index

Core 增加 JSON-safe spatial declaration、qualified output、index 与纯查询函数。首个版本只支持最终 world-space 轴对齐矩形边界。

```ts
type SpatialHandleDeclaration = Readonly<{
  key: string;
  role: string;
  bounds: Readonly<BoundsRect>;
  tags?: ReadonlyArray<string>;
  payload?: Readonly<JsonObject>;
}>;

type SpatialHandleOwner = Readonly<{
  namespace: string;
  type: string;
  instanceId?: string;
  occurrence: CompileOccurrenceLocator;
}>;

type QualifiedSpatialHandle = Readonly<{
  ownerPath: ReadonlyArray<SpatialHandleOwner>;
  key: string;
  role: string;
  geometry: Readonly<{
    kind: 'rect';
    bounds: Readonly<BoundsRect>;
  }>;
  tags: ReadonlyArray<string>;
  payload?: Readonly<JsonObject>;
  finalOccurrence: CompileOccurrenceLocator;
  originOccurrence: CompileOccurrenceLocator;
}>;

type SpatialOwnerSelector = Readonly<{
  namespace: string;
  type?: string;
  instanceId?: string;
  occurrence?: CompileOccurrenceLocator;
}>;

type SpatialHandleSelector = Readonly<{
  within?: ReadonlyArray<SpatialOwnerSelector>;
  owner?: SpatialOwnerSelector;
  key?: string;
  role?: string;
  tags?: ReadonlyArray<string>;
}>;

type SpatialHandleIndex = Readonly<{
  entries: ReadonlyArray<QualifiedSpatialHandle>;
}>;
```

`CompileResult` 增加同一 candidate revision 生成的 `spatialHandles: SpatialHandleIndex`。它是 Core Runtime / 工具链 sidecar，不进入 Scene；Render、SVG、Canvas 与 SSR renderer 不读取或复制该索引。retained compile 必须让 Scene、artifacts、diagnostics provenance 与 spatial handle index 在同一 revision 原子提交或一起回滚。

理由：

1. 空间 identity 与语义查询跨越 Composite、Scope、layout replay 和 renderer，只有 Core 掌握最终 owner topology 与 transform chain
2. sidecar 可以服务 inspection、composition 与交互准备，同时不污染 renderer execution 的最小 Scene
3. qualified owner path 保留每层 composite 各自的 namespace / identity；若未来 Plot 通过自己的 ADR 发布 handles，外层 Chart 不需要复制其 registry 或重命名内部 key

## Composite 输出契约

轻量 expand composite 不再返回 `IRChild | Array<IRChild>`，而是只返回结构化结果：

```ts
type CompositeExpandResult = Readonly<{
  children: ReadonlyArray<IRChild>;
  spatialHandles?: ReadonlyArray<SpatialHandleDeclaration>;
}>;
```

layout-aware composite 不在顶层 compile result 声明空间，而是把声明附着到它创建的 runtime Scope：

```ts
context.scope(props, children, spatialHandles?);
```

声明使用该 Scope 的局部坐标；bounds 必须是有限、非负尺寸的 local AABB。Core 只有在该 Scope 的 authored transform、placement、父级 scope chain 与 probe / replay remap 全部收敛后才发布 world-space AABB。`LayoutCompositeCompileResult` 不提供 `spatialHandles`，因此不存在既可绑定 Scope、又可绕过 Scope 的双轨。

expand composite 没有 runtime Scope authoring context，继续在 `CompositeExpandResult` 上使用当前 composite allocation coordinate 声明。该坐标明确位于 expand owner 生成的所有 output Scope 之外，不继承这些 Scope 的 transform 或 placement。若同一 expand result 含非空 declaration，且该 owner 直接生成的普通 IR output tree 在进入下一个 composite owner 之前出现带 `placement` 或非空 `transforms` 的 Scope，Core 必须在编译 outputs 前 fail-loud；需要让 handle 继承这种 generated Scope 空间的 owner 必须改用 layout-aware branch，并通过 `context.scope` 的单一 attachment 入口声明。Core 不猜测单根 Scope、不把 declaration 自动绑定到第一个 Scope，也不允许 owner 手算 transform。两种合法入口都由 Core 使用同一 declaration、qualification、validation 与 index 契约消费。

这是对 expand callback 的直接 breaking 替换。所有现有 definitions 在实现阶段迁移为结构化返回，不保留旧返回值 shorthand、运行时形态探测或新旧双轨。没有 handle 的 definition 返回 `{ children }`。

每个 declaration 的 `key` 在当前 composite occurrence 内唯一；layout-aware composite 即使在多个可达 runtime Scope 上附着声明，也共享同一个 owner-local key 空间，重复 key 必须 fail-loud。`context.scope` 调用时立即校验并冻结 declaration 结构，与 Scope props / children 的 callback boundary 行为一致；只有最终 `LayoutCompositeCompileResult.children` 可达 runtime output tree 中的 Scope 才发布声明并参与 duplicate-key 检查。创建后未返回或不再可达的 Scope 不发布 index entry、不占用 key，也不改变可达声明的顺序，但其调用时结构错误仍同步失败。`role` 是 owner 定义的稳定语义词汇；`tags` 是非空、数组内唯一且无顺序语义的精确匹配标签，序列化时保留 authored order；`payload` 保存 owner 定义的 JSON domain 数据。Core 校验结构和局部唯一性，但不解释 role、tag 或 payload 的领域含义。

Core 根据嵌套 composite occurrence 自动形成从外到内的 `ownerPath`。layout-aware 声明虽然附着到 runtime Scope，declaration owner 仍是创建该 Scope 的当前 composite occurrence；Scope 不形成 synthetic owner。声明者是 path 最后一段；外层 composite 只形成前缀，不复制 descendant handle。layout replay 可以改变最终 geometry 与 `finalOccurrence`，但 `originOccurrence` 保留声明来源。该通用不变量由 synthetic third-party nested owners 与 Standard Surface 的正式 `surface` handle 证明；Plot、Table、Chart 的具体 handle vocabulary 仍需各 owner 的独立 ADR。

### Lowering-only 入口边界

公开 `lowerIRToKernel()` 保持只返回 `LoweredIRScene`，不增加不完整或局部坐标的 spatial sidecar。该入口只执行 IR expansion，不拥有 Scene layout、placement、Scope transform 与 replay settle，因此不能把 declaration 正确物化为本 ADR 要求的 qualified world-space handle。

当 `lowerIRToKernel()` 执行的任一 expand definition 返回非空 `spatialHandles` 时，必须在返回 lowered IR 前同步 fail-loud；诊断包含完整 provider key 与当前 occurrence，并明确要求需要空间结果的调用方改用完整 `compileToScene()`。它不得静默丢弃 declaration、返回 local bounds 冒充 world geometry，或增加 ignore 选项形成能力双轨。未声明 handle 或返回空 declaration 数组的 expand definition 仍可按现有 lowering-only 契约使用。

## Identity 分层

spatial handle contract 明确区分以下 identity，不允许相互代替：

- `key`：声明 owner occurrence 内的稳定 local key
- `ownerPath`：嵌套 composite owner instance 的 qualified 路径
- `instanceId`：对应 authored composite IR 的显式 `id`；存在时可用于跨工具查询
- `occurrence`：当前 canonical compile 内的精确 occurrence，始终存在但不承诺 authored reorder 后持久稳定
- `payload` 中的 domain item key：由 Plot、Table 等 owner 解释，不是 Core identity
- runtime primitive identity：服务 retained patch 与 renderer，不是 author-facing spatial selector

显式 id 优先作为 owner instance identity。匿名 composite 只通过当前 compile 的 occurrence 区分；Core 不为其生成全局计数 id，也不承诺在 authored sibling 重排后维持同一持久 identity。需要跨 revision 稳定寻址的作者必须提供 owner 支持的显式 id。

## Selector 与查询语义

Core 提供两个纯查询函数：

```ts
selectSpatialHandles(index, selector): ReadonlyArray<QualifiedSpatialHandle>;
resolveSpatialHandle(index, selector): QualifiedSpatialHandle;
```

selector 字段均为精确过滤：

- `owner` 匹配 declaration owner，也就是 `ownerPath` 最后一段
- `within` 按顺序匹配 `ownerPath` 中 declaration owner 之前的连续祖先子路径，表达 qualified containment，不做几何包含判断；单段可以定位任意深度的一个祖先，多段用于冻结嵌套 namespace 顺序
- owner selector 中的 `instanceId` 用于 authored 稳定查询，`occurrence` 精确匹配对应 `SpatialHandleOwner.occurrence`，也就是 replay / remap 后的最终 settled owner occurrence，用于区分当前 compile 内的匿名或重复实例；它不匹配 `originOccurrence`。`instanceId` 与 `occurrence` 同时给出时必须都匹配
- `key` 与 `role` 匹配 declaration 的 owner-local 值
- `tags` 要求结果包含 selector 给出的全部标签；结果自身可以有额外标签

返回顺序采用最终 compile tree 的深度优先 pre-order，并在每个发布点保留 declaration authored order：expand result declarations 先于该 result 的 outputs；runtime Scope declarations 在进入 Scope 后、其普通 children、nested Scope 与 replay entries 之前发布；兄弟 output / Scope 按 authored order；replay 在 authored replay 位置进入，其内部 entries 保留 transaction 自身的 pre-order。因而外层 Scope-attached handle 先于 descendant handle，同一 owner 的多个可达 Scope 也按 runtime output tree 的 authored pre-order 排列。`selectSpatialHandles` 可以返回零到多项；`resolveSpatialHandle` 要求恰好一项，零项与多项分别以包含 selector 摘要的 miss / ambiguity 诊断 fail-loud。

`key` 不具有全局唯一性。跨 owner 或跨 namespace 查询若不足以唯一定位，必须由调用方增加 `within`、`owner`、显式 instance id 或当前 compile occurrence；Core 不猜测“最近的 Plot”或静默选择第一项。Chart facade 若接受“Chart 内某 Plot handle”输入，必须转换为带 Chart `within` 与 Plot `owner` 的公开 selector，再委托 Core query，不能读取私有 index 或越过 qualified owner path。

## Geometry、Scene 与 renderer 边界

首个版本的 geometry 只提供 world-space rect AABB。旋转、倾斜和其它 affine transform 后取保守 AABB；这与 renderer hit shape、Path 精确轮廓或视觉 alpha mask 不等价。空间索引用于稳定区域定位、组合、inspection 与后续交互准备，不自动创建 Scene primitive、Target、clip 或事件区域。

Scene 继续只保存 renderer execution 所需的 primitives、layout、resources 与 animations。空间 index 不能塞入 Scene `meta`、透明 Node、SVG data attribute 或 Canvas 私有表。已有透明 carrier 若仍服务合法 Core target / authored reference 可以保留，但不得作为工具链 spatial index 的唯一事实，也不得与新 handle identity 混为一谈。

Core 负责将 local bounds 通过最终 transform chain 映射到 world-space；领域 owner 负责声明有意义的 local bounds 与 role。Render 只执行 Scene，不对 index 做二次 transform。SSR、SVG 与 Canvas 消费同一次 Core result，因此不会因后端不同得到不同 spatial geometry。

## 行为、失败语义与兼容性

- 默认行为：无 declaration 的图与当前 Scene 行为相同，并返回空 index
- declaration 校验：空 key / role、同 owner occurrence 跨所有可达 attached Scope 的重复 key、非有限 bounds、负 width / height、非 JSON payload 均 fail-loud；discarded Scope 只保留调用时结构校验，不参与发布或 key 唯一性
- expand output 空间边界：非空 result-level declaration 与 owner 直接生成的 spatial Scope 同时出现时 fail-loud；需要 generated Scope 空间时只能切换到 layout-aware Scope attachment
- transform：所有最终 Scope / placement / replay transform 只应用一次；结果发布 world-space 保守 AABB
- 查询：`selectSpatialHandles` 返回精确匹配的零到多项；`resolveSpatialHandle` 的 miss / ambiguity 与未支持 geometry operation fail-loud，二者都不回读 Scene 或 renderer
- lowering-only：`lowerIRToKernel()` 遇到非空 declaration 同步失败；只有完整 compile 可以发布 qualified world-space index
- breaking：expand callback 统一迁移为 `CompositeExpandResult`；layout-aware declaration 只通过 runtime Scope attachment；`CompileResult` 增加 spatial sidecar；不保留旧返回值或 layout result-level declaration 兼容分支
- React / Vanilla 等价性：相同 IR、definitions 与 compile options 产生完全相同的 qualified entries 与 selector 结果；adapter 不生成或改写 handle

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的 Target / Coordinate、Composition 与 Interaction Readiness 交界；解决嵌套 composite 的 renderer-neutral 空间透明与可查询性
- 主责包与协作包：Core 拥有 declaration、owner qualification、world transform、index 与 query；Plot / Table / Chart / Standard 声明领域 handle；Runtime 原子提交；Render 忽略 sidecar
- 拥有：rect handle、qualified owner path、compile provenance、确定性 index、closed selector vocabulary 与 fail-loud query
- 不拥有：领域 role 目录、domain payload 语义、dashboard 状态、事件派发、hit testing、精确 Path geometry、renderer DOM identity
- 外部扩展与下游闭环：第三方 composite 通过同一 output contract 声明 handle；工具链通过完整 compile 的同一 Core index 查询，不需要注册 selector provider；只需要 lowered IR 的工具继续使用无 declaration 的 `lowerIRToKernel()` 路径
- 不支持边界：不从 primitive 猜测语义，不接受函数 predicate selector，不提供跨 document 全局索引

## 架构验证

- 是否可由现有能力组合：occurrence、observation 与 runtime topology 提供内部 provenance，但没有公开 local declaration、qualified index 或 selector；Scene bbox 也不能保留领域 role 与 owner path
- math / core / render / adapter 责任切分：Math 提供 rect / affine 计算；Core 赋予 owner 与 compile 语义；Render 忽略 sidecar；adapter 只转交同一 CompileResult
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：新增 composite output contract 与 CompileResult sidecar，不新增 authored IR、Scene 字段或 registry。selector vocabulary 闭合，owner role 作为数据发布，不存在动态 implementation lookup
- Scene / manifest / renderer / diagnostics 如何闭环：spatial index 是与 Scene 同 revision 的 headless compile manifest；renderer 无需执行，查询错误由 Core query 报告
- provenance / locator / Interaction Readiness 是否适用：适用；qualified owner、origin / final occurrence 与 domain payload 是空间透明和后续 interaction target 的基础，但本 ADR 不建立交互 runtime
- 结论：扩展 Core 当前 Drawing / compile result 域

## 同类设计验证

- [Vega Scenegraph](https://github.com/vega/vega/blob/main/packages/vega-scenegraph/src/Scenegraph.js)、[GroupItem](https://github.com/vega/vega/blob/main/packages/vega-scenegraph/src/GroupItem.js) 与 [Item](https://github.com/vega/vega/blob/main/packages/vega-scenegraph/src/Item.js) 证明嵌套 group identity 与 bounds 可以支持查询和布局；本 ADR 采用嵌套 owner path 与 settled bounds，但不暴露或复用 mutable renderer scene item
- [Apache ECharts model query](https://github.com/apache/echarts/blob/master/src/util/model.ts) 以 component type、subtype、id / name 组合定位并对重复 identity 设定明确边界；本 ADR 采用结构化 owner / id / role selector，但不把数组 index 当作持久 identity，也不建立全局 model

这些项目共同证明：空间查询需要稳定层级、明确 identity 与已结算 geometry；Retikz 将这些事实放在 Core compile sidecar，而不是把 renderer object 提升为公共模型。

## 被否决方案

- 把 spatial index 写入 Scene：让 renderer execution DTO 承担工具链领域数据，并迫使所有 renderer 复制无用语义
- 由 SVG DOM / Canvas draw list 反推区域：后端不等价，SSR 不可靠，也会丢失 composite owner 与 domain provenance
- Chart 复制 Plot handles 并改名：破坏 Plot identity，形成双 registry，内层 composition 增长时必然漂移
- 只复用 `CompileOccurrenceLocator`：locator 能定位 occurrence，却不表达语义 role、局部 key、world geometry 或 containment query
- 使用生成数组下标作为持久 identity：authored reorder 会改变含义，也无法区分 owner instance 与 domain item
- 首版支持 union / intersection / band / polar / attachment 运算：缺少当前闭环需要，会提前扩大 geometry 与 selector 契约

## 测试策略摘要

测试契约必须覆盖 declaration schema、owner-local key 唯一、expand result 与 layout-aware Scope attachment、expand declaration 与 owner-generated spatial Scope 的冲突、跨多个可达 attached Scope 的重复 key、discarded Scope 的结构校验但无发布 / key 副作用、Scope / placement / rotate / replay 的单次 world transform、origin / final occurrence、匿名与显式 id owner、synthetic third-party nested ownerPath、完整 pre-order、tag all-match、within ancestor 语义、miss / ambiguity 以及 JSON round-trip。类型与 runtime 证据必须拒绝 layout result-level declaration。`lowerIRToKernel()` 证据必须覆盖无 declaration 正常 lowering 与非空 declaration fail-loud。Scene、SVG 与 Canvas 证据必须证明 index 不进入 renderer DTO 且三入口共享相同 Core result；Standard Surface 作为本轮首个产品 owner 在 authored outer Scope 上发布正式 `surface` handle，并证明该 Scope transform 后的 world geometry、先于 descendant 的 index 顺序与外层 Chart qualification。Plot 只做结构化 callback migration 与现有 provenance、locator、lineage、透明 carrier 回归，本 ADR 不定义或测试 `plotArea` 等 Plot role、key、payload。

## 不在本 ADR 范围

- band、point、path、polygon、union、intersection、polar region 或 attachment operation
- renderer hit-test、pointer / keyboard event、selection、intent、tooltip 或 dashboard runtime
- 跨 document / 跨 revision 自动匹配匿名 occurrence
- 从 Scene、primitive、DOM、Canvas 或透明 carrier 反向生成领域 handle
- Chart / Plot / Table 的具体 role、payload、facade 与公开 selector convenience
