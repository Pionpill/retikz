# ADR-05：Scene Patch 与 Retained Renderer

- 状态：Proposed
- 决策日期：2026-07-26
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-04](./04-incremental-core-compile.md) · [ADR-03](./03-program-transaction-lifecycle.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md)

## 背景

Vanilla SVG update 当前清空全部 child 后重建，Canvas update 重设 bitmap 并完整 redraw；React SVG 也从完整 Scene 重新映射。即使 Core 只重算一个 contribution，没有 retained identity topology、统一 Patch 和可回滚 renderer commit，backend 成本仍与整图规模相关。

Scene 当前只有局部 `id?`，不能表达 qualified primitive identity、一个 semantic owner 对多个 primitive 或 anonymous subtree。React 还拥有当前 SVG descendants；直接命令式 patch 会与 reconciliation 双写。因此 Scene Patch 必须同时冻结 runtime-only topology、transaction participant 与唯一 DOM ownership。

## 决策：完整 Scene + Runtime Identity Topology 是 Retained 真源

```ts
type RuntimeDeepReadonly<T> = T extends (...args: infer TArgs) => infer TResult
  ? (...args: TArgs) => TResult
  : T extends ReadonlyArray<infer TItem>
    ? ReadonlyArray<RuntimeDeepReadonly<TItem>>
    : T extends object
      ? { readonly [TKey in keyof T]: RuntimeDeepReadonly<T[TKey]> }
      : T;

type RuntimeScene = RuntimeDeepReadonly<Omit<Scene, 'resources' | 'animations'>> &
  Readonly<{
    resources: ReadonlyArray<RuntimeSceneResource>;
    animations: RuntimeDeepReadonly<NonNullable<Scene['animations']>>;
  }>;
type RuntimeScenePrimitive = RuntimeDeepReadonly<ScenePrimitive>;
type RuntimeSceneResource = RuntimeDeepReadonly<SceneResource>;

type SceneRuntimeNode = Readonly<{
  identity: RuntimeIdentity;
  semanticOwner: RuntimeIdentity;
  parent: RuntimeIdentity;
  order: number;
  primitivePath: ReadonlyArray<number>;
  publicId?: string;
}>;

type SceneRuntimeSubtreeNode = Readonly<{
  identity: RuntimeIdentity;
  semanticOwner: RuntimeIdentity;
  parent?: RuntimeIdentity;
  order: number;
  primitivePath: ReadonlyArray<number>;
  publicId?: string;
}>;

type SceneRuntimeSnapshot = Readonly<{
  revision: RuntimeRevision;
  scene: RuntimeScene;
  root: RuntimeIdentity;
  topology: ReadonlyArray<SceneRuntimeNode>;
}>;

type SceneRuntimeSubtree = Readonly<{
  root: RuntimeIdentity;
  primitive: RuntimeScenePrimitive;
  topology: ReadonlyArray<SceneRuntimeSubtreeNode>;
}>;

type ScenePatch = Readonly<{
  baseRevision: RuntimeRevision;
  nextRevision: RuntimeRevision;
  operations: ReadonlyArray<ScenePatchOperation>;
}>;

type ScenePatchOperation =
  | Readonly<{ kind: 'insert'; parent: RuntimeIdentity; before?: RuntimeIdentity; subtree: SceneRuntimeSubtree }>
  | Readonly<{ kind: 'update'; identity: RuntimeIdentity; subtree: SceneRuntimeSubtree }>
  | Readonly<{ kind: 'remove'; identity: RuntimeIdentity }>
  | Readonly<{ kind: 'move'; identity: RuntimeIdentity; parent: RuntimeIdentity; before?: RuntimeIdentity }>
  | Readonly<{ kind: 'setLayout'; layout: RuntimeDeepReadonly<Scene['layout']> }>
  | Readonly<{ kind: 'setResources'; resources: ReadonlyArray<RuntimeSceneResource> }>
  | Readonly<{
      kind: 'setAnimations';
      animations: RuntimeDeepReadonly<NonNullable<Scene['animations']>>;
    }>
  | Readonly<{ kind: 'replaceScene'; snapshot: SceneRuntimeSnapshot }>;
```

上述 runtime-only DTO全部是 deeply immutable public read。RuntimeScene把持久 Scene可选的 `resources/animations`规范化为必有 readonly arrays；缺失与空都读作 `[]`，setResources/setAnimations的空数组分别表示清除最后资源/动画。Core final assembly对 Scene、primitive、layout、resources、animations、topology与 Patch payload做 session-owned结构复制并递归 `Object.freeze()`；persistent immutable节点可结构共享，callback保持可调用的稳定 identity。Render/第三方 participant只能读，任何 nested Array/object mutation在TypeScript被拒绝，运行时严格模式下也不能改变 candidate/current。该冻结不修改 `Scene` 持久 schema自身的可变类型，只约束 Runtime surface。

Core ADR-04 full/incremental final assembly始终产生 `SceneRuntimeSnapshot`。Snapshot `root`是固定 document-root identity，不对应 Scene primitive；`topology`与 `scene.primitives`递归得到的 primitive occurrence严格双射。Full snapshot的 `primitivePath`是从 `scene.primitives`起算的全局 zero-based index path；每个 identity唯一，parent只能是 snapshot root或另一个 node，所有 node从 root完全可达且无环；同 parent的 `order`必须是 `0..n-1`连续整数并与 Scene顺序一致。semantic owner/public mapping不写入持久 Scene schema。

Subtree使用独立相对坐标：`primitivePath=[]`且 `parent=undefined/order=0`的唯一 node必须等于 `subtree.root`并对应 `subtree.primitive`；descendant path从该 primitive children起算，parent只能引用 subtree内 node。Insert operation的外部 `parent/before`决定 root接入点；update要求 `identity === subtree.root`并保留外部 parent/order，但可替换 primitive type与全部 descendants。Renderer在 prepare时把相对 path重基到 next full snapshot并验证双射。缺失/重复 occurrence、错误 path、断链/cycle、root mismatch、非法 sibling分别以 `SCENE_TOPOLOGY_INVALID`或 `SCENE_PATCH_INVALID`拒绝。

首次 mount、replace与 Patch validation都消费 Core产生的 topology。预编译裸 Scene没有 topology，只能走现有 full static render，不能创建 retained session，也不能由 renderer猜 synthetic identity；`replaceScene`只接受 Core Program产生的完整 `SceneRuntimeSnapshot`。

Group insert/update使用含全部 descendant identity的 subtree payload；anonymous/duplicate child不能单独 patch，Core扩大到最近稳定 subtree update，无法证明时 `replaceScene`。一个 semantic owner可以映射多个 primitive，public handler id通过 topology明确归并。Patch identity比较/索引只调用 ADR-02 `runtimeIdentityEquals()`与 validated `RuntimeIdentityIndex`，Core/Render不得自行拼接或编码 identity key。

Operation规范化顺序固定：setResources → parent-before-child insert/update/move → setLayout → setAnimations → child-before-parent remove。`setResources/setLayout/setAnimations`各自最多一条；重复同 kind拒绝。Resources变化使用完整 next ordered array，不提供 upsert/remove双重语义，renderer内部仍按 id/descriptor diff并保证先创建新引用、consumer切换后再释放旧引用。`before`必须是 next topology中同 parent sibling；undefined表示末尾。insert root不得已存在，update/remove/move identity必须已存在，move的 parent不得是自身/descendant且不改变 subtree identity。Structural operations必须是 canonical non-overlapping cover：target不得重复，也不得同时操作其 ancestor/descendant；Core normalizer把重叠变化折叠为最近 ancestor update或独占 replace，第三方构造的重叠 Patch以 `SCENE_PATCH_INVALID`拒绝。`replaceScene`必须是唯一 operation。空 operations只在 Scene/topology/resources/animations语义等价时推进 revision，可与 renderer config变化一起提交，且不触碰未变 view object identity。Root animations变化必须有唯一 setAnimations或独占 replace，不能遗漏。

Patch与 next Snapshot必须 coherent：participant在 prepare中以 current snapshot为输入，用纯 validator完整解释 resource/layout/structural operations并重建 expected Scene/topology；expected必须与传入 next snapshot在 Scene primitive、layout、resource、identity topology和 revision上结构等价。任一差异以 `SCENE_PATCH_SNAPSHOT_MISMATCH` fail-loud，live state不变；不得以“两个 envelope各自合法”代替交叉验证，也不得静默选择其中一个为真源。

## Runtime Commit Participant

ADR-03 session 增加：

```ts
type RuntimeCommitParticipant = Readonly<{
  key: string;
  owners: ReadonlyArray<RuntimeOwnerToken>;
  programs: ReadonlyArray<RuntimeProgramToken>;
  revisionPolicy: 'affected' | 'continuous';
  tracePhases: ReadonlyArray<RuntimeTracePhaseDefinition>;
  prepare: (candidate: RuntimeParticipantCandidateView, context: RuntimeParticipantContext) => RuntimePreparedCommit;
  dispose: () => void;
}>;

type RuntimeParticipantContext = Readonly<{ trace: RuntimeTraceReporter }>;

type RuntimeParticipantCandidateLookup = Readonly<{
  snapshot: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
    program: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
}>;

type RuntimeParticipantCandidateView =
  | (RuntimeParticipantCandidateLookup &
      Readonly<{
        phase: 'initial';
        baseRevision?: never;
        candidateRevision: RuntimeRevision;
      }>)
  | (RuntimeParticipantCandidateLookup &
      Readonly<{
        phase: 'update';
        baseRevision: RuntimeRevision;
        candidateRevision: RuntimeRevision;
      }>);

type RuntimePreparedCommit = Readonly<{
  commit: () => void;
  rollback: () => void;
  dispose: () => void;
}>;
```

Participant由 `createRuntimeSession({ participants })`直接注入并立即把所有权转移给 session，重复 key以 `RUNTIME_PARTICIPANT_DUPLICATE`拒绝，按 key code-unit order。Session在任何 owner capture前验证 owners/programs token合法、已注册且各数组无重复；失败以 `RUNTIME_PARTICIPANT_DEPENDENCY_INVALID`拒绝并反向 dispose已接管 participant。CandidateView对未声明/foreign token以 `RUNTIME_UNDECLARED_DEPENDENCY`拒绝，并且只暴露 ADR-03 public read，永不暴露 program-private state/cache。Initial create所有 participant都 prepare。Update中 `revisionPolicy='affected'`只在声明 owner changed或 Program产生新 artifact时 prepare；`continuous`在每个非-bailout commit都 prepare，即使变化来自无关 owner。内置 retained renderer固定 continuous，用 lineage-only empty Patch推进 live revision；普通外部 participant默认必须显式选择策略，不做隐式默认。

`tracePhases`验证、owner-bound reporter与 reporter diagnostic drain复用 ADR-03 Program规则，participant reporter owner固定为 participant key。内置 SVG/Canvas participant声明 initial `commit/scene-primitive/full`与 update `update/scene-change/incremental|fallback`。Initial成功 mount恰好1条 full record，计数沿用 ADR-01完整 renderer primitive traversal；每次 affected update恰好1条 scene-change record，normal/config-only outcome incremental、capability/validation replace outcome fallback，计数为 Patch operations长度，empty为全0、replace为1。不得同时从同一次 retained mount调用独立 full入口重复发射。

Session create lifecycle固定为：接管并验证 participant → owner initial capture/read → Program full candidate/public+private read → participant prepare(`phase='initial'`) → participant commit正序（首次 renderer mount）→ Runtime pointer/revision 0 publish → Program observer拓扑序 → prepared token dispose反序 → 返回 session。Publish前任一步失败都反向 rollback已 commit/prepared token、反向 dispose prepared token、反向调用所有已接管 participant实例 `dispose()`，再清理 artifact/owner，且不返回半初始化 session。Initial rollback/participant dispose失败作为 secondary diagnostics附在原 `RuntimeError`并继续清理；即使无法恢复 host也不返回不可达的 broken session，caller只能丢弃该 host。Publish后 observer或 prepared-token dispose throw遵守 ADR-03：只追加 diagnostic、继续后序清理并返回已发布 session，绝不 rollback logical/view state。

Update顺序：Program prepare → affected participant prepare全部成功 → participant commit正序 → Runtime pointer/revision publish → observer → retire旧 artifact/owner → prepared token dispose反序。Prepare/commit任一步失败时，已 prepare/commit token反向 rollback，再反向 dispose全部 token；logical current不 publish。Session dispose先进入 ADR-03 disposing，再按 participant key反序 dispose renderer/host state，最后反向释放 committed artifact/owner；participant dispose failure进入 diagnostic并继续其它清理。

`commit()`必须在 prepare后无领域校验，只做已 staging的同步切换；仍若 throw，进入 rollback。每个 prepared token无论成功/失败都 exactly-once dispose；rollback只对已成功 prepare的 token exactly-once调用。Rollback throw时 logical current保持旧 revision，但 session标记 broken，以 `RUNTIME_PARTICIPANT_ROLLBACK_FAILED` fail-loud，之后拒绝 update/read，允许 revision/diagnostics/dispose；不能宣称 view已恢复。Replace/fallback在 prepare阶段选择，不在部分 commit后临时决定。Participant callback期间所有 session API遵守 ADR-03 reentry规则。

稳定 code还包括 `RUNTIME_PARTICIPANT_PREPARE_FAILED`、`RUNTIME_PARTICIPANT_COMMIT_FAILED`、`RUNTIME_PARTICIPANT_DISPOSE_FAILED`与 `RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED`；primary error保留 code/key/phase/cause，secondary rollback/token/session-dispose failure按发生顺序进入 Runtime diagnostic queue。

`@retikz/render`公开第三方 contract：

```ts
const RetainedRendererCapability = {
  None: 'none',
  Group: 'group',
  Entity: 'entity',
} as const;

type RetainedRendererCapabilityValue = ValueOf<typeof RetainedRendererCapability>;
type RetainedRendererHost = SVGSVGElement | HTMLCanvasElement;

type RetainedRendererImmutableOptions = Readonly<{
  backend: 'svg' | 'canvas';
  idPrefix: string;
  devicePixelRatio?: number;
}>;

type RetainedRendererDefinitionInput = Readonly<{
  backend: 'svg' | 'canvas';
  host: RetainedRendererHost;
  capability: RetainedRendererCapabilityValue;
  prepareMount: (
    snapshot: SceneRuntimeSnapshot,
    config: RenderRuntimeConfig,
    mode: 'create' | 'adopt',
  ) => RuntimePreparedCommit;
  prepare: (
    patch: ScenePatch,
    snapshot: SceneRuntimeSnapshot,
    config: RenderRuntimeConfig,
  ) => RuntimePreparedCommit;
  snapshot: () => SceneRuntimeSnapshot;
  dispose: () => void;
}>;

declare const RetainedRendererBrand: unique symbol;

type RetainedRenderer = RetainedRendererDefinitionInput & Readonly<{ [RetainedRendererBrand]: true }>;

const defineRetainedRenderer = (input: RetainedRendererDefinitionInput): RetainedRenderer;

type RetainedRendererFactory = (
  host: RetainedRendererHost,
  options: RetainedRendererImmutableOptions,
) => RetainedRenderer;
```

只有 `defineRetainedRenderer()`能创建 nominal instance；helper复制/冻结 contract、在 private WeakSet登记并固定 callback references。Participant在任何 prepare前验证 token、`renderer.backend === options.backend`与 `renderer.host === host`；foreign/伪造/mismatch以 `RETAINED_RENDERER_INVALID`拒绝，并 best-effort dispose已由 factory转移的 instance，dispose failure附 secondary diagnostic。prepareMount/prepare只做 staging并返回 ADR-05 exactly-once token，错误使用 `RETAINED_RENDERER_PREPARE_FAILED`且 live state不变。commit/rollback/dispose错误由 participant映射到 Runtime稳定 code；renderer自身不 publish revision，`dispose()` idempotent。

Capability矩阵固定为：

- `none`：只接受 initial mount、独占 replace以及 config-only empty Patch；其它非空 operation在调用 renderer前确定性转换为 replace。
- `group`：除上述能力外，支持 setLayout/setResources/setAnimations，以及 target为稳定 Group subtree root的 insert/update/remove/move；任何非 Group entity target转换为 replace。
- `entity`：支持全部规范化 operation。

Capability fallback只由公共 participant在 prepare前决定；不支持的 Patch转换为独占 replace并发一条 fallback trace，不先尝试部分 operation。第三方 replace-only/group/entity renderer必须通过同一 compile-time surface和 conformance suite。

Render统一装配入口固定为：

```ts
const RETAINED_SVG_PARTICIPANT_KEY = '@retikz/render:svg' as const;
const RETAINED_CANVAS_PARTICIPANT_KEY = '@retikz/render:canvas' as const;

type CreateRetainedRenderParticipantOptions<
  TComposites extends ReadonlyArray<AnyCompositeDefinition>,
> =
  | Readonly<{
      backend: 'svg';
      host: SVGSVGElement;
      rendererFactory: RetainedRendererFactory;
      immutableOptions: RetainedRendererImmutableOptions & Readonly<{ backend: 'svg' }>;
      coreProgram: CoreProgramDefinition<TComposites>;
    }>
  | Readonly<{
      backend: 'canvas';
      host: HTMLCanvasElement;
      rendererFactory: RetainedRendererFactory;
      immutableOptions: RetainedRendererImmutableOptions & Readonly<{ backend: 'canvas' }>;
      coreProgram: CoreProgramDefinition<TComposites>;
    }>;

const createRetainedRenderParticipant = <
  TComposites extends ReadonlyArray<AnyCompositeDefinition>,
>(
  options: CreateRetainedRenderParticipantOptions<TComposites>,
): RuntimeCommitParticipant;
```

Factory由 `@retikz/render/runtime`拥有，固定 dependencies为 owners `[RenderRuntimeOwnerDefinition]`、programs `[options.coreProgram]`，revisionPolicy continuous，participant key/trace owner按 backend取上述常量，trace phases使用本 ADR固定表。Discriminated options让 backend/host/immutableOptions在TypeScript一致；JavaScript入口在调用 rendererFactory前检查 host instance与 backend，失败以 `RETAINED_RENDER_PARTICIPANT_INPUT_INVALID`拒绝且 factory调用次数为0。constructor随后调用 rendererFactory一次并接管 nominal renderer；capability fallback、Patch/snapshot coherence、config-only lineage、prepared token和 renderer dispose全部封装在此 participant。constructor/factory throw时不返回 participant；返回后所有权立即归 participant，再由 session接管。React/Vanilla只创建 Core Program、owner/program registries与该 participant并交给 `createRuntimeSession()`，不得各自实现 Patch判断、coherence、trace或 renderer rollback。

`@retikz/render`的 built-in RetainedRenderer实现同一接口；其 `snapshot()`返回 current SceneRuntimeSnapshot。

SVG预校验后用 detached fragment/mutation journal保存 attribute/text/order/resource/handler/animation旧值；commit原地更新DOM，rollback逆序恢复，未变 node identity保留。Initial `adopt`先只读校验既有SSR DOM与 topology，mismatch在 commit前转换为 create/full replace。Canvas在 candidate display list/index与 offscreen bitmap中准备，commit一次交换 retained state并把 bitmap绘入稳定 canvas，rollback恢复旧 state/bitmap。Dirty boundary必须包含 stroke/shadow/clip/transform/animation/overlap，不能只擦 primitive AABB。

## Renderer Config、React、Vanilla 与第三方 Renderer

`@retikz/render`新增 `RenderRuntimeOwnerDefinition`，capture/read immutable `RenderRuntimeConfig`：

```ts
const RenderCachePolicy = {
  Auto: 'auto',
  Static: 'static',
  Dynamic: 'dynamic',
} as const;

type RenderCachePolicyValue = ValueOf<typeof RenderCachePolicy>;

type RenderHandlerContribution = Readonly<{
  registration: number;
  handlers: RuntimeDeepReadonly<HydrationHandlers>;
}>;

type RenderRuntimeConfigInput = Readonly<{
  handlerContributions?: ReadonlyArray<RenderHandlerContribution>;
  animation?: Readonly<{
    enabled?: boolean;
    snapshotAt?: number;
    easings?: EasingRegistry;
    properties?: AnimationPropertyRegistry;
  }>;
  cachePolicy?: RenderCachePolicyValue;
}>;

type RenderRuntimeConfig = RuntimeDeepReadonly<RenderRuntimeConfigInput>;
```

`RenderCachePolicyValue`是 Render自有、后端中立 contract；Render不导入或理解 `VanillaLayerCacheValue`。Definition对 handler contribution/registry与 nested config复制/冻结容器并保留 handler函数引用；handler函数是 trusted immutable callback identity，改变函数必须提交新 config。Retained participant同时声明 Core Program与该 owner；Scene/Core bailout但 config改变时，以 candidate revision重封装等价 SceneRuntimeSnapshot并提交 empty Scene Patch，使 handler/animation/index与 logical revision一起切换。backend kind、host、rendererFactory、capability、measurer/font resolver与 Canvas DPR是 session-lifetime immutable；改变它们必须 dispose并重建 session/renderer，initial full mount。

Handler contribution语义固定：每个 retained view维护从0递增的 registration safe integer；React Layout当前 handlers/JSX收集结果占一个可替换 contribution，Vanilla每次 `view.hydrate()`追加一个 contribution。对同一 `publicId + event`，所有仍存活 contribution都保留并按 registration升序触发；某个 handler throw按浏览器 listener错误路径报告但不阻止后序 contribution。Hydration handle只移除自己的 registration，成功 dispose后重复调用 no-op。添加 transaction失败时不返回 handle且 current集合不变；移除 transaction失败时 dispose抛 RuntimeError、handle仍 active并可重试；只有 commit成功才标记 disposed。Prepare/commit/rollback失败均不改变 current contribution顺序或成员。Renderer从 frozen contribution array派生 listener/dispatch table，不把它压成单值 `HydrationHandlers`。

更严格地说，ADR-04完整 `CoreProgramOptions`都是 session-lifetime immutable：React Layout公开的 shapes/boundaries/clips/arrows/patterns/path generators/kinds/ribbon profiles/composites/lowerTex/artifacts/nodeDistance/fontSize/measurer及其它 compile prop，经每次 render重新规范化；JSON-like字段做结构比较，Definition/callback/function按 object identity比较，任一语义变化都在 layout effect先 dispose旧 session/participant，再用新 Core Program、owner/program registries、Render participant和 initial full mount重建。Vanilla mount的 compile/adapters options在 view生命周期内不可更新，变化必须显式 dispose/remount。不得忽略变化或把新 option热塞进旧 Program；旧 participant/renderer必须在新 session ownership建立前 exactly-once dispose。

Renderer revision必须连续跟随 session，而 Core artifact可以跨无关 commit复用：retained participant以 `revisionPolicy='continuous'`参与每个非-bailout commit；config-only或任意 unrelated owner-only transaction都从 `renderer.snapshot()`复制完整 Scene/topology、把 envelope revision改为 candidate，并构造 `base=current/next=candidate/operations=[]`，不改写 committed Core artifact。下一次 Core Patch的 base来自 CandidateView current revision，participant只校验 `renderer.snapshot().revision === patch.baseRevision`与 next candidate一致，不要求 previous Core nested snapshot revision相等。任何 lineage gap/stale以 `SCENE_PATCH_REVISION_MISMATCH`在 prepare前拒绝。

公开 adapter接入冻结为：

```ts
type LayoutRuntimeOptions = Readonly<{
  rendererFactory?: RetainedRendererFactory;
  onDiagnostic?: (diagnostic: RuntimeDiagnostic) => void;
}>;

type RetainedVanillaCanvasUpdateOptions = Omit<VanillaCanvasOptions, 'devicePixelRatio'>;

type RetainedVanillaUpdateOptions = Readonly<{
  animation?: VanillaAnimationOptions;
  canvas?: RetainedVanillaCanvasUpdateOptions;
}>;

type VanillaRuntimeOptions = Readonly<{
  rendererFactory?: RetainedRendererFactory;
}>;

type RetainedRenderInput = IRScene | VanillaFigureSpec;

type VanillaViewState<TRoot extends SVGSVGElement | HTMLCanvasElement> = Readonly<{
  root: TRoot;
  dispose: () => void;
  hydrate: (options: HydrateOptions) => HydrationHandle;
  animation?: AnimationControls;
  runtimeMeta: VanillaRuntimeMeta;
  artifacts: ReadonlyArray<CompileArtifact>;
}>;

type RetainedSvgView = VanillaViewState<SVGSVGElement> &
  Readonly<{
    mode: 'retained';
    update: (next: RetainedRenderInput, options?: RetainedVanillaUpdateOptions) => void;
    diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  }>;

type RetainedCanvasView = VanillaViewState<HTMLCanvasElement> &
  Readonly<{
    mode: 'retained';
    update: (next: RetainedRenderInput, options?: RetainedVanillaUpdateOptions) => void;
    diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
    clientToScene: (clientX: number, clientY: number) => ScenePoint;
  }>;

type StaticSvgView = VanillaViewState<SVGSVGElement> & Readonly<{ mode: 'static'; update: (next: Scene) => void }>;

type StaticCanvasView = VanillaViewState<HTMLCanvasElement> &
  Readonly<{
    mode: 'static';
    update: (next: Scene) => void;
    clientToScene: (clientX: number, clientY: number) => ScenePoint;
  }>;

type RetainedVanillaView = RetainedSvgView | RetainedCanvasView;
type StaticVanillaView = StaticSvgView | StaticCanvasView;
```

- React `LayoutProps`新增 `runtime?: LayoutRuntimeOptions`。既有 `handlers/animate/snapshotAt/easings/animationProperties`形成 RenderRuntimeConfig，与 `ir/children`在同一 layout-effect transaction提交；diagnostics在 commit结束后按 queue顺序调用 `onDiagnostic`，callback throw只进 React dev warning，不回滚。
- Vanilla `MountOptions/MountCanvasOptions`新增 `runtime?: VanillaRuntimeOptions`。`mountSvg`对 retained/static输入分别返回 `RetainedSvgView/StaticSvgView`，`mountCanvas`分别返回 `RetainedCanvasView/StaticCanvasView`，统一 `mount`和宽 union输入返回对应 union。所有现有 `root/animation/runtimeMeta/artifacts/hydrate/dispose`能力保留，Canvas两种 mode都保留 `clientToScene`。static view继续完整重绘且不接受 rendererFactory；retained view新增 `diagnostics()`并使用上述 update签名。
- Retained `view.update()`把 next完整 IR/plain spec与 animation/可变 Canvas config组成同一个 session update；update canvas type显式排除 `devicePixelRatio`，DPR只能在 mount时提供，变化需调用方 dispose/remount。`view.hydrate(options)`不直接旁路绑定，而是注册一份 handler contribution并同步提交 RenderRuntimeConfig，返回 handle；handle.dispose同样提交移除 contribution。Static Scene view的 `hydrate()`保持 standalone immediate controller语义，`mode: 'static'`使两条路径在类型和运行时均可判别。
- SSR/string入口始终是 static full output；只有客户端 IR/plain mount或 React Layout进入 retained session。非法把 Scene、static view或 backend不匹配 factory送入 retained API时使用具名 `RETAINED_RUNTIME_INPUT_INVALID`。

Runtime session模式采用唯一 ownership：React只拥有 `<svg>` / `<canvas>` host shell的 attributes/ref，Render拥有所有 SVG descendants或 Canvas bitmap/index。React render phase不创建/应用 transaction；`useLayoutEffect`创建/提交 session，cleanup idempotent。Aborted render没有副作用，StrictMode replay不会双注册或双 dispose。props中的 IR与可变 RenderRuntimeConfig在 layout effect通过同一个 base revision update提交，不能由独立 React state直接改 live handler/animation。

SSR SVG使用 opaque seed协议：server与首次 client render都在 host上设置一次稳定的 `dangerouslySetInnerHTML` seed，并且 React永不声明 descendants；seed string存于 ref，后续 render即使 IR改变也保持同一引用和值，React不会重写 Render-owned内容。首次 layout effect用 `prepareMount(..., 'adopt')`验证并接管；mismatch在 publish前 full replace。SSR Canvas只输出 shell，客户端 create mount。React卸载先 dispose session/participant再释放 host；key/backend/factory改变走完整 teardown/recreate，禁止把旧 renderer接到新 host。

Vanilla mount直接持有同一 participant。React / Vanilla都允许 `rendererFactory(host, immutableOptions)`注入第三方 `RetainedRenderer`；factory不需要 initial snapshot，snapshot只经 participant initial CandidateView传给 `prepareMount`，消除构造循环。内置与自定义没有名称白名单。只支持 replace的 renderer合法且 diagnostic可见。

## Hydration、Resource、Animation 与 Layer Cache

Commit 同时切换 SceneRuntimeSnapshot、DOM/display list、geometry、hit-test index、handler context、resource refcount 与 animation state。Hit-test / locate 返回 `{ identity, semanticOwner, publicId? }`；现有 handler registry 仍以 public id 注册，一个 owner 的多个 primitive归并到同一 public id。未有 public id 的 primitive可以内部命中，但 alpha.2 不新增领域 behavior。

Retained resource table统一管理 Scene paint/clip 和 renderer-derived marker/shadow/style/WAAPI wrapper，以 canonical descriptor key + refcount staging。Consumer 可见前资源已创建；consumer 移除后资源才能释放；rollback恢复 refcount与对象。

Animation 规则：unchanged/move 保留 clock；仅静态 primitive update 且 track descriptor相等保留；track descriptor变化重启该 identity；remove dispose；replaceScene 重启全部 animation。Hydration controller在同一 commit中更新 target mapping，不允许新 DOM 配旧 Scene context。

`VanillaLayerCache` 只影响优化，不改变正确性：

- `auto`：默认；按 topology / animation / hydration / change trace选择 entity/group cache。
- `static`：允许复用完整 layer artifact，但 cache key必须覆盖 layer全部 primitive语义、layout、外部 resource/ref、animation descriptor与 hydration mapping；任何命中该 layer的 Patch/config change或无法证明依赖未变都失效重建。Topology hash相同绝不是充分条件。
- `dynamic`：不复用完整 layer artifact，但仍允许 entity/group Patch与资源缓存。

错误 hint 只能扩大重建范围；三种模式最终输出、hit-test 与 full render 等价。

alpha.2不建立 Vanilla layer → Core identity的平行 mapping：plain spec layer metadata不进入 Scene topology，anonymous child也不据 layer index获得稳定 identity。Vanilla在 normalization边界把多个 `VanillaLayerCacheValue`映射为单个 Render cache policy：存在 `dynamic`则为 dynamic；否则全部为 `static`且至少一层时为 static；其余为 auto。`auto/dynamic`只使用 Core topology决定 entity/group patch；`static`只在整张 normalized figure的完整 semantic fingerprint相等时复用完整 layer artifact，任一 figure/config变化都重建整组 static layers。该保守边界牺牲部分 per-layer reuse，但保证不会让 Render反向依赖 Vanilla，也不会因猜测 layer membership产生陈旧画面；更细映射需由后续独立 contract提供。

## 测试设计

- Initial full mount、anonymous subtree、多 primitive owner 与 Group descendants 可从 topology 重建。
- 每个 Patch / fallback 与 full next render比较 DOM/pixel/resource/index/animation/hydration。
- Participant prepare/commit/rollback/dispose 各阶段 throw；semantic/view revision保持规定状态。
- React abort/StrictMode/SSR handoff 与 Vanilla共享未变 node identity、无双写。
- `auto/static/dynamic`、derived resource、animation continuity 与 public target mapping具名验证。

详细矩阵见 ignored `notes/plans/kernel-v0.5-performance/TEST_CONTRACT_ALPHA2_ADR_05.md`。

## 公开影响

- Core 新增 SceneRuntimeSnapshot / topology / ScenePatch contract；Scene schema不增加字段。
- Runtime新增 commit participant；Render新增 runtime config owner、retained renderer公共 subpath与 target mapping。
- React / Vanilla 显式 session view使用 host-shell ownership；静态入口继续 full render。
- Layer cache语义按本 ADR 冻结；不保留旧行为桥接。

## 能力完备性检查

- 能力面：Primitive/Scene、Composition、Interaction Readiness基础。
- 主责：Core拥有 topology/Patch；Runtime拥有 commit protocol；Render拥有 view/resource/index；adapter拥有 host lifecycle。
- 内部链路：complete snapshot + patch → participant staging → renderer commit → runtime publish。
- 外部扩展：第三方 renderer通过相同 factory/interface/participant接入，replace-only合法。
- define-registry：renderer是直接 factory注入的闭合 capability，不按名称 dispatch，registry不适用。
- adapter等价：React只拥有 shell，Vanilla直接 mount；两者共用 Render participant。
- 边界：不定义 selection/drag/behavior；本轮结论为扩展 Core/Runtime/Render闭环。

## 不在本 ADR 范围

- progressive materialization、scheduler、Worker。
- selection、drag、brush、zoom 或 domain intent。
- WebGL、远端 renderer、跨页面 cache。

---

## 实现契约

### Level

`red`：新增 Core Patch/topology、Runtime participant、Render retained与adapter lifecycle。

### Schema 改动

无 IR / Scene schema 改动；全部为 runtime-only contract。

### 文件 scope

- `packages/kernel/core/src/contract/scene-patch/**`
- `packages/kernel/core/src/compile/incremental/**`
- `packages/kernel/runtime/src/{participant,session,transaction}/**`
- `packages/kernel/render/src/runtime/**`
- `packages/kernel/render/src/{svg,canvas,hydration,animation}/**`
- `packages/kernel/react/src/{kernel/runtime,render}/**`
- `packages/kernel/vanilla/src/runtime/**`
- `packages/kernel/{render,react,vanilla}/package.json`（runtime依赖与 public subpath exports）
- `packages/kernel/{render,react,vanilla}/AGENTS.md`、`notes/architecture/package-topology.md`（职责/依赖同步）
- `packages/kernel/{runtime,core,render,react,vanilla}/tests/**retained**` / `**incremental**`
- `apps/docs/src/modules/docs/contents/kernel/packages/{core,runtime,render,react,vanilla}/**`（zh/en topology/Patch/participant、renderer config、SSR handoff、layer语义、API与demo）

### 测试象限

**Happy path**：initial mount；insert/update/remove/move；layout/resource；SVG/Canvas entity commit。

**边界**：empty/anonymous/group subtree；multi-primitive owner；empty Patch；replace-only renderer；layer modes。

**错误路径**：stale/invalid topology；ordering/resource error；participant phase throw；rollback failed/broken session。

**交互**：hydration target；animation continuity；React abort/StrictMode/SSR handoff；third-party factory；full oracle parity。

### 依赖的现有元素

- ADR-03 session/participant extension point。
- ADR-04 SceneRuntimeSnapshot / ScenePatch artifact。
- SVG descriptor / `buildSvgDocument()` 与 Canvas `renderToCanvas()` / `hitTest()` full oracle。
- `VanillaRuntimeMeta.layers`、hydration / animation controller。
