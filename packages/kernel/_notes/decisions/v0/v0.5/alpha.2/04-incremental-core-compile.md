# ADR-04：Core Incremental Program 与增量编译

- 状态：Proposed
- 决策日期：2026-07-26
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-03](./03-program-transaction-lifecycle.md) · [ADR-06 Box Layout contract](./06-box-layout-composite-contract.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 背景

`compileToScene()` 当前为纯函数全量入口，每次创建 registry、resource、namespace 与 traversal state，遍历完整 IR 后构造完整 Scene。即使只有一个 Node 样式或位置变化，Core 也不能复用未受影响的布局、引用、资源和 Scene contribution。

单纯比较最终 Scene 只能减少 renderer commit，无法减少 Tier 2 lowering、文字测量、布局和 Core traversal。Core 必须作为 Runtime Program 拥有自己的 identity、依赖、contribution、局部失效和 fallback；Runtime 不能猜测 Node、Scope、Path、Composite 或引用语义。

## 决策：完整 Compile 保持真源，Incremental Program 复用稳定 Contribution

`compileToScene()` 保持无 session 的完整同步入口。新增 `createCoreProgram(options)`，把同一编译语义接入 `@retikz/runtime`，维护 session-local 的 Core Snapshot、identity/dependency index、contribution tree/cache 与完整 `CompileResult`。

`options` 在 Program 生命周期内不可变：factory 规范化并复制 option、registry array 与 Definition record，冻结所有 JSON-like 字段，并固定保存 callback reference。Definition / measurer / lowerer callback 必须纯且其闭包外部状态在 Program 生命周期内稳定。创建后修改原数组、option record 或 Definition 字段不影响 Program；要改变 callback 或外部状态必须销毁旧 Program/session并创建新 Program，首轮执行 full run。

Core 公共接入固定为：

```ts
const CORE_OWNER_KEY = '@retikz/core/document';
const CORE_PROGRAM_ID = { owner: CORE_OWNER_KEY, key: 'compile' } as const;

const CoreOwnerDefinition: RuntimeOwnerDefinition<
  IRScene,
  Readonly<IRScene>,
  Readonly<IRScene>,
  CoreChange
>;

type CoreProgramOptions<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Omit<
  CompileOptions<TComposites>,
  'trace'
>;

type CoreProgramDefinition<TComposites extends ReadonlyArray<AnyCompositeDefinition>> =
  RuntimeProgramDefinition<
    CoreProgramArtifactInput<TComposites>,
    CoreProgramArtifact<TComposites>,
    CoreProgramRead<TComposites>,
    CoreProgramPublicRead<TComposites>
  >;

const createCoreProgram = <TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
  options: CoreProgramOptions<TComposites>,
): CoreProgramDefinition<TComposites>;
```

`CoreOwnerDefinition.capture()` 对 JSON-safe IR 做结构复制与 deep freeze；`read()` 返回同一 immutable value；`equals()` 使用结构化 IR equality。Owner 不提供 `collectIdentities()`：child identity与 document root都依赖 namespace、Composite expansion及 canonical traversal，由 Core Program index统一派生，ADR-02 owner registry只提供 document-level Snapshot而不宣称实体 identity。Owner也不实现通用 `validateChangeSet()`，ChangeSet / Snapshot交叉校验归 Core Program。

```ts
type CoreProgramOutput<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  result: CompileResult<CompositeArtifactOf<TComposites[number]>>;
  diagnostics: ReadonlyArray<CompileWarning>;
}>;

type CoreProgramPublicRead<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  output: CoreProgramOutput<TComposites>;
  snapshot: SceneRuntimeSnapshot;
  patch?: ScenePatch;
}>;

type CoreProgramRead<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = CoreProgramPublicRead<TComposites> &
  Readonly<{ state: CoreProgramStateRead }>;

type CoreProgramArtifactInput<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  publicRead: CoreProgramPublicRead<TComposites>;
  state: CoreProgramState;
}>;

type CoreProgramArtifact<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  publicRead: CoreProgramPublicRead<TComposites>;
  state: CoreProgramState;
}>;

type CoreChange =
  | Readonly<{ kind: 'add'; identity: RuntimeIdentity; parent: RuntimeIdentity; before?: RuntimeIdentity }>
  | Readonly<{ kind: 'update'; identity: RuntimeIdentity }>
  | Readonly<{ kind: 'remove'; identity: RuntimeIdentity }>
  | Readonly<{ kind: 'move'; identity: RuntimeIdentity; parent: RuntimeIdentity; before?: RuntimeIdentity }>;
```

`CoreContribution`、primitive/resource/artifact/diagnostic template与 cache都是 `CoreProgramState`私有实现类型，不从 Core barrel导出。artifact capture拥有 `{ publicRead, state }`；`readForProgram()`返回含 immutable/persistent `CoreProgramStateRead`的 `CoreProgramRead`，只交给同一 Core Program下一次 update；`read()`返回不含 state/cache的 `CoreProgramPublicRead`，供依赖 Program、participant、observer和 session caller使用。Candidate state通过 copy-on-write/structural sharing构建，旧 committed state永不原地修改；失败 candidate只释放自己的新增 handles，shared immutable node由 refcount/持久结构保留。

Public read只冻结三个实际下游消费角色：`output = 完整 CompileResult + canonical compile warnings`；`snapshot = 完整 next Scene + runtime topology`；`patch = 相对 base的完整 ScenePatch envelope`。Provenance、dependency/identity index和 contribution cache都留在 private `CoreProgramStateRead`，alpha.2不提前公开无 consumer的查询契约。初始 revision 0 full run的 `patch`为 `undefined`，participant通过 `snapshot` mount；每次 owner真正改变的 full/incremental/fallback update都产生 candidate revision的完整 snapshot与 patch，full/fallback使用独占 `replaceScene`，incremental使用规范化 operations。Runtime-level whole-session bailout复用旧 artifact且不推进 revision。

Patch revision lineage只取本次 CandidateView：`baseRevision=view.baseRevision`、`nextRevision=view.candidateRevision`，不得使用 previous Core artifact内 snapshot最后产出的 revision。其它 owner/config-only commit可以跨多个 session revision复用 Core artifact content；下一次 Core update仍从 previous immutable content/state Diff，但对 live renderer生成 current→candidate Patch。Core public nested snapshot在未运行期间不被偷偷改写，participant按 ADR-05用 empty Patch推进自己的 live snapshot revision。

私有 Contribution 按 next canonical order 组成 tree，至少保存 identity、semantic owner、parent/slot、dependency identities、bounds，以及以下内部条目：

- primitive entry：`identity`、稳定 emission `role`、role-local ordinal、含 `CoreResourceKey` 占位符的 unresolved primitive。
- resource descriptor：`key`、resource kind 与不含最终 id 的 canonical payload；primitive 只能引用 key，不缓存 `paint-N` / `clip-N`。
- artifact template：artifact payload、owner identity 与 owner-relative locator tokens，不缓存最终 `children[index]`。
- diagnostic template：Core compile warning code/message、owner identity与 owner-relative locator tokens；确有 locator语义的 root/global compile warning显式归 document root。Runtime mismatch diagnostic不使用该模板。

这些类型保持私有，使 implementer 可以优化存储；上述字段角色、resource placeholder、locator rebasing 与最终排序是不允许改变的实现契约。一个 semantic owner 可以产出多个 primitive；Scene identity 由 owner identity + emission role / ordinal path 派生，不把用户 `id` 假设成一对一 DOM key。

Core owner Snapshot 由 `CoreOwnerDefinition.capture()` 对完整 `IRScene` 做 JSON-safe clone / freeze 后形成 canonical typed Snapshot。它不额外执行当前 `compileToScene()` 没有承诺的 Zod parse；parser/schema 入口仍负责 unknown input。Program full run 与 `compileToScene()` 共享同一个内部 `compileCoreSnapshot()`，不得形成两种验证语义。

### Identity 与 Contribution Tree

- Program 注册时获得固定 document root identity，root contribution path 固定为 `['root']`。
- 在同一稳定父 boundary 内，唯一非空 `id` 的 child identity 追加 `[type, id]`；reorder 不改变 identity，移动到另一个父 boundary形成 remove + add。
- 有唯一 id 的 Scope建立稳定 boundary。alpha.2不把任意 Composite payload中的 `id`偷升格为 Kernel contract；现有 Composite基础 schema/Definition没有统一 identity extractor，因此所有 Composite call都按 anonymous boundary处理，其展开 child变化回退到最近外层稳定 Scope/root。后续若增加保留 id或 Definition identity extractor，必须另行修改 schema/contract与文档。
- Stable identity boundary与 namespace frame是两套索引。普通有 id Scope可建立 identity boundary，但只有 `localNamespace: true`的 Scope才 push namespace frame；Composite call始终 anonymous，其 source/output仍登记到当前 namespace frame，不因此建立 identity boundary。
- 每次 candidate 按完整 canonical tree 重建 namespace-frame registration order、duplicate set 与 last-wins target。只要同一 frame 的 duplicate 集合、顺序或胜出 occurrence 改变，Core 必须重绑定该 frame 的全部引用依赖，并回退到 owning localNamespace Scope；root frame 则 root fallback。跨 identity boundary 重名仍按同一 frame 处理。
- `localNamespace` 内同名 id shadow 外层 frame，内部变化只使该 frame 与显式依赖它的 contribution 失效，不误判为 root duplicate。
- Anonymous child 使用 candidate-local occurrence，只能在最近稳定 identity boundary 内整体重算；duplicate occurrence 即使各自有 id 也不能单独作为跨 revision identity。
- contribution-local primitive 用确定性 emission role + ordinal 派生；同一 contribution 内 role 数量变化时更新或替换该 contribution，不把 ordinal 当语义实体 identity。
- Runtime identity equality、hash 和 path 合法性完全复用 ADR-02。Core namespace lookup 仍按当前 Scope 语义工作，不把 `NamespaceStack` 的 last-wins 字符串 key 提升为公共 identity。

Core owner 按以下规则失效：

- 无 id实体与任何 Composite call变化都回退到最近外层稳定 Scope/root boundary；Composite展开产物中的 id只用于本次 candidate namespace/reference定位，不能成为跨 revision boundary。
- Node 内容、shape、font、padding、scale 或 rotate 变化使自身 layout、依赖其 anchor/boundary/bounds 的实体与包含它的自动 layout boundary 失效。
- Path 变化使自身命令、label、mark、arrow/resource 与其引用依赖失效；引用目标变化沿 dependency index 传播。
- Scope transform/style/default 变化使其 subtree contribution 失效；只改变 zIndex 时允许保留几何并重新排序。
- layout-aware Composite 的 probe/replay 只在一个 candidate compile 内复用；跨 revision 只缓存已提交 contribution，不缓存一次性 replay token。
- ADR-06 的双轴 constraint、slot、显式 composite allocation 与 replay wrapper transform / clip 都属于布局 contribution；父 slot变化必须使消费该 constraint 的 nested layout-aware subtree失效。无法证明局部等价时回退到最近的稳定identity boundary，即唯一非空id Scope；不存在则root。anonymous Composite不建立跨revision boundary。
- root automatic layout、资源 dedupe 或跨 boundary 引用无法局部证明时，扩大到 root full compile。

Incremental update始终接收完整 next canonical Snapshot，并从前后 Snapshot自行建立稳定 identity index。ADR-03在 ChangeSet缺失时仍调用 update，Core走 Snapshot-only Diff；可选 ChangeSet只加速候选定位。stale base已由 Runtime拒绝；若 add/update/remove/move hint与实际前后 index不一致、漏掉变化或指向 anonymous/duplicate identity，Core丢弃 hint并执行 full fallback，不留下半候选。

Mismatch唯一可观察通道是 ADR-03 candidate warning：Core提交不含归属字段的 `RuntimeProgramWarningInput { code:'CORE_CHANGESET_MISMATCH', phase:'update', message }`，Runtime注入 owner `@retikz/core/document`、当前 Program id与 severity `warning`；message不带不稳定 locator。按 Program执行位置产生一次，只在 fallback commit成功后进入 result/queue/observer event。它不进入 `CompileWarning`、`CoreProgramOutput.diagnostics`或 `compileToScene().onWarn`，因此没有双通道/去重问题。

### Final Assembly 与 Diagnostic

Contribution cache 不直接保存最终 order-sensitive resource id 或 occurrence locator。每次 candidate 都按 next contribution tree 执行统一 final assembly：

1. 以资源语义 descriptor 的 canonical key 全局去重，按 next 首次消费顺序重新分配与 full oracle 一致的 id，并重写所有 primitive resource ref。
2. 按 parent / slot 装配 Group、zIndex、root layout、animation 与空 bounds；move 只改变 next slot，不改变稳定 identity。
3. Artifact 缓存 owner-relative locator template，final assembly 根据 next `children[index]` 顺序重建 `CompileOccurrenceLocator` 并稳定排序。
4. Core compile warning在 candidate内按 contribution/root归属缓存，final assembly重建 locator，并按 next canonical traversal order、同 occurrence内 emission order稳定排序后写入 `output.diagnostics`；Runtime mismatch diagnostic不进入此 collector。

Core Program 的 `run/update` 不调用 `onWarn`。它通过 ADR-03 通用 `observeCommit` 在 revision publish 后读取 committed `output.diagnostics`，按顺序恰好派发一次；full/incremental/fallback commit 都派发，bailout、失败、stale 与 rollback 不派发。React / Vanilla 不自行解释 diagnostics。

完整 `compileToScene()` 也改用同一 candidate diagnostic collector：成功后按 canonical order 同步派发 warning，throw 时不派发部分 warning。复用/fallback 后必须与 fresh full compile 的 warning code、message、locator 和顺序完全等价。

Core私有 delta描述 contribution identity的 insert/update/remove/move、layout与 resource变化；final assembly直接封装 ADR-05公开 `ScenePatch` envelope，不存在第二个公开 `SceneChange[]`形态。即使产生 Patch，Program仍提交完整 next `CompileResult`与 runtime-only identity topology，用于 participant读取、重建与等价校验。

理由：

1. 保留 `compileToScene()` 作为 oracle 和无 Runtime 场景入口。
2. Contribution 把多 primitive、resources、bounds、artifacts、diagnostics 与 provenance 绑定到同一 owner。
3. 统一 final assembly 解决资源 id、排序和 locator 的全量/增量等价；Runtime 只协调 transaction。

## Core Runtime 表面

- `createCoreProgram<TComposites>(options)` 返回保留 `CompositeArtifactOf<TComposites[number]>` 的标准 `RuntimeProgramDefinition`。
- `CoreChange` 精确使用上述 add/update/remove/move 判别联合；它不是通用 JSON Patch，不携带局部 IR value，也不直接修改 Snapshot。
- 调用方始终提供 next 完整 IR Snapshot；ChangeSet 可选，只用于加速定位。Mismatch 固定 full fallback，stale base 固定由 Runtime fail-loud。
- Program 生命周期内 options / registry / provider / measurer / lowerer 不可变；调用方修改原 options 对象不影响 Program，重建 Program 才生效并 full run。
- Program trace按下述唯一口径报告，不另造自由 label。
- `compileToScene()` 与 Core Program full run 对同一输入、options 产生可观察等价 `CompileResult`。

Core Program的 `tracePhases`精确声明 `update/ir-child` outcomes `full|incremental|fallback`与 `update/scene-change` outcomes `incremental|fallback`。Reporter owner固定为 `CORE_PROGRAM_ID.owner = '@retikz/core/document'`。每次 initial run或 affected update恰好发射1条 ir-child record；Runtime whole-session bailout或无关 Program复用发射0条。Initial record outcome=`full`；full fallback outcome=`fallback`；安全局部更新和empty Patch outcome=`incremental`。Initial/full/fallback的 `visited`沿用 ADR-01 batch-0 `compileChild()`实际 dispatch次数，`reused=0`、`changed=visited`。Incremental classification逐项计数：每个复用的 committed IRChild occurrence贡献一个 `visited+reused`；每次实际重新进入 `compileChild()`贡献一个 `visited+changed`，probe/final重复 dispatch按真实次数重复计；因此 `visited=reused+changed`。Snapshot Diff自身的索引比较不额外计成 ir-child。Core changed owner但可观察 compile output等价时仍产出 empty Patch artifact并报告 incremental，Core Program不返回 bailout。

Scene Patch另由 Core Program在同一次成功 update后恰好发射1条同 owner、`phase='update' / unit='scene-change'` record：normal/empty Patch outcome=`incremental`，replace outcome=`fallback`；`visited=operations.length`、`reused=0`、`changed=operations.length`。Initial revision 0没有 Patch，发射0条 scene-change record；empty incremental Patch发射1条全0 record；replace fallback的 operations长度固定为1。`createCoreProgram()`不接受 `CompileOptions.trace`，共享 full compiler在 Program路径只发 context update records；直接 `compileToScene()`才发 ADR-01 `@retikz/core/compile` record，杜绝双报。

machine-readable预算写入 `apps/bench/budgets/kernel-alpha2.json`：

- `core-single-style-5000`：1条 ir-child incremental，`visited=5000/reused=4999/changed=1`；1条 scene-change incremental，`changed=1`。
- `core-anonymous-root-fallback-5000`：1条 ir-child fallback，计数与同 fixture batch-0 full dispatch精确相等且 `reused=0/changed=visited`；1条 scene-change fallback，`visited=changed=1`（独占 replace）。
- `core-tier2-boundary`：1条 ir-child record；`changed`不得超过 fixture声明的 owner boundary occurrence数，`reused=visited-changed`，不得 root fallback；Patch与 fresh compile完整等价。

上述预算在实现前随 fixture一并落地；`bench:check`机器判定 record基数、outcome与精确关系，wall-clock仍不作共享CI硬门槛。

## 测试设计

- 每个增量场景同时运行 incremental 与 fresh `compileToScene()` 并比较 Scene、resources、layout、artifacts 与 warnings。
- 单 Node 样式、文本、几何、Scope transform 与 Path target 分别锁定最小安全失效；option/provider 变化只通过重建 Program做 full run。
- anonymous entity、duplicate id、forward reference、automatic viewBox、resource dedupe 与 layout-aware Composite 验证扩大边界或 full fallback。
- 普通 Scope identity boundary与 anonymous Composite output的同 frame重名、duplicate winner reorder及 `localNamespace` shadowing验证 namespace index和 fallback。
- insert/remove/reorder 后 identity、zIndex、resource id/ref、occurrence artifact 与 warning locator 保持确定。
- 失败 candidate 不泄漏 warning；复用 contribution 的 diagnostics 与 fresh full compile 完全等价。

详细矩阵见 ignored `notes/plans/kernel-v0.5-performance/TEST_CONTRACT_ALPHA2_ADR_04.md`。

## 公开影响

- `@retikz/core`新增 Runtime Program factory、Core change/public read；provenance/index/Program state保持私有。Core IR与 Scene持久 schema不增加字段。
- `compileToScene()` 保持完整同步入口，但 warning 改为成功后统一派发，失败 compile 不泄漏部分 warning。
- React / Vanilla 的直接 update 由 ADR-05 接入同一 Program，不自行 diff IR。

## 能力完备性检查

- 所属能力域与能力面：Drawing 的 Composition、Constraint/Layout、Primitive/Scene 与 Interaction Readiness 基础。
- 解决的问题：让 Core 以自身语义判断局部失效并派生完整 Scene + changes。
- 主责包与协作包：Core 拥有 contribution/dependency/compile；runtime 协调 revision；render 消费 Scene Patch；adapter 持有 session。
- 是否可由现有能力组合：完整 compile 可作为 oracle，但现有 traversal 没有跨 revision contribution/index，需要扩展 Core compile owner。
- 内部表达链路：IR Snapshot → identity/dependency → contribution recompute/reuse → canonical assembly → full CompileResult + Scene changes。
- 外部扩展链路：自定义 providers/composites 通过同一 immutable options registry；无增量声明也可由 Core dependency/fallback 处理，改变 definition 必须重建 Program。
- 下游执行 / adapter 等价性：ADR-05 消费完整 ScenePatch / identity topology；React/Vanilla 使用相同 Core Program。
- define-registry：Core Program 是单一封闭 owner；开放点仍是现有 provider/composite registry，不新增按 node kind 的第三方 compiler registry。
- 不支持边界与诊断：不安全局部处理显式 trace fallback；本轮结论为扩展 Core compile 域并保留 full oracle。

## 不在本 ADR 范围

- Scene Patch envelope、SVG DOM patch、Canvas dirty redraw 与 retained resources。
- concurrent scheduler、Worker、progressive materialization 或 generation session。
- Plot / Table 的领域 Diff；它们分别产出 Core contribution Snapshot / changes。
- 持久化 contribution cache、跨 session cache 或 module-global memo。

---

## 实现契约

### Level

`red`：修改 Core compile 核心并新增公共 Runtime Program surface。

### Schema 改动

无 Core IR schema改动；Contribution与 CoreChange是 runtime派生 contract，ScenePatch/SceneRuntimeSnapshot由 ADR-05定义。

### 文件 scope

- `packages/kernel/core/src/contract/runtime/**`（Core Program 公共 contract）
- `packages/kernel/core/src/compile/incremental/**`（identity、dependency、contribution、diff、fallback）
- `packages/kernel/core/src/compile/{compile,types}.ts` 与 owner barrels
- `packages/kernel/core/src/compile/orchestration/**`（共享 canonical assembly 与 diagnostic collector）
- `packages/kernel/core/tests/compile/incremental/**`
- `packages/kernel/runtime/**`（只消费 ADR-02/03 已接受 contract，不增加 Core 特判）
- `packages/kernel/core/src/index.ts`（公共 owner barrel 聚合）
- `apps/bench/{fixtures,budgets}/**`（alpha.2 deterministic trace预算）
- `apps/docs/src/modules/docs/contents/kernel/packages/core/**`（zh/en Runtime Program API、完整/增量/fallback示例、warning与 mismatch diagnostic差异）

### 测试象限

**Happy path**：Node 单属性增量；Path 单 target 增量；Scope subtree 增量；insert/remove/reorder。

**边界**：空 Scene；anonymous / duplicate child；普通 Scope 同 frame duplicate；localNamespace shadow；automatic viewBox；单次 compile replay；5,000 实体中单实体变化；immutable options/definitions。

**错误路径**：stale ChangeSet；hint/Snapshot mismatch full fallback；unresolved reference；candidate compile throw 且 warning 不泄漏。

**交互**：Node 变化传播到引用 Path；Tier 2 nested；在旧资源前 insert；跨 Scope reorder；resources + artifacts + warnings 同步更新；incremental 与 fresh compile 等价。

### 依赖的现有元素

- `compileToScene()` / `CompileResult`——完整 oracle 与输出真源。
- `CompileOccurrenceLocator`——仅 compile-local artifact 定位，不作为跨 revision identity。
- `NamespaceStack`、provider registries、paint/clip registries——由 owner contribution 记录依赖，不复制规则。
- ADR-07 compile-local session / replay——候选内部复用，禁止跨 revision 持有 token。
