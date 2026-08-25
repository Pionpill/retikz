# ADR-12：将 Inspector 抽离为可选扩展包

- 状态：Accepted
- 决策日期：2026-08-06
- 接受日期：2026-08-07
- 关联：[Standard Layout Inspector ADR-07](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/07-layout-inspector.md) · [Standard Inspector 视觉语义 ADR-08](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/08-layout-inspector-visual-semantics.md)

## 背景与目标

现有 Inspector 已能读取最终布局产物或 Path 几何，并以普通 IR 子元素生成隔离辅助 Scene；但它的定义、选项、选择策略、色板、诊断、辅助编译编排和内置 Path 控制点实现都位于 Core，Render、React 与 Vanilla 也直接认识 inspection plane

这使一个默认关闭的开发期能力进入基础编译、渲染和宿主入口。随着 Plot、Chart、Table、贝塞尔曲线及其它能力增加各自的辅助内容，Core 会持续吸收领域选项、注册关系和辅助呈现逻辑，未使用 Inspector 的应用也必须携带相关公共契约与接线代码

Inspector 的根问题不是新的绘图语义，而是观察一次确定编译的最终产物，再用既有绘图能力生成不影响主图的辅助内容。Core 应提供稳定、领域中立的观测与片段编译底座；具体观察什么、如何选择、如何呈现和如何接入宿主，应由可选扩展拥有

本 ADR 的目标是：

1. 新增独立的 `@retikz/inspect` 包，并加入 Kernel 发布组的版本联动
2. Core 只保留最终编译观测、所属者产物、来源追踪和隔离片段编译能力
3. Inspector 定义、注册、选择、辅助平面、色板、诊断和内置 stroke Path Inspector 全部迁入 `@retikz/inspect`
4. Standard 通过可选 `/inspect` 子入口提供 Flex、Grid 与 Overlay Layout Inspector，根入口不静态导入 Inspector
5. 未安装或未注册 Inspector 时，Core、Render、React、Vanilla 与 Standard 根入口没有 Inspector 默认行为和额外编译成本

## 与既有 Standard 决策的关系

[Standard Layout Inspector ADR-07](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/07-layout-inspector.md) 冻结的最终 occurrence、最终 replay、运行时选择、主图隔离和完整帧原子提交语义继续有效，但其实现归属从 Core、Render 与基础 adapter 迁移到可选 Inspect 能力

[Standard Inspector 视觉语义 ADR-08](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/08-layout-inspector-visual-semantics.md) 保留真实 spacing artifact、选项拆分、occurrence 配色、纹理、线型、绘制顺序和共线消重目标。色板、辅助 IR 与视觉实现归 `@retikz/inspect` 和 `@retikz/standard/inspect`，不再由 Core 或 Render 持有 inspection 专用语义

## 决策：以 Core 通用观测能力支撑独立 Inspect 包

整体依赖方向固定为：

```text
@retikz/core
  ├─ 最终 occurrence 观测
  ├─ 所属者产物与来源追踪
  └─ 隔离 IR 片段编译
          │
          ▼
@retikz/inspect
  ├─ Inspector Definition 与注册表
  ├─ 选择、选项、色板与诊断
  ├─ InspectionPlane 与编译编排
  └─ 内置 stroke Path Inspector
          ▲
          │
@retikz/standard/inspect
  └─ Flex / Grid / Overlay Layout Inspector
```

Core、Render、React、Vanilla 与 Standard 根入口都不得反向依赖 `@retikz/inspect`。`@retikz/inspect` 是 Kernel 发布组中的独立 npm 包，但安装和导入保持可选

### Core 提供的领域中立底座

Core 公开四项稳定能力：

1. **所属者产物**：开放 Definition 可以为最终编译结果声明带 schema 的 JSON-safe 产物。layout-aware Composite 复用已解析的 typed artifact；Path kind 可以声明自己的最终产物。内置 stroke Path 公开由最终 move、line、quadratic、cubic 等命令及必要局部几何组成的产物，但不包含控制点呈现逻辑
2. **最终 occurrence 观测**：外部观察者按所属者选择感兴趣的 occurrence。Core 只发布最终逻辑树中实际提交的结果，丢弃 probe、失败候选、未选 replay 和空 Path 结果；事件携带所属者、compile-local occurrence、最终变换与 probe/replay 来源
3. **按需捕获**：没有观察者或没有观察者选择当前所属者时，Core 不为观察用途读取、克隆或校验额外产物。观察者只能读取 schema 已验证并冻结的 JSON-safe snapshot
4. **隔离片段编译**：观察者可以在当前 occurrence 的有效 Theme、Scope 样式、provider 与文字度量环境中，把普通 `IRChild` 片段编译为局部 Scene。片段使用新的 namespace、resource、artifact、identity 与 diagnostic staging，默认不再次触发观察者，也不能读取主 Scene 身份

这些能力使用 `observation`、`owner output` 或同义的领域中立命名，不在 Core 公共面出现 Inspector、InspectionPlane、色板、控制点或 Layout Inspector 选项。具体泛型和函数排列由实施计划细化，但必须保留以下最小跨包契约：

```ts
type CompileObservationOwner =
  | Readonly<{ kind: 'composite'; namespace: string; type: string }>
  | Readonly<{ kind: 'pathKind'; name: string }>;

type CompileOwnerOutputDefinition<TValue extends JsonValue> = Readonly<{
  schema: ZodType<TValue>;
}>;

type CompileOwnerOutputPublisher<TValue extends JsonValue> = Readonly<{
  requested: boolean;
  publish: (value: TValue) => void;
}>;

type CompileObservationSite = Readonly<{
  owner: CompileObservationOwner;
  sourcePath: string;
}>;

type CompileObservationProvenance = Readonly<{
  origin: CompileOccurrenceLocator;
  final: CompileOccurrenceLocator;
}>;

type CompileObservation<TValue extends JsonValue = JsonValue> = Readonly<{
  owner: CompileObservationOwner;
  occurrence: CompileOccurrenceLocator;
  value: TValue;
  transform: readonly [number, number, number, number, number, number];
  provenance: CompileObservationProvenance;
}>;

type CompileObserverDefinition<TOutput = unknown> = Readonly<{
  key: string;
  createSession: () => CompileObserverSession<TOutput>;
}>;

type CompileObserverSession<TOutput> = Readonly<{
  select: (site: CompileObservationSite) => boolean;
  observe: (observation: CompileObservation, context: CompileObservationContext) => void;
  complete: () => TOutput;
}>;

type CompileObservationContext = Readonly<{
  compileFragment: (children: IRChild | ReadonlyArray<IRChild>) => CompiledSceneFragment;
}>;

type CompiledSceneFragment = Readonly<{
  scene: Scene;
  artifacts: ReadonlyArray<CompileArtifact>;
  diagnostics: ReadonlyArray<CompileWarning>;
}>;

type CompileObserverOutput<TOutput> = Readonly<{
  key: string;
  value: TOutput;
}>;

type ObservedCompileResult<TOutput = unknown> = Readonly<{
  primary: CompileResult;
  observerOutputs: ReadonlyArray<CompileObserverOutput<TOutput>>;
}>;

declare const observeCompileToScene: (
  ir: IRScene,
  options: CompileOptions,
  observers: ReadonlyArray<CompileObserverDefinition>,
) => ObservedCompileResult;
```

`CompileObservationProvenance.origin` 是所属者产物在最终 replay remap 前的 occurrence，`final` 与公开 `occurrence` 相同；两者的结构化 `expansionPath` 使用既有 `probe` / `replay` 段表达来源。直接产物的 `origin` 与 `final` 相同。外部选择不解析私有 traversal 状态，只依赖这两个公开 locator

所属者产物的声明和捕获固定为：

- layout-aware Composite 的既有 `artifactSchema` 同时是 `CompileOwnerOutputDefinition.schema`，最终 replay 发布的 typed artifact 是 owner output。观察者选中声明 typed artifact 的最终 occurrence 后缺少 artifact 属于 Core contract failure；expand-only 或未声明 artifact 的 Composite 没有 owner output
- Path kind 使用可选 `ownerOutput: CompileOwnerOutputDefinition<TValue>` 声明产物，其 compile context 获得同泛型的 `ownerOutput: CompileOwnerOutputPublisher<TValue>`：只有至少一个 observer 选择当前 site 时 `requested` 才为 true；非空 Path 结果必须恰好 publish 一次，`null` 结果不得 publish。未请求时 Core 不读取、克隆或校验 owner output
- Composite 与 Path kind 最终都进入同一个 `CompileObservation` envelope、schema 校验、冻结、排序和 observer dispatch；不存在 Inspector 专用 subject 字段或第二条消费路径

`select()` 只接收 owner 与 authored `sourcePath`，可以在候选编译前请求按需产物；它本身不代表 observable occurrence。Core 可以为 probe 候选捕获被请求的产物，但只对最终选中 replay 调用 `observe()`。`observe()` 事件先按既有 final occurrence comparator 排序，同 occurrence 再按 owner key 排序

观察者通过显式运行时注册进入一次 observed compile，不进入 IR、Snapshot 或 Scene。每个 Definition 为每次编译创建独立 session；observer definition 的 `key` 在编译前查重，重复 key fail-loud。Core 按稳定顺序调用 `observe()`，即使没有事件也对每个 session 调用一次 `complete()`；`observerOutputs` 按 definitions 输入顺序返回，每个 key 恰有一项，空观察结果由该 observer 的 canonical output 表达

`compileFragment()` 以当前 observation 捕获的 Theme、resolved Scope style、providers、host measurer 与局部坐标为输入，返回独立 Scene、artifact 和 diagnostics；默认 observer 集合为空。fragment 的 artifact 与 diagnostics 只存在于返回值，不写入 primary。Core 不负责移除 fragment 的公共身份，具体扩展在消费前自行 seal

任一 observer session 创建、`select()`、owner output、`observe()`、fragment compile 或 `complete()` 失败时，observed compile 整体 fail-loud，不返回 primary 或部分 outputs。未使用 observed 入口的普通 `compileToScene()` 不创建 session，也不受 observer failure 影响。Core 不维护全局可变注册表，不自动发现包，也不区分内置与第三方观察者

普通 `compileToScene()` 继续只返回主 Scene、artifact 与普通诊断；不再返回 `inspection`。Core 另提供显式 observed compile 入口，输入 observer definitions 并返回主结果与 observer outputs。需要辅助内容的调用方使用 `@retikz/inspect` 提供的编译驱动，它为每次调用创建 Inspector observer session，不复用上次编译状态

### `@retikz/inspect` 拥有 Inspector 完整语义

`@retikz/inspect` 根入口是宿主无关的 Inspector 真源，至少拥有：

- `InspectorDefinition`、`defineInspector()`、注册表解析与重复 key 诊断
- occurrence 选择、选项解析、继承与关闭策略
- `InspectionOwner`、`InspectionAppearanceContext`、`InspectionPlane` 与稳定排序
- canonical scope palette、Core shared semantic colors 与 appearance 分配
- Inspector callback、普通 IR 输出规范化、隔离片段编译编排和 inspection-specific error origin
- 主图结果与辅助平面的原子 `InspectionCompileResult`
- 内置 stroke Path Inspector 及其控制点、控制柄与标签选项

Inspector 独立注册，不再挂载到 `CompositeDefinition` 或 `PathKindDefinition`。注册键是 `namespace + type`，其中 `namespace` 使用拥有该 Inspector 能力的包稳定短名：Core 能力使用 `core`，Layout 能力使用 `layout`，第三方能力使用其所属包短名，不使用统一 `retikz` 前缀；`type` 在该 namespace 内唯一。Core 观测所属者是 Definition 的独立目标字段；内置与第三方 Inspector 经过同一 `defineInspector()`、注册表、选项解析、callback 与输出编译路径。重复键 fail-loud，不使用内置白名单或 import 副作用覆盖

```ts
type InspectorDefinition<
  TSubject extends JsonValue,
  TOptionsInput extends IRJsonObject,
  TResolvedOptions extends IRJsonObject,
> = Readonly<{
  namespace: string;
  type: string;
  owner: CompileObservationOwner;
  subjectSchema: ZodType<TSubject>;
  optionsInputSchema: ZodType<TOptionsInput>;
  optionsSchema: ZodType<TResolvedOptions, TOptionsInput>;
  mergeOptionsInput?: (inherited: TOptionsInput, local: TOptionsInput) => TOptionsInput;
  inspect: (subject: TSubject, context: InspectorContext<TResolvedOptions>) => InspectorOutput;
}>;

type InspectorOutput = IRChild | ReadonlyArray<IRChild>;

type InspectorKey = Readonly<{ namespace: string; type: string }>;

type InspectionAppearanceContext = Readonly<{
  colorScope: number;
  scopeColor: CssColorValue;
  semanticColors: CoreSemanticColors;
}>;

type InspectorContext<TOptions extends IRJsonObject> = Readonly<{
  inspectorKey: InspectorKey;
  owner: CompileObservationOwner;
  occurrence: CompileOccurrenceLocator;
  provenance: CompileObservationProvenance;
  options: TOptions;
  appearance: InspectionAppearanceContext;
}>;

type InspectionPlaneEntry = Readonly<{
  inspector: InspectorKey;
  owner: CompileObservationOwner;
  occurrence: CompileOccurrenceLocator;
  colorScope: number;
  transform: readonly [number, number, number, number, number, number];
  scene: Scene;
}>;

type InspectionPlane = Readonly<{
  entries: ReadonlyArray<InspectionPlaneEntry>;
}>;

type InspectionDiagnosticOrigin =
  | Readonly<{
      stage: 'selection';
      ruleIndex: number;
      target: InspectionSelectionTarget | null;
    }>
  | Readonly<{
      stage: 'subject' | 'inspect';
      inspector: InspectorKey;
      owner: CompileObservationOwner;
      occurrence: CompileOccurrenceLocator;
    }>
  | Readonly<{
      stage: 'output' | 'fragment';
      inspector: InspectorKey;
      owner: CompileObservationOwner;
      occurrence: CompileOccurrenceLocator;
      outputIndex: number;
    }>;

type InspectionDiagnostic = Readonly<{
  origin: InspectionDiagnosticOrigin;
  cause: Readonly<Pick<CompileWarning, 'code' | 'message' | 'path'>>;
}>;

type InspectionCompileResult = Readonly<{
  primary: CompileResult;
  inspection: InspectionPlane | null;
  diagnostics: ReadonlyArray<InspectionDiagnostic>;
}>;
```

`namespace + type` 是 Inspector registry key；`namespace` 表示拥有该 Inspector 能力的包，`owner` 是被观察的 Core 所属者，二者不是同一个字段。`subjectSchema` 在外部注册表恢复具体所属者产物类型，不替代 Core owner output schema。两者必须连续成功：Core 先保证所属者产物符合其 Definition 契约，Inspect 再保证该 Inspector 与目标所属者约定的 subject 一致

`optionsInputSchema` 接受 runtime-only sparse input，`optionsSchema` 产出 JSON-safe canonical options。多层规则默认由更具体输入整体替换；需要稀疏合并的 Inspector 显式提供 `mergeOptionsInput()`，内置与第三方使用同一回调边界。合并结果必须再次经过 input schema 和 canonical schema，不能由 adapter 预先按内置 key 裁剪

canonical scope palette 沿用 `#2563eb`、`#7c3aed`、`#c026d3`、`#db2777`、`#ea580c`、`#a16207`、`#16a34a`、`#0f766e`、`#0891b2` 的顺序并按 `colorScope % 9` 取值，warning color 为 `#dc2626`。这些默认值迁入 `@retikz/inspect`，Render 与 Standard 不得维护副本

同一 owner 可以注册多个不同 key 的 Inspector，例如控制点、曲率或边界视图；一次选择明确指定 Inspector key。重复 key fail-loud，不能以 owner 重复为由阻止独立扩展，也不能 last-wins 覆盖内置定义

`@retikz/inspect` 导出内置 Inspector 集合和显式的默认注册表构造器。使用默认构造器可以获得 stroke Path Inspector；自定义注册表必须显式组合所需定义，不存在进程级自动注册。选择请求必须指明 Inspector key 和目标 locator，避免同一 owner 存在多个定义时产生隐式优先级

### Inspect 包入口与依赖

`@retikz/inspect` 根入口只依赖 Core，提供宿主无关的 Definition、registry、选择、编译驱动与辅助平面。可选集成使用独立子入口：

- `@retikz/inspect/render`：把 plane 适配为 Render 普通只读图层
- `@retikz/inspect/react`：为 React 宿主提供选择收集和编译驱动接线
- `@retikz/inspect/vanilla`：为 Vanilla 宿主提供同构接线

Render、React 与 Vanilla 只作为相应子入口的 optional peer dependency；导入 Inspect 根入口不得加载 renderer 或框架代码。子入口共享根入口契约，不复制 registry、selection 或 compile orchestration

### 选择与 authoring 边界

Inspector 选择是 `@retikz/inspect` 的 runtime-only 输入，不进入 Core 或 Standard IR。基础选择以 Inspector key、所属者和 authored / final occurrence locator 为依据；Core 只提供稳定来源追踪和 replay remap，不解释启用、继承或 family 选项

```ts
type InspectionSelectionTarget =
  | Readonly<{ kind: 'scene' }>
  | Readonly<{ kind: 'subtree'; sourcePath: string }>
  | Readonly<{
      kind: 'self';
      locator:
        | Readonly<{
            kind: 'authored';
            sourcePath: string;
            occurrenceIndex?: number;
          }>
        | Readonly<{ kind: 'occurrence'; occurrence: CompileOccurrenceLocator }>;
    }>;

type InspectionSelectionRule =
  | Readonly<{
      kind: 'request';
      inspector: InspectorKey;
      target: InspectionSelectionTarget;
      value: false | true | IRJsonObject;
    }>
  | Readonly<{
      kind: 'barrier';
      target: Extract<InspectionSelectionTarget, { kind: 'scene' | 'subtree' }>;
    }>;

type InspectionSelection = Readonly<{
  rules: ReadonlyArray<InspectionSelectionRule>;
}>;

type ResolvedInspectionRequest = Readonly<{
  inspector: InspectorKey;
  owner: CompileObservationOwner;
  occurrence: CompileOccurrenceLocator;
  provenance: CompileObservationProvenance;
  options: IRJsonObject;
  appearance: InspectionAppearanceContext;
}>;
```

`scene` 规则作用于整张 authored scene；`subtree` 以 `sourcePath` 作用于该 Scope / Composite 来源的最终后代；`self` 可以选择一个 authored source 的全部最终映射，也可以精确选择一个 final occurrence。同一 `sourcePath` 与 owner 对应多个嵌套 occurrence 时，`occurrenceIndex` 按最终 occurrence 顺序选择其中一个；省略仍表示选择全部映射。规则按 scene → 包含当前 occurrence 的 subtree 由外到内 → self 求值；同一 target 对同一 Inspector key 出现重复 request fail-loud，不使用数组后项覆盖

`true` 表示 canonical 空输入，object 按 Definition 的 options merge 契约级联，`false` 关闭该 Inspector 在当前规则范围的继承但允许更深层显式重开。`barrier` 关闭目标子树内所有 Inspector，并禁止任何后代规则重开。无效 sourcePath、越界 self occurrence、重复规则、barrier 作用于 self 或 options schema 失败都在 callback 前 fail-loud

scene / subtree 规则只选择 owner 与目标 InspectorDefinition 匹配的 final occurrence，不因普通 child 没有匹配 Inspector 报错；显式 self 请求的 key 未注册、owner 不匹配或目标没有 owner output 时 fail-loud。所有规则求值后先生成 `ResolvedInspectionRequest`，按 final occurrence comparator、Inspector key 排序，再分配连续 `colorScope` 和 appearance，之后才调用 callback。空 callback 输出仍占用自己的 colorScope，但不形成 plane entry；所有输出为空时 plane 为 `null`

Layout 全图、Scope 子树、组件局部与关闭值由 `@retikz/standard/inspect` 分别生成 scene、subtree、self request 与通用 barrier；barrier 内的 Path 和其它 Inspector 也不能由后代重新开启。Flex、Grid、Overlay 的 sparse options merge 由各自 InspectorDefinition 提供，不由 Core 或 adapter 解释。Path 默认只在显式 self 规则选中时开启；全图 Path 策略仍不在本轮冻结

React 与 Vanilla 的基础包不再拥有 `inspect` prop、inspection sidecar 或输出解释。`@retikz/inspect` 提供与 Core 编译签名兼容的可选编译驱动，并通过可选宿主入口把相同选择请求接入 React 与 Vanilla。宿主只负责收集 locator 和调用该驱动，选项解析、所属者匹配、辅助编译与诊断仍在 Inspect 包中

组件局部 authoring sugar 只由相应的可选 `/inspect` 入口导出；基础 adapter 根入口不得静态导入 Inspect。React 与 Vanilla 必须表达同一 `InspectionSelection` 并得到结构等价的 plane，不能各自维护内置 Inspector key 或选项白名单

React 可嵌入贡献可以转发其内部按 authored 顺序收集的领域中立 authoring sites。每个 site 可以携带 observation owner；外层 builder 只把内部 site 绑定到贡献节点的 `sourcePath` 并保持顺序，不解释 Inspector key、options 或 barrier。当同一贡献位置出现同 owner 的父子 occurrence 时，Inspect React driver 依据这些 sites 的稳定 authored ordinal 生成明确的 `occurrenceIndex`，从而只选择包装组件对应的 occurrence，不误选父级或相邻 occurrence。基础 React adapter 不生成 Inspector selection，也不把该序号写入 IR

### Standard 的可选 `/inspect` 子入口

`@retikz/standard` 根入口继续拥有 Layout schema、Definition、solver、artifact 与 lowering，不导出 Inspector、Inspect options、色板或辅助内容 helper，也不在 Flex、Grid、Overlay Definition 上挂载 Inspector

`@retikz/standard/inspect` 作为显式子入口导出：

- Flex、Grid、Overlay 的 `InspectorDefinition`
- 共享与 family-local 的 Layout Inspect 选项 schema、类型和预设
- Layout / Scope / component-local 选择策略构造器
- Layout artifact 到普通 Core Path、Node、paint 的辅助内容生成逻辑

Standard 包家族固定提供三个可选入口：

- `@retikz/standard/inspect`：宿主无关 Definition、options、preset 与 selection helper
- `@retikz/standard-react/inspect`：把 Layout、Scope 与组件局部 sugar 转为同一 `InspectionSelection`
- `@retikz/standard-vanilla/inspect`：提供与 React 结构等价的无框架 authoring 与编译驱动接线

这是对 Standard 现有“package exports 只保留根入口”规则的受控例外，只服务可选横切能力，不为普通组件逐项增加 subpath。三个根入口均不得 re-export `/inspect` 内容或静态导入 `@retikz/inspect`

三个 `/inspect` 入口都把 `@retikz/inspect` 声明为 optional peer dependency，并在各自开发依赖中完成构建。只导入任一根入口时，即使未安装该 peer 也必须正常工作；显式导入 `/inspect` 而缺少 peer 时由模块解析 fail-loud，不提供静默空实现、动态自动安装或降级到 Core 内置路径

未来 Plot、Chart、Table 等领域包沿用 `@retikz/plot/inspect`、`@retikz/chart/inspect`、`@retikz/table/inspect` 这类子入口提供领域 Inspector，不为每种领域 Inspector 新建薄 npm 包，也不把领域选项下沉到 Core 或 `@retikz/inspect`

### Render 与完整帧

`InspectionPlane` 不再属于 Core，Render 也不再拥有 inspection-specific frame、capability、palette、SVG builder 或 Canvas 绘制器

Render 只提供领域中立的只读 Scene 图层契约：

```ts
type RenderReadonlyLayer = Readonly<{
  key: string;
  scene: Scene;
  transform: readonly [number, number, number, number, number, number];
}>;

type StaticRenderFrame = Readonly<{
  primary: Scene;
  layers: ReadonlyArray<RenderReadonlyLayer>;
}>;

type RenderFrameSnapshot = Readonly<{
  primary: SceneRuntimeSnapshot;
  layers: ReadonlyArray<RenderReadonlyLayer>;
}>;
```

`layers` 是稳定有序的后置绘制序列，默认空数组。`key` 在单帧内唯一并作为 renderer resource namespace；空 key、重复 key、非法 transform、带公共 id / meta / animation 的 layer Scene 在 prepare 前 fail-loud。Render 为 primary 和每个 layer 使用独立资源前缀，同名 paint、clip 或 image 不得跨层解析

主 Scene 单独决定 camera、fit、viewBox、layout、交互身份和增量 patch。只读 layer 固定不参与 viewport、hit-test、pointer、hydration、animation runtime、accessibility 或 primary identity topology；这些不是调用方可切换的布尔选项，避免外部包把只读层升级成第二套交互 Scene

静态 SVG、Canvas 与 SSR 接收同一 `StaticRenderFrame`，先物化 primary，再按数组顺序物化 layers。retained renderer 的通用 `readonlyLayerCapability` 取代 inspection capability：空 layers 对 unsupported renderer 合法，非空 layers 在 prepare 前 fail-loud；supported renderer 必须在一个 prepared token 中验证 primary 与全部 layer Scene / resources，commit 或 rollback 整帧，`read()` 只返回最近一次 committed `RenderFrameSnapshot`

primary patch 只描述 primary identity 变化；任一 layer 或其顺序变化时，renderer 可以整体替换只读层，但不能把 layer identity 混入 primary patch。layer prepare、resource 或绘制失败不得提交新的 primary candidate

`@retikz/inspect/render` 只把每个 `InspectionPlaneEntry` 一对一映射为 `RenderReadonlyLayer`：稳定 key 来自 Inspector key 与 entry 顺序，Scene 和 occurrence transform 原样进入 layer。它不改变 camera、资源执行或 retained transaction。SVG 与 Canvas 复用正常 Scene primitive / resource 执行能力，不认识 Inspector role、tone、palette 或 options；Render 的任何公共 frame 字段都不得使用 inspection 命名

## 辅助内容隔离与确定性

`@retikz/inspect` 调用 Core 隔离片段编译时必须满足：

- 只读取同次最终提交的 settled observation，不重新运行主图 layout 或 Path solver
- callback 输出先规范化为稠密 `IRChild` 序列，完成 JSON-safe 脱离、schema / provider 校验与冻结
- 捕获当前 occurrence 的有效 Theme 与完整 Scope style defaults，不从全局默认重新开始
- 观察者在辅助片段中默认关闭，返回带 Inspector 的 Path 或 Composite 不产生递归
- 每个 entry 使用独立 namespace、resource、artifact、diagnostic 与 identity staging
- entry 内部引用按正常 Core 规则解析；引用主 Scene 或其它 entry 必须 fail-loud
- 辅助 artifact 不进入主 `CompileResult.artifacts`，辅助诊断具有 Inspect 自己的 owner、occurrence 与 output index 来源
- seal 后辅助 Scene 不保留公共 id、meta、animation、hit target 或 hydration identity；资源内部连接保留并隔离
- 主 Scene、artifact、layout、resource、identity topology、runtime metadata、patch 与 hit-test index 在开关 Inspector 前后结构等价
- 相同 IR、definitions、observer registry、Inspector registry、选择与 host options 得到同序、深冻结且结构等价的结果

Inspector 输出为空是合法结果，不形成 entry。已选择 Inspector 的 subject、options、callback、输出或片段编译失败时，整个 Inspect 编译驱动 fail-loud，不返回只有主 Scene 的部分结果；retained 宿主保留上一 committed frame

selection admission 失败使用 `stage: 'selection'` 并保留原始 rule index；target 结构有效时原样保留，尚未形成合法 target 时为 `null`，不伪造 owner / occurrence；subject 与 callback 失败使用已绑定的 Inspector key、owner 和 final occurrence；输出规范化及片段编译失败再携带精确 output index。Core fragment diagnostic 的 code、message 与 child path 作为 cause 保留，不能折叠为 entry 根路径或伪装成 primary warning

非致命 fragment warning 只进入 `InspectionCompileResult.diagnostics`，不写入 `primary.warnings`。每项诊断保留对应的 `InspectionDiagnosticOrigin`，并把 Core warning 的 `code`、`message` 与 `path` 原样放入 `cause`；结果先按 resolved request 的稳定顺序，再按 `outputIndex` 和 Core fragment 的产生顺序排列。没有诊断时返回深冻结的空数组

需要 fail-loud 的 selection、subject、callback、输出或 fragment 错误由 Inspect 抛出携带同一 origin 与原始 cause 的错误，不返回 primary、plane、diagnostics 或其它部分结果；由 fragment warning 提升的错误保留相同的 `code`、`message` 与 `path` cause。retained 宿主把 primary、plane 与 diagnostics 作为同一 revision 的候选一起 prepare、commit 或 rollback，不能提交跨 revision 的组合

## 行为、失败语义与兼容性

- 默认行为：未注册 Core observer 时不捕获额外所属者产物；未使用 `@retikz/inspect` 时没有 Inspector callback、辅助编译或辅助 plane
- 注册行为：Inspector 必须显式加入一次编译使用的注册表；内置 stroke Inspector 与第三方定义使用同一冲突和查找规则，同一 owner 的不同 key 可以共存
- 最终结果：只观察主图最终逻辑树中实际提交的 occurrence；probe、失败候选、未 replay 结果和空 Path 不可观察
- 失败与诊断：无效 observer、owner output、Inspector、选择 locator、options、subject、callback 输出、跨平面引用或辅助编译均在所属包边界 fail-loud，并保留 Core occurrence provenance
- React / Vanilla 等价性：两者调用同一 Inspect 编译驱动并构造同一选择请求；基础 adapter 不解释 Inspector
- renderer 等价性：SVG / Canvas 消费同一普通只读 Scene 图层，不维护 Inspector 图元分支
- 兼容性：这是 `0.x` breaking change，不保留双轨或别名。Core 移除 inspection contract、`CompileOptions.inspection`、`CompileResult.inspection`、Definition 上的 inspector 字段和内置 stroke Inspector；Render 移除 inspection-specific frame / capability；基础 React / Vanilla 与 Standard 根入口移除 inspection-specific authoring 与导出
- 持久化兼容性：不修改 Core / Standard authored IR schema；Inspector 选择仍是 runtime-only 数据

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的编译可观测性与 Composition 协作面；解决可选开发辅助能力污染 Core 所有权和默认依赖的问题
- Core 拥有：所属者产物、最终 occurrence、probe/replay provenance、观察者注册入口和隔离片段编译
- `@retikz/inspect` 拥有：Inspector contract / registry、选择、options、appearance、palette、plane、诊断、辅助编译编排、内置 Path Inspector 与宿主接入
- Render 拥有：领域中立的普通 Scene 图层执行和完整帧原子提交，不拥有 Inspector 语义
- Standard 拥有：Layout artifact；其 `/inspect` 子入口拥有 Layout Inspector 定义、选项、策略和视觉生成
- 外部扩展与下游闭环：第三方 owner 通过 Core Definition 发布稳定产物，第三方 Inspector 在 Inspect registry 独立注册，两者经 Inspector key、owner selector、subject schema、final occurrence、普通 IR 与隔离片段编译闭环
- 不支持边界：Inspector 不能修改主图、跨平面引用、获得 renderer / DOM 句柄、返回未注册 JSON、持久化 UI 状态或建立第二套绘图 IR

## 最终结果

Core 已收敛为领域中立的所属者产物、最终 occurrence 观测与隔离片段编译底座；Inspector 的定义、注册、选择、诊断、辅助平面、内置 Path 实现及宿主驱动均由可选 `@retikz/inspect` 提供。Render 只执行普通只读 Scene 图层，Standard 三包通过显式 `/inspect` 子入口提供布局辅助能力，基础入口不加载可选依赖

验收覆盖 Core、Render、Inspect、React、Vanilla、Standard 三包的契约、类型、全量测试与生产构建，以及 Standard 可选入口的缺失依赖、显式安装和发布产物边界。中英文文档、示例、导航与生产构建已同步验证；最终整体审计无未处理阻塞项

当前真实限制是贡献内部 Scope 尚无独立 subtree locator，因此无法无歧义定位时会明确失败；Path 的全图与 Scope 批量策略、Inspector 增量更新及交互式控制点仍留待后续能力设计

## 长期边界

- 控制点选择、hover、拖拽、键盘操作、吸附、history、编辑事务或跨 compile 稳定 handle identity
- 全图 / Scope 级 Path Inspector 批量策略，以及 Plot、Chart、Table、Gantt 等具体领域 Inspector
- inspection 增量 patch、跨 compile cache、独立刷新频率、worker 编译或性能预算
- 用户 palette、CSS 注入、屏幕像素恒定线宽 / 纹理或 DevTools 面板
- 从预编译 Scene 反推 owner output，或允许辅助内容引用主 Scene identity / resource
- 为旧 Core 内置 Inspector、旧 Render frame 或旧 adapter `inspect` prop 保留兼容桥接
