# ADR-06：水合 handler runtime 上下文——`(event, ctx)` 富上下文（meta / 几何 / DOM / 动画控制），renderer 无关

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[v0.3-alpha.5 roadmap](./roadmap.md) · **前置 / 复用**：[v0.3-alpha.3 水合](../v0.3-alpha.3/01-hydration.md)（handler 注册表 + 根级委托 + locate（svg closest / canvas hitTest），本 ADR 升级其 handler 签名与上下文）· [v0.3-alpha.4 ADR-08 meta](../v0.3-alpha.4/08-meta-provenance.md)（provenance 透传——本 ADR 是它的主要消费方）· [ADR-01 动画 IR](./01-timeline-animation-ir.md) / [ADR-04 runtime 播放](./04-runtime-control.md)（动画控制从 handler 触发的目标）

## 背景

alpha.3 的水合 handler 签名是 `(event: Event) => void`——只拿到原生 DOM 事件，**够不到任何 retikz 语义**：不知道命中图元的 `id` / `meta`（provenance）/ 类型 / 几何，也无法控制动画。于是两个真实诉求都做不到：

1. **回调读 provenance**：点中柱状图某根柱子，handler 想知道「这是哪个 datum / series」——alpha.4 建的 `meta` 透传正是为此，但 handler 拿不到。
2. **回调触发动画**：点击后想播放 / 重播某图元的动画（[ADR-04 §trigger](./04-runtime-control.md) 的 `{onEvent}` 只能让 track 自绑事件、不让 handler 内命令式决定）。

参照生态：**D3** 回调是 `(event, d)`（喂回绑定的 datum）；**Recharts / Visx** 喂聚合 `payload`；**Konva / Pixi** 的 `event.target` 是带几何 / 方法的**节点对象**；**LangChain** 的 tool 是 `(input, config)`——单一 `config` runtime 携带回调 / 元数据 / store，**只增不破**。retikz 是 renderer-agnostic + SVG(DOM) / Canvas(即时) 双后端，**没有统一节点对象**；本 ADR 用一个 runtime 上下文 `ctx` 在双后端上统一补齐「节点对象该有的东西」，扩展姿势抄 LangChain config。

## 决策：handler 升级为 `(event, ctx)`，ctx 是 renderer 无关的单一 runtime

### 签名（additive，非破坏）

```ts
type HydrationHandler = (event: Event, ctx: HydrationContext) => void;
```

- **加第二参，不动第一参**：现有 `(event) => …` / `() => …` handler 忽略 `ctx`、照常工作——零破坏。
- **用单一 `ctx` 而非 `(event, ctx, ref)` 三参**：`ref`（DOM 元素）只是 ctx 的一个字段。单 runtime 对象（LangChain config 同理）让「以后加能力」不动签名；位置参会把形态焊死。

### HydrationContext 形态

**ctx 是「按 id 聚合的语义元素」，不是命中的单个 primitive**（评审 P1-2）。compile 会把同一 user id stamp 到多个平铺 shape 图元（多图元 Node / custom shape）；canvas `hitTest` 也只返回 `string | null`（id），不返回 primitive。强行「按 id 反查一个 primitive」在多图元下取错 type / geometry、且 svg / canvas 不一致。故 ctx 表达的是**用户交互的那个语义元素**（由 id 标识），几何取**同 id 全部图元的并集**；不暴露单 primitive 的 `type`（多图元下无单一答案，且用户关心的是 meta / id / 几何，不是底层 shape 类型）。

```ts
type HydrationContext = {
  /** 命中的语义元素 id（user id）；同 id 的多个平铺图元聚合视为「一个元素」 */
  id: string;
  /** provenance：同 id 图元共享的 meta（认 datum / series / layer）；无 / 无 scene 时 undefined */
  meta?: IRJsonObject;
  /** 渲染后端 */
  renderer: 'svg' | 'canvas';
  /** 命中 DOM 元素：SVG = 被点中的那片 `data-retikz-id` 图元（多图元 Node 时是其中一片）；Canvas → null */
  element: Element | null;
  /** figure 根（svg root 或 canvas） */
  root: Element;
  /** 指针在 scene user units 的坐标（逆 meet-fit）；非指针事件 → null */
  point: { x: number; y: number } | null;
  /** 语义元素聚合几何（scene user units）：**同 id 全部图元的并集 bbox** + 中心；无 scene 时 undefined */
  geometry?: { bbox: { x: number; y: number; width: number; height: number }; center: [number, number] };
  /** 动画控制（缺省作用于命中元素；传 id 控别的元素）；无 runtime / scene 时各方法为 no-op */
  animation: HydrationAnimationControls;
  /** 当前 Scene：逃生舱；standalone `hydrate` 未传 scene 时 undefined */
  scene?: Scene;
};

type HydrationAnimationControls = {
  /** 播放 / 继续（manual track 或已暂停的） */
  play: (id?: string) => void;
  /** 暂停 */
  pause: (id?: string) => void;
  /** 从头重播 */
  restart: (id?: string) => void;
  /** 停止并回 settled 终态 */
  stop: (id?: string) => void;
  /** 跳到时刻（毫秒） */
  seek: (timeMs: number, id?: string) => void;
};
```

字段来源与 renderer 差异（`id → Array<prim>` 索引：Map 一个 id 到**全部**同 id 图元，geometry 取并集）：

| 字段 | SVG | Canvas |
|---|---|---|
| `id` / `meta` | Scene 按 id 索引（meta 取首个同 id 图元，同 id 共享）（**双后端一致**） | 同 |
| `geometry` | 同 id 全部图元的**并集 bbox** + 中心（双后端一致） | 同 |
| `element` | 被点中的那片 `[data-retikz-id]` DOM 元素 | `null`（无逐元素 DOM；用 `root` + `point`） |
| `point` | 事件坐标（必要时逆 viewBox） | 已有 `clientToScene` 逆 meet-fit |
| `root` | svg root | `<canvas>` |
| `animation` | **per-id 强**：见下「动画 owner 标记」——查 `[data-retikz-id="<id>"]` **与** `[data-retikz-animation-owner="<id>"]` 全部命中元素的 `getAnimations()`，覆盖 CSS / WAAPI / transform-wrapper / 文本 group | **coarse**：scene 级单 rAF 时钟，per-id 控制为后续；本批 `restart` 走整图重渲染、其余降级 |

### 动画 owner 标记（评审 P1-1：transform / camera wrapper 没有 data-retikz-id）

SVG 动画把 **transform track 包到外层 `<g>` wrapper**（[ADR-02](./02-svg-playback.md)），wrapper 没有 `data-retikz-id`；文本 / rotate Node 的动画落 GroupPrim、camera 落 scene 根 wrapper。单查 `data-retikz-id` 元素的 `getAnimations()` 会**漏掉这些 wrapper 上的真 animation**，导致带 transform / manual 的节点 `restart()` 失效。

修正：**给承载动画的 wrapper `<g>` 打 owner 标记** `data-retikz-animation-owner="<元素 id>"`（仅当被包元素有 id）。`ctx.animation` 的 per-id 控制改为：在 root 下查 `[data-retikz-id="<id>"], [data-retikz-animation-owner="<id>"]` 的全部元素，聚合各自 `getAnimations()` 后 play / pause / cancel——一并覆盖元素本身的 CSS load 动画、WAAPI 交互动画、以及 wrapper 上的 transform 动画。camera（scene 根、无元素 id）属 scene 级、不走 per-element ctx.animation。

> 选 owner 属性而非「runtime registry（id→Animation[]）」：registry 只能登记 WAAPI（runtime 创建的），抓不到 CSS `@keyframes` load 动画；`getAnimations()` 同时返回 CSSAnimation + WAAPI，配 owner 属性定位最完整。

### 接线（renderer 无关控制器 + runtime 注入 ctx 工厂）

`createHydrationController(root, handlers, locate)` 增一个 **`buildContext(event, id) => HydrationContext`**：控制器命中 id 后恒 `handler(event, buildContext(event, id))`——**ctx 永远传入**（绝不 undefined），化解「`(event, ctx)` 必传 vs 退化只传 event」的类型冲突。ctx 的 Scene-派生字段（`meta` / `geometry` / `scene`）本就可选、animation 各方法在无 runtime 时 no-op，故「信息不全」表现为**字段缺省**而非「无 ctx」。

`buildContext` 由各 runtime 提供（持 Scene / renderer / root / `clientToScene` / 动画句柄）：

- **vanilla**：`mountSvg` / `mountCanvas` 在 `hydrate()` 时构造**富** `buildContext`（有 Scene）。
- **react**：`<Layout>` 的 svg 绑定 hook / `CanvasHost` 构造富 `buildContext`。

### standalone `hydrate(root, options)` 的能力边界（评审 P2）

vanilla 还有 SSR 后的独立入口 `hydrate(root, { handlers })`——它**没有 Scene**，给不出 meta / geometry / animation。处理：

- `hydrate` 入参扩为 `{ handlers, scene?, renderer? }`：**传 `scene`** → 富 ctx（meta / geometry / animation 全有）；**不传** → **最小 ctx**（`id` + `element` + `root` + `point` + `renderer`，`meta`/`geometry`/`scene` 为 undefined、`animation` no-op）。
- 文档明确：SSR 后只靠 DOM 水合、要富 ctx 须把 `scene`（或经 `toScene(ir)`）一并传给 `hydrate`。最小 ctx 仍满足「读 event / id / DOM」这类纯 DOM 交互。

### 与「回调触发动画」的配合

回调命令式播放通常配 **`trigger: 'manual'`** 的 track（不自动播，等 `ctx.animation.play()`）；`load` track 已自播、无需回调。典型：

**React**：

```tsx
<Node
  meta={{ series: 'sales', i: 3 }}
  animations={[{ ...pulse(), trigger: 'manual' }]}
  onClick={(event, ctx) => {
    console.log(ctx.meta);        // { series:'sales', i:3 }
    ctx.animation.restart();      // 点一下重播本节点的 pulse
  }}
/>
```

**Vanilla**（命令式 + standalone hydrate，两套 surface 对等）：

```ts
const view = mountSvg(container, ir);
view.hydrate({
  handlers: {
    bar3: { click: (event, ctx) => { console.log(ctx.meta); ctx.animation.restart(); } },
  },
});

// SSR 后 standalone：传 scene 才得富 ctx（meta / 几何 / 动画）
hydrate(root, { handlers, scene: toScene(ir) });
```

### Schema 改动

**无 IR schema 改动**。本 ADR 只动 **runtime / handler 公开契约**（handler 签名 + `HydrationContext` 类型 + 接线）；不增删 IR 字段（`meta` / `animations` 早在 ADR-08 / ADR-01 入 IR，本 ADR 仅在交互层消费）。

理由：

1. **meta 收割**：ADR-08 的 provenance 透传在交互层兑现——handler 拿 `ctx.meta` 认数据，是图表 hit-test / tooltip / 联动的基础。
2. **回调触发动画**：补齐 ADR-04 留的「handler 命令式控动画」缺口，且 renderer 无关（svg 强、canvas 降级）。
3. **单 runtime、只增不破**：抄 LangChain config——以后给 ctx 加字段（如 `ctx.tooltip` / `ctx.select`）不动 handler 签名。
4. **双后端统一**：canvas 无 DOM 节点对象，用 ctx 从 Scene 补 meta/几何/动画，使两后端 handler 写法一致。

## 不在本 ADR 范围

- **canvas 的 per-id 动画控制**（单 rAF 时钟拆 per-track 子时钟）：后续；本批 canvas `animation` coarse / 降级。
- **handler 改 IR / 触发重渲染**：那是 react state / vanilla `view.update(ir)` 的职责，不进 ctx（ctx 是只读 runtime + 动画控制，不背数据层）。
- **新事件类型**：沿用 alpha.3 的 `RetikzEvent` 集，不在此扩。
- **handler 返回值语义**（如返回 false 阻止默认）：暂不引入，handler 仍 `void`；要 preventDefault 用 `event`。

---

## 实现契约（必填）🔻

### Level

`red`

判级：动 `@retikz/render/hydration` 公开契约（handler 签名 + 新 `HydrationContext` 类型 + `createHydrationController` 入参）+ `@retikz/vanilla` / `@retikz/react` 的 handler 类型与接线 → red。

### 改动

| 文件 | 操作 | 内容 |
|---|---|---|
| `packages/core/render/src/hydration/events.ts` | 修改 | `ElementHandlers` 的 handler 类型 `(event, ctx) => void`；新增 `HydrationContext` / `HydrationAnimationControls` 类型 |
| `packages/core/render/src/hydration/controller.ts` | 修改 | `createHydrationController` 加可选 `buildContext`；`invoke` / 调用处 `handler(event, ctx)` |
| `packages/core/render/src/hydration/context.ts` | 新建 | **`id → Array<prim>` 索引**（同 id 聚合）+ 并集 `geometryOf(prims)` + meta 取首个 + `buildHydrationContext` 工厂骨架（renderer 无关：meta / geometry / scene 查询） |
| `packages/core/render/src/hydration/index.ts` | 修改 | 导出 `HydrationContext` / `HydrationAnimationControls` / 工厂 |
| `packages/core/render/src/svg/animation/keyframes.ts` | 修改 | **transform / 交互 wrapper `<g>` 打 `data-retikz-animation-owner="<id>"`**（被包元素有 id 时）——供 ctx.animation per-id 双查（评审 P1-1） |
| `packages/core/vanilla/src/mountSvg.ts` / `mountCanvas.ts` | 修改 | `hydrate()` 构造富 `buildContext`（svg：DOM 元素 + per-id owner 双查 `getAnimations` 动画控制；canvas：null element + clientToScene + coarse 动画） |
| `packages/core/vanilla/src/hydrate.ts` | 修改 | 入参扩 `{ handlers, scene?, renderer? }`：传 scene → 富 ctx；否则最小 ctx（评审 P2） |
| `packages/core/react/src/kernel/Layout.tsx`（svg 绑定）/ `render/canvasHost.tsx` | 修改 | 构造 `buildContext` 注入 `createHydrationController` |
| `packages/core/react/src/kernel/eventProps.ts` / `collectHydrationHandlers.ts` | 修改 | handler 类型同步 `(event, ctx)`（onClick 等 prop 类型） |
| 各包 `tests/` | 新建 / 扩 | 见测试象限 |

### 测试象限

**Happy（≥3）**：svg 点击带 id+meta 的图元 → handler 收到 `ctx.id` / `ctx.meta` / `ctx.element` / `ctx.geometry`；canvas 同点击 → `ctx.element===null` 但 `ctx.id`/`meta`/`geometry` 仍对；`ctx.animation.restart()` 在 svg 真重播。
**owner per-id 动画（评审 P1-1，≥2）**：带 **transform / manual** 动画的节点（动画在无 id 的 wrapper `<g>` 上）→ `ctx.animation.restart()` 经 `data-retikz-animation-owner` 命中 wrapper 的 animation 并重播（spy wrapper getAnimations / cancel+play）；纯 opacity（元素本身）动画同样命中。
**多图元聚合（评审 P1-2，≥2）**：多图元 Node（同 id 多个平铺 shape）→ `ctx.geometry.bbox` = 全部图元并集；svg 与 canvas 命中同一 Node 时 `ctx.geometry` / `ctx.meta` 一致（不取错单 prim）。
**边界（≥2）**：旧式 `(event) => …` handler 仍工作（忽略 ctx）；命中无 meta 的图元 → `ctx.meta === undefined`、不报错。
**standalone hydrate（评审 P2，≥2）**：`hydrate(root,{handlers})` 不传 scene → 最小 ctx（`meta`/`geometry`/`scene` undefined、`animation` no-op、不抛）；传 `scene` → 富 ctx（meta/geometry 到位）。
**降级（≥2）**：canvas `ctx.animation.play()` per-id 走 coarse / 文档约定（不抛）；`point` 在两后端都是 scene user units（逆 meet-fit 一致）。

### 依赖的现有元素

- alpha.3 `createHydrationController` / `locate`（svg closest / canvas hitTest）/ 根级委托 —— **升级**：调用处加 ctx。
- ADR-08 `ScenePrimitive.meta` + alpha.3 `id` stamp —— **消费**：ctx 从 Scene 按 id 取 meta / 几何。
- ADR-04 runtime 动画（`bindWaapiDescriptors` 的 WAAPI 句柄 / clock）—— **复用 / 细化**：ctx.animation 的 svg per-id 走 getAnimations，canvas 走 clock（coarse）。
- vanilla `clientToScene` / `mountCanvas` hitTest —— **复用**：ctx.point / canvas 命中。
