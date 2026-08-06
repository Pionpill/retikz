# ADR-12：以可编译辅助内容统一 Inspector 输出

- 状态：Proposed
- 决策日期：2026-08-06
- 关联：[alpha.2 roadmap](./roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Standard Layout Inspector ADR-07](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/07-layout-inspector.md) · [Standard Inspector 视觉语义 ADR-08](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/08-layout-inspector-visual-semantics.md)

## 背景与目标

现有 Inspector 只依附带 typed artifact 的 layout-aware Composite，`inspect()` 也只能返回由矩形、直线和标签组成的 `InspectionPrimitive` 数组。Core 为这些 DTO 建立独立 schema 与 occurrence plane，Render 再分别实现 SVG / Canvas 的专用绘制路径。

这套合同可以解释布局盒模型，但把 Inspector 固定成了一套平行的微型图元系统：曲线、椭圆、箭头、资源、自定义 Composite 或未来其它辅助内容都必须先扩展闭合 primitive union，再同步修改每个 renderer。即使只为贝塞尔曲线显示控制柄，也无法直接复用现有 Path、Node、style、resource 与 Composite 编译能力。

仅给 `inspect()` 增加任意 JSON `outputSchema` 不能解决该问题。Schema 只能证明数据形状合法，不能决定如何把任意 payload 转成 Scene；Core 仍需建立第二套 consumer / registry，renderer 也必须认识每一种自定义结果。

本 ADR 的目标是让 Inspector 返回任意可由当前 Core registry 与编译管线解析的辅助子元素，同时保持以下既有约束：

1. Inspector 只读取同次最终提交的 settled subject，不重新运行主图 solver，也不从 renderer 反向测量
2. 辅助内容与主 Scene 同 revision 原子产生，但不改变主 Scene 的布局、资源、identity、artifact、命中或水合语义
3. 内置与第三方 Inspector 依附各自既有 Definition 和 registry，不建立平行 inspector registry
4. 未开启 Inspector 时不调用回调，也不产生辅助编译成本

## 与既有 Standard 决策的关系

[Standard Layout Inspector ADR-07](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/07-layout-inspector.md) 已冻结 runtime sidecar、最终 replay、独立 plane 与完整 frame 原子提交，这些长期语义继续保留；其中“Composite Inspector 只能返回专用 primitive”以及“Render 解释专用 primitive”的部分由本 ADR 取代。

[Standard Inspector 视觉语义 ADR-08](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/08-layout-inspector-visual-semantics.md) 已标记为 Superseded。其 Layout spacing artifact、选项拆分和视觉区分目标仍归 Standard；`InspectionTone`、pattern DTO 与 Render palette owner 则由本 ADR 取代。Standard 改用普通 IR style / paint 表达线型与纹理，Core 解析 occurrence appearance，Render 不再持有 inspection-only palette，两份 ADR 不再形成并行实施真源。

## 决策：Inspector 返回普通 IR 子元素并编译为隔离辅助 Scene

Core 提供 owner-neutral 的 `InspectorDefinition`。具体能力仍由拥有 subject 的 Definition 承载 Inspector：Composite 继续通过 `CompositeDefinition` 注册，Path kind 通过 `PathKindDefinition` 注册；未来其它开放能力也必须依附自己的现有 Definition / registry。Core 内建的闭合能力可以使用同一协议提供 built-in Inspector，但不会获得绕过公开契约的第二条消费路径。

`inspect()` 返回一个或多个普通 `IRChild`。Core 把回调结果视为不可信 provider output，完成脱离、JSON-safe 校验与冻结后，按正常 child discriminator、schema、Definition registry 和 compile 语义解析。Inspector 不声明 `outputSchema`；每个返回 child 的权威 schema 与 Definition 就是它的输出契约。

解析后的辅助内容进入隔离的 inspection compile channel，并形成 occurrence-local Scene。该 channel 复用当前 compile 注入的 provider、Composite、文字 / TeX 测量、Theme 与资源能力，但强制关闭所有 Inspector，防止辅助 Path 再触发自己的 Inspector 或形成递归。它不重新求值主图 occurrence，也不能复用或提交主图的 probe / replay token。

主 Scene 与 inspection plane 使用同一最终 revision。任一已选择 Inspector 失败时，整次 compile fail-loud，不返回或提交只有主 Scene 的部分结果。

## 基础数据结构与公开契约

以下形态冻结长期语义；具体泛型排列与 schema 组合可以在实现计划中细化，但不得改变 subject、options、appearance 与可编译 child 的职责边界：

```ts
export type InspectorOutput = IRChild | ReadonlyArray<IRChild>;

export type InspectionOwner =
  | Readonly<{
      kind: 'composite';
      namespace: string;
      type: string;
    }>
  | Readonly<{
      kind: 'pathKind';
      name: string;
    }>;

export type InspectionAppearance = Readonly<{
  colorScope: number;
  scopeColor: string;
  warningColor: string;
}>;

export type InspectorContext<TOptions extends IRJsonObject> = Readonly<{
  occurrence: CompileOccurrenceLocator;
  options: TOptions;
  appearance: InspectionAppearance;
}>;

export type InspectorDefinition<
  TKind extends string,
  TSubject extends JsonValue,
  TOptionsInput extends IRJsonObject,
  TResolvedOptions extends IRJsonObject,
> = Readonly<{
  kind: TKind;
  optionsInputSchema: ZodType<TOptionsInput>;
  optionsSchema: ZodType<TResolvedOptions, TOptionsInput>;
  inspect: (subject: TSubject, context: InspectorContext<TResolvedOptions>) => InspectorOutput;
}>;

export type PathKindCompileResult<TInspectionSubject extends JsonValue = never> = Readonly<{
  primitives: ReadonlyArray<ScenePrimitive>;
  boundsPoints: ReadonlyArray<IRPosition>;
}> &
  ([TInspectionSubject] extends [never] ? { inspectionSubject?: never } : { inspectionSubject: TInspectionSubject });

export type PathKindInspectionContract<
  TInspectionSubject extends JsonValue,
  TOptionsInput extends IRJsonObject,
  TResolvedOptions extends IRJsonObject,
> = Readonly<{
  inspectionSubjectSchema: ZodType<TInspectionSubject>;
  inspector: InspectorDefinition<'path', TInspectionSubject, TOptionsInput, TResolvedOptions>;
}>;

export type PathKindInspectionBranch<
  TInspectionSubject extends JsonValue,
  TOptionsInput extends IRJsonObject,
  TResolvedOptions extends IRJsonObject,
> = [TInspectionSubject] extends [never]
  ? Readonly<{
      inspectionSubjectSchema?: never;
      inspector?: never;
    }>
  : PathKindInspectionContract<TInspectionSubject, TOptionsInput, TResolvedOptions>;

export type InspectionDiagnosticOrigin =
  | Readonly<{ kind: 'primary' }>
  | Readonly<{
      kind: 'inspection';
      stage: 'resolve';
      site: 'authoring';
      locator:
        | Readonly<{ kind: 'scene'; value: SceneInspectionAuthoringLocator }>
        | Readonly<{ kind: 'child'; value: ChildInspectionAuthoringLocator }>;
    }>
  | Readonly<{
      kind: 'inspection';
      stage: 'resolve';
      site: 'occurrence';
      owner: InspectionOwner;
      occurrence: CompileOccurrenceLocator;
    }>
  | Readonly<{
      kind: 'inspection';
      stage: 'inspect';
      owner: InspectionOwner;
      occurrence: CompileOccurrenceLocator;
    }>
  | Readonly<{
      kind: 'inspection';
      stage: 'output';
      owner: InspectionOwner;
      occurrence: CompileOccurrenceLocator;
      outputIndex: number;
    }>;

export type InspectionPlaneEntry = Readonly<{
  owner: InspectionOwner;
  occurrence: CompileOccurrenceLocator;
  colorScope: number;
  transform: readonly [number, number, number, number, number, number];
  scene: Scene;
}>;

export type InspectionPlane = Readonly<{
  entries: ReadonlyArray<InspectionPlaneEntry>;
}>;
```

`PathKindDefinition` 的 `compile()` 返回类型必须使用同一个 `TInspectionSubject` 参数，并与 `PathKindInspectionBranch<TInspectionSubject, ...>` 相交；异构 Path kind registry 擦除后只能在对应 kind schema parse、普通 compile result 校验和 subject schema parse 三个边界连续成功时恢复 Inspector callback。不得把 `inspectionSubjectSchema` 或 `inspector` 作为与 compile result 泛型无关的可选字段拼接。

`TSubject` 是 owner 在正常编译中已经求值完成、由 Core 脱离并冻结的 JSON-safe snapshot，不是 authored props、可变 provider result 或主 Scene 的无类型切片：

- layout-aware Composite 的 subject 是与最终 replay occurrence 同次发布、经过 `artifactSchema` 解析的 typed artifact
- Path kind 的 `compile()` 返回 `null` 或与 Definition 泛型绑定的 `PathKindCompileResult<TInspectionSubject>`；声明 Inspector 时，非空结果必须同时返回 `inspectionSubject`，Definition 必须声明 `inspectionSubjectSchema`
- Core 先完成 Path kind 普通 `primitives` / `boundsPoints` 合同校验；仅当该 Path 被选中 inspection 时，再以 `inspectionSubjectSchema` 解析、脱离并冻结 subject，随后调用 Inspector。未开启时不得读取或校验 inspection-only subject
- 内置 stroke Path kind 的 subject 是由最终 move / line / quadratic / cubic 等 settled command 与必要局部几何组成的 JSON snapshot；第三方 Path kind 可以定义自己的 JSON subject，但必须使用同一 `PathKindDefinition` conditional branch、schema 校验与 callback 路径
- Path kind `compile()` 返回 `null` 表示该 occurrence 没有 settled visual output；即使 authored sidecar 已选择 Inspector，也不读取 subject、不调用回调且不创建 entry。非空结果缺少或违反声明 subject 才是 contract failure
- 新 owner 若不能提供稳定、JSON-safe、可归属到 occurrence 的 settled subject，就不能注册 Inspector

`defineInspector()` 作为 nested Definition 的 authoring hook，校验 kind、options schema、空输入 canonical resolve 与 callback 形态。Inspector 不独立注册；拥有它的 `defineComposite()`、`definePathKind()` 或未来同类 define helper 负责验证 subject 类型并把它带入既有 registry。

`optionsInputSchema` 接收 runtime sidecar 的 strict sparse object，必须接受空对象；`optionsSchema` 产出完整、JSON-safe 的 canonical options。layout family 把既有 Base 与 family-local 选项合并成一个 `context.options`，不再让通用 `InspectorContext` 固定携带 layout-only 的 `baseOptions`。

`InspectionAppearance` 只提供 Core 已解析的稳定 occurrence 色域与推荐常规 / 警告颜色。Core 拥有唯一 canonical inspection palette，并在调用回调前按 `colorScope` 解析为普通 CSS color；Inspector 可以用普通 IR style 覆盖它，线型、纹理、paint、文字和几何都继续使用 Core 现有 IR。由于最终颜色已经进入辅助 Scene，Render 不再拥有一套按 `InspectionTone` 二次解释的专用 palette，也不能为 SVG / Canvas 选择不同颜色。

canonical scope palette 沿用 `#2563eb`、`#7c3aed`、`#c026d3`、`#db2777`、`#ea580c`、`#a16207`、`#16a34a`、`#0f766e`、`#0891b2` 的顺序并按 `colorScope % 9` 取值，warning color 为 `#dc2626`。这些值从 Standard ADR-08 的 Render 私有常量迁入 Core appearance 默认；本 ADR 不开放用户 palette，但后端也不得自行覆写。

`InspectionPlaneEntry.scene` 是当前 occurrence 局部坐标中的正常 Scene 结果，`transform` 仍由 Core 从最终 occurrence scope chain 生成。Core 先按所有最终选中的 Inspector occurrence 稳定排序，再为每个请求分配 `colorScope` 并调用一次回调；空输出会占用自己的色域但不形成 entry，因此后续 occurrence 的颜色不随前项是否产出图形而漂移。Render 使用主 Scene 的 camera / fit / DPR 解释完整 frame，不以辅助 Scene 的 layout 扩张主 viewBox。

## Inspector 挂载与 authoring 边界

Inspector 是 owner Definition 的可选能力，不是新的顶层 provider：

1. `CompositeDefinition.inspector` 改为通用 `InspectorDefinition`，subject 仍是 typed artifact；Standard Flex、Grid、Overlay 继续走 Composite registry
2. `PathKindDefinition` 以 conditional generic branch 同时绑定 `compile()` 的 `inspectionSubject`、`inspectionSubjectSchema` 与 `inspector`；三者不能各自擦除或单独出现。内置 stroke Path kind 用同一入口提供 quadratic / cubic 控制点、控制柄与可选标签辅助内容
3. 第三方 Path kind 可以随自身 Definition 提供 Inspector，不需要向 Core 白名单或 Render 注册新图元
4. 未来 Shape、Effect 等 owner 是否开放 Inspector，由各自能力 ADR 决定；不得先向独立 Inspector registry 注册并从 Scene 反推 subject

`CompileOptions.inspection` 继续是唯一 Core 编译入口，仍属于 runtime-only authoring sidecar，不进入 IR、Snapshot 或 AI 生成契约。Core sidecar 的稳定形态泛化为：

```ts
export type InspectionAuthoringTargetKind = 'composite' | 'path';

export type SceneInspectionAuthoringLocator = Readonly<{
  target: InspectionAuthoringTargetKind;
  path: readonly [SceneInspectionAuthoringPathSegment, ...Array<ScopeInspectionAuthoringPathSegment>];
}>;

export type ChildInspectionAuthoringLocator = Readonly<{
  target: InspectionAuthoringTargetKind;
  path: ReadonlyArray<ScopeInspectionAuthoringPathSegment>;
}>;

export type InspectionAuthoringPolicy<TLocal extends InspectionOptionsInputObject = InspectionOptionsInputObject> =
  Readonly<{
    inherited?: InspectOptions;
    self?: boolean | TLocal;
  }>;

export type InspectionAuthoringTree<TLocal extends InspectionOptionsInputObject = InspectionOptionsInputObject> =
  Readonly<{
    policy?: InspectionAuthoringPolicy<TLocal>;
    children?: ReadonlyArray<InspectionChildForest | null>;
  }>;

export type InspectionAuthoringRoot = Readonly<{
  locator: SceneInspectionAuthoringLocator;
  tree: InspectionAuthoringTree;
}>;

export type InspectionChildRoot = Readonly<{
  locator: ChildInspectionAuthoringLocator;
  tree: InspectionAuthoringTree;
}>;

export type InspectionChildForest = ReadonlyArray<InspectionChildRoot>;

export type CompileInspectionOptions = Readonly<{
  root?: InspectOptions;
  roots?: ReadonlyArray<InspectionAuthoringRoot>;
}>;
```

`locator.target` 与最终 authored IR child 必须一致：`composite` 目标从 `namespace + type` 绑定 owner，`path` 目标从解析后的 Path kind 绑定 owner；目标越界、target 与 child 不符或重复 locator 均在调用 provider 前 fail-loud。Nested `layoutChild()` forest 继续按相对 Scope path remap，但 forest root 也携带 target，因此可以选中 layout child 内 authored Composite 或 Path。

只有 Composite target 可以携带 `tree.children` 并把 child forest 交给 `layoutChild()`；Path target 的 `children` 必须省略，非空或稀疏数组均 fail-loud。两类 target 都可以携带 inherited policy 与当前 `self`，但不会把 Path 的局部选项传播给后代。

求值顺序固定为：

1. Layout / Scope `InspectOptions.enabled: false` 是所有 Inspector family 的 authored 子树硬屏障；后代的 Composite 或 Path `self` 都不能重新开启
2. `enabled` 未阻断时，`InspectOptions.layout` 只参与 layout Composite 的 inherited 求值，不隐式开启 Path；`layout: false` 也不关闭显式 Path `self`
3. `policy.self` 取代 layout-only 的 `component` 命名。`false` 只关闭当前 occurrence，`true` 使用 owner Inspector 的 canonical 空输入，对象由该 owner 的 options schema 解析
4. Path 当前没有 inherited family policy，因此只有显式 `self: true | object` 才会请求 Inspector；省略 `self` 不产生请求
5. 显式 `self` 请求的非空 target 没有 Inspector 时 fail-loud；全图 / Scope 的 inherited layout 策略仍只选择实际带 Inspector 的 layout Composite，不把普通 child 视为错误

本 ADR 为 authored Path 增加 occurrence-local 开关，使 React 与 Vanilla 可以等价开启当前 Path 的控制点 Inspector：

```ts
export type PathInspectOptions = Readonly<
  {
    controlPoints?: boolean;
    labels?: boolean;
  } & Record<string, unknown>
>;

export type PathInspectionAuthoring = boolean | PathInspectOptions;
```

`true` 等价于空对象的 canonical profile；内置 stroke Inspector 的 `controlPoints` 默认开启，`labels` 默认关闭。`PathInspectOptions` 是开放的 runtime authoring object，只为内置 stroke keys 提供类型提示，不代替具体 owner 的 strict input schema：内置 stroke 拒绝其它 key，第三方 Path kind 可以声明自己的 sparse keys，并由自身 Inspector options schema 接受或拒绝。React `Path` 与 Vanilla Path spec 暴露同一 `inspect` sidecar，adapter / normalization 必须在进入 Core IR 前剥离该字段，并生成 `locator.target: 'path' + policy.self` 的同构 `InspectionAuthoringRoot`。Scope hard barrier 在两套 adapter 中都只贡献 inherited `enabled: false`，最终阻断由 Core 统一求值；target mismatch、owner schema 拒绝的 option 与缺失 owner Inspector 也都在 Core 形成同一失败。两套 adapter 对擦除后的开放输入保持同一运行时语义，不能在 adapter 层按内置 stroke 白名单预先裁剪第三方 key。

全图或 Scope 级 Path family 继承策略不在本轮冻结；需要批量开启时应由后续需求证明其选项合并语义，不能把开放字符串 map 当成未经校验的全局策略。

预编译 Scene 没有 authored occurrence、owner Definition 与 settled subject，继续不能事后开启 Inspector。调用方必须从 IR 及相同 definitions 重新编译。

## 辅助编译隔离与确定性

Inspector output 可以包含 Node、Path、Coordinate、Scope，以及当前 compile options 已注册的 Composite；它不能包含 `CompositeCompileChild`、probe result、replay token、callback 或 renderer object。

隔离边界固定如下：

- 辅助 child 从当前 occurrence 捕获的有效 Theme 与完整 resolved Scope style defaults 开始，在 occurrence 局部坐标中使用同一组 provider definitions 编译；它不是从全局默认 style 重新开始，也不能读取之后 sibling 的 Scope 状态
- Inspector 在辅助 channel 中始终关闭；返回 Path 或 Composite 不会递归生成下一层 inspection plane
- 每个 entry 使用新的 auxiliary namespace stack，初始不含主图 id；辅助内容内部按正常 Scope / id 规则建立和解析引用，引用主 Scene identity 必然 unresolved 并 fail-loud
- 普通主图 compile 对 unresolved reference 可以 warning 后跳过图形；辅助 channel 必须在自己的 warning dispatcher 中识别 `UNRESOLVED_NODE_REFERENCE`、`OFFSET_BASE_UNRESOLVED`、`POLAR_ORIGIN_UNRESOLVED` 与 `AT_TARGET_UNRESOLVED`，把它们提升为带当前 output origin 的 fatal inspection error。其它普通辅助 warning 继续进入独立 diagnostic staging
- 每个 entry 使用独立 resource、artifact、diagnostic 与 identity staging；资源 id 在 seal 时进入 entry-local namespace，Render 在同一 SVG / Canvas frame 物化时再与 primary 和其它 entry 隔离
- 辅助 compile 产生的 Composite / Node artifacts 不追加到主 `CompileResult.artifacts`
- 主 Scene 的 layout、resources、animations、identity topology、runtime metadata、patch 与 hit-test index不因 Inspector 开启而改变
- 同一 IR、definitions、inspection sidecar 与 host options 必须得到同序、深冻结且结构等价的 inspection plane

辅助 channel 可以借助临时 id 完成 entry 内引用，但 seal 后的 `InspectionPlaneEntry.scene` 必须是静态、无公共身份的 Scene：Core 递归移除 element / group 的 public `id`、`meta` 与 `animations`，根 Scene 也不得保留 animation track；resource id / ref 作为渲染内部连接保留并隔离。`id`、`meta` 与 animation 被明确规范化掉，不进入 retained identity、SSR hydration、时间轴、hit-test、accessibility 或 inspection patch。entry 的 `owner + occurrence` 是辅助 Scene 唯一公开 provenance。

回调输出先按单值或数组规范化；稀疏数组、非 JSON 值、非法顶层 discriminator、schema / provider 失败和 hostile getter 都以 inspector owner key、输出索引与原始 occurrence fail-loud。普通辅助 child 在正常 compile 中会产生的 warning 继续可观察，但 `CompileWarning` 增加必填 `origin: InspectionDiagnosticOrigin`：主图 warning 使用 `{ kind: 'primary' }`；provider 尚未解析前的 locator target mismatch、越界、重复或非法 child forest 使用 `stage: 'resolve' + site: 'authoring'`，并携 Scene root 或 layoutChild root 的原始 runtime locator；已经绑定 Definition / occurrence 后的 owner、options 与 subject 解析使用 `stage: 'resolve' + site: 'occurrence'`；callback 使用 `stage: 'inspect'`；已规范化 child 的 schema / compile 使用带 `outputIndex` 的 `stage: 'output'`。authoring resolve origin 不伪造尚不存在的 owner 或 canonical occurrence，occurrence resolve、inspect 与 output origin 则必须携二者。原有 `path` 保留辅助 child 内相对路径。辅助 error 使用同一 origin 数据形成 cause 与稳定格式化消息，因此不能伪装成主图 warning，也不能丢失 nested child 的相对路径。

## Render frame 与后端行为

`CompileResult.inspection`、`StaticRenderFrame.inspection` 与 retained frame 继续使用 `InspectionPlane | null`，但 entry 的受限 `primitives` 被 occurrence-local `scene` 取代。这样保留 plane 与主 Scene 的原子关系、occurrence metadata 和 transform，同时让每个后端复用正常 Scene primitive / resource 执行能力。

retained frame 继续只为 primary 持有 `SceneRuntimeSnapshot`；inspection plane 是每次 Core candidate 随 revision 产生的深冻结静态 overlay，不建立第二套 runtime identity 或动画时钟。prepare 必须同时验证 primary candidate 与全部静态 entry Scene，commit / rollback 一次切换完整 frame。

所有 renderer 必须保持：

- 先绘制 primary，再按 entry 顺序绘制辅助 Scene
- inspection plane 已不含 public id、meta 或 animation，不进入 pointer、hit-test、hydration identity、时间轴或 accessibility tree
- primary 与各 entry 的 resource id 在同一输出文档中隔离，SVG / Canvas 不因同名资源互相引用
- static、SSR、retained prepare / commit / rollback 对完整 frame 原子等价
- custom renderer 若声明支持 inspection，必须至少支持自己已经声明可执行的普通 Scene 能力；不能只实现旧 rect / line / label 白名单

Scene-only API 仍等价于 `inspection: null`。inspection capability negotiation 保留，因为“能够渲染一张 Scene”不自动表示宿主可以正确叠加、隔离命中并原子提交第二平面。

## 行为、失败语义与兼容性

- 默认行为：未声明任何 inspection sidecar 时 `inspection` 为 `null`，不调用 Inspector，不执行辅助 compile
- 最终 occurrence：只对主图最终逻辑树中的 settled occurrence 调用一次 Inspector；layout Composite 必须来自最终选中的 replay，Path 必须来自实际提交的非空 Path kind result。丢弃 probe、失败候选和未 replay 结果保持零可观察
- 空输出：合法，且不创建 plane entry；Path kind 的普通 compile 返回 `null` 也按空输出处理。所有选中 Inspector 都为空时结果为 `null`
- 失败与诊断：显式 `self` 选中但非空 owner 没有 Inspector、非空 Path result 缺少 / 违反 subject、Composite 缺少 required artifact、options 无效、callback 抛错、输出非法或辅助编译失败均携 structured inspection origin fail-loud；retained runtime 保留上一 committed frame
- React / Vanilla 等价性：两者只构造同一 runtime sidecar，Core 负责 locator remap、options resolve、subject 绑定与辅助 compile；adapter 不解释输出
- renderer 等价性：SVG / Canvas 及 custom renderer 消费同一 entry Scene，不建立 inspector-specific shape fallback
- 兼容性：这是 `0.x` breaking change，不保留别名或双轨。移除 `InspectionPrimitive*` / `InspectionTone*` 公共 schema 与类型，`InspectionPlaneEntry.primitives` 改为 `owner + scene`，`CompositeInspectorDefinition` 由通用 `InspectorDefinition` 取代，sidecar `component` 改为 `self` 并给 locator 增加 target，`CompileWarning` 增加必填 origin；旧 custom inspector 必须返回 IR child
- 持久化兼容性：不修改 Core / Standard authored IR schema；新增 Path `inspect` 仍是 runtime sidecar

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的 Composition、Primitive / Scene 与 Interaction Readiness 辅助面，解决开发期辅助内容被闭合 DTO 和专用 renderer 限制的问题
- 主责包与协作包：Core 主责 Inspector contract、settled subject、通用 sidecar target、有效 Theme / style 捕获、辅助 compile、静态 plane 与诊断 provenance；Render 执行普通 Scene 并隔离辅助平面；React / Vanilla 等价构造 sidecar；Standard 和其它 Tier 2 owner 生成自己的辅助 IR
- Core 拥有：`InspectorDefinition`、`defineInspector()`、Path kind subject branch、可编译输出边界、appearance、owner / occurrence、静态 Scene seal、资源 / namespace / identity 隔离与结构化诊断 origin
- Core 不拥有：Flex / Grid / Overlay 求解语义、领域 artifact、用户 DevTools 状态、交互编辑、renderer 私有对象或领域 Inspector 选项
- 外部扩展与下游闭环：内置与第三方 Composite / Path kind 都在原 Definition registry 中携带 Inspector；Path subject 由同一 conditional result / schema contract 验证，两类 owner 返回同一 Core IR，并经过同一辅助 compile、静态 seal 与 Render Scene 路径
- 不支持边界：Inspector 不能修改主图、跨 plane 引用、返回任意未注册 JSON、持久化 UI 状态或获得 DOM / Canvas / SVG 句柄

## 架构验证

- 是否可由现有能力组合：可以复用现有 IR、schema、Definition registry、compile 与 Scene；需要扩展 Inspector contract、挂载 owner 和隔离输出 channel，不能继续组合闭合 `InspectionPrimitive`
- math / core / render / adapter 责任切分：不新增 math 能力；Core 解析并编译辅助 IR；Render 只执行普通 Scene 和 frame isolation；adapter 只映射 authoring sidecar
- 是否需要新 IR / contract / registry：新增通用 nested `InspectorDefinition`、Path kind conditional subject、通用 sidecar target 与 diagnostic origin contract，不新增持久化 IR 或独立 registry；`defineInspector()` 是 authoring hook，真正 registration 仍由 owner Definition 完成
- Scene / manifest / renderer / diagnostics 如何闭环：settled subject → owner Inspector → IR child → 捕获 Theme / style 的隔离辅助 compile → identity-free 静态 Scene → owner / occurrence plane → frame renderer；warning / error origin 保留 owner、occurrence 与输出索引，辅助 artifact 不进入主 manifest
- provenance / locator / Interaction Readiness 是否适用：sidecar locator 显式携 target，entry 保留 owner + compile-local occurrence 与稳定顺序；辅助 Scene 的 public id / meta / animation 在 seal 时移除，不形成交互 target 或第二 runtime。未来控制点拖拽必须另建 interaction identity 与编辑事务
- 结论：扩展当前 Drawing Complete 能力域，用现有可编译内容替代平行 inspection primitive，并以 owner-attached Definition 保持内置与第三方同路

## 被否决方案

- 扩充 `InspectionPrimitive` union：每增加一种辅助图形都要同步 Core schema 和所有 renderer，继续维护平行图元系统
- `outputSchema + arbitrary JSON`：只能校验 payload，无法确定 Scene lowering 与 consumer ownership，最终仍需要第二套 registry
- 直接返回 `ScenePrimitive` 或 `Scene`：绕过 IR schema、Definition registry、Theme 与正常 provider 校验，也让 Inspector 自己承担资源和 occurrence transform
- 建立独立 Inspector registry：Composite / Path kind 的 owner key、subject 与 options 会被拆成两套注册和冲突路径
- 把辅助 child 合并进主 IR / Scene：会改变 viewBox、资源、identity、patch、hit-test 与持久化语义
- 在 Inspector 内重跑 layout / path solver：不能保证与最终 replay / path command 同源，并产生重复测量与 provider side effects
- 让 Render 解释 role、tone 或任意自定义 payload：把绘图语义下推到后端，并使 SVG / Canvas / custom renderer 分叉

## 测试策略摘要

需要 contract / type 证据锁定 `InspectorDefinition`、Path kind conditional subject / schema / null result、canonical options、target locator、universal hard barrier、空输出和 IR child 返回边界；compile contract 证明普通 Node、Path、Scope 与自定义 Composite 可作为辅助内容，非法 / hostile 输出 fail-loud，辅助 Inspector 不递归，主 Scene、artifact、identity、resource、layout 与 warning ownership不漂移。需要以最终 quadratic / cubic path control handle 覆盖首个非 Composite owner、相对坐标和 nested transform。

需要验证辅助 compile 捕获同一有效 Theme / Scope style、使用全新 namespace、只解析 entry 内引用，并给 warning / error 附加结构化 inspection origin；seal 后递归移除 public id / meta / animation，同时保留隔离 resource connection。React / Vanilla authoring parity 必须证明 layout 既有三层策略与 authored Path occurrence-local 开关映射到同一 Core sidecar；SVG / Canvas、static / SSR / retained frame 必须证明普通 Scene primitive / resource 等价执行、静态 overlay、资源隔离、pointer / hit / hydration / animation 排除和失败回滚。公共类型、schema reference、Layout Inspector 与 Path authoring文档必须同步，旧 custom Inspector / renderer 的 breaking migration 需要显式说明。

## 不在本 ADR 范围

- 控制点选择、hover、拖拽、键盘操作、吸附、history、编辑事务或跨 compile 稳定 handle identity
- 全图 / Scope 级 Path Inspector 批量策略，以及 Shape、Effect、Plot、Table、Gantt 等其它 owner 的具体 Inspector
- inspection 增量 patch、跨 compile cache、独立刷新频率或 worker 编译
- 用户 palette、CSS 注入、屏幕像素恒定线宽 / 纹理或 DevTools 面板
- 允许 Inspector 返回完整 `IRScene`、DOM、SVG 字符串、Canvas 命令、ReactNode 或任意未注册 JSON
- 从预编译 Scene 反推 subject，或允许辅助内容引用主 Scene identity / resource
