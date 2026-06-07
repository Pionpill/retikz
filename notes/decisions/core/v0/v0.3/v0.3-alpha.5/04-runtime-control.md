# ADR-04：runtime 播放控制——rAF 时钟 + `trigger` 落地 + `{animate:false}`/reduced-motion + 静态截帧 `{at:t}`

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[v0.3-alpha.5 roadmap](./roadmap.md) · **前置**：[ADR-02 SVG 播放](./02-svg-playback.md)（CSS 自播 + WAAPI 描述）· [ADR-03 Canvas 播放](./03-canvas-playback.md)（`drawScene({time})` + `evaluateTrack`）· **复用**：[v0.3-alpha.3 水合](../v0.3-alpha.3/01-hydration.md)（rAF / 事件绑定 / DOM 挂载 runtime 基建——动画播放与水合同源、共用）

## 背景

ADR-02/03 让 SVG/Canvas **有能力**播放（给数据 / 给时刻就能出帧），但**谁来驱动**——起 rAF 时钟、按 `trigger` 决定何时播、读 `prefers-reduced-motion`、做静态截帧——这些有副作用、依赖 DOM / 环境，属 **runtime**（`@retikz/vanilla` / `@retikz/react`），不进纯 render 包。本 ADR 把这层接起来，复用水合（alpha.3）已有的 rAF / 事件 / 挂载基建。

## 决策：Canvas runtime 跑 rAF 调 `drawScene`，SVG 交互 track runtime 调 WAAPI；trigger / 降级 / 截帧统一在 runtime

### Canvas：runtime 拥有 rAF 时钟

- `mountCanvas` 返回的 view 加播放：检测 scene 有 `animations` 时起 **单条 rAF 循环**，维护一个 scene 级时钟 `time`，每帧 `drawScene(ctx, scene, { time })`（ADR-03）。
- 所有 track 共用这一个时钟（**共享时钟**）；per-track `delay` 在 `evaluateTrack` 内偏移——天然支持错峰编排。
- 全部 track 到时长尽头（无 `infinite`）→ 停循环、最后画一帧 settled；有 `infinite` → 持续。

### SVG：load 自播（CSS，无需 runtime），交互 track runtime 接 WAAPI

- `load` track：ADR-02 已编进 CSS、挂载即自播，runtime 不介入。
- `visible` / `manual` / `onEvent` track：runtime 读已挂载 DOM 元素上的 WAAPI 描述（ADR-02 挂的 data）→ 调 `element.animate(keyframes, timing)`，并按 trigger 接驱动（见下）。

### trigger 落地（SVG WAAPI + Canvas 通用）

| trigger | runtime 行为 |
|---|---|
| `load` | 挂载即播（SVG=CSS 自播；Canvas=rAF 立即起） |
| `visible` | `IntersectionObserver` 进视口才播（复用水合的根级观察） |
| `manual` | 不自动播；返回控制句柄 `{ play, pause, seek(t), cancel }`（WAAPI-like；Canvas 端控制 rAF 时钟） |
| `{ onEvent }` | 桥水合：按事件名（如 `'click'`）经 alpha.3 的事件委托绑定，命中即播 |

回调函数（onComplete 等）始终在 runtime 注册、**不进 IR**（与水合同源）。

### `{animate:false}` + `prefers-reduced-motion`

- runtime 统一关口：`options.animate === false` **或** `matchMedia('(prefers-reduced-motion: reduce)').matches` → 走静态：
  - SVG：传 `{ animate:false }` 给 `buildSvgDocument`/`renderToSvgString`（ADR-02）→ 不 emit CSS/WAAPI；
  - Canvas：只 `drawScene(ctx, scene)`（无 time）、不起 rAF。
- 即 ADR-01「三事一路」的 runtime 落地：不支持后端 / reduced-motion / `{animate:false}` 殊途同归到 base 静态。

### 静态截帧 `{ at: t }`（SSR 封面 / 导出 / Node）

- `renderToSvgString(ir, { at: t })`：用 `evaluateTrack`（ADR-03 共享引擎）算每条 track 在 t 的值，**作为静态属性写进 SVG**（无 CSS/WAAPI，纯静态一帧），供 SSR 封面 / 无 JS 环境。
- Canvas：`drawScene(ctx, scene, { time: t })` 本就是单帧（ADR-03）= 截帧。
- 截帧与「连续播放」共用 `evaluateTrack`，同 t 同帧。

### React 集成

- `<Layout>` 渲染含 animations 的 IR 时按 trigger 自动播（svg / canvas 双模）；`manual` 经 ref 暴露控制句柄；`animate={false}` prop 走静态。handler / 控制不进 IR。

理由：

1. **副作用归 runtime**——render 保持纯（drawScene 单帧 / svg 出描述），时钟与环境判断在 runtime，职责清。
2. **复用水合基建**——rAF / IntersectionObserver / 事件委托 / DOM 挂载 alpha.3 已有，动画播放与水合同源，不另起一套。
3. **三事一路落地**——`{animate:false}` / reduced-motion / 截帧共用 settled 路径与 `evaluateTrack`，与 ADR-01 一致。

## 实现说明（本批落地 / 与 ADR 草案的偏差 / 后续）

- **runtime 基建落 `@retikz/render/animation`（非 vanilla-local clock.ts）**：`createClock` / `prefersReducedMotion` / `bindWaapiDescriptors` / `sceneHasAnimations` / `sceneAnimationDurationMs` 放共享子路径，vanilla + react 共用一份——优于 ADR 草案里 vanilla 私有 clock.ts（否则 react 要再抄一遍）。clock onFrame 由各 adapter 注入（Canvas 调 `renderToCanvas({time})`）。
- **vanilla 已落地**：`mountCanvas`（含动画 → 起 rAF 共享时钟，load/visible 自动播、全 manual 不自动播、`view.animation` 句柄 play/pause/seek）；`mountSvg`（`{animate}` 透传 + 交互 track WAAPI 桥 + `view.animation`）；`renderToSvgString`（`{animate}` 透传）；`{animate:false}` / reduced-motion → 静态。
- **react 已落地**：`<Layout animate>` prop（false → 静态）；SVG 模式 load track 内联 CSS 自播（`buildSvgDocument` 默认开）、交互 track WAAPI 桥（`useSvgRootBinding` effect）。
- **后续（未在本批）**：① **SVG 静态截帧 `{at:t}`**（Canvas 截帧已由 `drawScene(…,{time:t})` 提供；SVG 需把某时刻值写成静态属性的 freeze 通路，留后续）；② **react canvas rAF 播放**（`CanvasHost` 接共享时钟）；③ **react manual `ref` 控制句柄**与 react 侧 `prefers-reduced-motion` 接线。这些不阻塞 SVG（react/vanilla）与 Canvas（vanilla）的完整播放。

## 不在本 ADR 范围

- **SVG / Canvas 出帧能力本体**：ADR-02 / ADR-03。
- **sugar 动词**（`fadeIn` 等）：react + 共享 parser，后续。
- **数据过渡 / morph**（`view.update(nextIr,{transition})` 的 diff + morph）：runtime + Tier 2，[v0.3 roadmap §动画 B](../roadmap.md)。
- **完整 timeline / sequence DSL**：本 ADR 只共享时钟 + per-track delay。

---

## 实现契约（必填）🔻

### Level

`red`

判级：动 `packages/core/vanilla/src/index.ts` + `packages/core/react/src/index.ts`（runtime 播放 API / props）→ red。

### 改动

| 文件 | 操作 | 内容 |
|---|---|---|
| `packages/core/vanilla/src/animation/clock.ts` | 新建 | rAF 时钟循环（start/stop/seek/pause），调 `drawScene({time})`；scene 级共享时钟 |
| `packages/core/vanilla/src/mountCanvas.ts` | 修改 | 检测 animations → 起 clock；trigger（load/visible/manual/onEvent）落地；返回控制句柄 |
| `packages/core/vanilla/src/mountSvg.ts` | 修改 | 交互 track 读 WAAPI 描述调 `element.animate` + trigger 绑定；load 由 CSS 自播 |
| `packages/core/vanilla/src/renderToSvgString.ts` | 修改 | 加 `{ at?: t }`（静态截帧，import `evaluateTrack` 自 `@retikz/render/animation`，ADR-03 建）+ `{ animate?: false }` 透传 ADR-02 |
| `packages/core/vanilla/src/reducedMotion.ts` | 新建 | `matchMedia('(prefers-reduced-motion: reduce)')` 判定 → 静态关口 |
| `packages/core/react/src/kernel/Layout.tsx` | 修改 | 双模按 trigger 自动播 + `animate` prop + `manual` 控制句柄（ref） |
| `packages/core/{vanilla,react}/src/index.ts` | 修改 | 导出播放控制 API / 句柄类型 |
| `packages/core/vanilla/tests/animation.test.ts` + `packages/core/react/tests/animation.test.tsx` | 新建 | 见测试象限 |

### 测试象限

**Happy（≥3）**：mountCanvas 含 animations → rAF 起、`drawScene` 收递增 time（fake timer + spy）；`load` 立即播、`visible` 进视口才播（mock IntersectionObserver）；`manual` 返回 `{play/pause/seek}` 句柄、seek(t) 出对应帧。
**边界（≥2）**：无 animations → 不起 rAF（零开销，回归现状）；全 track 有限时长跑完 → 停循环 + 末帧 settled。
**降级（≥2）**：`{animate:false}` → 不起 rAF / SVG 无 CSS、输出 = 静态 base；mock `prefers-reduced-motion: reduce` → 同静态路径。
**交互（≥2）**：`{at:t}` 截帧 SVG 静态属性 = Canvas `drawScene({time:t})` 同 t 视觉一致（共享 `evaluateTrack`）；`onEvent` track 经水合事件委托触发播放；react `<Layout animate={false}>` 走静态。

### 依赖的现有元素

- ADR-02 WAAPI 描述 + `{animate:false}` 入参；ADR-03 `drawScene({time})` + `evaluateTrack` —— **驱动**。
- alpha.3 水合：rAF / IntersectionObserver / 事件委托 / `mountSvg` / `mountCanvas` / hydrate —— **复用**：动画播放与水合同源、共用基建。
- alpha.1 `renderToSvgString` / `renderToCanvas` —— **扩展**：加 `{at}` / `{animate}`。
