# ADR-01：性能观测与 Baseline

- 状态：Accepted
- 决策日期：2026-07-26
- 接受日期：2026-07-27
- 关联：[alpha.2 roadmap](./roadmap.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [能力完备性总纲](../../../../../../../notes/architecture/capability-design.md)

## 背景

Kernel 当前没有可复现的性能 harness、phase tracing、实体访问计数或持续更新基准。`compileToScene()`、Vanilla `update()` 与 SVG / Canvas renderer 的全量路径虽然可以用一次 wall-clock 测量，但无法回答成本来自 normalize、Tier 2 lowering、Core layout、Scene 构建还是 backend commit，也无法证明后续 Diff 与 patch 真正减少了工作。

绝对时间在共享 CI 上容易受机器负载影响；只看 wall-clock 会让回归门槛不稳定。alpha.2 需要同时建立确定性的工作量指标和固定环境下的时间指标，先形成 baseline，再允许后续 ADR 冻结预算。

## 决策：先建立 Runtime Trace 切片，再建立独立 Bench App

ADR-01 先创建零领域依赖的 `@retikz/runtime` 包与最小 trace contract；ADR-02 / ADR-03 在同一包继续增加 identity / owner 与 Program / session。新增 private `@retikz/bench` app 统一承载 Node 与 browser benchmark。产品包不能依赖 bench，也不能复制 bench-local trace 类型。

Trace 是 `RuntimeProgramContext` 后续复用的公共执行期扩展契约，不是稳定的第三方 profiling 服务。内置与第三方 Program 只能通过 context 提供的 owner-bound reporter 发出 record，不能伪造其它 owner；Runtime 统一校验 phase、outcome 和 count。`0.x` 可破坏性收紧字段，不提供兼容桥接。

```ts
type PerformanceTraceRecord = Readonly<{
  owner: string;
  phase: 'compile' | 'commit' | 'update';
  unit: 'ir-child' | 'scene-primitive' | 'program' | 'scene-change';
  outcome: 'full' | 'incremental' | 'bailout' | 'fallback' | 'commit';
  visited: number;
  reused: number;
  changed: number;
}>;

type PerformanceTraceSink = (record: PerformanceTraceRecord) => void;

type PerformanceTraceDiagnostic = Readonly<{
  code: 'invalid-record' | 'sink-threw' | 'reentrant-report';
  owner: string;
  phase: PerformanceTraceRecord['phase'];
}>;

type RuntimeTracePhaseDefinition = Readonly<{
  phase: PerformanceTraceRecord['phase'];
  unit: PerformanceTraceRecord['unit'];
  outcomes: ReadonlyArray<PerformanceTraceRecord['outcome']>;
}>;

type RuntimeTraceReporter = Readonly<{
  owner: string;
  report: (record: Omit<PerformanceTraceRecord, 'owner'>) => void;
  diagnostics: () => ReadonlyArray<PerformanceTraceDiagnostic>;
}>;
```

`durationMs` 由 bench harness 在阶段外部采样，不进入跨包 trace contract，避免产品实现依赖特定计时 API。`owner + phase + unit` 构成有限语义；自由字符串 label 只能进入 bench report，不能成为预算 key。

Batch 0 冻结三个必报 full-path phase：

| owner / phase                      | unit              | 每次操作发射                          | 计数规则                                                                                                                   |
| ---------------------------------- | ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@retikz/core` / `compile`         | `ir-child`        | 每次 `compileToScene()` 正好 1 条     | `visited` 是 traversal 接受的 `IRChild` occurrence 数，不计 root `IRScene` 容器；full 时 `reused = 0`、`changed = visited` |
| `@retikz/render:svg` / `commit`    | `scene-primitive` | 每次完整 SVG document build 正好 1 条 | `visited` 是递归消费的 `ScenePrimitive` occurrence 数，包含 Group；full commit 时 `reused = 0`、`changed = visited`        |
| `@retikz/render:canvas` / `commit` | `scene-primitive` | 每次完整 Canvas draw 正好 1 条        | 与 SVG 使用相同 Scene occurrence 口径；full commit 时 `reused = 0`、`changed = visited`                                    |

Reporter 由 `createRuntimeTraceReporter({ owner, phases, sink })` 创建。Runtime 只按调用方传入的 `RuntimeTracePhaseDefinition` 校验 phase/unit/outcome，不硬编码 Core、SVG 或 Canvas；owner 固定在 reporter 上，调用者无法通过 `report()` 改写。Core `CompileOptions.trace`、SVG `BuildDocumentOptions.trace` 与 Canvas `DrawOptions.trace` 分别接收 owner/type 已收窄的 reporter，并且只能在各自公开 full 入口完成后发射一次；内部 helper 不重复发射。Bench 直接创建三个 reporter；ADR-03 的 Program context 复用同一 reporter。

所有 count 都是 finite nonnegative safe integer，并满足 `reused <= visited`、`changed <= visited`；`bailout` 必须 `changed = 0`，`incremental` / `fallback` 的具体发射基数和单位由 ADR-03～05 在接入时追加，不回改 batch-0 full 口径。漏报、重复报或 unit 不匹配都使 benchmark 失败。

`report()` 在调用 sink 前校验并冻结 record。无效 record、sink throw 与同 reporter reentry 都只追加到 reporter-local diagnostic queue并丢弃本次发射，不向产品路径抛错；`diagnostics()` 返回并清空 immutable diagnostics，作为 bench / tests 的唯一可观察出口。Diagnostic 收集自身不调用用户 callback，因此不会递归失败。

Core `ir-child` 的封闭计数点是共享 `compileChild()` dispatch 入口，每次实际调用计 1：普通 child 与 Scope child 各按调用次数计；Composite source call 计 1，`expand()` / `compile()` 产生并送入 dispatch 的每个 child 再各计 1；每次 sandbox `layoutChild()` 嵌套 dispatch 计 1；replay 只重用已保存结果、不再次 dispatch，因此不计。相同 IRChild 若因 probe 与最终 compile 被实际 dispatch 两次就计 2，体现真实工作量而不是唯一源节点数。

基准场景固定为：

1. Core 首次完整编译：100 / 1,000 / 5,000 个有稳定 id 的简单实体。
2. 单实体样式、文本和几何修改。
3. 同 owner 集合内增加、删除和 reorder。
4. 局部修改触发 Scope 或整图 layout fallback。
5. 连续 30 次 revision 替换。
6. 一个 layout-aware composite 嵌套场景。
7. 一个 Tier 2 fixture，经公开 contribution 边界进入 Core；作为 ADR-04 接入证据，不阻塞 batch 0。
8. SVG 与 Canvas 的完整 commit；后续 ADR 接入 patch commit。

Batch 0 只锁定当前 full compile / full renderer commit 的工作量与功能 oracle。单实体增量、fallback、revision、reuse 和 patch 指标是 ADR-03～05 的具名后继证据，不作为 ADR-01 进入 ADR-02 的前置通过条件。

CI 硬门槛使用 visited/reused/changed、发射基数、输出等价、retained handle / resource 数量等确定性指标。内存硬门槛不直接使用 GC 后 heap 字节；dispose 后 live handle、listener、index 与 resource reference 必须回到 fixture 起始计数。Heap 只在 Node `--expose-gc` 或 browser runner 提供显式 GC 时作为非阻断报告。

机器可读环境描述冻结 Node `24.x`、pnpm lockfile 对应的 Chromium build、`1440 × 900` viewport、DPR 1、关闭动画、固定字体与 locale/timezone。每个 wall-clock 场景 warm-up 5 次、测量 30 次，报告 median / p95 / max；只在 environment fingerprint 完全一致时比较。确定性预算只读验证，时间报告保持 ignored，baseline 更新只生成需人工审查的候选 diff，不由普通验证或 CI 自动改预算。

理由：

1. 先量化工作量，避免用不稳定 wall-clock 反推架构。
2. 独立 app 可以组合 Kernel 与 Tier 2，不把 benchmark 依赖带入发布包。
3. trace sink 是 runtime option，不进入 IR / Scene，也不成为第二份状态真源。

## 观测表面

- `@retikz/bench` 是 private app，不发布。
- trace sink 由 Runtime reporter 注入 Core / Render；alpha.2 不把它暴露为 React props 或 Vanilla plain spec 字段。Batch 0 的 browser harness 直接观测公开 Core/Render full 入口；React / Vanilla 真实 session 接线由 ADR-05 回填同一 trace contract。
- benchmark 输出结构化 JSON，包含环境、fixture、revision、指标和结果校验；结果目录默认 ignored，只有基准定义与预算配置入库。
- 相同 fixture 的功能输出先通过等价校验，再记录性能指标；错误结果没有性能通过资格。
- sink 在 record 完整构造后同步调用；record 不复用可变对象。sink throw / reentry 进入 reporter-local diagnostic queue，不改变产品输出。

## 最终实现与验证

- 新增零领域依赖的 `@retikz/runtime` trace contract、owner-bound reporter 与 reporter-local diagnostic queue。
- Core compile、SVG build 与 Canvas draw 接入相同工作量口径；未注入 trace 时不改变产品输出。
- 新增 private `@retikz/bench`，固定 Node/browser fixture、环境描述、结构化报告、deterministic baseline 与预算比较。
- 自动化验证覆盖 record 校验、owner 越权、sink throw/reentry、Core/Render 发射基数、fixture 重建、预算超限和 browser runner。
- 验证覆盖 Runtime trace、Bench fixture 与预算、Core/Render trace 基数以及错误隔离；功能 oracle 通过后才允许比较性能结果。
- alpha.2 后续 ADR 继续复用该 contract；增量、fallback、Scene Patch 与连续 revision 的预算由各自实现补齐，不回写本 ADR 的 batch-0 baseline。

## 公开影响

- Kernel release group从六包扩展为七包；ADR-01只实现 `@retikz/runtime`的 trace切片，ADR-02实现 identity/owner registry，ADR-03再实现 session。
- 新增 private benchmark app 与公共执行期 trace contract，不改变 IR、Scene、React 或 Vanilla authoring。
- 根 package scripts 增加可重复的 Kernel 性能 baseline / compare 命令。
- 性能预算成为 alpha.2 后续 ADR 的进入与退出证据。

## 能力完备性检查

- 所属能力域与能力面：Drawing 横向质量门槛；不新增 Drawing 用户能力。
- 解决的问题：为 Core compile、Render commit 与 adapter update 提供共同、可验证的性能证据。
- 主责包与协作包：runtime 拥有 trace contract / owner reporter；`@retikz/bench` 拥有 harness；Core/Render 只报告本 owner 计数；React/Vanilla session 接线由 ADR-05 回填。
- 是否可由现有能力组合：现有测试可复用 fixture 与等价断言，但没有跨包 benchmark/trace owner，需要新增内部工具边界。
- 内部表达链路：fixture → owner trace → structured result → baseline compare。
- 外部扩展链路：第三方 Program 通过注册 Program owner 获得同一 reporter；未声明自定义 phase 时只能使用 `program/update` 与 `program` unit，不能自由扩展预算 key。
- 下游执行 / adapter 等价性：Node 负责纯计算，browser 负责 SVG/Canvas commit；两者不混用时间预算。
- define-registry：trace record 本身是闭合观测值，不按名称 dispatch，独立 Definition registry 不适用；开放 Program 仍由 ADR-03 的统一 Program registry 分配 owner-bound reporter。
- 不支持边界与诊断：共享 CI 不以绝对 wall-clock 单次结果判失败；本轮结论为把 contract 下沉到 runtime、harness 上移到 private bench。

## 不在本 ADR 范围

- Diff、cache、增量编译、Scene Patch 或 retained renderer。
- production telemetry、用户 analytics、远程上报或持久 trace store。
- 在 IR / Scene 写入性能字段。
- 为第三方实现承诺稳定的公共 profiling API。

## 遗留风险与后续

- deterministic 工作量预算是共享 CI 的硬证据；wall-clock 仍只在固定环境中比较。
- trace 是 `0.x` 执行期扩展契约，不进入 IR / Scene，也不承诺 production telemetry 或持久 profiling 服务。
- ADR-04 与 ADR-05 完成后仍需补齐增量 compile、Scene Patch 和 retained commit 的场景预算。
