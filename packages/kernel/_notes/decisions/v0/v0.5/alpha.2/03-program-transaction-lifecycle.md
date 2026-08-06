# ADR-03：Program Graph 与同步 Transaction Lifecycle

- 状态：Accepted
- 决策日期：2026-07-26
- 接受日期：2026-07-27
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-02](./02-runtime-identity-owner-registry.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md)

## 背景

ADR-02 已冻结 owner value、Snapshot 与 identity，但多个 owner / Program 的依赖、候选隔离和原子提交仍需统一。React / Vanilla 或 Tier 2 若自行组织 update，会形成不同的 stale、fallback、错误和资源生命周期。

alpha.2 只交付同步 transaction；它仍必须从第一天隔离 candidate，并只把完整结果一次发布，为 alpha.3 concurrent prepare 保留正确性边界。

## 决策：只读 Candidate、无 Fork Program Artifact、必填 Base Revision

```ts
type RuntimeProgramId = Readonly<{ owner: string; key: string }>;
declare const RuntimeProgramTokenBrand: unique symbol;
type RuntimeProgramToken = Readonly<{
  id: RuntimeProgramId;
  [RuntimeProgramTokenBrand]: true;
}>;

type RuntimeDiagnostic = Readonly<{
  code: string;
  phase: string;
  severity: 'warning' | 'error';
  message: string;
  owner?: string;
  program?: RuntimeProgramId;
}>;

type RuntimeWarningDiagnostic = RuntimeDiagnostic & Readonly<{ severity: 'warning' }>;

type RuntimeProgramWarningInput = Readonly<{
  code: string;
  phase: string;
  message: string;
}>;

type RuntimeProgramContext = Readonly<{
  trace: RuntimeTraceReporter;
  diagnose: (diagnostic: RuntimeProgramWarningInput) => void;
}>;

type RuntimeProgramArtifactDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead> = Readonly<{
  capture: (input: TArtifactInput) => TArtifact;
  readForProgram: (artifact: TArtifact) => TProgramRead;
  read: (artifact: TArtifact) => TPublicRead;
  dispose?: (artifact: TArtifact) => void;
}>;

type RuntimeProgramDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead> = Readonly<{
  id: RuntimeProgramId;
  owners: ReadonlyArray<RuntimeOwnerToken>;
  programs: ReadonlyArray<RuntimeProgramToken>;
  tracePhases: ReadonlyArray<RuntimeTracePhaseDefinition>;
  artifact: RuntimeProgramArtifactDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead>;
  run: (view: RuntimeCandidateView, context: RuntimeProgramContext) => RuntimeRunResult<TArtifactInput>;
  update?: (
    previous: TProgramRead,
    view: RuntimeCandidateView,
    context: RuntimeProgramContext,
  ) => RuntimeUpdateResult<TArtifactInput>;
  observeCommit?: (event: RuntimeCommitEvent<TPublicRead>) => void;
}>;

declare const RuntimeProgramType: unique symbol;

type RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead = TProgramRead> = RuntimeProgramToken &
  Readonly<{
    [RuntimeProgramType]: (
      input: TArtifactInput,
      artifact: TArtifact,
      programRead: TProgramRead,
      publicRead: TPublicRead,
    ) => void;
  }>;

const defineRuntimeProgram = <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
  input: RuntimeProgramDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
): RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>;

type RuntimeProgramRegistry = Readonly<{
  resolve<TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
    definition: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
  ): RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>;
  find: (id: RuntimeProgramId) => RuntimeProgramToken | undefined;
  definitions: () => ReadonlyArray<RuntimeProgramToken>;
}>;

const createRuntimeProgramRegistry = (input: {
  owners: RuntimeOwnerRegistry;
  builtins?: ReadonlyArray<RuntimeProgramToken>;
  custom?: ReadonlyArray<RuntimeProgramToken>;
}): RuntimeProgramRegistry;

type RuntimeCandidateLookup = Readonly<{
  snapshot: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  changeSet: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeChangeSet<TChange> | undefined;
  artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
    program: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
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

type RuntimeRunResult<TArtifactInput> = Readonly<{
  kind: 'full';
  artifact: TArtifactInput;
}>;

type RuntimeUpdateResult<TArtifactInput> =
  | Readonly<{ kind: 'incremental'; artifact: TArtifactInput }>
  | Readonly<{ kind: 'bailout' }>
  | Readonly<{ kind: 'fallback'; diagnostics?: ReadonlyArray<RuntimeProgramWarningInput> }>;

type RuntimeCommitEvent<TPublicRead> =
  | Readonly<{
      phase: 'initial';
      baseRevision?: never;
      revision: RuntimeRevision;
      outcome: 'full';
      artifact: RuntimeSnapshot<TPublicRead>;
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>
  | Readonly<{
      phase: 'update';
      baseRevision: RuntimeRevision;
      revision: RuntimeRevision;
      outcome: 'full' | 'incremental' | 'fallback';
      artifact: RuntimeSnapshot<TPublicRead>;
      diagnostics: ReadonlyArray<RuntimeDiagnostic>;
    }>;
```

与 Owner 相同，Program Definition 是 typed token，author callbacks只存在 `defineRuntimeProgram()` 创建的 private executor中。`RuntimeProgramTokenBrand`不导出 value，Definition可直接进入 registry/dependencies，object literal不能构造；private WeakSet拒绝 foreign/JavaScript伪 token并报 `RUNTIME_PROGRAM_TOKEN_INVALID`。Program registry存 `RuntimeProgramToken`；具体 Definition可进入异构 dependencies / builtin / custom collection而不赋给 `RuntimeProgramDefinition<unknown, ...>`。实现只允许 define helper内部以 token identity守卫做一次 `unknown` narrowing，禁止 `any` 或在 graph/session重新 cast callback。

`defineRuntimeProgram()`要求 id.owner/id.key都是非空字符串并用 code-unit exact equality；helper复制并冻结 id、owners、programs、tracePhases及每个 outcomes数组，固定 callback references。创建后修改 author input/arrays不改变 graph或 trace capability；invalid id以 `RUNTIME_PROGRAM_ID_INVALID`拒绝。Program registry创建时在 private WeakMap绑定传入的 Owner registry object identity；session必须传同一个 Owner registry实例，不接受“相同 definitions但不同 registry”，并在任何 participant/capture前以 `RUNTIME_REGISTRY_MISMATCH`拒绝。这样 Program dependencies不能绕过已验证 owner token集合。

`tracePhases`是必填 immutable声明，空数组合法；Definition helper拒绝重复 `phase+unit`、空 outcomes或不属于 ADR-01 union的值。Session从唯一 `PerformanceTraceSink`为每次 Program invocation创建 owner-bound reporter，owner固定为 `program.id.owner`，只开放该 Definition声明的 phase/unit/outcome。Program callback只能取得该 reporter，不能改 owner或追加未声明预算 key；无 sink时 reporter仍校验但不产生外部 side effect。领域完整入口自己的 trace（例如 `compileToScene()` compile phase）与 Program context trace是互斥调用路径，不得在一次 Program invocation重复发射。

每次 Program callback返回或抛错后，Runtime立即 drain reporter-local diagnostics，并按发生顺序映射为 commit-safe `RuntimeDiagnostic`：`invalid-record → RUNTIME_TRACE_INVALID_RECORD`、`sink-threw → RUNTIME_TRACE_SINK_FAILED`、`reentrant-report → RUNTIME_TRACE_REENTRANT`，phase为 `trace`、owner/program context固定；它们进入本次 candidate diagnostics但不改变产品 outcome。callback无需也不能自行 drain Program context reporter。

Program artifact显式区分 `TProgramRead` 与 `TPublicRead`：前者只传给该 Program自己的 `update(previous)`，用于读取 immutable/persistent private index/cache；依赖 Program、participant、observer和 `session.artifact()`只能取得 `TPublicRead`。两种 read都必须在 prepare内成功生成并满足 ADR-02 immutable read conformance；candidate只能以 copy-on-write/structural sharing构造新 state，永不修改 previous program read。

CandidateView 只返回 owner / artifact 的 `TRead`，不暴露 committed `TValue/TArtifact`。Runtime 在 prepare 内对每个将发布的新 owner/artifact执行一次 `read()` 并缓存；任一首次 read失败都会回滚 candidate。CandidateView 与 commit event只返回该 immutable缓存。Definition author必须遵守 ADR-02 deeply immutable read conformance；Runtime不以无法执行的“不得保存 reference”假设防御恶意 provider。Runtime运行时检查所有 lookup已在 Definition的 owners/programs中声明，隐藏依赖以 `RUNTIME_UNDECLARED_DEPENDENCY` 拒绝。

所有 `RuntimeSnapshot.revision`都表示当前 view所属的 session revision，而不是 value最后改变的 revision：CandidateView中无论新建或复用 owner/artifact一律标 candidate revision；commit后 public snapshot/artifact一律标 current revision。内部可私有记录 last-changed revision，但不能从公共 envelope观察。这样 unchanged dependency、Program bailout与 owner-only commit都只重标 immutable envelope，不复制/retire底层 value。

Program artifact不做 fork。`update()`读取 previous `TProgramRead`，只有返回 incremental artifact input时 Runtime才 capture新 artifact；bailout直接复用 committed artifact；fallback只可携带 commit-safe `RuntimeProgramWarningInput`，随后调用 `run()` capture full artifact并把 Program outcome标为 fallback。`RuntimeProgramWarningInput`不允许 author填写 severity/owner/program；Runtime统一注入 `severity='warning'`、当前 `program.id.owner`与当前完整 id，因而不能伪装其它 Program。缺少 `update()`时才直接 full run；ChangeSet缺失时仍调用 `update()`，`view.changeSet(owner)`返回 `undefined`，由领域 Program基于完整前后 Snapshot自行 Diff或返回 fallback。Runtime不创建未消费 fork。

`defineRuntimeProgram()` 与 `createRuntimeProgramRegistry({ owners, builtins, custom })` 统一合并 typed token；Program owner必须存在 ADR-02 owner registry。`resolve(definition)`只接受原 typed token，`find(id)`只返回无 callback的 token。重复 id、unknown owner/program dependency、自依赖与 cycle 在 session 创建前 fail-loud。拓扑按依赖优先；平级按 owner/key code-unit顺序。

```ts
declare const RuntimeOwnerCommandBrand: unique symbol;
type RuntimeOwnerInput = Readonly<{
  owner: RuntimeOwnerToken;
  kind: 'initial';
  [RuntimeOwnerCommandBrand]: true;
}>;
type RuntimeOwnerUpdate = Readonly<{
  owner: RuntimeOwnerToken;
  kind: 'update';
  [RuntimeOwnerCommandBrand]: true;
}>;

const createRuntimeChangeSet = <TChange>(
  baseRevision: RuntimeRevision,
  changes: ReadonlyArray<TChange>,
): RuntimeChangeSet<TChange>;

const createRuntimeOwnerInput = <TInput, TValue, TRead, TChange>(
  owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
): RuntimeOwnerInput;

const createRuntimeOwnerUpdate = <TInput, TValue, TRead, TChange>(
  owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
  changeSet?: RuntimeChangeSet<TChange>,
): RuntimeOwnerUpdate;

type RuntimeSessionUpdate = Readonly<{
  baseRevision: RuntimeRevision;
  owners: ReadonlyArray<RuntimeOwnerUpdate>;
}>;

type RuntimeSessionResult = Readonly<{
  revision: RuntimeRevision;
  outcome: 'committed' | 'full' | 'incremental' | 'fallback' | 'bailout';
  diagnostics: ReadonlyArray<RuntimeDiagnostic>;
}>;

type RuntimeSessionOptions = Readonly<{
  owners: RuntimeOwnerRegistry;
  programs: RuntimeProgramRegistry;
  initialSnapshots: ReadonlyArray<RuntimeOwnerInput>;
  trace?: PerformanceTraceSink;
}>;

type RuntimeSnapshot<TRead> = Readonly<{
  revision: RuntimeRevision;
  value: TRead;
}>;

type RuntimeSession = Readonly<{
  revision: () => RuntimeRevision;
  update: (update: RuntimeSessionUpdate) => RuntimeSessionResult;
  snapshot: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSnapshot<TRead>;
  artifact: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
    program: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
  ) => RuntimeSnapshot<TPublicRead>;
  diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  dispose: () => void;
}>;

const createRuntimeSession = (options: RuntimeSessionOptions): RuntimeSession;

class RuntimeError extends Error {
  readonly code: string;
  readonly phase: string;
  readonly cause: unknown;
  readonly owner?: string;
  readonly program?: RuntimeProgramId;
  readonly diagnostics: ReadonlyArray<RuntimeDiagnostic>;
}
```

`createRuntimeOwnerInput/Update()` 在 concrete owner泛型仍在作用域时闭包捕获正确 value/change并返回不暴露 callback的 erased command；private `RuntimeOwnerCommandBrand` value与 WeakSet guard使 object literal / foreign command在TypeScript和JavaScript两层均被拒绝，stable code为 `RUNTIME_OWNER_COMMAND_INVALID`。错误 value或 ChangeSet类型在 builder调用点由 TypeScript拒绝。Session只接受这些 command，不接受 `{ owner, value }` object literal。Initial snapshot必须精确覆盖 owner registry，重复/缺失/额外 owner都拒绝。Session创建时 capture initial values、首次 read全部成功后按拓扑 full run Program并发布 revision 0；随后每个 Program observer按拓扑恰好调用一次，最后才返回 session。任一步失败都先反向清理已 capture artifact，再反向清理 owner，最终不返回 session。空 Program graph合法。

`RuntimeRevision`在 TypeScript中只能从 Runtime API取得 branded value，但运行时是 `0..Number.MAX_SAFE_INTEGER` integer；JavaScript可传入相同数值，Runtime只验证 safe integer与 current/base equality，不声称鉴别来源。`createRuntimeChangeSet()`对 base做同样数值校验，并以 private brand/WeakSet保证 ChangeSet envelope来自 factory，再复制/冻结 changes容器。current已经是 MAX时，只有 `owners: []`可直接 bailout；任何非空 update都在 capture前以 `RUNTIME_REVISION_EXHAUSTED`拒绝，即使其 value之后可能 semantic equal。

`update()` 校验顺序固定：session disposed → baseRevision必须等于 current → owner command/token有效且 duplicate/unknown检查 → 每个 ChangeSet base必须等于 envelope base → empty owners bailout → revision exhaustion → capture/identity/equals/validation → Program prepare。非 MAX revision下所有 owner equals current返回 bailout，不递增 revision。Owner改变但 Program graph为空时提交 owner Snapshot，outcome为 `committed`。

Graph执行算法固定为：

1. capture并 compare owner。equal owner不算 changed；若 Definition带 `dispose` 而新旧 value object identity相同，视为违反 ownership contract，以 `RUNTIME_OWNER_OWNERSHIP_ALIAS` 拒绝且不得 dispose仍在使用的 current value。
2. changed owner直接标记声明它的 Program；只有 `validateChangeSet()` 成功的 hint才进入 CandidateView。缺失 hint不等于不安全，Program仍可从完整前后 Snapshot Diff；validator明确返回 fallback时丢弃不可信 hint、记录 fallback diagnostic，并使直接 Program走 full/fallback outcome。
3. 初始 session所有 Program走 full。普通 update中，无直接/传递 changed dependency的 Program复用 artifact且不调用 callback。
4. affected Program只要存在 `update()`且 changed upstream Program没有 full/fallback，就调用 update；changed owner的 hint可 valid或缺失，缺失时 view返回 `undefined`。owner validator明确 fallback或任一 upstream full/fallback时强制本 Program full。upstream bailout不传播 invalidation。
5. `update()` 返回 incremental时捕获新 artifact并把下游标为 incremental-eligible；返回 bailout时复用 committed artifact且不标记下游；返回 fallback时丢弃增量路径、调用 `run()`，并把所有下游强制为 full。任何 full run都保守地强制所有下游 full，不做另一套 artifact equality优化。
6. full/incremental/fallback capture若返回与 committed disposable artifact相同的 object identity，以 `RUNTIME_ARTIFACT_OWNERSHIP_ALIAS`作为 primary error拒绝；aliased current永不进入 candidate cleanup/rollback/retire。其它已 capture candidate仍按反向顺序清理。无 dispose的 persistent immutable artifact允许同引用。
7. diagnostics按 owner key code-unit顺序、Program拓扑顺序、单 callback产生顺序稳定追加；不去重。Program context只允许提交 commit-safe warning；fatal condition必须 throw，`severity: 'error'`不能作为继续提交的旁路。

Program 聚合 outcome 优先级为 `fallback > full > incremental > committed > bailout`。Owner validation fallback 与 Program fallback diagnostics 都进入 candidate；只有 full artifact 成功并发布后才成为该次 result diagnostic。

Session update状态机为 `idle → preparing → observing → retiring → idle`；initial create为 `preparing → observing → idle`，另有 `disposing / disposed`。alpha.2不排队重入：在非 idle阶段同步调用 `update()`、`dispose()`、`snapshot()`、`artifact()` 或 drain `diagnostics()`，统一以 `RUNTIME_SESSION_REENTRANT` 拒绝且不得改变外层 transaction；`revision()`只返回当前已 publish revision。trace sink重入遵守 ADR-01相同规则。observer通过 event读取本次 artifact，不回调 session。

生命周期：

1. Capture next owner value；任一步失败反向 dispose 本次已 capture value。
2. 按拓扑执行 Program；incremental/full artifact input 立即 capture 为 candidate artifact，capture 失败清理整个 candidate。
3. Bailout 只保留 committed artifact reference，不纳入 candidate dispose；fallback 没有临时 artifact ownership。
4. 所有 candidate owner/artifact首次 read与 Program prepare成功后，Runtime一次原子交换内部 pointer/read cache/revision；pointer publish本身不调用用户 callback。
5. Publish前冻结同一份 candidate diagnostic前缀。Initial create对所有 Program按拓扑调用 observer，program-local outcome=`full`；update只通知本轮成功生成新 artifact的 Program，event outcome使用该 Program自身的 `full|incremental|fallback`，unaffected/bailout不通知。所有 observer接收完全相同的 frozen diagnostic前缀；任一 observer失败不影响后序 observer且不回滚，observer/retire diagnostics只追加到最终 result/queue，不反向改变任何 event。
6. 最后反向拓扑 retire被替换的旧 artifact/owner value；publish后 dispose error进入 diagnostic并继续清理，不再 rollback已发布 revision。Publish前 primary error保留，dispose secondary只追加 diagnostic、不覆盖 primary。

`RuntimeSessionResult.diagnostics` 是本次调用 diagnostics 的 immutable copy；完全相同顺序的 entries在本次调用返回前追加到 session queue。`session.diagnostics()`只在 idle/disposed时返回并清空累计 queue；不去重。observer diagnostics排在 candidate diagnostics后，retire diagnostics最后。再次调用 Definition `read()`只发生在未来新 candidate capture；当前 public snapshot/artifact读取 committed cache，因此不存在“首次 post-commit read failure”。

稳定 session/graph错误至少包括 `RUNTIME_PROGRAM_ID_INVALID`、`RUNTIME_PROGRAM_DUPLICATE`、`RUNTIME_PROGRAM_UNKNOWN`、`RUNTIME_PROGRAM_TOKEN_INVALID`、`RUNTIME_PROGRAM_CYCLE`、`RUNTIME_UNDECLARED_DEPENDENCY`、`RUNTIME_REGISTRY_MISMATCH`、`RUNTIME_OWNER_COMMAND_INVALID`、`RUNTIME_INITIAL_OWNER_MISMATCH`、`RUNTIME_REVISION_INVALID`、`RUNTIME_REVISION_STALE`、`RUNTIME_REVISION_EXHAUSTED`、`RUNTIME_CHANGESET_REVISION_MISMATCH`、`RUNTIME_SESSION_REENTRANT`、`RUNTIME_SESSION_DISPOSED`、`RUNTIME_OWNER_OWNERSHIP_ALIAS` 与 `RUNTIME_ARTIFACT_OWNERSHIP_ALIAS`。`RuntimeError`公开 `code/phase/message/cause/diagnostics`，可选 `owner/program` context；原 callback error只作为 `cause`，不改变稳定 code。

Program lifecycle primary code固定为 `RUNTIME_PROGRAM_RUN_FAILED`、`RUNTIME_PROGRAM_UPDATE_FAILED`、`RUNTIME_ARTIFACT_CAPTURE_FAILED`、`RUNTIME_ARTIFACT_PROGRAM_READ_FAILED`与 `RUNTIME_ARTIFACT_PUBLIC_READ_FAILED`，phase分别为 `run/update/artifact-capture/artifact-program-read/artifact-public-read`并保留 program/cause。Artifact dispose与 observer throw不改变已确定 primary/publish，分别映射非致命 `RUNTIME_ARTIFACT_DISPOSE_FAILED` / `RUNTIME_PROGRAM_OBSERVER_FAILED` diagnostic并继续反向清理/后序 observer。

失败 transaction的 diagnostics规则固定：尚未 commit的 Program warning/fallback diagnostic属于 candidate product输出，全部丢弃；trace reporter diagnostic与 rollback/dispose等 lifecycle secondary属于执行诊断，按产生顺序放入 thrown `RuntimeError.diagnostics`。Initial create没有 session queue，只能从 error取得；update失败则在 throw前把完全相同的 immutable entries追加到现有 session queue，之后 `session.diagnostics()`可 drain。Primary error本身不重复作为 diagnostic entry；secondary永不覆盖 primary code/cause。

`snapshot(definition)` / `artifact(definition)` 返回含 immutable cached `TRead` 的 `RuntimeSnapshot<TRead>`。`dispose()` 从 idle进入 disposing，先阻止重入，再反向释放 committed artifact/value并进入 disposed；重复 dispose no-op，之后除 `revision/diagnostics/dispose` 外的调用具名失败。

Renderer commit participant、prepare/commit/rollback token、不可恢复 rollback与 broken Session均留给 ADR-05；它们不是本 ADR 已接受的 Runtime API或状态。

## 最终实现与验证

- `@retikz/runtime` 公开 typed Program Definition/registry、同步 Session、revision-bound transaction、CandidateView、observer 与 diagnostic queue。
- initial full、incremental、bailout、fallback 和 empty Program 共用同一稳定拓扑执行；candidate 在 publish 前隔离，成功后一次切换 revision。
- artifact 与 owner value 按 acquire/rollback/retire/dispose 路径 exactly-once 管理；primary error 保持 code/cause，secondary lifecycle failure 进入 immutable diagnostics。
- 自动化验证覆盖 graph/cycle/undeclared dependency、stale base、multi-owner ChangeSet、revision exhaustion、callback phase failure、rollback、observer reentry、资源所有权和 compile-time generic lookup。
- 类型与自动化验证已覆盖同步 transaction、泛型 lookup、资源所有权、错误优先级和诊断队列。
- Runtime package/session 中英文文档、执行逻辑图和 alpha.2 changelog 已同步当前同步事务合同。

## 公开影响

- `@retikz/runtime` 新增 Program Definition / registry、同步 session、typed CandidateView、observer 与 diagnostics。
- React / Vanilla 后续接线必须持有相同 session contract；本 ADR 不暴露 adapter API 或框架 lane。
- 不修改 IR / Scene；不提供 concurrent API。

## 能力完备性检查

- 所属能力域：跨领域 Runtime transaction。
- 主责包：runtime 拥有 graph/lifecycle/revision；领域 owner 拥有 value/change/Program。
- 内部表达：完整 next Snapshot → read-only candidate → Program → atomic pointer publish。
- 外部扩展：builtin/custom Program 同一 define/registry/dispatch。
- define-registry：完整适用；owner 必须来自 ADR-02 registry。
- 下游闭环：ADR-04 提供 Core Program，ADR-05 接入 renderer participant 并让 React/Vanilla 共用 Session。
- 阶段结论：扩展 runtime；scheduler/Worker 延后 alpha.3。

## 不在本 ADR 范围

- Core invalidation / contribution；Scene Patch / DOM/Canvas。
- Priority、cancel、Promise task、Worker、generation、history。

## 遗留风险与后续

- alpha.2 Session 只同步执行；优先级、取消、Worker、时间片和 progressive presentation 留给 alpha.3。
- Runtime 只保证候选隔离和原子 pointer publish；Core contribution 与 renderer commit participant 仍由 ADR-04、ADR-05 完成，participant 与 broken Session 不属于本 ADR 当前公开面。
- observer 与 retire failure 发生在 publish 之后，只进入 diagnostic queue，不回滚已经公开的 revision。
