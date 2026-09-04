# ADR-05：Flow Orchestration、Result 与 Artifact

- 状态：Accepted
- 决策日期：2026-08-30
- 关联：[Diagram v0.1 roadmap](../roadmap.md) · [ADR-03：Flow Source 模型与 LLM-first Authoring](./03-flow-source-model.md) · [ADR-04：Flow Layout Definition 与 Registry](./04-flow-layout-definition-registry.md) · [ADR-07：Flow 平级 Source、Group 与 Layout](./07-flow-catalog-source-layout-groups.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

ADR-03/07 已冻结唯一、LLM-first 的 `IRFlowDiagram` Source：Entity / Group / Layout 平级声明，owner-side `children` 经过 resolve 后形成唯一递归 Canonical tree。ADR-04 已冻结同步、原子的 `FlowLayoutDefinition` 及 Layout placement context：provider 接收已测量层级与完整布局意图，保留 authored Layout 的固定排列，再返回 element bounds、relation point chain 与可选 label bounds。它们尚未决定 Source 如何在一次真实 Core compile 中完成 Graph appearance 解析、测量、capability preflight、provider dispatch、输出验证、Graph 物化、Diagram Foundation 装配，以及调用方最终从哪里取得稳定几何

如果公开一个预计算 geometry Source 或把 provider output 写回 Flow / Graph Source，会同时保存 authored facts 与派生结果，并要求调用方维护失效关系；如果在 adapter、renderer 或多个公开 composite 之间分阶段传递测量和布局结果，则 Direct IR、Vanilla、React、Scene 与 artifact 容易形成不同入口和不同几何真源。仅返回 Scene 又不足以让 Inspect、导出、LLM 工具或后续交互按 authored id 取得布局区域和 relation route

本决策冻结 FlowDiagram 的单次同步编排边界、Graph Group shell measurement 缺口、Layout placement、provider output 的规范化与物化规则、Core `CompileResult` 下的唯一公共 Result、renderer-neutral `FlowDiagramArtifact`、spatial handles、identity / provenance 与可修复 diagnostics。它保持 ADR-01～04 的 Foundation、布局 Definition 与 provider 输入输出不变；Source containment 与 Group / Layout 边界以 ADR-07 为准

## 决策

### 一个顶层 layout-aware Flow composite 完成原子编排

`IRFlowDiagram` 由一个 `namespace: 'diagram'`、`type: 'flow'` 的 layout-aware Composite Definition 消费。它在同一次同步 callback 和同一个有效 Core Theme / provider assembly 中完成：

```text
Flow Source resolve 与 Graph 语义投影
→ Graph appearance / layout intent 确定
→ element、Group shell 与 relation label 真实测量
→ Flow layout capability preflight
→ FlowLayoutDefinition.layout + Layout placeLayout
→ output 脱离、规范化与验证
→ render-ready Graph materialization 与 probe
→ Diagram Foundation regions / Surface 装配
→ Scene children、FlowDiagramArtifact 与 spatial handles
```

这些阶段是一个 compile transaction，不建立公开的 measure result、prelayout result、Graph geometry Source、resume token 或第二个 `compileFlowDiagram()`。Core `compileToScene()` 继续是唯一编译入口；Core layout-aware callback、`layoutChild()`、one-use replay、artifact envelope 与 spatial handle index 继续是编排和输出底座

provider output 只在 callback 内作为 transient 输入。通过验证后形成一次 canonical layout geometry；同一值驱动 Graph placement / route 物化，并在 Foundation placement 后确定性投影为 artifact。Flow Source、Graph Source、provider output、artifact 与 Scene 不得分别维护可独立修改的几何副本

### Flow 只用真实 Graph 语义测量和绘制

Flow resolve 把每个 authored Entity 与 Group id 原样投影到对应 Graph record，并按 Source relations 顺序投影没有 Path id 的 Graph Relation records；Layout 保留 Flow authored id 与递归 scope，但不生成 Graph record。同一次 Graph Definition options 解析 role、kind、direction、Graph Theme 与 appearance。测量必须 probe 最终会使用的 Graph / Core child；不能用字符数、DOM、renderer 回读、固定节点尺寸或 Diagram 私有 shape / text 算法估算

Entity 的 measured leaf size 不包含 Flow margin。Entity margin 在进入 provider input 前由 Graph 同源字段解析为独立 insets，最终 placement 已消费该 margin，render-ready Graph 不再把它作为第二次外边距应用。relation label 使用最终 Graph Geometry Label text、font、opacity 与同一个 Core text measurer取得固定 label size；Flow 不增加独立 label primitive

Group shell 的默认 padding、caption、caption item gap、caption body gap、Surface appearance 与组合顺序继续由 Graph 拥有。Graph 提供最小、同步、公开的 Graph-owned shell measurement / composition 投影：它接收已解析 Group shell 与 Core measurement 上下文，使用 Graph 自己的 caption lowering 和 Layout / Surface 组合真源，返回 ADR-04 所需的 `minimumSize` 与 `contentInsets`，并能以一个给定 body allocation 构造同源的精确 Group shell。Graph 自身 Group lowering 与该投影共享同一组合来源；Diagram 不复制 Graph 默认常量、caption child、Flex 算术或 Surface proposal 规则。Layout 不调用 Graph shell measurement；Flow 将其 direct children 的真实 size / margin 交给 Flex placement context，再把结果作为固定 compound box 交给 provider。这些投影不接收 Flow relation 或自动布局状态，也不让 Graph / Layout 拥有 Flow 自动布局

全部 measurement 结果都是 compile-local probe。replay token、Graph canonical 私有状态、Text layout、Surface artifact 或 provider engine payload 不进入 Source、public artifact 或缓存

### provider output 先规范化，再成为唯一 layout geometry

ADR-04 的 id、顺序、尺寸、scope containment、Layout 固定 placement、margin collision、route、label coverage 与 capability 不变量全部在 Graph materialization 前验证。Retikz 把 provider output 深度脱离并递归冻结，拒绝非 plain-data / JSON-safe 值、Promise、非有限数值、缺失 / 多余 / 重复 id 与任何违反 Definition output contract 的记录

point chain 使用以下唯一规范形态：`-0` 规范化为 `0`，相邻重复点折叠；折叠后仍须至少两个点。straight route 必须恰有起终点；orthogonal route 的每个相邻非零 segment 必须轴对齐。首尾点必须落在对应 source / target layout bounds 内或边界上；它们用于验证 provider 对 endpoint 与出入方向的计算，不成为 Graph 的手写绝对 endpoint

规范化后的 root-local geometry 是 drawing core 内唯一权威布局值。Graph probe 的 element allocation 必须与该值一致；Graph 无法在相同 proposal 下实现对应尺寸、包含或 placement 时 fail-loud，不能修改 artifact 追随意外的 Graph output，也不能静默拉伸、裁剪、重跑 provider 或换用另一个 Definition

### render-ready Graph 保留语义 endpoint 和 canonical lowering

Flow 根据 canonical layout geometry 构造 compile-local、render-ready 的 Graph Entity、Group 与 Relation records。它们不是新的公开 Source，也不进入 artifact；其职责只是把自动布局结果交给 Graph 的正式 resolve / lowering。全部 element 与 root relations 在同一个 Flow-owned Scope / Core namespace 环境中提交；Entity 与 Group output 先注册 authored identity，relation 再通过同一 Core target lookup 解析跨 scope endpoint，不能把每个 Group 编译成互不相见的 Scene。Layout 只形成无 authored Graph id 的内部 Core Scope，因此不能意外恢复为 Graph / Core endpoint identity

leaf 使用测量尺寸和最终位置。递归 Group / Layout 把 root-local child bounds 转换为直接 parent-local placement。Group 将 provider bounds 扣除 Graph-owned `contentInsets` 后的 content rect 交给同一 shell composition；该 composition 可以生成一个无绘制、无 id、不可寻址的 body allocation constraint，使 Graph Group 的 natural allocation 精确等于 provider bounds。Layout 直接以无绘制、无 Graph id 的 Core Scope 承载 transform 与 children placement，不生成 shell、caption、Surface 或 endpoint。内部 constraint / Scope 只约束本次 layout，不进入 endpoint namespace。Flow root 不生成派生 Graph id、数组 id、hash id 或 presentation id；最外层 Flow Scope 使用 authored Diagram id，派生 Graph root / wrapper、Surface、Layout 与 presentation nodes 保持无公共 identity

Relation 的语义 `source` / `target` 继续使用 authored element id 和 Core NodeTarget。straight route 下沉为 NodeTarget 到 NodeTarget；orthogonal route 只把规范化 point chain 的中间点作为 bends，首尾仍由 Core 按最终 Node / Group boundary 解析。有效 orthogonal corner radius 下沉到 Graph / Core 已有 rounded-corners 能力；Graph 与 Core继续拥有 shape boundary、target lookup、marker shortening、Path、Geometry Label 与 Scene primitive

有 label 时，Flow 把 provider `labelBounds` 解释为布局预留盒。它将预留盒中心确定性投影到规范化 point chain：最近 segment 决定 anchor，等距时选择较早 segment，再由累计长度、segment side 与法向距离导出 Geometry Label 的 normalized position、side 与 distance。Core boundary clipping、rounded corners 与 marker shortening可能使最终 glyph 相对预留盒产生轻微偏移，因此 artifact 明确保存 `labelReservation`，不宣称它是 renderer glyph visual bounds

### Core CompileResult 是唯一公共 Result

Flow 不建立平行的 `FlowDiagramResult`、`compileFlowDiagram()` 或 adapter 专属 geometry callback。Core `CompileResult` 同时返回 Scene、artifacts 与 world-space spatial handles；Flow 只增加一个由自身 layout-aware Composite Definition 的 `artifactSchema` 验证的 composite artifact

artifact envelope 继续由 Core 拥有 `kind`、`namespace`、`type` 与 `occurrence`。Flow artifact value 不重复 occurrence、Source、Graph records、effective Theme、capability catalog、provider defaults、diagnostics 或 Scene。`FlowDiagramArtifact` 是一次 compile 的 renderer-neutral、JSON-safe、深只读结果，不是下一次 compile 的输入或持久化布局缓存

Vanilla 通过现有 readonly processing / compile result 暴露同一个 artifact；React 通过同一 Vanilla 处理链和既有 compile-result / artifact 接口暴露，不新增 React-only result。Direct IR、Vanilla 与 React 对同一 Source、definitions、Theme 和 measurer必须得到等价 artifact value

### artifact 使用 Flow-local 单一坐标系和 authored identity

artifact value 中全部 bounds 与 points 使用完整 Flow composite 的 allocation-local 坐标；它们已包含 drawing region 在 Frame 中的平移，但不烘焙外层 Scope transform、placement 或祖先 Scene transform。需要 world-space selection / overlay 时使用同 revision 的 Core spatial handle index，而不是猜测 artifact 与 Scene transform

`frame` 保存最终 Surface 的 allocation 与保守 visual bounds。`regions` 只保存实际存在的 title、description、drawing 与 legend；drawing 必有，缺失 presentation slot 完全省略，不生成零尺寸占位。region bounds来自同一次真实 probe 与 Layout placement，不能从 gap / padding 重新推导

现有 Diagram Foundation 可以在包内重构为一个共享的 composition 过程：它仍以 ADR-01/02 的唯一 resolve、Layout 与 Standard Surface 为真源，同时把本次真实 probe / placement 的 region geometry交给拥有具体root的Flow callback。该过程保持 package-internal，不建立 Foundation artifact、公共result或第二套assembly；Flow不得复制Foundation lowering、解析嵌套Layout artifact或用Frame字段重新计算region bounds

`elements` 在 artifact 中递归保存 ADR-07 已确定的 containment 结果，而不是复制平级 Source catalog。每项只保存 authored id、`entity | group | layout` kind 与最终 layout bounds；Group / Layout 通过递归 `elements` 表达结果层级，不增加重复 `parentId`、membership path 或 source index。`relations` 保持 Source 顺序，只保存 source / target、有效 routing 与 Flow-local point chain，以及可选 label reservation。artifact 不保存 relation id、Graph Source 副本、relation direction、style 或 Theme，因为它们不是解释布局几何所需的独立事实

### spatial handles 服务 world-space 查询，不复制 route

Flow composite 在自身 allocation coordinate 中为完整 frame、每个实际 presentation / drawing region 和每个 authored element 发布矩形 spatial handle。handle key 在同一 Flow occurrence 内由稳定 slot 或 authored id 构成；Entity、Group 与 Layout 分别使用 `role: 'entity' | 'group' | 'layout'`，payload 保存 authored id。Core 负责把这些 handle 限定到 `namespace: 'diagram'`、`type: 'flow'`、instance id 与 occurrence owner path，并转换为 world-space rect；spatial handle 本身不建立 endpoint identity

当前 Core spatial handle 只支持 rect。Relation 的精确 point chain 留在 `FlowDiagramArtifact`，不以 route AABB 冒充 path hit geometry，也不为 Flow 私自扩展 handle geometry kind。未来通用 path handle 只有由 Core 独立设计后才能被 Flow 复用

### authored id、occurrence 与 provenance 保持分层

Flow element authored id 是领域 identity，在一个 `IRFlowDiagram` 内全局唯一并跨重新编译稳定；它原样进入 Graph records、artifact 与 diagnostics。Flow relation 不拥有 authored identity，compile-local 阶段、provider 输出和 artifact 都按 Source 数组位置对齐。Core occurrence描述同一 Source 在一次完整 compile 中的实际展开位置，允许同一 authored Flow Source被多次嵌入；它由 artifact envelope、spatial handle owner path与 Inspect 使用，不能替代 authored element id

provider name 只作为 artifact 的 layout provenance 保存。element Source JSON path 与 authored id、relation `relations[index]` path 由 Flow resolve 建立 compile-local 映射，供 measurement、provider output 与 Graph materialization错误回指；该索引不进入 Source或artifact。Graph / Core observation、final occurrence 与 origin occurrence继续使用既有 provenance，不由 Flow 构造平行 locator

### provider contribution 与三入口共享一个闭环

FlowDiagram 的 Definition provider 拥有 package-internal Diagram Foundation assembly，并显式依赖 Graph Entity / Group / Relation、Flex Layout 以及 Foundation 所需的 Layout / Standard providers；不存在单独的 Foundation provider 或临时 public composite。Flow 使用一个公开的 provider contribution assembly，把 `DiagramDefinitionOptions` 与同一次调用的 `GraphDefinitionOptions` 组合为 `FlowDiagramDefinitionOptions`；Flow resolver 与最终 Graph lowering 因此读取同一组 role、kind、Graph Theme、Diagram Theme、Flow Theme 和 layout Definition。Graph provider 的完整闭包可以继续包含 Graph Block，这不扩大 Flow Source 或 authoring surface

内置与自定义 Graph / Diagram definitions依旧按各自 registry合并，不共享 key space。Direct IR 使用该 contribution assembly取得完整 Core provider graph；Diagram Vanilla只把 TypeScript authoring Input规范化为同一个 `IRFlowDiagram`并贡献同一 providers；Diagram React只把 props / children调度到 Vanilla。adapter不能解析布局、测量Graph、调用provider、生成artifact或维护静态catalog

## 基础数据结构与公开契约

最小 artifact value 为：

```ts
type FlowArtifactBounds = Readonly<{
  allocationBounds: Readonly<BoundsRect>;
  visualBounds: Readonly<BoundsRect>;
}>;

type FlowLeafArtifact = Readonly<{
  id: string;
  kind: 'entity';
  bounds: Readonly<BoundsRect>;
}>;

type FlowGroupArtifact = Readonly<{
  id: string;
  kind: 'group';
  bounds: Readonly<BoundsRect>;
  elements: ReadonlyArray<FlowElementArtifact>;
}>;

type FlowLayoutArtifact = Readonly<{
  id: string;
  kind: 'layout';
  bounds: Readonly<BoundsRect>;
  elements: ReadonlyArray<FlowElementArtifact>;
}>;

type FlowElementArtifact = FlowLeafArtifact | FlowGroupArtifact | FlowLayoutArtifact;

type FlowRouteArtifact =
  | Readonly<{
      kind: 'straight';
      points: ReadonlyArray<Readonly<Position>>;
    }>
  | Readonly<{
      kind: 'orthogonal';
      cornerRadius: number;
      points: ReadonlyArray<Readonly<Position>>;
    }>;

type FlowRelationArtifact = Readonly<{
  source: string;
  target: string;
  route: FlowRouteArtifact;
  labelReservation?: Readonly<BoundsRect>;
}>;

type FlowDiagramArtifact = Readonly<{
  layout: Readonly<{ definition: string }>;
  frame: FlowArtifactBounds;
  regions: Readonly<{
    title?: FlowArtifactBounds;
    description?: FlowArtifactBounds;
    drawing: FlowArtifactBounds;
    legend?: FlowArtifactBounds;
  }>;
  elements: ReadonlyArray<FlowElementArtifact>;
  relations: ReadonlyArray<FlowRelationArtifact>;
}>;
```

`FlowDiagramArtifactSchema` 是 artifact value 的运行时真源，`FlowDiagramArtifact` 由 schema 派生；`BoundsRect` 与 `Position` 继续复用 `@retikz/math`。Group 与 Layout artifact 使用独立 kind，递归 `elements` 保持非空。orthogonal route 的 corner radius 必须等于有效 routing；straight 不保存无意义的 0 radius

Flow Definition 的 Core artifact 类型由 `CompositeCompileArtifact<'diagram', 'flow', FlowDiagramArtifact>` 表达；调用方可以按 envelope namespace / type / occurrence 选择正确实例。没有 Presentation 时 regions 仍包含 drawing；空 relations Source时 artifact 使用空数组而不是省略

运行时 authoring options 组合为：

```ts
type FlowDiagramDefinitionOptions = DiagramDefinitionOptions & GraphDefinitionOptions;
```

该类型只存在于 TypeScript provider / adapter authoring边界，不进入 `IRFlowDiagram`。同一次 contribution assembly 必须把相同 Graph options同时交给 Flow measurement / resolve与派生 Graph providers；不能让使用者为两条链分别注册相同 Definition

## 行为、失败语义与兼容性

- Flow Source schema、duplicate id、unresolved reference、containment、endpoint 与 constraint errors 继续使用 ADR-03/07 的稳定 code、JSON path 与 related id；本 ADR 不把它们合并成通用 compile 错误
- Graph / text / Surface child无法完成真实测量时使用 `DIAGRAM_FLOW_MEASUREMENT_FAILED`，details包含`stage: 'measure'`、可修复Source path、相关element / relation endpoint id与底层provider key（存在时），并保留原cause
- provider capability不足、callback失败与output非法继续使用ADR-04的错误码。output错误必须包含layout definition、provider output path与相关authored id；不能把provider path伪装成Source path
- 已验证geometry无法被Graph materialize、exact proposal下allocation不一致、label reservation不能确定性投影或最终Graph probe失败时使用 `DIAGRAM_FLOW_MATERIALIZATION_FAILED`，details包含`stage: 'materialize'`、Source path、相关id、definition与reason，并保留Graph / Core cause
- Foundation region或Surface最终装配失败也使用 `DIAGRAM_FLOW_MATERIALIZATION_FAILED`，但`stage: 'assemble'`且path指向`presentation`、`frame`或Flow root；不吞掉Text、Legend、Layout、Surface或Core诊断
- 同一Source、definitions、effective Theme、text measurer与layout Definition必须产生逐字段相同的provider input、canonical geometry、artifact与Scene。Core precision只圆整Scene输出，不反向改写artifact geometry
- artifact schema validation由Core沿现有composite artifact contract fail-loud并保留Flow occurrence；不得返回Scene但丢弃artifact，也不得保留上一次成功artifact
- element authored id 保持唯一；只有 Entity 与 Group identity 可以进入 Graph endpoint namespace，Layout 只保留 Flow Source / artifact / inspection identity。Graph namespace / target 错误必须回指原 Flow path 与 endpoint element id。adapter 不得自动生成 element id、relation id、修正 route、移动 label、删除 invalid relation 或 fallback 到默认 layout
- 本能力是新的 v0.1 公共编排与结果契约，不提供 precomputed geometry Source、engine payload、async result、manual route、旧 result alias、migration、fallback 或新旧双轨。ADR-01～04 保持 Accepted；Source containment、Group materialization 与 artifact Group 语义按 ADR-07 校准

## 实现摘要与遗留风险

Flow 已在一次 Core compile 中完成 Graph 语义解析与测量、Layout 固定 placement、layout dispatch、输出验证、render-ready Graph 物化、Foundation 装配，并同时产出 Scene、renderer-neutral artifact 与 world-space spatial handles。Group 使用真实 Graph shell，Layout 使用无 Graph id 的内部 Scope；artifact 与 handles 分别以 `group` / `layout` 标识二者。Direct IR、Vanilla 与 React 共享同一 contribution 和结果语义

深层递归 Group / Layout 的正确性已闭合，但当前递归 compile 成本随层级增长明显，且更深结构仍受 Core composite expansion safety limit 约束。后续若真实语料需要更深层级，应独立冻结性能与深度预算；不能通过跳过校验、缓存派生 geometry 或放宽 expansion safety limit 隐式改变本 ADR
