# ADR-02：Canvas 动画触发桥——复用 per-id 虚拟时钟，补 onEvent / visible 接线与隔离测试

- 状态：Accepted
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md) TODO-2 · **直接前置（还账）**：[v0.3-alpha.5 ADR-04 runtime 播放控制](../alpha.5/04-runtime-control.md) `§实现说明 → 后续（未在本批）` ②③——本 ADR 就是兑现那两条 · **机制基座**：[v0.3-alpha.5 ADR-03 Canvas 播放](../alpha.5/03-canvas-playback.md)（`drawScene(ctx, scene, { time })` 单帧求值 + 共享 `evaluateTrack`）· [v0.3-alpha.3 水合](../alpha.3/01-hydration.md)（rAF / IntersectionObserver / 事件委托 / DOM 挂载 runtime 基建）· [v0.3-alpha.1 ADR-02 Canvas renderer](../alpha.1/02-canvas-renderer-and-react-canvas-mode.md)（meet-fit 坐标映射矩阵）

## 背景：这不是新提案，是 alpha.5 显式记下的欠账

alpha.5 已把时间轴动画做完：IR 持 `AnimationTrack`，SVG 端 `load` 走 CSS 自播、`visible`/`manual`/`{ onEvent }` 走 WAAPI 触发桥；Canvas 端 `drawScene(..., { time })` 能逐帧求值、runtime 起 scene 级共享 rAF 时钟驱动。

但 alpha.5 ADR-04 在 `§实现说明 → 后续（未在本批）` 里**白纸黑字留了两条 Canvas 欠账**：

> ② canvas 的 per-track visible/manual/onEvent 触发（需 per-track 子时钟 / 视口·事件接线）；③ react manual per-element `ref` 控制句柄

并在 `§trigger 落地` 表里写明 Canvas 当前对非自动播 track 的处理是「**渲染 base**」——`applyPrimAnimations` 按 `isAutoplayTrigger` 过滤，只施加 `load`/缺省 track，`visible`/`manual`/`{ onEvent }` 一律不施加。本 ADR 不开新功能，只把这两条欠账在 beta.1 收口。

## 现状对账：per-id 时钟已存在，本 ADR 不重造

SVG 能逐元素触发，是因为它是 **retained DOM**——每个 primitive 是一个 `<g>`/`<path>`，runtime 可对单个元素 `element.animate()`、各挂各的 WAAPI 时间线、IntersectionObserver 观测各自的盒子。

Canvas 是 **即时模式**：alpha.5 ADR-03/04 确立的模型是**一条 scene 级共享 rAF 时钟 + 逐帧重绘整个 scene**，没有 per-prim DOM 节点可挂。所以非自动播触发的真问题不是「接个回调」，而是：

1. **被触发的语义元素需要自己的本地时间原点**（被激活那一刻 = 它的 t=0），而画面只有一个全局 master time。
2. **激活态必须活在 runtime、绝不进 IR**（IR 须 100% JSON 可序列化，且与水合同源——handler / 控制句柄历来不进 IR）。
3. **没有 per-prim DOM**，`visible` 不能直接用 IntersectionObserver 观测子区域，得靠 meet-fit 矩阵把 prim 几何盒映射到 client 坐标自行做视口判定。

当前代码已经有一层 Canvas per-id 虚拟时钟：

- `@retikz/render/animation` 的 `IdClockRegistry`：记录 id 的 `offset` / `pausedAt` / `active` / `stopped`。
- `drawScene` 的 `resolvePrimAnimation(id)`：把全局帧时刻折算为该 id 的有效时刻，并用 `includeNonAutoplay` 控制是否施加 `manual` / `visible` / `{ onEvent }` track。
- hydration context 的 `ctx.animation`：Canvas 侧已通过 `createCanvasIdAnimationControls` 暴露 per-id play / pause / restart / stop / seek。

因此本 ADR **不再新增 per-track registry**。在现有公开/内部接口下，`drawScene` 只能按 primitive id 解析时间，无法无 API 变更地给每条 track 单独传本地时间。beta.1 先保持 per-id 粒度：同一 id 下被激活时，非自动播 track 共享该 id 的本地时钟；同时补齐 `{ onEvent }` / `visible` 的触发接线和隔离测试。

## 决策：复用 per-id 虚拟时钟，在共享 rAF 里激活非自动播 track

**不新增 IR 字段**；只在 `@retikz/render/animation` runtime 与 canvas 渲染层复用既有「激活态 + 本地时间」，补齐事件 / visible 接线与回归测试。

### 1. per-id 激活态（runtime 态）

runtime 继续维护 `IdClockRegistry`：

- 自动播 track（`load`/缺省）不依赖 `active`，继续走 master time / id effective time。
- 非自动播 track 默认 `active=false`（= 渲染 base，与现状一致）。
- `ctx.animation.play(id)` / `restart(id)` / `seek(id)` 或事件 / visible 触发命中 id 后，把该 id 置为 active，并通过 `offset` 把本地时间从触发点开始计算。

### 2. `applyPrimAnimations` 保持「autoplay ∪ 该 id 已激活」

每帧对每个 prim：

| track 触发类型 | 喂给 `evaluateTrack` 的时间 | 未满足时 |
|---|---|---|
| `load` / 缺省（autoplay） | 该 id 的 effective time（无 entry 时等同 master time） | —— |
| `manual` / `visible` / `{ onEvent }` | 该 id 的 effective time | `includeNonAutoplay=false` → 跳过，渲染 base |

`evaluateTrack`（alpha.5 ADR-03 共享引擎）零改动；`applyPrimAnimations` 不新增 trackKey 参数，继续吃 `includeNonAutoplay`。如后续确实需要同一 id 下多条 `manual` track 彼此独立启动，再单独升级 `resolvePrimAnimation` / `applyPrimAnimations` 的 per-track API，不能在本批暗改。

### 3. 三类触发源的接线

| trigger | Canvas 激活来源（本 ADR 落地） | 复用 |
|---|---|---|
| `manual` | handler context 的 `ctx.animation.play(id?)` / `restart(id?)` 激活该 id；`view.animation` / React `animationRef` 仍是 scene 级 clock，不在本 ADR 中改成 per-id API | 现有 `createCanvasIdAnimationControls` + alpha.5 scene clock |
| `{ onEvent }` | hydration 事件委托命中 id → 自动激活该 id 的 onEvent track，再调用用户 handler | alpha.3 事件委托绑定（与 SVG 桥同一事件源） |
| `visible` | runtime 用 meet-fit 矩阵把 prim 几何盒映射到 canvas client rect，做视口相交判定（rAF 内或 scroll/resize 触发）；命中即激活 | alpha.1 meet-fit 矩阵 |

`manual` 的 per-id 控制优先落在 handler context（`ctx.animation`）这一既有水合面；组件外命令式控制仍通过 scene 级 `animationRef` / `view.animation` 驱动整图 clock。本批不新增 `view.animation.forId(...)` 之类顶层 API，避免把 beta parity 修复扩大成新公开面。

### 4. `visible` 的降级（兑现 alpha.5「三事一路」契约）

- 浏览器有 `window` + 布局 → 视口判定生效。
- 无 DOM / SSR / Node 截帧 → **不自动触发 `visible`，渲染 base**（不崩）。这与 alpha.5 ADR-04「不要求 SSR / 无 DOM 环境自动触发 visible」一致，也与 ADR-01「三事一路」（不支持后端 / reduced-motion / `{animate:false}` 殊途同归到 base）同源。
- `prefers-reduced-motion` / `{ animate:false }` 仍走 alpha.5 既有统一关口：不起 rAF、只画一帧 base，本 ADR 的激活注册表整体不参与。

理由：

1. **per-id 虚拟时钟是当前接口下的最小等价物**——画面只有一条 master 时钟，靠「effective time = master − offset」在同一帧里让各语义元素各按各的进度求值；这是 SVG per-element WAAPI 在 Canvas 上的近似等价物。
2. **激活态归 runtime、不碰 IR**——与水合 / handler 历来同源，保 IR 纯 JSON、保 SVG↔Canvas 同一份 tracks。
3. **复用既有基建防重造**——`IdClockRegistry` / `resolvePrimAnimation`、`evaluateTrack`（ADR-03）、事件委托（alpha.3）、meet-fit（alpha.1）、scene 级时钟（ADR-04）全部复用，本 ADR 只加「事件/visible 激活接线 + 测试补齐」。

## 影响范围

- `packages/core/render/src/animation/*`（复用 `IdClockRegistry`；必要时补视口判定 helper，不新增 per-track registry）
- `packages/core/render/src/canvas/*`（维持 `resolvePrimAnimation(id)` / `includeNonAutoplay` 契约，补必要回归测试）
- `packages/core/react/src/render/canvasHost.tsx`（事件命中激活、视口接线）
- `packages/core/vanilla/src/mountCanvas.ts`（事件命中激活、视口接线；不改变 `view.animation` 的 scene 级含义）
- `packages/core/react/tests/animation.test.tsx`、`packages/core/vanilla/tests/animation.test.ts`
- 视需要补 hydration canvas 交互测试

## 非目标

- 不新增 timeline / sequence DSL（本 ADR 只共享时钟 + per-id 激活）。
- 不做数据过渡 / morph（runtime + Tier 2，见 v0.3 roadmap §动画 B）。
- 不把 `visible` 判定 / 激活态写进 core schema（runtime 专属）。
- 不要求 SSR / 无 DOM 环境自动触发 `visible`。
- 不引入 per-prim canvas 子 DOM（坚持单 canvas 即时模式）。
- 不新增 per-track resolver / trackKey runtime API；同一 id 下多条非自动播 track 独立启动后置。
- 不新增 `view.animation.forId` / `animationRef` per-id 顶层公开 API；handler context 的 `ctx.animation` 已承担 per-id 控制。

## 测试要求

- Canvas `load` track 仍按现状自动 rAF 播放（回归不变）。
- Canvas `manual` track 默认 inactive 渲染 base；调 `ctx.animation.play()` / `restart()` 后按 id effective time 施加，`pause`/`seek` 生效。
- Canvas `{ onEvent }` track 在 hydration 事件命中后激活，其本地 t=0 对齐命中时刻。
- Canvas `visible` 在有 `window`/布局的环境下进视口才激活；无 DOM 时不崩、渲染 base。
- 同一 prim 同时挂 `load` + `manual` 两条 track 时，`manual` 不随 `load` 泄漏自动跑（非自动播隔离）。
- 同一 id 下多条非自动播 track 当前共享 id effective time；测试需锁定该边界，避免误写成未承诺的 per-track 独立时间轴。
- SVG 既有动画测试全绿。

## 文档要求

- 动画文档明确「SVG / Canvas 触发行为一致边界」：两模 `manual`/`visible`/`{ onEvent }` 语义对齐，差异只在实现机制（WAAPI vs Canvas per-id 虚拟时钟）。
- 写清无 IO / SSR 下 `visible` 的降级方式（渲染 base）。
- 文档区分 scene 级 `animationRef` / `view.animation` 与 handler context 的 per-id `ctx.animation`。

> 实现指针：最终 schema / 类型 / 行为以代码为准。本 ADR 的「激活注册表 / 句柄」字段名为设计草案，施工时以实际导出为准。
