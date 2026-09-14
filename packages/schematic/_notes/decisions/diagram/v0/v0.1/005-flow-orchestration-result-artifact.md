---
description: Flow Orchestration、Result 与 Artifact
keywords: 'Flow、Orchestration、Result、Artifact、IRFlowDiagram、FlowDiagramArtifact、elements、CompileResult'
---

# ADR-005：Flow Orchestration、Result 与 Artifact

- 状态：Accepted
- 决策日期：2026-08-30
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [ADR-003：Flow Source 模型与 LLM-first Authoring](./003-flow-source-model.md) · [ADR-004：Flow Layout Definition 与 Registry](./004-flow-layout-definition-registry.md) · [ADR-007：Flow 平级 Source、Group 与 Layout](./007-flow-catalog-source-layout-groups.md) · [Schematic Graph 完备设计](../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

ADR-003/007 已冻结唯一、LLM-first 的 `IRFlowDiagram` Source：Entity / Group / Layout 平级声明，owner-side `children` 经过 resolve 后形成唯一递归 Canonical tree。ADR-004 已冻结同步、原子的 `FlowLayoutDefinition` 及 Layout placement context：provider 接收已测量层级与完整布局意图，保留 authored Layout 的固定排列，再返回 element bounds、relation point chain 与可选 label bounds。它们尚未决定 Source 如何在一次真实 Core compile 中完成 Graph appearance 解析、测量、capability preflight、provider dispatch、输出验证、Graph 物化、Diagram Foundation 装配，以及调用方最终从哪里取得稳定几何

如果公开一个预计算 geometry Source 或把 provider output 写回 Flow / Graph Source，会同时保存 authored facts 与派生结果，并要求调用方维护失效关系；如果在 adapter、renderer 或多个公开 composite 之间分阶段传递测量和布局结果，则 Direct IR、Vanilla、React、Scene 与 artifact 容易形成不同入口和不同几何真源。仅返回 Scene 又不足以让 Inspect、导出、LLM 工具或后续交互按 authored id 取得布局区域和 relation route

本决策冻结 FlowDiagram 的单次同步编排边界、Graph Group shell measurement 缺口、Layout placement、provider output 的规范化与物化规则、Core `CompileResult` 下的唯一公共 Result、renderer-neutral `FlowDiagramArtifact`、spatial handles、identity / provenance 与可修复 diagnostics。它保持 ADR-001～004 的 Foundation、布局 Definition 与 provider 输入输出不变；Source containment 与 Group / Layout 边界以 ADR-007 为准

## 决策

### 单次编译与几何事实源

Core `compileToScene()` 是唯一编译入口。Flow 在同一次同步 compile 中完成 Source 解析、真实 Graph 测量、固定 Layout placement、Layout Definition 调用、几何验证、Graph 物化和 Diagram 装配，不提供第二个编译入口或可持久化的中间布局结果

测量与最终绘制使用同一组 Graph definitions、Core Theme 与 text measurer。Entity 的测量尺寸不包含 margin；margin 独立参与布局，物化时不重复应用。Relation label 使用同一 Core TextBlock 的完整视觉盒，不能用字符数、DOM 或 renderer 回读估算

Group 的 minimumSize、contentInsets、caption 和 Surface 组合由 Graph 的公开 shell 能力提供；Layout 的固定 linear / grid placement 复用 Layout 的公开能力。Flow 不维护另一份文字测量、Group 外框或容器排版算法

Provider 输出通过 ADR-004 的 identity、顺序、尺寸、containment、固定 placement、route 和 label coverage 校验后，成为本次编译唯一的布局几何。输入与输出均脱离调用方引用；输出必须是有限、JSON-safe 的 plain data。坐标中的负零归一为零，相邻重复点折叠，规范化后的路线仍须至少有两个点

### Graph 物化与路由

Entity、Group 与 Relation 复用 Graph 的正式解析与下沉路径。Entity / Group authored id 原样进入 Core endpoint namespace；Layout 只形成无公共 Graph identity 的 scope。所有 endpoint 使用同一 Core target lookup，不能把每个 Group 编译成互不可见的 Scene

根坐标系布局转换为直接 parent-local placement 后，Graph 的实际 allocation 必须与布局几何一致。不能通过修改 artifact、静默拉伸、裁剪或重跑 provider 掩盖差异

Relation 保留 authored source / target 的 Core NodeTarget 语义。straight 直接连接两个 target；轴对齐路由以 point chain 的中间点表达 bends，首尾仍交给 Core 处理最终边界、圆角与 marker shortening。单折角语义遵循 [ADR-011](./011-flow-elbow-routing.md)

Provider labelBounds 表示布局预留盒。预留盒中心投影到路线的最近 segment，等距时选择较早 segment，再导出 Geometry Label 的位置、侧向和距离。边界裁剪、圆角与 marker shortening 可能改变最终文字位置，因此 artifact 字段称为 labelReservation，不宣称是最终 glyph bounds

### 唯一公共结果

Core `CompileResult` 同时返回 Scene、artifacts 与 world-space spatial handles。Flow 只增加受 `FlowDiagramArtifactSchema` 验证的 composite artifact，不增加 `FlowDiagramResult`、adapter 专属结果或 geometry callback

Artifact envelope 的 kind、namespace、type、occurrence 由 Core 拥有。Flow artifact 不重复保存 Source、Graph records、Theme、catalog、diagnostics、Scene 或测量中间态，也不是下一次编译的输入

Artifact 全部坐标均为完整 Flow allocation-local 坐标，包含 drawing region 在 Frame 中的平移，不包含祖先 Scene transform。world-space 查询使用同 revision 的 Core spatial handles

Frame 保存最终 allocation 与保守 visual bounds；regions 只保存实际存在的 title、description、drawing、legend，drawing 必有。缺失 slot 完全省略。region geometry 与最终装配共享同一 measurement / placement 来源

Elements 递归保存 authored id、entity / group / layout kind 与最终 bounds；不重复保存 parentId、membership path 或 source index。Relations 按 Source 顺序保存 endpoint、有效 routing、point chain 和可选 label reservation，不增加 relation id 或复制 appearance

Flow 为 frame、实际 region 和每个 authored element 发布矩形 spatial handle。Core 负责 occurrence 归属与 world-space 转换；handle 不建立 endpoint identity。Relation 的精确路线保留在 artifact，不以路线 AABB 冒充 path hit geometry

[ADR-012](./012-flow-layout-bounds.md) 允许 Layout 排除直接子项的对外 bounds 贡献，但完整 drawing 仍包含所有后代；[ADR-013](./013-flow-item-width.md) 在布局前确定直接 Entity 的测量宽度。这些能力不建立第二份几何事实源

### Identity、诊断与三入口

Element authored id 在一个 Flow Source 内全局唯一；Relation 以 Source 数组位置对齐。Core occurrence 表达同一 Source 在完整 compile 中的展开位置，不能代替 authored identity。诊断回指原 Source 路径和相关 id，provider output path 不冒充 Source path

Flow 的 provider assembly 合并同一次调用的 Diagram、Graph、Flow Theme 与 Flow Layout options，测量与最终 Graph lowering 使用同一组 definitions。内置与自定义经同一 registry 消费，不维护 adapter 白名单

Direct IR、Vanilla 与 React 共用同一 Source、provider contribution 与 Core result。Vanilla 只负责 authoring 归一化，React 调度至 Vanilla；两者都不拥有独立布局、测量或 artifact 生成逻辑。Graph provider 闭包包含 Block 不代表当前 Flow Source 支持 Block

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
      kind: 'orthogonal' | '-|' | '|-';
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

`FlowDiagramArtifactSchema` 是 artifact value 的运行时真源，`FlowDiagramArtifact` 由 schema 派生；`BoundsRect` 与 `Position` 继续复用 `@retikz/math`。Group 与 Layout artifact 使用独立 kind，递归 `elements` 保持非空。轴对齐 route 的 corner radius 必须等于有效 routing；straight 不保存无意义的 0 radius

Flow Definition 的 Core artifact 类型由 `CompositeCompileArtifact<'diagram', 'flow', FlowDiagramArtifact>` 表达；调用方可以按 envelope namespace / type / occurrence 选择正确实例。没有 Presentation 时 regions 仍包含 drawing；省略 relations Source 时 artifact 使用空数组而不是省略

运行时 authoring options 组合为：

```ts
type FlowDiagramDefinitionOptions = DiagramDefinitionOptions &
  GraphDefinitionOptions &
  Readonly<{
    flowThemeStyles?: ReadonlyArray<FlowThemeStyleDefinition>;
    flowLayouts?: ReadonlyArray<FlowLayoutDefinition>;
    defaultFlowLayout?: string;
  }>;
```

该类型只存在于 TypeScript provider / adapter authoring 边界，不进入 `IRFlowDiagram`。同一次 contribution assembly 必须把相同 Graph options 同时交给 Flow measurement / resolve 与派生 Graph providers；不能让使用者为两条链分别注册相同 Definition

## 行为、失败语义与兼容性

- Flow Source schema、duplicate id、unresolved reference、containment、endpoint 与 constraint errors 继续使用 ADR-003/007 的稳定 code、JSON path 与 related id；本 ADR 不把它们合并成通用 compile 错误
- Graph / text / Surface child 无法完成真实测量时使用 `DIAGRAM_FLOW_MEASUREMENT_FAILED`，details 包含`stage: 'measure'`、可修复 Source path、相关 element / relation endpoint id 与底层 provider key（存在时），并保留原 cause
- provider capability 不足、callback 失败与 output 非法继续使用 ADR-004的错误码。output 错误必须包含 layout definition、provider output path 与相关 authored id；不能把 provider path 伪装成 Source path
- 已验证 geometry 无法被 Graph materialize、exact proposal 下 allocation 不一致、label reservation 不能确定性投影或最终 Graph probe 失败时使用 `DIAGRAM_FLOW_MATERIALIZATION_FAILED`，details 包含`stage: 'materialize'`、Source path、相关 id、definition 与 reason，并保留 Graph / Core cause
- Foundation region 或 Surface 最终装配失败也使用 `DIAGRAM_FLOW_MATERIALIZATION_FAILED`，但`stage: 'assemble'`且 path 指向`presentation`、`frame`或 Flow root；不吞掉 Text、Legend、Layout、Surface 或 Core 诊断
- 同一 Source、definitions、effective Theme、text measurer 与 layout Definition 必须产生逐字段相同的 provider input、canonical geometry、artifact 与 Scene。Core precision 只圆整 Scene 输出，不反向改写 artifact geometry
- artifact schema validation 由 Core 沿现有 composite artifact contract fail-loud 并保留 Flow occurrence；不得返回 Scene 但丢弃 artifact，也不得保留上一次成功 artifact
- element authored id 保持唯一；只有 Entity 与 Group identity 可以进入 Graph endpoint namespace，Layout 只保留 Flow Source / artifact / inspection identity。Graph namespace / target 错误必须回指原 Flow path 与 endpoint element id。adapter 不得自动生成 element id、relation id、修正 route、移动 label、删除 invalid relation 或 fallback 到默认 layout
- 本能力是新的 v0.1 公共编排与结果契约，不提供 precomputed geometry Source、engine payload、async result、manual route、旧 result alias、migration、fallback 或新旧双轨。ADR-001～004 保持 Accepted；Source containment、Group materialization 与 artifact Group 语义按 ADR-007 校准

## 实现摘要与遗留风险

Flow 已在一次 Core compile 中完成 Graph 语义解析与测量、Layout 固定 placement、layout dispatch、输出验证、render-ready Graph 物化、Foundation 装配，并同时产出 Scene、renderer-neutral artifact 与 world-space spatial handles。Group 使用真实 Graph shell，Layout 使用无 Graph id 的内部 Scope；artifact 与 handles 分别以 `group` / `layout` 标识二者。Direct IR、Vanilla 与 React 共享同一 contribution 和结果语义

深层递归 Group / Layout 的正确性已闭合，但当前递归 compile 成本随层级增长明显，且更深结构仍受 Core composite expansion safety limit 约束。后续若真实语料需要更深层级，应独立冻结性能与深度预算；不能通过跳过校验、缓存派生 geometry 或放宽 expansion safety limit 隐式改变本 ADR
