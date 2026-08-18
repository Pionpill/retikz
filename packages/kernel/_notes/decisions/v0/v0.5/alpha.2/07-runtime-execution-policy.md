# ADR-07：Runtime 执行模式与更新策略

- 状态：Accepted
- 决策日期：2026-07-29
- 接受日期：2026-07-29
- 关联：[ADR-03](./03-program-transaction-lifecycle.md) · [ADR-04](./04-incremental-core-compile.md) · [ADR-05](./05-scene-patch-retained-renderer.md)

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

IR / plain spec 配 `mode: 'static'` 时，mount 与每次 `view.update(next)` 都经现有 normalization / `compileToScene` 后完整重绘，并返回 `mode: 'static'` view。与 retained view 一致，raw static view 的 update 统一接受 `IRScene | InputScene`，不锁死 initial 的具体 subtype。预编译 Scene 仍天然进入 static view，其 update 只接受 Scene，并继续拒绝整个 `runtime` 字段，调用方不需要重复声明 `mode: 'static'`。

Static没有candidate、commit或rollback。compile / normalization在宿主写入前失败时旧画面与公开getter保持不变；SVG / Canvas materialization、动画或hydration切换在写宿主期间失败时错误同步抛出，但不承诺恢复旧画面，调用方必须dispose并remount。文档不得把static描述为事务安全模式。

## 最终结果

- Runtime公开`RuntimeUpdateStrategy`，Session在创建时固定`auto | full`；Program context准确区分`full | incremental | fallback`，invalid ChangeSet仍优先归为fallback。
- Core forced full发布独占`replaceScene`，Render区分直接replace full、局部incremental与capability fallback。
- React `<Layout>`与Vanilla raw-input mount对等支持static、retained full与默认retained auto；React strategy变化在同一host重建Session，Vanilla改变策略需dispose/remount。
- Bench 观测 retained/static 的 execution outcome，但不改变运行时契约或 timing gate

## 影响

- `@retikz/runtime`新增领域中立 Session 调度策略及 Program invocation 可观察 execution，不依赖 Core / Render。
- `@retikz/core`只消费 execution 以区分主动 full 与 fallback，并继续以完整编译为真源。
- `@retikz/render`只校准 Scene materialization trace，不解释 adapter mode。
- React / Vanilla 对等暴露 mode 与 updateStrategy；默认行为、既有 IR、Scene schema 和 static SSR API 不变。
- 新增公开 options 与默认值，必须同步双语文档和 Bench A/B 场景。

## 长期边界

- 逐次update切换auto/full；改变策略需dispose/remount
- 自适应内存阈值、自动从retained降为static
- `cachePolicy`图层复用、可信mutation log或Diff复杂度优化
- alpha.3 concurrent / progressive策略
- 保留旧写法的别名或额外boolean快捷字段
