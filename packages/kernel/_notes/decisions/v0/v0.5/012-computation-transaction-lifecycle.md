---
description: Runtime Computation Graph 与同步事务生命周期，覆盖隔离候选、完整结果和原子提交
keywords: 'Runtime、Computation、transaction、事务、原子提交'
---

# ADR-012：Computation Graph 与同步 Transaction Lifecycle

- 状态：Accepted
- 决策日期：2026-07-26
- 接受日期：2026-07-27
- 关联：[ADR-011](./011-runtime-identity-source-registry.md) · [ADR-013](./013-incremental-core-compile.md)

## 背景

ADR-011 已冻结 source value、Snapshot 与 identity，但多个 Source / Computation 的依赖、候选隔离和原子提交仍需统一。React / Vanilla 或 Tier 2 若自行组织 update，会形成不同的 stale、fallback、错误和资源生命周期。

本决策交付同步 transaction；候选状态保持隔离，完整结果一次发布。并发准备属于后续独立决策，不承诺具体 alpha 批次。

## 决策：只读 Candidate、无 Fork Computation Result、必填 Base Revision

核心对象统一命名为 Source、Computation 与 Runtime。Source 定义输入状态，Computation 声明依赖并产生派生结果；Runtime 是持有已提交状态、计算结果和 revision 的持续运行实例，可以连续接受多次 `update()`。每次 update 才是一次事务，Runtime 的生命周期从 `createRuntime()` 延续到 `dispose()`。公开符号、命令字段与错误码使用这些名称，不提供旧名别名。

Computation 作者输入中的 `computations` 与 `tracePhases` 默认为空数组。`capture`、`readForComputation` 与 `read` 在各自输入和输出类型相同时可以独立省略，默认直接返回入参；类型转换仍必须显式提供对应回调。所有转换均可省略且无需资源释放时，整个 `result` 配置也可省略。

泛型默认沿 result 输入到内部 result 推导；private read 与 public read 分别默认采用内部 result 类型，公开读取不经过 private read。恒等默认不复制、冻结或接管外部可变引用的安全性，作者仍须履行 candidate/current 隔离、不可变共享与资源释放契约。

```ts
type RuntimeComputationId = Readonly<{ owner: string; key: string }>;
declare const RuntimeComputationTokenBrand: unique symbol;
type RuntimeComputationToken = Readonly<{
  id: RuntimeComputationId;
  [RuntimeComputationTokenBrand]: true;
}>;

type RuntimeDiagnostic = Readonly<{
  code: string;
  phase: string;
  severity: 'warning' | 'error';
  message: string;
  owner?: string;
  computation?: RuntimeComputationId;
}>;

type RuntimeWarningDiagnostic = RuntimeDiagnostic & Readonly<{ severity: 'warning' }>;

type RuntimeComputationWarningInput = Readonly<{
  code: string;
  phase: string;
  message: string;
}>;

type RuntimeComputationContext = Readonly<{
  trace: RuntimeTraceReporter;
  diagnose: (diagnostic: RuntimeComputationWarningInput) => void;
}>;

type RuntimeComputationResultDefinitionInput<TResultInput, TResult = TResultInput, TComputationRead = TResult, TPublicRead = TResult> = Readonly<{
  /** 捕获 runtime-owned result；同类型时可省略，默认原样返回，不复制或冻结 */
  capture?: (input: TResultInput) => TResult;
  /** 产生只供本 Computation update 使用的 private read；同类型时可省略，默认返回内部 result */
  readForComputation?: (result: TResult) => TComputationRead;
  /** 产生依赖 Computation 与宿主可见的 public read；同类型时可省略，默认返回内部 result */
  read?: (result: TResult) => TPublicRead;
  /** 释放未发布或已替换的 result */
  dispose?: (result: TResult) => void;
}> & RuntimeRequiredResultTransform<'capture', TResultInput, TResult>
  & RuntimeRequiredResultTransform<'readForComputation', TResult, TComputationRead>
  & RuntimeRequiredResultTransform<'read', TResult, TPublicRead>;

/** 仅输入与输出类型一致时允许省略恒等转换 */
type RuntimeRequiredResultTransform<TKey extends string, TInput, TOutput> =
  [TInput, TOutput] extends [TOutput, TInput]
    ? unknown
    : Readonly<Record<TKey, (input: TInput) => TOutput>>;

/** 三层转换均可省略时允许省略整个 result 配置 */
type RuntimeRequiredComputationResult<TResultInput, TResult, TComputationRead, TPublicRead> =
  Record<never, never> extends RuntimeComputationResultDefinitionInput<TResultInput, TResult, TComputationRead, TPublicRead>
    ? unknown
    : Readonly<{ result: RuntimeComputationResultDefinitionInput<TResultInput, TResult, TComputationRead, TPublicRead> }>;

type RuntimeComputationDefinitionInput<TResultInput, TResult = TResultInput, TComputationRead = TResult, TPublicRead = TResult> = Readonly<{
  /** Computation 的结构化 identity */
  id: RuntimeComputationId;
  /** Computation 声明读取的 source tokens */
  sources: ReadonlyArray<RuntimeSourceToken>;
  /** Computation 声明读取的 upstream Computation tokens，默认为空数组 */
  computations?: ReadonlyArray<RuntimeComputationToken>;
  /** Computation callback 允许发出的 trace phases，默认为空数组 */
  tracePhases?: ReadonlyArray<RuntimeTracePhaseDefinition>;
  /** Computation result 生命周期；三层转换类型相同且无需释放资源时可整体省略 */
  result?: RuntimeComputationResultDefinitionInput<TResultInput, TResult, TComputationRead, TPublicRead>;
  /** full 执行入口 */
  run: (view: RuntimeCandidateView, context: RuntimeComputationContext) => RuntimeRunOutcome<TResultInput>;
  /** 可选 incremental 执行入口 */
  update?: (
    previous: TComputationRead,
    view: RuntimeCandidateView,
    context: RuntimeComputationContext,
  ) => RuntimeUpdateOutcome<TResultInput>;
  /** 成功发布新 result 后的隔离 observer */
  observeCommit?: (event: RuntimeCommitEvent<TPublicRead>) => void;
}> & RuntimeRequiredComputationResult<TResultInput, TResult, TComputationRead, TPublicRead>;

declare const RuntimeComputationType: unique symbol;

type RuntimeComputationDefinition<TResultInput, TResult = TResultInput, TComputationRead = TResult, TPublicRead = TResult> = RuntimeComputationToken &
  Readonly<{
    [RuntimeComputationType]: (
      input: TResultInput,
      result: TResult,
      computationRead: TComputationRead,
      publicRead: TPublicRead,
    ) => void;
  }>;

const defineRuntimeComputation = <TResultInput, TResult = TResultInput, TComputationRead = TResult, TPublicRead = TResult>(
  input: RuntimeComputationDefinitionInput<TResultInput, TResult, TComputationRead, TPublicRead>,
): RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>;

type RuntimeComputationRegistry = Readonly<{
  resolve<TResultInput, TResult, TComputationRead, TPublicRead>(
    definition: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
  ): RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>;
  find: (id: RuntimeComputationId) => RuntimeComputationToken | undefined;
  definitions: () => ReadonlyArray<RuntimeComputationToken>;
}>;

const createRuntimeComputationRegistry = (input: {
  sources: RuntimeSourceRegistry;
  computations?: ReadonlyArray<RuntimeComputationToken>;
}): RuntimeComputationRegistry;

type RuntimeCandidateLookup = Readonly<{
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  changeSet: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeChangeSet<TChange> | undefined;
  result: <TResultInput, TResult, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
}>;

type RuntimeCandidateView =
  | (RuntimeCandidateLookup &
      Readonly<{
        phase: 'initial';
        baseRevision?: never;
        candidateRevision: RuntimeRevision;
      }>)
  | (RuntimeCandidateLookup &
      Readonly<{
        phase: 'update';
        baseRevision: RuntimeRevision;
        candidateRevision: RuntimeRevision;
      }>);

type RuntimeRunOutcome<TResultInput> = Readonly<{
  kind: 'full';
  result: TResultInput;
}>;

type RuntimeUpdateOutcome<TResultInput> =
  | Readonly<{ kind: 'incremental'; result: TResultInput }>
  | Readonly<{ kind: 'bailout' }>
  | Readonly<{ kind: 'fallback'; diagnostics?: ReadonlyArray<RuntimeComputationWarningInput> }>;

type RuntimeCommitEvent<TPublicRead> =
  | Readonly<{
      phase: 'initial';
      baseRevision?: never;
      revision: RuntimeRevision;
      outcome: 'full';
      result: RuntimeSnapshot<TPublicRead>;
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>
  | Readonly<{
      phase: 'update';
      baseRevision: RuntimeRevision;
      revision: RuntimeRevision;
      outcome: 'full' | 'incremental' | 'fallback';
      result: RuntimeSnapshot<TPublicRead>;
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>;
```

与 Source 相同，Computation Definition 是 typed token，只有 `defineRuntimeComputation()` 能创建，author callbacks 不公开。伪造或 foreign token 以 `RUNTIME_COMPUTATION_TOKEN_INVALID` 拒绝。Registry 保存 `RuntimeComputationToken`；具体 Definition 可以进入异构 dependencies / computations 集合，并保留各自输入与结果类型的关联。

`defineRuntimeComputation()`要求 id.owner/id.key都是非空字符串并用 code-unit exact equality；helper复制并冻结 id、sources、computations、tracePhases及每个 outcomes数组，固定 callback references。创建后修改 author input/arrays不改变 graph或 trace capability；invalid id以 `RUNTIME_COMPUTATION_ID_INVALID`拒绝。Computation registry 绑定创建时传入的 Source registry identity；runtime必须传同一个 Source registry实例，不接受“相同 definitions但不同 registry”，并在任何 participant/capture前以 `RUNTIME_REGISTRY_MISMATCH`拒绝。这样 Computation dependencies不能绕过已验证 source token集合。

`tracePhases`是可选 immutable声明，默认为空数组，空数组合法；Definition helper拒绝重复 `phase+unit`、空 outcomes或不属于 ADR-010 union的值。Runtime从唯一 `PerformanceTraceSink`为每次 Computation invocation创建 owner-bound reporter，owner固定为 `computation.id.owner`，只开放该 Definition声明的 phase/unit/outcome。Computation callback只能取得该 reporter，不能改 owner或追加未声明预算 key；无 sink时 reporter仍校验但不产生外部 side effect。领域完整入口自己的 trace（例如 `compileToScene()` compile phase）与 Computation context trace是互斥调用路径，不得在一次 Computation invocation重复发射。

每次 Computation callback返回或抛错后，Runtime立即 drain reporter-local diagnostics，并按发生顺序映射为 commit-safe `RuntimeDiagnostic`：`invalid-record → RUNTIME_TRACE_INVALID_RECORD`、`sink-threw → RUNTIME_TRACE_SINK_FAILED`、`reentrant-report → RUNTIME_TRACE_REENTRANT`，phase为 `trace`、source/computation context固定；它们进入本次 candidate diagnostics但不改变产品 outcome。callback无需也不能自行 drain Computation context reporter。

Computation result显式区分 `TComputationRead` 与 `TPublicRead`：前者只传给该 Computation自己的 `update(previous)`，用于读取 immutable/persistent private index/cache；依赖 Computation、participant、observer和 `runtime.result()`只能取得 `TPublicRead`。两种 read都必须在 prepare内成功生成并满足 ADR-011 immutable read conformance；candidate只能以 copy-on-write/structural sharing构造新 state，永不修改 previous computation read。

CandidateView 只返回 source / result 的 `TRead`，不暴露 committed `TValue/TResult`。Runtime 在 prepare 内对每个将发布的新 source/result执行一次 `read()` 并缓存；任一首次 read失败都会回滚 candidate。CandidateView 与 commit event只返回该 immutable缓存。Definition author必须遵守 ADR-011 deeply immutable read conformance；Runtime不以无法执行的“不得保存 reference”假设防御恶意 provider。Runtime运行时检查所有 lookup已在 Definition的 sources/computations中声明，隐藏依赖以 `RUNTIME_UNDECLARED_DEPENDENCY` 拒绝。

所有 `RuntimeSnapshot.revision`都表示当前 view所属的 runtime revision，而不是 value最后改变的 revision：CandidateView中无论新建或复用 source/result一律标 candidate revision；commit后 public snapshot/result一律标 current revision。内部可私有记录 last-changed revision，但不能从公共 envelope观察。这样 unchanged dependency、Computation bailout与 source-only commit都只重标 immutable envelope，不复制/retire底层 value。

Computation result不做 fork。`update()`读取 previous `TComputationRead`，只有返回 incremental result input时 Runtime才 capture新 result；bailout直接复用 committed result；fallback只可携带 commit-safe `RuntimeComputationWarningInput`，随后调用 `run()` capture full result并把 Computation outcome标为 fallback。`RuntimeComputationWarningInput`不允许 author填写 severity/source/computation；Runtime统一注入 `severity='warning'`、当前 `computation.id.owner`与当前完整 id，因而不能伪装其它 Computation。缺少 `update()`时才直接 full run；ChangeSet缺失时仍调用 `update()`，`view.changeSet(owner)`返回 `undefined`，由领域 Computation基于完整前后 Snapshot自行 Diff或返回 fallback。Runtime不创建未消费 fork。

`defineRuntimeComputation()` 与 `createRuntimeComputationRegistry({ sources, computations })` 统一注册 typed token；computations 缺省为空列表，内置与自定义的分类及合并由调用方负责；Computation owner必须存在 ADR-011 source registry。`resolve(definition)`只接受原 typed token，`find(id)`只返回无 callback的 token。重复 id、unknown source/computation dependency、自依赖与 cycle 在 runtime 创建前 fail-loud。拓扑按依赖优先；平级按 owner/key code-unit顺序。

```ts
declare const RuntimeSourceCommandBrand: unique symbol;
type RuntimeSourceInput = Readonly<{
  source: RuntimeSourceToken;
  kind: 'initial';
  [RuntimeSourceCommandBrand]: true;
}>;
type RuntimeSourceUpdate = Readonly<{
  source: RuntimeSourceToken;
  kind: 'update';
  [RuntimeSourceCommandBrand]: true;
}>;

const createRuntimeChangeSet = <TChange>(
  baseRevision: RuntimeRevision,
  changes: ReadonlyArray<TChange>,
): RuntimeChangeSet<TChange>;

const createRuntimeSourceInput = <TInput, TValue, TRead, TChange>(
  source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
): RuntimeSourceInput;

const createRuntimeSourceUpdate = <TInput, TValue, TRead, TChange>(
  source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
  changeSet?: RuntimeChangeSet<TChange>,
): RuntimeSourceUpdate;

type RuntimeUpdate = Readonly<{
  baseRevision: RuntimeRevision;
  sources: ReadonlyArray<RuntimeSourceUpdate>;
}>;

type RuntimeResult = Readonly<{
  revision: RuntimeRevision;
  outcome: 'committed' | 'full' | 'incremental' | 'fallback' | 'bailout';
  diagnostics: ReadonlyArray<RuntimeDiagnostic>;
}>;

type RuntimeOptions = Readonly<{
  sources: RuntimeSourceRegistry;
  computations: RuntimeComputationRegistry;
  initialSnapshots: ReadonlyArray<RuntimeSourceInput>;
  trace?: PerformanceTraceSink;
}>;

type RuntimeSnapshot<TRead> = Readonly<{
  revision: RuntimeRevision;
  value: TRead;
}>;

type Runtime = Readonly<{
  revision: () => RuntimeRevision;
  update: (update: RuntimeUpdate) => RuntimeResult;
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  result: <TResultInput, TResult, TComputationRead, TPublicRead>(
    computation: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
  diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  dispose: () => void;
}>;

const createRuntime = (options: RuntimeOptions): Runtime;

```

`createRuntimeSourceInput/Update()` 按具体 owner 类型接受 value/change，返回不暴露 callback 的 command；Runtime 拒绝 object literal 与 foreign command，稳定错误码为 `RUNTIME_SOURCE_COMMAND_INVALID`。错误 value或 ChangeSet类型在 builder调用点由 TypeScript拒绝。Runtime只接受这些 command，不接受 `{ source, value }` object literal。Initial snapshot必须精确覆盖 source registry，重复/缺失/额外 owner都拒绝。Runtime创建时 capture initial values、首次 read全部成功后按拓扑 full run Computation并发布 revision 0；随后每个 Computation observer按拓扑恰好调用一次，最后才返回 runtime。任一步失败都先反向清理已 capture result，再反向清理 owner，最终不返回 runtime。空 Computation graph合法。

`RuntimeRevision`在 TypeScript中只能从 Runtime API取得 branded value，但运行时是 `0..Number.MAX_SAFE_INTEGER` integer；JavaScript可传入相同数值，Runtime只验证 safe integer与 current/base equality，不声称鉴别来源。`createRuntimeChangeSet()`对 base做同样数值校验，并要求 ChangeSet envelope 来自 factory，再复制/冻结 changes容器。current已经是 MAX时，只有 `sources: []`可直接 bailout；任何非空 update都在 capture前以 `RUNTIME_REVISION_EXHAUSTED`拒绝，即使其 value之后可能 semantic equal。

`update()` 校验顺序固定：runtime disposed → baseRevision必须等于 current → source command/token有效且 duplicate/unknown检查 → 每个 ChangeSet base必须等于 envelope base → empty sources bailout → revision exhaustion → capture/identity/equals → Computation prepare。非 MAX revision下所有 owner equals current返回 bailout，不递增 revision。Source改变但 Computation graph为空时提交 owner Snapshot，outcome为 `committed`。

Graph执行算法固定为：

1. capture并 compare owner。equal owner不算 changed；若 Definition带 `dispose` 而新旧 value object identity相同，视为违反 ownership contract，以 `RUNTIME_SOURCE_OWNERSHIP_ALIAS` 拒绝且不得 dispose仍在使用的 current value。
2. changed owner直接标记声明它的 Computation；通过 envelope/revision 检查的 hint进入 CandidateView，Runtime不解释领域内容。消费 hint 的 Computation负责判断其完整性与可用性，必要时返回 fallback。缺失 hint时仍可从完整前后 Snapshot Diff。
3. 初始 runtime所有 Computation走 full。普通 update中，无直接/传递 changed dependency的 Computation复用 result且不调用 callback。
4. affected Computation只要存在 `update()`且 changed upstream Computation没有 full/fallback，就调用 update；changed owner的 hint可存在或缺失，缺失时 view返回 `undefined`。任一 upstream full/fallback时强制本 Computation full。upstream bailout不传播 invalidation。
5. `update()` 返回 incremental时捕获新 result并把下游标为 incremental-eligible；返回 bailout时复用 committed result且不标记下游；返回 fallback时丢弃增量路径、调用 `run()`，并把所有下游强制为 full。任何 full run都保守地强制所有下游 full，不做另一套 result equality优化。
6. full/incremental/fallback capture若返回与 committed disposable result相同的 object identity，以 `RUNTIME_RESULT_OWNERSHIP_ALIAS`作为 primary error拒绝；aliased current永不进入 candidate cleanup/rollback/retire。其它已 capture candidate仍按反向顺序清理。无 dispose的 persistent immutable result允许同引用。
7. diagnostics按 owner key code-unit顺序、Computation拓扑顺序、单 callback产生顺序稳定追加；不去重。Computation context只允许提交 commit-safe warning；fatal condition必须 throw，`severity: 'error'`不能作为继续提交的旁路。

Computation 聚合 outcome 优先级为 `fallback > full > incremental > committed > bailout`。Computation fallback diagnostics 进入 candidate；只有 full result 成功并发布后才成为该次 result diagnostic。

Runtime update状态机为 `idle → preparing → observing → retiring → idle`；initial create为 `preparing → observing → idle`，另有 `disposing / disposed`。alpha.2不排队重入：在非 idle阶段同步调用 `update()`、`dispose()`、`snapshot()`、`result()` 或 drain `diagnostics()`，统一以 `RUNTIME_REENTRANT` 拒绝且不得改变外层 transaction；`revision()`只返回当前已 publish revision。trace sink重入遵守 ADR-010相同规则。observer通过 event读取本次 result，不回调 runtime。

生命周期：

1. Capture next source value；任一步失败反向 dispose 本次已 capture value。
2. 按拓扑执行 Computation；incremental/full result input 立即 capture 为 candidate result，capture 失败清理整个 candidate。
3. Bailout 只保留 committed result reference，不纳入 candidate dispose；fallback 没有临时 result ownership。
4. 所有 candidate source/result首次 read与 Computation prepare成功后，Runtime一次原子交换内部 pointer/read cache/revision；pointer publish本身不调用用户 callback。
5. Publish前冻结同一份 candidate diagnostic前缀。Initial create对所有 Computation按拓扑调用 observer，computation-local outcome=`full`；update只通知本轮成功生成新 result的 Computation，event outcome使用该 Computation自身的 `full|incremental|fallback`，unaffected/bailout不通知。所有 observer接收完全相同的 frozen diagnostic前缀；任一 observer失败不影响后序 observer且不回滚，observer/retire diagnostics只追加到最终 result/queue，不反向改变任何 event。
6. 最后反向拓扑 retire被替换的旧 result/source value；publish后 dispose error进入 diagnostic并继续清理，不再 rollback已发布 revision。Publish前 primary error保留，dispose secondary只追加 diagnostic、不覆盖 primary。

`RuntimeResult.diagnostics` 是本次调用 diagnostics 的 immutable copy；完全相同顺序的 entries在本次调用返回前追加到 runtime queue。`runtime.diagnostics()`只在 idle/disposed时返回并清空累计 queue；不去重。observer diagnostics排在 candidate diagnostics后，retire diagnostics最后。再次调用 Definition `read()`只发生在未来新 candidate capture；当前 public snapshot/result读取 committed cache，因此不存在“首次 post-commit read failure”。

稳定 runtime/graph错误至少包括 `RUNTIME_COMPUTATION_ID_INVALID`、`RUNTIME_COMPUTATION_DUPLICATE`、`RUNTIME_COMPUTATION_UNKNOWN`、`RUNTIME_COMPUTATION_TOKEN_INVALID`、`RUNTIME_COMPUTATION_CYCLE`、`RUNTIME_UNDECLARED_DEPENDENCY`、`RUNTIME_REGISTRY_MISMATCH`、`RUNTIME_SOURCE_COMMAND_INVALID`、`RUNTIME_INITIAL_SOURCE_MISMATCH`、`RUNTIME_REVISION_INVALID`、`RUNTIME_REVISION_STALE`、`RUNTIME_REVISION_EXHAUSTED`、`RUNTIME_CHANGESET_REVISION_MISMATCH`、`RUNTIME_REENTRANT`、`RUNTIME_DISPOSED`、`RUNTIME_SOURCE_OWNERSHIP_ALIAS` 与 `RUNTIME_RESULT_OWNERSHIP_ALIAS`。`RetikzRuntimeError`公开 `code/phase/message/cause/diagnostics`，可选 `owner/computation` context；原 callback error只作为 `cause`，不改变稳定 code。

Computation lifecycle primary code固定为 `RUNTIME_COMPUTATION_RUN_FAILED`、`RUNTIME_COMPUTATION_UPDATE_FAILED`、`RUNTIME_RESULT_CAPTURE_FAILED`、`RUNTIME_RESULT_COMPUTATION_READ_FAILED`与 `RUNTIME_RESULT_PUBLIC_READ_FAILED`，phase分别为 `run/update/result-capture/result-computation-read/result-public-read`并保留 computation/cause。Result dispose与 observer throw不改变已确定 primary/publish，分别映射非致命 `RUNTIME_RESULT_DISPOSE_FAILED` / `RUNTIME_COMPUTATION_OBSERVER_FAILED` diagnostic并继续反向清理/后序 observer。

失败 transaction的 diagnostics规则固定：尚未 commit的 Computation warning/fallback diagnostic属于 candidate product输出，全部丢弃；trace reporter diagnostic与 rollback/dispose等 lifecycle secondary属于执行诊断，按产生顺序放入 thrown `RetikzRuntimeError.diagnostics`。Initial create没有 runtime queue，只能从 error取得；update失败则在 throw前把完全相同的 immutable entries追加到现有 runtime queue，之后 `runtime.diagnostics()`可 drain。Primary error本身不重复作为 diagnostic entry；secondary永不覆盖 primary code/cause。

`snapshot(definition)` / `result(definition)` 返回含 immutable cached `TRead` 的 `RuntimeSnapshot<TRead>`。`dispose()` 从 idle进入 disposing，先阻止重入，再反向释放 committed result/value并进入 disposed；重复 dispose no-op，之后除 `revision/diagnostics/dispose` 外的调用具名失败。

Renderer commit participant、prepare/commit/rollback token、不可恢复 rollback与 broken Runtime均留给 ADR-014；它们不是本 ADR 已接受的 Runtime API或状态。

## 最终结果

- `@retikz/runtime` 公开 typed Computation Definition/registry、同步 Runtime、revision-bound transaction、CandidateView、observer 与 diagnostic queue。
- initial full、incremental、bailout、fallback 和 empty Computation 共用同一稳定拓扑执行；candidate 在 publish 前隔离，成功后一次切换 revision。
- result 与 source value 按 acquire/rollback/retire/dispose 路径 exactly-once 管理；primary error 保持 code/cause，secondary lifecycle failure 进入 immutable diagnostics。
- 同步 transaction、泛型 lookup、资源所有权、错误优先级和诊断队列均复用上述公开合同

## 公开影响

- `@retikz/runtime` 新增 Computation Definition / registry、同步 runtime、typed CandidateView、observer 与 diagnostics。
- React / Vanilla 后续接线必须持有相同 runtime contract；本 ADR 不暴露 adapter API 或框架 lane。
- 不修改 IR / Scene；不提供 concurrent API。

## 长期边界

- Core invalidation / contribution；Scene Patch / DOM/Canvas。
- Priority、cancel、Promise task、Worker、generation、history。

## 遗留风险与后续

- Runtime 当前只同步执行；优先级、取消、Worker、时间片与渐进呈现属于未排期的 ADR-040、ADR-041、ADR-042，不属于本次交付。
- Runtime 只保证候选隔离和原子 pointer publish；Core contribution 与 renderer commit participant 仍由 ADR-013、ADR-014 完成，participant 与 broken Runtime 不属于本 ADR 当前公开面。
- observer 与 retire failure 发生在 publish 之后，只进入 diagnostic queue，不回滚已经公开的 revision。
