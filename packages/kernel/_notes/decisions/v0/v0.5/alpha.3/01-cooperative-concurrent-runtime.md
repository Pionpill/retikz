# ADR-01：Cooperative Concurrent Runtime

- 状态：Proposed
- 决策日期：2026-07-26
- 关联：[alpha.3 roadmap](./roadmap.md) · [alpha.2 Transaction ADR](../alpha.2/03-program-transaction-lifecycle.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [包拓扑](../../../../../../../notes/architecture/package-topology.md)

## 背景

alpha.2 的 Runtime 以隔离 candidate、revision 校验和串行原子 commit 保证同步增量更新正确，但普通 JavaScript lowering 不会因为 React Concurrent Rendering 自动让出。连续输入、复杂 Core compile 或 Tier 2 lowering 仍可能长时间占用主线程；如果 adapter 各自增加 debounce、Promise 或 Worker，又会形成不同的取消、优先级和提交语义。

Concurrent 的根问题不是把所有 Program 改成异步，而是让 Program 显式声明执行能力，由 framework-neutral Runtime 调度 prepare，并保证旧 candidate 即使未能及时停止也绝不提交。

## 决策：并发 Prepare，串行原子 Commit

`@retikz/runtime` 在 alpha.2 session 上新增 cooperative scheduler。Program 的 `run()` / `update()` 仍是完整同步 oracle；未声明执行能力时按 `blocking` 执行。需要让出或 offload 的 Program 通过同一 Program definition 附加 capability，不另建异步 Program registry。

```ts
type RuntimePriority = 'immediate' | 'interactive' | 'visible' | 'background';

type RuntimeProgramExecutionCapability<TArtifactInput, TProgramRead> =
  | Readonly<{ kind: 'blocking' }>
  | Readonly<{
      kind: 'chunkable';
      createRunWork: (
        view: RuntimeCandidateView,
        context: RuntimePrepareContext,
      ) => RuntimeChunkedWork<RuntimeRunResult<TArtifactInput>>;
      createUpdateWork?: (
        previous: TProgramRead,
        view: RuntimeCandidateView,
        context: RuntimePrepareContext,
      ) => RuntimeChunkedWork<RuntimeUpdateResult<TArtifactInput>>;
    }>
  | Readonly<{
      kind: 'offloadable';
      executorKey: string;
      encodeRunRequest: (view: RuntimeCandidateView) => RuntimeTransferPayload;
      decodeRunResult: (payload: RuntimeTransferPayload) => RuntimeRunResult<TArtifactInput>;
      encodeUpdateRequest?: (previous: TProgramRead, view: RuntimeCandidateView) => RuntimeTransferPayload;
      decodeUpdateResult?: (payload: RuntimeTransferPayload) => RuntimeUpdateResult<TArtifactInput>;
    }>;

type RuntimeConcurrentProgramDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead> =
  RuntimeProgramDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead> &
    Readonly<{
      execution?: RuntimeProgramExecutionCapability<TArtifactInput, TProgramRead>;
    }>;

type RuntimeScheduledUpdate<TResult> = Readonly<{
  id: string;
  result: Promise<TResult>;
  cancel: (reason?: string) => void;
  snapshot: () => RuntimeTaskSnapshot;
}>;
```

alpha.3扩展原 `defineRuntimeProgram()`的 author input为 `RuntimeConcurrentProgramDefinitionInput`；`execution`封装进同一个 typed Program token/private executor，Program registry与 graph不变，不建立第二套 async registry。缺省/`blocking`直接调用 alpha.2 `run/update`。Chunkable按 candidate phase调用 `createRunWork`或 `createUpdateWork`；update work缺失时使用同步 update，Program本来无 update则同步 full run。所有 work最终必须返回同一 `RuntimeRunResult/RuntimeUpdateResult`，再走 alpha.2 artifact capture/read与 transaction。

Offload encoder只在主线程执行，并取得原 typed CandidateView/previous private read；它只能读取 Program已声明依赖，必须把所需事实投影为 structured-clone-safe `RuntimeTransferPayload`。CandidateView、Definition token、callback、owner/artifact cache本身绝不传入 Worker。Runtime按 initial/update phase选择 run/update encode/decode对；update任一函数缺失时回退同步 update/full。decode在主线程恢复标准 result，随后仍走同一 capture/fallback/commit gate。具体 Program的 encoder/decoder负责证明 blocking/chunkable/offloadable结果与同步 oracle等价。

`RuntimeTransferPayload` 必须结构化克隆安全；函数、DOM、ReactNode、renderer 对象和 owner cache 不能跨 Worker。Offload executor 由宿主按 `executorKey` 注入 `RuntimeOffloadExecutorDefinition` registry，内置与第三方 executor 走同一解析、校验和 diagnostic 链路。Runtime 不静态 import Worker 或任何领域包。

Session 表面：

- `session.update()` 保留 alpha.2 同步原子入口，只接受 blocking/full 路径。
- `session.scheduleUpdate(input, { priority, supersedeKey? })` 创建隔离 candidate，异步返回已提交或被拒绝的 outcome。
- 同一 `supersedeKey` 的新任务请求取消旧 prepare；没有 key 的任务也必须在 commit 前按 base revision 校验。
- `session.flushSync()` 只执行显式 immediate blocking work，不把 chunkable/offloadable 隐式降级为不可控长任务。
- 所有 commit 进入 session-local 串行队列；一次只切换一个完整 semantic revision。

四个优先级是跨包有限语义，不接受任意数字。`immediate` 用于取消和轻量反馈，`interactive` 用于用户触发的领域更新，`visible` 用于当前视图与可见 generation 批次，`background` 用于预计算。宿主 scheduler 根据帧、设备和环境映射预算；优先级不改变 Program 结果和 revision 顺序。

Chunkable work 只能在显式 cooperative boundary 让出，并在每个 boundary 检查 cancellation token。Blocking work 无法中途抢占；它完成后仍必须经过取消与 revision 校验。Offload work 的取消可以终止宿主任务或只废弃返回值，正确性都由 commit gate 保证。

宿主不支持某项 capability 时：

1. 若 Program 的同步 `run()` / `update()` 可用，则按 blocking fallback 执行并记录原因。
2. 若调用方设置 `requireCapability: true`，则在 prepare 前 fail-loud，不创建部分 candidate。
3. Worker crash、decode 失败或 chunk step throw 都丢弃整个 candidate；是否重试必须由调用方显式发起，Runtime 不静默重复副作用。

理由：

1. alpha.2 的 candidate 隔离直接成为 concurrent-safe 基础，不引入第二套 transaction。
2. capability opt-in 让现有与第三方 Program 保持正确默认值，同时允许重任务渐进采用 chunk / Worker。
3. scheduler 只协调时间、取消和 commit，不理解 Core、Plot、Table 或 renderer payload。

## 测试设计

- 高频 revision、同 key supersede 与不同优先级下，只有基于 current revision 的完整 candidate 能提交。
- Blocking 完成后取消、chunk boundary 取消、offload late result 都不能越过 commit gate。
- 同一 Program 的 blocking、chunkable、offloadable 结果与 full oracle 可观察等价。
- compile-time/runtime验证 execution与 Program的 artifact input/private read泛型绑定；initial/update选择正确run/update work或encoder，缺失update能力按规则fallback。
- offload encoder能读取声明依赖并只输出 structured-clone-safe payload；把 CandidateView/token/cache/函数放入 payload时prepare前具名拒绝。
- 无宿主 capability、requireCapability、Worker crash、decode error 与 dispose 路径具有确定 outcome 和 diagnostic。
- React / Vanilla 接入不同宿主 scheduler 时共享 revision、取消、fallback 与 commit 语义。

详细矩阵见 ignored `notes/plans/kernel-v0.5-performance/TEST_CONTRACT_ALPHA3_ADR_01.md`。

## 公开影响

- `@retikz/runtime` 新增 scheduler host、task handle、priority、cancellation、chunkable 与 offload executor contract。
- `@retikz/react` 只把 Runtime task 接入 React lifecycle / commit，不把 React lane 暴露为跨包优先级。
- `@retikz/vanilla` 注入浏览器或自定义 scheduler host；无调度宿主时仍可使用 alpha.2 同步入口。
- alpha.3 不保证所有 Program 可中断；未声明 capability 的 blocking 是明确兼容和正确性 fallback。

## 能力完备性检查

- 所属能力域与能力面：Drawing 的运行时基础，同时为 Data / Visualization 提供跨领域调度契约。
- 解决的问题：控制 prepare 的主线程占用、优先级与过期工作，同时保留原子 semantic commit。
- 主责包与协作包：runtime 拥有 scheduler / task / commit gate；Program owner 拥有 chunk/offload 实现；adapter 注入宿主；renderer 不参与 semantic scheduling。
- 是否可由现有能力组合：alpha.2 已有 candidate 与 revision，但没有让出、取消或 host capability，需要扩展 runtime，不应在 React / Vanilla 局部补丁。
- 内部表达链路：scheduled update → isolated candidate → capability prepare → cancellation/revision validation → serialized atomic commit。
- 外部扩展链路：第三方 Program capability 与 offload executor 通过同一 definition registry 注入；缺省 blocking。
- define-registry：Program collection 沿用 alpha.2 registry；offload executor 是新增开放能力，使用 `RuntimeOffloadExecutorDefinition`、define helper、内置与自定义合并和统一 key dispatch。
- 下游执行 / adapter 等价性：React / Vanilla 只映射 host scheduling；相同输入产生相同 commit outcome。
- 不支持边界与诊断：blocking 不承诺可抢占；capability 缺失、fallback、取消浪费和 stale result 全部进入 trace。

## 不在本 ADR 范围

- 把所有 Core / Tier 2 Program 改为 chunkable 或 offloadable。
- Scene 的 progressive materialization、renderer batch 与 hit-test 状态。
- generation draft、模型调用、prompt、token stream 或聊天 UI。
- 多 session 全局公平性、服务端分布式任务、SharedArrayBuffer 或跨进程 cache。

---

## 实现契约

### Level

`red`：扩展公共 Runtime Program / session 契约，并改变 React / Vanilla 更新执行方式。

### Schema 改动

无 IR / Scene schema 改动。Transfer payload 是执行期 contract，不写入 IR 或 Scene。

### 文件 scope

- `packages/kernel/runtime/src/{contract,scheduler,session,offload}/**`
- `packages/kernel/runtime/src/index.ts`
- `packages/kernel/runtime/tests/{scheduler,session,offload}/**`
- `packages/kernel/react/src/kernel/runtime/**`
- `packages/kernel/vanilla/src/runtime/**`
- `packages/kernel/{react,vanilla}/tests/**concurrent**`
- `apps/docs/src/modules/docs/contents/kernel/packages/runtime/**`

### 测试象限

**Happy path**：blocking schedule；chunk 多次 yield；offload success；不同优先级；串行 commit。

**边界**：空 Program；零 chunk；同步完成；同 revision 多任务；safe-integer revision 上界前一值。

**错误路径**：取消；stale base；Worker crash；decode error；chunk throw；缺 capability；dispose 后 schedule。

**交互**：同 key supersede；高优先级在 boundary 前置；React unmount；Vanilla dispose；第三方 executor 同路。

### 依赖的现有元素

- alpha.2 `RuntimeSession` / candidate transaction / `RuntimeProgram`——直接扩展，不复制状态机。
- Core incremental Program——blocking oracle 与首个 chunk/offload consumer。
- React commit lifecycle、Vanilla view lifecycle——只作为 scheduler host 和取消接线。
- benchmark trace——记录最长 blocking、yield、取消浪费、fallback 与 commit cost。
