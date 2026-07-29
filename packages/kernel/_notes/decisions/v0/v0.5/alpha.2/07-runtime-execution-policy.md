# ADR-07：Runtime 执行模式与更新策略

- 状态：Proposed
- 决策日期：2026-07-29
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-03](./03-program-transaction-lifecycle.md) · [ADR-04](./04-incremental-core-compile.md) · [ADR-05](./05-scene-patch-retained-renderer.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md)

## 背景

ADR-03～05 已建立同步 Runtime Session、Core 增量编译和 SVG / Canvas retained renderer。React `<Layout>` 与 Vanilla 的 IR / plain spec mount 默认进入 retained Session；预编译 Scene、SSR string 与直接 Core / Render API 继续使用 static full 路径。

当前公开配置只能替换 retained renderer factory，不能让调用方显式选择无 Session 的 static 执行，也不能在保留 transaction、rollback 与 retained host 的同时强制每次更新走 full Program。开发者因内存约束选择静态执行，或在 Bench 中对比 auto 与 full 时，只能改用不同输入层或私有 harness，React 与 Vanilla 也没有对等配置。

一个 `incremental: boolean` 无法区分“完全关闭 Runtime 状态”和“保留 Runtime 但关闭局部更新”。前者改变 Snapshot、diagnostic、rollback 和 view 能力，后者只改变 Program 调度与 renderer 工作量；两者必须成为正交契约。

## 决策：Adapter 选择 mode，Runtime Session 选择 updateStrategy

React 与 Vanilla 的 runtime options 增加两个参数。两包拥有各自的 adapter options，不导出一个错误暗示 Runtime 拥有 host mode 的共享 `RuntimeMode`：

```ts
type RuntimeUpdateStrategyValue = 'auto' | 'full';

const LayoutRuntimeMode = {
  Retained: 'retained',
  Static: 'static',
} as const;
type LayoutRuntimeModeValue = ValueOf<typeof LayoutRuntimeMode>;

type LayoutRuntimeOptions =
  | Readonly<{
      mode?: 'retained';
      updateStrategy?: RuntimeUpdateStrategyValue;
      rendererFactory?: RetainedRendererFactory;
      onDiagnostic?: (diagnostic: RuntimeDiagnostic) => void;
    }>
  | Readonly<{
      mode: 'static';
      updateStrategy?: never;
      rendererFactory?: never;
      onDiagnostic?: never;
    }>;

type VanillaRuntimeOptions =
  | Readonly<{
      mode?: typeof VanillaViewMode.Retained;
      updateStrategy?: RuntimeUpdateStrategyValue;
      rendererFactory?: RetainedRendererFactory;
    }>
  | Readonly<{
      mode: typeof VanillaViewMode.Static;
      updateStrategy?: never;
      rendererFactory?: never;
    }>;
```

- `mode` 由 React / Vanilla adapter 拥有。缺省 `retained`，保持现有客户端行为；`static` 不创建 `RuntimeSession`、Core Program 或 retained Render participant。
- `updateStrategy` 由 `@retikz/runtime` 的 `RuntimeSessionOptions` 拥有。缺省 `auto`；`auto` 沿用 Program `update → bailout / incremental / fallback`，`full` 在每次实际 owner 变化时跳过 Program `update()`并直接调用 `run()`。
- `static` 与 `updateStrategy`、retained renderer factory、Runtime diagnostic sink 互斥。TypeScript 使用判别联合拒绝组合；JavaScript 入口 fail-loud，不静默忽略。
- `full` 仍保留完整 Snapshot、candidate 隔离、原子 commit、rollback、diagnostics、retained renderer 和资源生命周期，因此不是低内存模式。Core full update 产生独占 `replaceScene` Patch；renderer 执行完整物化。
- `static` 使用现有 `compileToScene`、SVG document / React mapping、CanvasHost、Vanilla static mount 和 static update，不建立第二套 compile 或 renderer 语义。

`@retikz/runtime`公开 const object `RuntimeUpdateStrategy`及其`RuntimeUpdateStrategyValue`。`RuntimeProgramContext`增加当前 invocation 的`execution: 'full' | 'incremental' | 'fallback'`，让 Program 对 forced full 与安全失败 fallback 使用准确 trace；它不允许 callback 改写调度结果。

Runtime Session 的策略在创建时复制并固定。`full` 只改变有实际依赖变化的 Program：无关 Program 仍复用 committed artifact，continuous participant 仍按既有规则推进 revision。Program graph 中任一 upstream full 仍使依赖 Program full；invalid ChangeSet 仍标为 fallback，不被 forced full 隐藏。

`auto | full` 是 Runtime 为保证 transaction、invalid-hint fallback precedence 与 Program graph propagation 而拥有的封闭调度枚举，不接受第三方注册任意 strategy；开放 Program 继续统一通过 `defineRuntimeProgram()`接入。`static | retained`同样只是 adapter 对两条既有宿主生命周期的封闭选择，不是绘图能力或可注册 provider；第三方 renderer 仍只通过现有 `RetainedRendererFactory`进入 retained 分支。

Render participant 将直接收到的独占 `replaceScene` 记录为 `full` work；renderer capability 把原局部 Patch 扩大成 replace 时仍记录 `fallback`并产生既有 warning；规范局部 Patch继续记录`incremental`。三种结果都必须与 next完整Snapshot 等价。

## Adapter 表面

### React

```tsx
<Layout runtime={{ mode: 'static' }} />

<Layout runtime={{ mode: 'retained', updateStrategy: 'full' }} />

<Layout /> // retained + auto
```

React static 模式复用 retained 接入前的静态宿主链路：render 阶段完整 compile；SVG 由 React materialize Scene，Canvas 交给 `CanvasHost`。它保留现有 hydration、animation、artifacts 与 SSR 输出，但不提供 Runtime diagnostics 或第三方 retained renderer factory。`mode`跨 render 改变时卸载旧宿主并创建新宿主，不能把 retained 内部状态接入 static。

React retained 模式下 `updateStrategy` 跨 render 改变时，在同一 React host 上 dispose 旧 Session并以当前完整输入创建新 Session；revision从initial重新开始，artifacts、animation handle与diagnostics按新Session重新发布，宿主元素identity保持稳定。Vanilla mount 的strategy固定，改变时必须dispose并remount。

### Vanilla

```ts
mountSvg(container, ir, { runtime: { mode: 'static' } });
mountCanvas(container, spec, { runtime: { mode: 'retained', updateStrategy: 'full' } });
mountSvg(container, ir); // retained + auto
```

IR / plain spec 配 `mode: 'static'` 时，mount 与每次 `view.update(next)` 都经现有 normalization / `compileToScene` 后完整重绘，并返回 `mode: 'static'` view。与 retained view 一致，raw static view 的 update 统一接受 `IRScene | VanillaFigureSpec`，不锁死 initial 的具体 subtype。预编译 Scene 仍天然进入 static view，其 update 只接受 Scene，并继续拒绝整个 `runtime` 字段，调用方不需要重复声明 `mode: 'static'`。

Static没有candidate、commit或rollback。compile / normalization在宿主写入前失败时旧画面与公开getter保持不变；SVG / Canvas materialization、动画或hydration切换在写宿主期间失败时错误同步抛出，但不承诺恢复旧画面，调用方必须dispose并remount。文档不得把static描述为事务安全模式。

## Bench A/B 契约

Bench复用同一5000实体fixture，为SVG与Canvas分别增加三个稳定场景ID：

- `<backend>-policy-static-full-5000`
- `<backend>-policy-retained-full-5000`
- `<backend>-policy-retained-auto-5000`

`DeterministicBenchmarkResult`与budget增加可选、闭合的`execution`字段：

```ts
type BenchmarkExecution = Readonly<{
  mode: 'static' | 'retained';
  updateStrategy?: 'auto' | 'full';
  outcome: 'full' | 'incremental' | 'fallback';
  source: 'static-view' | 'runtime-trace';
}>;
```

Static场景的`full`来自公开`view.mode === 'static'`与static update完整重绘契约，source固定为`static-view`；retained场景必须从Runtime/Core/Render trace取得唯一outcome，source为`runtime-trace`，漏报或多报使场景失败。三路都与独立full oracle对账。

六个deterministic场景进入tracked`apps/bench/deterministic-baseline.json`，baseline逐字段对账execution；三组wall-clock会写入ignored report，用于手动A/B，但本ADR不把新场景加入`relativeGuards`，也不修改fingerprint timing baseline。待稳定样本人工审查后再独立批准timing gate，不能用当前机器一次结果直接冻结绝对预算。

## 测试设计

- Runtime：默认 auto 调用 Program update；full 跳过 update 并以 full outcome 调用 run；invalid strategy fail-loud；fallback 与 upstream full 语义不变；rollback、bailout、无关 Program 与 continuous participant 不退化。
- Core / Render：forced full 产出 replaceScene；Core trace 为 full；Render直接replace为full、capability扩大为fallback、局部Patch为incremental；三者均与完整Snapshot一致。
- React：缺省 retained + auto；static SVG / Canvas 不创建Session且与完整Scene输出等价；retained + full在更新时完整物化；mode切换释放旧宿主；static互斥字段拒绝。
- Vanilla：IR与plain spec的static mount/update完整重绘且保留root identity、runtimeMeta、artifacts、hydration与animation语义；retained + full保留事务；默认行为不变；预编译Scene继续拒绝runtime。
- Bench：同一场景显式运行 retained auto、retained full 与 static full，并按上述结构分别报告 execution outcome；deterministic进入tracked baseline，新增wall-clock仅进入ignored report。
- Docs：React / Vanilla 中英文包页面同步参数、默认值、内存与能力差异以及可运行示例。

详细行为、反例与最低测试层见 ignored 矩阵 `notes/plans/kernel-v0.5-alpha2-adr07/TEST_CONTRACT.md`。

## 实现摘要与验证

- Runtime公开`RuntimeUpdateStrategy`，Session在创建时固定`auto | full`；Program context准确区分`full | incremental | fallback`，invalid ChangeSet仍优先归为fallback。
- Core forced full发布独占`replaceScene`，Render区分直接replace full、局部incremental与capability fallback。
- React `<Layout>`与Vanilla raw-input mount对等支持static、retained full与默认retained auto；React strategy变化在同一host重建Session，Vanilla改变策略需dispose/remount。
- Bench为SVG/Canvas加入六个共享5000实体确定性场景与ignored wall-clock A/B；tracked baseline冻结execution来源与工作量，不扩张timing guard。
- React/Vanilla中英文包页面与v0.5 changelog已同步参数、默认值、内存/rollback差异及失败语义。

最终scoped验证通过：Runtime 175 tests、Core 2827 tests、Render 519 tests、React 442 tests、Vanilla 116 tests、Bench 46 tests；`bench:check`通过24项deterministic budget，docs完整性检查覆盖14个package页面并通过TypeScript检查。

## 影响

- `@retikz/runtime`新增领域中立 Session 调度策略及 Program invocation 可观察 execution，不依赖 Core / Render。
- `@retikz/core`只消费 execution 以区分主动 full 与 fallback，并继续以完整编译为真源。
- `@retikz/render`只校准 Scene materialization trace，不解释 adapter mode。
- React / Vanilla 对等暴露 mode 与 updateStrategy；默认行为、既有 IR、Scene schema 和 static SSR API 不变。
- 新增公开 options 与默认值，必须同步双语文档和 Bench A/B 场景。

## 能力完备性检查

- 所属能力域与能力面：不扩张 Drawing IR；属于 Runtime execution 与 adapter host lifecycle 的执行策略面
- 解决的问题：调用方无法区分无 Session static 执行与 retained Session forced-full 执行，也无法用公共契约做 A/B
- 主责包与协作包：`@retikz/runtime`拥有 Program update strategy；React / Vanilla拥有宿主 mode；Core / Render只消费执行结果
- 是否可由现有能力组合：static与retained路径均已存在，但缺少公共选择和Runtime forced-full调度，需扩展现有options而非新增平行pipeline
- 是否需要下沉到依赖能力域：updateStrategy下沉Runtime；mode不下沉Core，避免Core拥有宿主生命周期
- 内部表达链路：adapter mode选择既有static或Session路径；Session strategy选择Program run/update；Core产Patch；Render按Patch物化
- 外部扩展链路：第三方Program从统一context读取execution并继续由`defineRuntimeProgram`接入；第三方retained renderer继续消费同一replace/local Patch并由既有factory接入
- define-registry：不适用。strategy与mode是保护统一transaction/host分派的不开放闭合枚举，允许任意注册会破坏fallback precedence与adapter能力判别；开放执行单元仍复用既有Program definition和renderer factory
- 下游执行 / adapter 等价性：React与Vanilla同值、同默认值、同互斥规则；SVG与Canvas同时覆盖static、retained full与auto
- 不支持边界与诊断：不提供逐次update动态切换策略；不把full宣称为低内存；非法组合fail-loud；不改变SSR/预编译Scene入口
- 本轮结论：扩展既有Runtime Session contract与adapter宿主配置，Drawing IR / Scene schema不变

## 被否决的选项

1. 单一 `incremental: boolean`：无法说明false是否仍保留Snapshot与rollback，也无法表达static与retained full的内存差异。
2. 把两个字段放入 `RenderRuntimeConfig`：mode在renderer创建前决定是否存在Runtime，updateStrategy控制Program调度，Render不是所有者。
3. 只给Bench私有forced-full factory：产品调用方仍不能因内存或诊断需要选择执行方式，React / Vanilla继续不对等。

## 不在本 ADR 范围

- 逐次update切换auto/full；改变策略需dispose/remount
- 自适应内存阈值、自动从retained降为static
- `cachePolicy`图层复用、可信mutation log或Diff复杂度优化
- alpha.3 concurrent / progressive策略
- 保留旧写法的别名或额外boolean快捷字段
