# ADR-02：`@retikz/canvas` Canvas 2D renderer + `@retikz/react` 的 `renderer="canvas"` 渲染模式

- 状态：Proposed
- 决策日期：2026-05-29
- 关联：[v0.3 roadmap §Canvas 包首版范围 / §React API 方向 / §待决策 2·10·11·12·13](../roadmap.md) · [v0 roadmap](../../roadmap.md) · [ADR-01 `@retikz/svg` descriptor 契约](./01-svg-descriptor-contract.md)(并列 renderer + react 接 svg) · [core-design.md §5 / §6](../../../../../architecture/core-design.md) · [tikz-gap-analysis](../../../../../analysis/tikz-gap-analysis.md)

> **备注（范围已扩，取代早期"骨架/不动 react"定位）**：本 ADR 覆盖 **Canvas renderer 端到端 + `@retikz/react` 经 `<Layout renderer="canvas">` 渲染 Canvas**,即把 roadmap 原 alpha.6(React 双渲染模式)与 alpha.7(Canvas MVP)的**核心**并入本条。与 ADR-01(react 接 `@retikz/svg`)对称:每条 renderer ADR 各自包含对 `@retikz/react` 渲染层的替换 / 接入。
>
> ⚠️ **alpha 位置**:本 ADR 的内容跨 roadmap alpha.6 / alpha.7,已超出 alpha.1。文件暂置于 `v0.3-alpha.1/`(延续本轮 ADR 编号),实现排期与是否迁目录见文末"影响"。

## 背景

v0.2 把 renderer-agnostic 的 Scene 契约打好,[ADR-01](./01-svg-descriptor-contract.md) 把 SVG 渲染抽成 `@retikz/svg`(走 `SvgNode` descriptor)并让 react 消费它。Canvas 是**第二条 renderer 路径**,它的价值在于验证 "同一份 Scene 能否同时服务声明式(SVG 产树)与命令式(Canvas 发命令)两种范式"。

roadmap §Canvas 包首版范围定了硬基调:**Canvas 不走 SVG 中转;SVG 与 Canvas 并列、共享上游 Scene,而非父子。** §React API 方向定了:**默认 `<Layout>` 仍渲染 SVG**(降低迁移成本),新增 `renderer="canvas"` 用**同一套 Kernel / Sugar JSX 构 IR,只在最终 Scene 渲染阶段切换输出目标**。

关键差异决定 canvas 包形态与 svg 完全不同:SVG 声明式(产 descriptor → DOM / 字符串,可比对 / 序列化 / 水合);Canvas 2D 命令式(对 `CanvasRenderingContext2D` 顺序调 `fill` / `stroke` / `save` / `restore`)。所以 **Canvas 不产 `SvgNode` descriptor、无中间树**——遍历 Scene 直接发绘制命令。

本 ADR 现包含 react 接 canvas,因此 react 要能**真的**经 canvas 渲染出图;故 `@retikz/canvas` 首版即实现**核心 primitives 的绘制**,高级 paint / clip / marker 走可诊断降级(见决策与范围)。

## 选项

> 两个决策维度:① `@retikz/canvas` 公开 API(对应待决策 #2);② react 怎么切到 canvas 渲染(对应待决策 #10)。

### A. 无状态 `(ctx, scene)` 绘制 + react `renderer` prop 切换（**推荐**）

```ts
// @retikz/canvas —— 纯函数,消费已编译 Scene,命令式画到 2D context
drawScene(ctx: CanvasRenderingContext2D, scene: Scene, options?: DrawOptions): void;
// 便利:取 ctx + DPR/viewBox transform + clear,再 drawScene
renderToCanvas(canvas: HTMLCanvasElement, scene: Scene, options?: RenderOptions): void;
```

```tsx
// @retikz/react —— 同一套 JSX 构 IR,末端切渲染目标;默认 svg 不变
<Layout renderer="canvas">...</Layout>   // canvas 路:react 管 <canvas>,ref + effect 调 renderToCanvas
<Layout>...</Layout>                      // 缺省 = svg(ADR-01 路径,现有用户无感)
```

- `@retikz/canvas` **不持画布、不 compile、不持状态**;消费**已编译 Scene**(与 ADR-01 / svg 对称,`compile` 留 core / runtime)。
- react canvas 路与 svg 路**共用同一 `compileToScene` + 同一 `browserMeasurer`** → 产**同一份 Scene** → 两 renderer 天然等价(这是多 renderer 验证的核心)。react 只在"拿到 Scene 之后"分叉:svg 走 `buildSvgDocument`,canvas 走 `renderToCanvas`。
- react 用 `renderer` prop(非新增 `<SvgLayout>` / `<CanvasLayout>` 组件,待决策 #10 倾向)。

### B. canvas 包接收 IR、自己 compile + 绘制

`renderToCanvas(canvas, ir)` 内部 compile。代价:`compileToScene` + measurer 进 canvas 包,与 svg 不对称、复制 compile 责任、且 react 与 canvas 两处 compile 难保 Scene 一致。否决。

### C. 有状态 `CanvasRenderer` 对象

`new CanvasRenderer(canvas).render(scene)` 持 ctx + 状态。为后续 dirty-rect / layer 预留载体,但首版即引入状态,违背"renderer 无状态"边界(ADR-01 同立)。否决其作首版形态;增量 / 对象式留 v0.4+。

## 决策：选 A

理由：

1. **与 ADR-01 对称**:renderer 消费已编译 Scene、纯函数无状态;react 两条路共用 compile + measurer,**同 Scene 才有真等价**,也才对得起"多 renderer 验证"的目标。
2. **贴合 Canvas 2D 命令式本质**:`drawScene(ctx, scene)` 顺序发命令、不产中间树,与 svg 的 descriptor 刻意对照。
3. **默认 svg、`renderer` 切换最小侵入**:现有用户零改动;canvas 是 opt-in。不引入并列组件,API 面更小(待决策 #10)。

### 首版绘制范围(MVP 线)与降级

本 ADR 首版 `drawScene` **必须真实绘制**的核心集:

- primitives:`rect` / `ellipse` / `path` / `text` / `group`;
- group `transform`(`save`/`setTransform`/`restore`)、`opacity`、`stroke`、`fill`(**纯色** + `context-stroke` 等价)、`dashPattern`、line cap / join、fill-rule。

**首版走"明确可诊断降级"**(承 roadmap 验收"每项要么明确实现、要么明确可诊断降级"):

- paint:`linearGradient` / `radialGradient` / `pattern` / `image` —— 首版未实现则**降级为不绘制该 fill / 退回纯色,并经 dev 警告标明**(不静默);完整 Canvas 等价物(`createLinearGradient` / `createPattern`)细化后续(待决策 #12)。
- `clip`(`ctx.clip()`)、`marker` / arrow 的 Canvas 绘制 —— 同上,首版可降级 + 警告。

> 不允许"调用成功但静默不画"——任何未支持能力必须 dev 可见。

## 待决策点

- **DPR / 坐标变换 / 位图尺寸**：`renderToCanvas` 用 `devicePixelRatio`(`options.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1`)缩放 + Scene `layout` / viewBox → 画布像素 transform + `clear`。首版**不改写 `canvas.width|height`**(caller 拥有位图尺寸,react canvas 路在 effect 里据容器尺寸设);具体 fit / letterbox 策略首版取"撑满目标位图"。
- **`RenderOptions` / `DrawOptions`**：首版 `RenderOptions = { clear?: boolean; devicePixelRatio?: number }`(`clear` 默认 `true`);`DrawOptions` 预留(后续放降级开关等)。
- **文本测量(待决策 #11)**：react canvas 路**复用现有 `browserMeasurer`** 做 compile(与 svg 路同测量器,保等价),**不**用 `ctx.measureText` 以免两 renderer Scene 漂移;`drawScene` 收已编译 Scene 不测量。是否为非 react 环境(如纯 canvas / 未来 SSR）抽 measurer 公共接口,后续定。
- **react `<canvas>` 生命周期**：canvas 路用 `useLayoutEffect`(或 `useEffect`)在 ref 就绪后 `renderToCanvas`;props / IR 变化时重绘(全量);卸载时无需特殊清理(无持有状态)。细节实现期定。
- **高级 paint / clip / marker 补全(待决策 #12)**：首版降级项的逐个补全排期,后续 ADR / 本 ADR 加条。
- **canvas 依赖状态(待决策 #13)**：`@retikz/react` 直接依赖 `@retikz/canvas` vs 作 optional peer 控安装体积——归 **ADR-03(依赖图)**;本 ADR 暂按直接依赖写,留 ADR-03 收口。

## DSL 表面

```tsx
// 默认 svg —— 现有用户零改动
<Layout>
  <Node id="a" position={[0, 0]}>a</Node>
</Layout>

// 切 canvas —— 同一套 JSX / IR,只换输出目标
<Layout renderer="canvas" width={400} height={300}>
  <Node id="a" position={[0, 0]}>a</Node>
</Layout>
```

```ts
// 低层(非 react / 测试 / 未来 vanilla):自己拿 ctx 或 canvas
import { drawScene, renderToCanvas } from '@retikz/canvas';
drawScene(ctx, scene);
renderToCanvas(canvasEl, scene);
canvasEl.toBlob(blob => { /* 导出 */ });
```

## 测试设计

`packages/canvas/tests/**` + `packages/react/tests/**` 覆盖:

- `drawScene` 对核心 primitives 发出的 Canvas 命令(spy ctx 断言 fill / stroke / path / transform 顺序)
- `renderToCanvas` 的 ctx 获取 / DPR / clear / viewBox transform
- 高级 paint / clip / marker 的**可诊断降级**(dev 警告 + 不静默)
- react `<Layout renderer="canvas">` 挂 `<canvas>` 并完成一次绘制;`renderer` 缺省仍 svg(ADR-01 路径不回归)
- 等价性:同 IR 下 svg 路与 canvas 路经**同一 Scene**(同 `browserMeasurer`)

具体 case 见"实现契约 § 测试象限"。

## 影响

- **新增 `@retikz/canvas` 包**(`packages/*` glob 已覆盖,**无需改 `pnpm-workspace.yaml`**:Canvas 2D 类型走 `lib.dom.d.ts`,但需本包 `tsconfig.json` 显式开 DOM lib)。`dependencies` 仅 `@retikz/core: workspace:*`。
- **改 `@retikz/react`**:`Layout` 新增 `renderer?: "svg" | "canvas"`(默认 `"svg"`,**additive、无 breaking**);新增 canvas 渲染分支(管 `<canvas>` + effect + `renderToCanvas`);`package.json` 加 `@retikz/canvas` 依赖。svg 路径(ADR-01)不变。
- **不动 `packages/core`**(无 IR / schema 改动);**`@retikz/canvas` 不依赖 `@retikz/svg`**(Canvas 不走 SVG 中转)。
- **公开 API**:新增 `@retikz/canvas` 的 `drawScene` / `renderToCanvas` / options 类型;`@retikz/react` `Layout` 加 `renderer` prop。
- **alpha 排期**:本 ADR 内容对应 roadmap alpha.6 + alpha.7 的核心。实现时若仍想保留 roadmap 的"SVG 优先、Canvas 靠后"节奏,可把本 ADR 的**实现**拆到 alpha.6 / alpha.7 落地,但**决策在此一次定清**。文件是否从 `v0.3-alpha.1/` 迁到 `v0.3-alpha.6/` 或 `alpha.7/` 待定(本轮先按编号留此)。
- **无 breaking**:canvas 包纯新增;react `renderer` 默认 svg。

## 不在本 ADR 范围

- 高级 paint(gradient / pattern / image)、clip、marker / arrow 的**完整** Canvas 实现(首版仅降级 + 警告)→ 后续细化(待决策 #12)。
- Node canvas / `@napi-rs/canvas` 服务端 Canvas 导出 → alpha.7+ / 单独入口。
- 新增 `<SvgLayout>` / `<CanvasLayout>` 显式组件 → 暂只用 `renderer` prop(待决策 #10);如需另议。
- `@retikz/vanilla` 的 `mountCanvas`、跨包依赖图、canvas 是否 optional peer → **ADR-03**(待决策 #3 / #4 / #13)。
- layer canvas / dirty rect / hit-test / 增量渲染 → v0.4+。
- Canvas 事件 / 水合(canvas 无 DOM 图元,走 hit-test,roadmap 列 SVG 水合优先)→ 后续。

---

## 实现契约（必填）

> 下游 implement / test / document / wrapup 严格按此执行,偏离需开新 ADR 或本 ADR 加条重审。

### Level

`red`

判级规则:新建 `packages/canvas/src/index.ts` 命中 red(`packages/*/src/index.ts` 新公开 API 表面);同时动 `packages/react/src/{kernel}/**`(yellow)、`Layout` 公开 prop(react 包 API 表面变更)。跨级取最高 → **red**。不动 `packages/core`(非 core IR 改动)。

### Schema 改动

无。不新增 / 不修改任何 `packages/core/src/ir/**` 字段或 zod schema。`@retikz/canvas` 只消费已编译 `Scene`;`Layout` 的 `renderer` 是 react prop、非 IR、不持久化。

### 文件 scope

新建(`@retikz/canvas`):

- `packages/canvas/package.json`（`dependencies`: `@retikz/core: workspace:*`)
- `packages/canvas/tsconfig.json`（`extends ../../tsconfig.json`,`lib: ["ESNext", "DOM"]`——根 tsconfig 仅 `ESNext` 无 DOM;同 `packages/react`)
- `packages/canvas/vite.config.ts`（dts / build / test,对齐现有包)
- `packages/canvas/src/index.ts`
- `packages/canvas/src/types.ts`（`DrawOptions` / `RenderOptions = { clear?: boolean; devicePixelRatio?: number }`)
- `packages/canvas/src/drawScene.ts`（核心 primitives 命令式绘制 + 高级能力可诊断降级)
- `packages/canvas/src/renderToCanvas.ts`（getContext + DPR + viewBox transform + clear + drawScene)
- `packages/canvas/tests/draw.test.ts` / `render.test.ts` / `degrade.test.ts`

修改(`@retikz/react`):

- `packages/react/src/kernel/Layout.tsx`（加 `renderer?: "svg" | "canvas"` prop;canvas 分支:`compileToScene`(同 `browserMeasurer`)→ 管 `<canvas>` ref + effect → `renderToCanvas`;svg 分支不变)
- `packages/react/src/render/canvasHost.tsx`（新建:react `<canvas>` 宿主组件 + effect 调用绘制)
- `packages/react/package.json`（加 `@retikz/canvas: workspace:*` 依赖)
- `packages/react/tests/renderer-canvas.test.tsx`（新建:canvas 模式挂载 + 绘制 + 默认 svg 不回归 + 双路同 Scene)

不在白名单:`packages/core/**`、`packages/svg/**`、`pnpm-workspace.yaml`。偏离需在本段加条目并自注解,或开新 ADR。

### 测试象限

至少 9 个 case,四象限分布:

**Happy path（≥ 3）**：

- `draw-core-prims`：含 rect / path / text 的 Scene → `drawScene` 对 spy ctx 发出对应命令(`fillRect` 或 `fill` after path、`stroke`、`fillText` / 文本绘制),顺序与 Scene 一致。
- `render-to-canvas-frame`：`renderToCanvas(canvas, scene)` → `getContext('2d')` 被调、按 DPR `setTransform`、`clearRect` 一次、再绘制。
- `react-canvas-mode-mounts`：`<Layout renderer="canvas">` → 渲染出 `<canvas>` 元素,effect 后对其 2D ctx 完成一次绘制(spy / mock ctx 断言被画)。

**边界（≥ 2）**：

- `default-renderer-is-svg`：`<Layout>`(无 `renderer`)→ 仍走 ADR-01 SVG 路径,产 `<svg>`,canvas 分支不触发(防默认行为回归)。
- `empty-scene-canvas`：空 Scene → `renderToCanvas` 仅 clear、无绘制命令,不抛。

**错误路径（≥ 2）**：

- `no-2d-context`：`getContext('2d')` 返回 `null` → `renderToCanvas` throw 可诊断错误,不静默。
- `unsupported-paint-degrades`：`fill` 为 gradient / pattern(首版未实现)→ **不静默**:降级(退纯色 / 跳过)+ dev 警告,`drawScene` 不抛崩。

**交互（≥ 2）**：

- `svg-canvas-same-scene`：同一 IR,svg 路与 canvas 路经 `compileToScene`(同 `browserMeasurer`)得**同一 Scene**(断言 Scene 相等),证明两 renderer 上游一致。
- `no-svg-roundtrip / core-only-dep`：架构守卫——`@retikz/canvas` 不依赖 `@retikz/svg`、无 SVG 字符串中转、运行时依赖仅 `@retikz/core`(import / package.json 断言)。

### 依赖的现有元素

- `Scene` / `ScenePrimitive` / `SceneResource` / `PaintValue` / `ClipShape` / `ArrowEndSpec` / `MarkerPrimitive`（`@retikz/core`）—— 仅引用(`drawScene` 读 Scene)。
- `compileToScene`（`@retikz/core`）—— **非** canvas 依赖;由 `@retikz/react`(canvas 路)调用,与 svg 路共用。
- `browserMeasurer`（`packages/react/src/render/browser-measurer.ts`）—— react canvas 路复用,保两 renderer Scene 一致。
- `Layout`（`packages/react/src/kernel/Layout.tsx`）—— 扩 `renderer` prop + canvas 分支。
- `CanvasRenderingContext2D` / `HTMLCanvasElement`（`lib.dom.d.ts` 内置）—— 引用,需 `packages/canvas/tsconfig.json` 加 `lib: ["ESNext", "DOM"]`,无需 `@types`。
- `@retikz/svg`—— **明确不依赖**(Canvas 并列、不走 SVG 中转)。
