# ADR-01：水合（hydration）—— SVG + Canvas 统一事件绑定

- 状态：Accepted（已实现，2026-06-05；core IRPath.id + 图元 id stamp / render data-retikz-id + hitTest + hydration 控制器 / vanilla hydrate + mountCanvas / react 事件 props + collectHydrationHandlers + 双模等价 / 文档全落地。Adversarial 两关：第一关修 1 BLOCKING（canvas enter/leave 改 pointermove 状态机）+ W1/I1；第二关 contract 对账无 BLOCKING）
- 决策日期：2026-06-04
- 关联：[v0.3 roadmap §水合 / §动画 / §Alpha 切分 alpha.3](../roadmap.md) · [core-design.md §4.4 IR 100% 可序列化](../../../../../architecture/core-design.md) · [alpha.1 ADR-01 svg descriptor](../v0.3-alpha.1/01-svg-descriptor-contract.md) · [alpha.1 ADR-02 canvas + react 双渲染](../v0.3-alpha.1/02-canvas-renderer-and-react-canvas-mode.md) · [alpha.1 ADR-03 vanilla runtime / 依赖图](../v0.3-alpha.1/03-vanilla-runtime-and-dependency-graph.md) · [alpha.2 ADR-01 Tier 2 支撑](../v0.3-alpha.2/01-tier2-support.md)

> **范围**：把 roadmap §水合 落地为**统一的事件绑定**——SSR / 静态先渲染出图，客户端再把用户 handler 绑回图元。**SVG 与 Canvas 一起做**（roadmap 已决：Canvas 不后置），共用同一套绑定语义，差异只在"如何把 pointer 事件定位到图元 id"这一定位层。函数（handler / 回调）**不进 IR**，只在 runtime；IR / Scene / renderer 只提供稳定的可定位挂点。**本 ADR 不做动画**（见 roadmap §动画，候选 v0.4，复用本段 runtime 基建）。

## 背景（2026-06-04 摸底）

- **`data-retikz-id` 尚未真正 emit**：全仓只在 notes / 本 roadmap 出现，`@retikz/render/svg` 的 `buildPrim`（`packages/core/render/src/svg/builders/prim.ts`）各分支的 `compact({...})` 里**没有**任何 id attribute。水合第一件事就是把它落地。
- **Scene 图元没有 id 通道**：`ScenePrimitive`（`packages/core/core/src/primitive/*.ts`，纯 TS type、非 zod）的 `RectPrim` / `EllipsePrim` / `TextPrim` / `PathPrim` / `GroupPrim` **都无 `id` 字段**。缺的是 compile 把 IR `id` 带到它 emit 的图元上。
- **IR 侧 id 不齐**（评审 P1.1）：Node（`ir/node.ts:114`「Optional unique id」）、Coordinate（`ir/coordinate.ts:19`，必填）、Scope（`ir/scope.ts:142`）**有** user `id`；但 **`PathSchema`（`ir/path/path.ts`）没有 `id`**，React `PathProps`（`kernel/Path.tsx`）也无 `id` prop。⇒ 要支持 Path 水合，须**新增 `IRPath.id`**——这是一处真正的 zod IR schema 变更（非"additive-only TS"），且触发文档同步。
- **Node emit 不总是 group**（评审 P1.2）：`emitNodePrimitives`（`compile/node.ts:671`）`needsGroup = rotateDeg≠0 || lines≠undefined`——**带文本 / rotate 才包单层 `GroupPrim`；纯几何 Node 直接平铺 shape 图元、无 group**。故"id 灌到 group"对纯几何节点不成立，须改为"灌到每个 top-level emit 图元"。Path 落成 `PathPrim`、Scope 落成 `GroupPrim`。
- **Coordinate 无视觉、不 emit 图元**（评审 P1.3）：`CoordinateSchema`（`ir/coordinate.ts`）是"命名点、不绘制"，compile 不为它产 ScenePrimitive ⇒ **无可点击面积，不能作 hit 目标**；首版不暴露 Coordinate handler。
- **drawScene 几何 helper 私有**（评审 P2.1）：`buildPath` / `roundedRectPath` / `pathCommand` / `applyClip`（`canvas/drawScene.ts`）是模块私有函数；hit-test 要复用须先抽成共享模块，不能复制几何逻辑。
- **SVG 挂载链路**：`buildSvgDocument` → `buildPrim`（renderer-neutral `SvgNode` descriptor）→ react 映射 React element / vanilla `svgNodeToDom` 物化 DOM（`packages/core/vanilla/src/{mountSvg,svgNodeToDom}.ts`）。SVG 图元是**真实 DOM**，可直接 `closest('[data-retikz-id]')` 反查。
- **Canvas 无逐图元 DOM**：`drawScene`（`packages/core/render/src/canvas/drawScene.ts`）即时模式逐 prim 绘制，关键——**每个 prim 都经 `ctx.beginPath()` + commands 构建路径**（`buildPath` / `roundedRectPath` / `ctx.ellipse`）。这给 hit-test 留了干净复用点：同一套几何构建 + 原生 `ctx.isPointInPath` / `ctx.isPointInStroke`，无需重写点测、无需离屏色拾取。
- **Canvas 挂载现状**：react `CanvasHost`（`packages/core/react/src/render/canvasHost.tsx`）已 `renderToCanvas`，含 dpr + meet-fit（位图按名义尺寸开、内容 fit 进去，镜像 SVG `preserveAspectRatio=meet`）；vanilla 仅 `Figure.toCanvas`（`packages/core/vanilla/src/figure.ts`），**无独立 `mountCanvas`**（roadmap 已把它从 alpha.4 提前到本段，作 Canvas 水合的挂载基座）。
- **依赖图（[alpha.1 ADR-03](../v0.3-alpha.1/03-vanilla-runtime-and-dependency-graph.md)）**：`react → core + render`、`vanilla → core + render`、**`react 不依赖 vanilla`**。⇒ react / vanilla 想共用一套水合 runtime，只能放在两者都依赖的 `@retikz/render`（或新包），不能放 vanilla。

水合的本质：**SSR / 静态输出携带稳定 id 挂点 → 客户端按 id + 事件名把 handler 绑上**。不重建组件树、不接管应用状态，只做"图元 ↔ 用户函数"绑定。

## 设计要点

1. **绑定语义分两层**（renderer 无关 + renderer 提供定位）：
   - **上层（renderer 无关，runtime）**：handler 注册表 `Map<id, Map<eventName, handler>>` + 根级单 listener 分发器；非冒泡的 `pointerEnter` / `pointerLeave` 用 **`pointermove` + 「上一帧命中 id」状态机**合成（每次 move 调 `locate(event) → id`，与上次命中 id 不同则 fire `leave(旧 id)` + `enter(新 id)`；根级 `pointerleave`/离开整图时清空命中态）。**关键：经统一的 `locate` 故 SVG（`closest`）与 Canvas（`hitTest` 坐标命中）共用同一实现**——`pointerover/out` + `relatedTarget` 那套只对逐元素 DOM 的 SVG 成立、对单 `<canvas>` 失效（图元间移动不产生 over/out），故不用。**两条 renderer 共用同一实现。**
   - **下层（定位，各自实现）**：把一次 DOM 事件定位到图元 id——SVG 走 `event.target.closest('[data-retikz-id]')`；Canvas 走 hit-test（pointer 坐标 → Scene 坐标 → 命中图元 id）。
2. **稳定挂点来自 IR `id`，stamp 到每个 top-level emit 图元**（评审 P1.2 修正）：compile 把 IR 元素 user `id` **stamp 到它 emit 的每个 top-level ScenePrimitive**——带文本 / rotate 的 Node → 其 `GroupPrim`（一个）；纯几何 Node → 直接平铺的 shape 图元（逐个 stamp 同一 id）；Path → 其 `PathPrim`；Scope → 其 `GroupPrim`。**不为挂点强制包 group**（避免改 emit 结构 / layout）。SVG emit `data-retikz-id="<id>"`，Canvas hit-test 返回该 id（命中 group 子图元 → 上溯最近 id-bearing 祖先）；同一节点的多个平铺图元共享同一 id，SVG `closest` / Canvas hitTest 命中任一皆解析到该 id，无歧义。**只为 user `id` stamp**（compile 内部 id 不 emit），天然 opt-in、不膨胀输出、无需 manifest。
   - **可作挂点的元素**（评审 P1.1 / P1.3）：**Node ✓**、**Path ✓**（需新增 `IRPath.id`）、**Scope ✓**（仅在命中其可见 children 时归到该 scope；空 / 纯 id scope 自身无可点面积）。**Coordinate ✗**——无视觉、不 emit 图元、无可点面积，首版不暴露 handler props（给了也 dev-warn / no-op）。
3. **函数绝不进 IR**：handler / onComplete 等是闭包，只活在 runtime 注册表；IR 仍 100% JSON 可序列化（core-design §4.4）。**事件"名"是数据**（枚举），但 handler 是函数——只有名进得了任何持久层。
4. **`<Layout renderer="svg"｜"canvas">` 双模一致**：同一份 `<Node onClick>` 在 svg / canvas 两模式**走同一注册表 + 同一分发**，切 renderer 不改 handler 语义。Canvas 没有逐元素 React 节点、本就只能走 hit-test + 注册表，故让 SVG 也走同一条 → 双模等价（roadmap 验收硬指标）。
5. **Canvas hit-test 复用 drawScene 几何**：以"pick 遍历"按**逆 z-order（最上层优先）**重走 Scene，用与 `drawScene` 完全相同的路径构建 + `isPointInPath`（填充区）/ `isPointInStroke`（描边线）判定，命中即返回该 prim 或其最近 id-bearing 祖先（group）的 id。不重写点测数学、不每帧离屏重绘。
6. **vanilla `mountCanvas` 提前到本段**：补无框架 canvas 直挂入口，返回的 view 自带坐标映射（client px → Scene units，逆 meet-fit），供 canvas 水合用。

## 选项 A（推荐）：统一注册表 + 双定位层，共享 runtime 落 `@retikz/render/hydration`

```ts
// ── 上层：renderer 无关分发器（@retikz/render/hydration）──────────────
// 事件名：全程、无缩写（AGENTS.md house style），as const 对象 + ValueOf 派生。
// EventName 是面向用户的语义名；EVENT_DOM_TYPE 映射到真实 DOM 事件类型供根级 addEventListener。
import type { ValueOf } from '@retikz/core';
const HYDRATION_EVENTS = {
  click: 'click',
  doubleClick: 'doubleClick',   // 不用 dblclick 缩写
  rightClick: 'rightClick',     // 右键；不用 contextmenu
  pointerDown: 'pointerDown',
  pointerUp: 'pointerUp',
  pointerMove: 'pointerMove',
  pointerEnter: 'pointerEnter',
  pointerLeave: 'pointerLeave',
  wheel: 'wheel',
} as const;
type EventName = ValueOf<typeof HYDRATION_EVENTS>;
// EventName → 真实 DOM 事件类型（根级 addEventListener 用）。
// pointerEnter/pointerLeave 不直接 addEventListener——由 pointermove + 命中 id 状态机合成（见控制器）；
// rightClick 默认不抑制浏览器菜单，handler 自行 event.preventDefault()。
const EVENT_DOM_TYPE: Record<Exclude<EventName, 'pointerEnter' | 'pointerLeave'>, string> = {
  click: 'click', doubleClick: 'dblclick', rightClick: 'contextmenu',
  pointerDown: 'pointerdown', pointerUp: 'pointerup', pointerMove: 'pointermove',
  wheel: 'wheel',
};
type HydrationHandlers = Record<string /* id */, Partial<Record<EventName, (event: Event) => void>>>;

// locate：把一次 DOM 事件定位到图元 id（svg / canvas 各注入一份）
type Locate = (event: Event) => string | null;

// 控制器：根级委托 + enter/leave 合成；与 renderer 无关
const createHydrationController = (
  root: EventTarget,
  handlers: HydrationHandlers,
  locate: Locate,
): { dispose: () => void };

// ── 下层定位：svg = closest；canvas = hitTest ──────────────────────
// svg（DOM 原生，trivial）
const locateSvg: Locate = e => (e.target as Element).closest?.('[data-retikz-id]')?.getAttribute('data-retikz-id') ?? null;

// canvas（@retikz/render/canvas 新增纯函数，复用 drawScene 几何）
export const hitTest = (
  scene: Scene,
  point: { x: number; y: number },  // Scene user units
  // context2d：原生 isPointInPath/isPointInStroke 需一个真实 2D context（即时模式无逐图元 DOM）；
  // 生产由 mountCanvas / CanvasHost 注入已挂 canvas 的 context，缺省自建离屏；SSR 无 canvas → 返回 null。
  options?: { strokeTolerance?: number; context2d?: CanvasRenderingContext2D },
): string | null;                    // 逆 z-order、命中即最近 id-bearing 祖先 id
```

落地分布：
- **core**：`ScenePrimitive` 各 type 加可选 `id?: string`（additive、非 zod）；compile 从 IR `id` 灌入 emit 出的图元。
- **render/svg**：`buildPrim` 各分支 `compact({ ..., 'data-retikz-id': p.id })`，零运行时。
- **render/canvas**：新增纯函数 `hitTest(scene, point)`（复用 `drawScene` 的路径构建）。
- **render/hydration（新子路径）**：`createHydrationController` + `locateSvg` + enter/leave 合成；renderer 无关 runtime，**不污染 svg / canvas 纯子路径**。放 render 因为它是 react / vanilla 唯一共同依赖。
- **vanilla**：`hydrate(container, { handlers })`（svg，用 `locateSvg`）；`mountCanvas` + 其 view 的 canvas 水合（用 `hitTest` + 坐标映射做 `locate`）。
- **react**：组件 handler props（`onClick` / `onPointerEnter`…）收集 → 喂同一 `createHydrationController`，绑在 figure root（svg root 或 canvas el）；svg / canvas 双模共用。

### 被否决的选项

- **B：React 用原生 React 合成事件（onClick 直接挂元素），vanilla 另用委托**。两套机制 → 违反 roadmap「react / vanilla 共享同一绑定语义」硬指标；且 `renderer="canvas"` 下 react 无逐元素节点、无法挂 React handler，双模不一致。否决。
- **C：Canvas 离屏 pick canvas（每图元唯一色重绘、读像素反查 id）**。需维护与主 canvas 同步的离屏副本、每次命中或每帧重绘，开销大且与 `drawScene` 逻辑双份。A 的 `isPointInPath` 复用同一几何，更省更 DRY。pick canvas 留作超大图的后续优化备选（与 #14）。
- **D：interaction manifest 进 IR**。事件名是数据，但"哪些 id 可交互"完全可由 user-provided id 的存在性 + runtime handlers map 推断，无需在 IR 增一张表。manifest 进 IR 只会增 schema 面、撑 LLM 契约。否决——见待决策 #6。
- **E：把水合 runtime 放 `@retikz/vanilla`**。react 不依赖 vanilla（ADR-03），放这儿 react 用不了。否决，落 render。

## 决策：选 A

理由：
1. **唯一同时满足**「SVG + Canvas 统一语义」「react / vanilla 共享」「`renderer` 双模 handler 等价」「函数不进 IR」四条。
2. **最大化复用**：SVG 定位是 trivial `closest`；Canvas hit-test 直接复用 `drawScene` 的路径构建 + 原生 `isPointInPath`；上层分发器一份两端共用。
3. **opt-in 且零额外契约**：挂点来自现有 `id` 字段，无需新增 manifest / IR schema；SSR 只多 emit 一个 attribute，静态 SVG 即可被客户端 `hydrate` 绑定。
4. **依赖图自洽**：共享 runtime 落 render（react / vanilla 唯一共同依赖），不破坏 `react ⊥ vanilla`。

## DSL 表面（用户侧 API，评审 P2.3）

**React（JSX 模式，handler 来自组件 props）：**

```tsx
<Layout renderer="svg">          {/* 或 renderer="canvas"，handler 语义一致 */}
  <Node id="a" onClick={e => openPanel('a')} onPointerEnter={highlight} fill="..." />
  <Path id="edge1" onClick={selectEdge}>{/* ...steps... */}</Path>
  <Coordinate id="m" position={[3, 2]} />   {/* 不接 handler：无可点面积 */}
</Layout>
```

- handler 仅在元素有 `id` 时可绑（无 id + 有 handler → dev warn、跳过）。

**React（`ir` prop 模式，无 JSX children）：** 经 `<Layout>` 的 `handlers` prop 按 id 提供（JSX handler props 在此模式不可用）：

```tsx
<Layout ir={ir} handlers={{ a: { click: e => ... }, edge1: { click: ... } }} />
```

**Vanilla（SVG）：**

```ts
const view = mountSvg(container, ir);              // 或 SSR：先注入 renderToSvgString(ir) 产物
const h = hydrate(view.root, { handlers: { a: { click: e => ... } } });  // 根级 closest 委托
// h.dispose() 解绑；view.dispose() 一并解绑
```

**Vanilla（Canvas）：**

```ts
const view = mountCanvas(container, ir);           // 新入口（本段提前）
view.hydrate({ handlers: { a: { click: e => ... } } });   // hitTest 定位
```

> `hydrate` / `view.hydrate` 返回 `{ dispose }`。`renderer="svg"｜"canvas"` 下同一 `{ a: { click } }` 行为一致（同一注册表 + 同一分发，定位层不同）。

## 各包分工（任务拆分）

### `@retikz/core`（compile + IRPath.id，red）
- `ScenePrimitive` 各 type 加可选 `id?: string`（`primitive/*.ts`，纯 TS、非 zod、additive）。
- **`PathSchema` 加 `id`**（`ir/path/path.ts`，`z.string().min(1).optional()` + 英文 describe）——Path 缺 id，Node / Coordinate / Scope 已有。
- compile（`compile/node.ts` / `compile/path` / scope）把 IR 元素 user `id` **stamp 到它 emit 的每个 top-level 图元**：纯几何 Node → 逐个平铺 shape 图元都 stamp 同一 id；文本 / rotate Node → 其 GroupPrim；Path → PathPrim；Scope → GroupPrim。**仅 user id**；Coordinate 不 emit 图元、跳过。
- 不引入任何 DOM / 函数；IR 仅 Path 新增 id（其余 IR schema 不变）。

### `@retikz/render`（svg emit + canvas hitTest + 新 hydration 子路径，red）
- **svg**：`buildPrim` 各分支 emit `data-retikz-id`（来自 `prim.id`）。
- **canvas — 先抽共享几何**（评审 P2.1）：把 `drawScene.ts` 私有的 `buildPath` / `roundedRectPath` / `pathCommand` / `applyClip` 抽到 `canvas/pathGeometry.ts`，`drawScene.ts` 改为 import（♻️ 纯重构、行为不变、回归绿）。
- **canvas — hitTest**：新增 `hitTest(scene, point, options?) → string | null`——逆 z-order 重走 Scene，复用 `pathGeometry` 构建路径 + `isPointInPath`（填充区）/ `isPointInStroke`（描边线），命中返回最近 id-bearing 祖先 id；可选 `strokeTolerance`（缺省 strokeWidth/2）。
- **新子路径 `@retikz/render/hydration`**：`createHydrationController(root, handlers, locate)`（根级委托 + `pointerEnter/Leave` 经 `pointermove` + 命中 id 状态机合成（renderer 无关，经 `locate`）+ 根级离开整图清空命中态 + dispose）+ `locateSvg`。renderer 无关 runtime，独立子路径、不进 svg / canvas 纯子路径，不引 React。

### `@retikz/vanilla`（hydrate + mountCanvas，yellow→red）
- `hydrate(container, { handlers }): { dispose }`——SVG 水合：用 `locateSvg` + `createHydrationController` 绑到容器内已挂的 `<svg>` root。
- `mountCanvas(container, input, options): VanillaView`——无框架 canvas 直挂（对齐 `mountSvg`，复用 `Figure.toCanvas` 同款 fit），view 暴露 `hydrate({ handlers })`：以 `hitTest` + client→Scene 坐标映射构造 `locate`。
- `view.update(nextIr)` 维持（数据过渡 / 形变是后续，见 roadmap §动画 B，本 ADR 不做）。

### `@retikz/react`（handler props → 注册表，yellow→red）
- Kernel 组件 **`Node` / `Path` / `Scope`** 加事件 props，按 `EventName`（`on` + PascalCase）：`onClick` / `onDoubleClick` / `onRightClick` / `onPointerDown` / `onPointerUp` / `onPointerMove` / `onPointerEnter` / `onPointerLeave` / `onWheel`；**`Coordinate` 不加**（无可点面积）。`Path` 同时加 `id` prop（透传新 `IRPath.id`；react builder 的 PATH 字段表加 `id`）。
- **`collectHydrationHandlers(children)`**（新模块，评审 P2.2）：与 `buildIR` **同源遍历** children——穿透 `Fragment`、展开 Sugar 后按各元素 `id` 收 handler props 组装 `HydrationHandlers`。规则：无 `id` 带 handler → dev warn、跳过；重复 `id` → dev warn，同 id 合并不同事件、同事件后者覆盖；Sugar 元素的 handler 归到其展开后承载 `id` 的 Kernel 元素。
- `Layout` / `CanvasHost`：**JSX 模式**用 `collectHydrationHandlers` 收集，**`ir` prop 模式**改用 `<Layout handlers={...}>` prop（无 JSX children 可收集，`ir` + JSX children 本就是既有非法组合）；两路结果经 `createHydrationController` 绑到 figure root（svg root 或 `<canvas>`）。svg / canvas 双模共用同一控制器与注册表。

### SSR
- `renderToSvgString` 已经 emit `data-retikz-id`（随 svg）；服务端零额外执行，客户端 `hydrate` 绑定。可选 `interactions` manifest 导出留 #6 / 后续。

## 待决策点

- **#5 水合 API 命名**（roadmap 待决策 #5）：`hydrate` / `hydrateInteractions` / `bind` / `attachHandlers`。**倾向 `hydrate`**（SSR / React 词汇最通用）；vanilla `hydrate(container, { handlers })`、react 经组件 handler props。
- **#6 interaction manifest 落点**（roadmap 待决策 #6）：进 IR vs runtime option vs 不需要。**倾向"不需要"**——挂点 = user-provided id 的存在性，绑定 = runtime handlers map，二者已足；`renderToSvgString` 仅在需要"为外部工具导出机器可读清单"或"限制哪些 id emit 以压输出"时提供可选 `interactions` option。默认不引入。
- **#14 Canvas hit-test 策略**（roadmap 待决策 #14）：**选 (a) 几何 pick + 原生 `isPointInPath`/`isPointInStroke`**（复用 `drawScene` 几何，逆 z-order）。(b) 离屏色拾取 / (c) bbox 空间索引留作超大图的后续性能优化。命中口径先定：描边按 `strokeTolerance`（缺省 = strokeWidth/2）、透明填充（fill=none）仅描边可命中、z-order 取最上层、group 命中归到最近 id-bearing 祖先。
- **render/hydration 落点**：放 `@retikz/render` 新子路径（react / vanilla 唯一共同依赖）vs 新建独立小包。**倾向 render 子路径**（不增依赖图复杂度；svg/canvas 纯子路径不受影响）。
- **事件集首版范围**：`HYDRATION_EVENTS`（`as const` + `ValueOf`）含 `click` / `doubleClick` / `rightClick` / `pointerDown` / `pointerUp` / `pointerMove` / `pointerEnter` / `pointerLeave` / `wheel`——**全程无缩写命名**（house style）；`EVENT_DOM_TYPE` 映射到真实 DOM 类型供根级 `addEventListener`（`doubleClick→dblclick`、`rightClick→contextmenu`），enter/leave 经 over/out 合成。**事件集是注册表、加值即扩展**。`rightClick` 默认不抑制浏览器菜单，handler 自行 `preventDefault`。
  - **命名取舍**（参考组件库）：React `onDoubleClick` 已把双击写全、但右键留 `onContextMenu`；Flutter 用 `onDoubleTap` / `onSecondaryTap`（语义化）。本库取**全程 + 直白**：`doubleClick`（非 `dblclick`）、`rightClick`（非 `contextmenu`）；DOM 技术名只藏在 `EVENT_DOM_TYPE` 内部。
  - **对标 ECharts / Highcharts / Vega**（已核）：三家的交互原始事件（click / dblclick / contextmenu / hover / down·up·move / wheel）本集**全覆盖、无缺失、无多余**。差异：① 三家历史用 `mouse*` 命名，本集用 **Pointer Events 统一 mouse + touch + pen → 不另列 `touchstart/move/end`**（优点）；② 三家 hover 实际用冒泡的 `mouseover/out`，本集对 id-粒度语义单位用**合成 enter/leave** 更顺手（冒泡版 over/out 见下，可选）；③ `select` / `unselect` / `brush` / `datazoom` 是**语义态 / 复合手势**，非原始 DOM 事件 → 归 Tier 2（plot）或延后手势编排，不进 core。
  - **两处可选补充（待定）**：① root 级「离开整图」hook（≈ ECharts `globalout`，用于离开图时清空所有 tooltip）；② 冒泡版 `pointerover` / `pointerout`（三家 hover 的底层，enter/leave 之外按需暴露）。
  - **延后**：键盘 / 焦点 / a11y（Vega 有 keydown/up）、拖拽 / brush / pan / 缩放手势编排（down·move·up 原语已具备、可自拼，命名手势延后）、多指 touch 手势。
- **坐标映射归属**（已落地）：canvas client px → Scene units 的逆 meet-fit 在 view 层算——vanilla `mountCanvas.clientToScene` 与 react `CanvasHost` 同口径（读 `getBoundingClientRect` + `scene.layout` + scale/letterbox）。`clientToScene` **始终返回 `ScenePoint`（不返 null）**：落 letterbox 黑边时得到 layout 区域外坐标，「无命中」判定下推给 `hitTest` 自然处理（纯坐标函数无 null 分支，更顺）。

## 影响

- **`@retikz/core`**：Scene 图元加 `id?`（additive、非 zod）+ compile stamp id；**`IRPath` 新增 `id`（zod + describe，additive optional IR schema 变更）**——Node / Coordinate / Scope 的 id 早已存在。red（动 `primitive/*` + `compile/*` + `ir/path/path.ts`）。
- **`@retikz/render`**：svg emit `data-retikz-id`；canvas 抽 `pathGeometry` 共享（♻️）+ 新增 `hitTest`；新子路径 `@retikz/render/hydration`（含 DOM 事件 runtime——render 职责从"纯输出"扩到"输出 + 交互定位 / 委托"，但隔离在独立子路径，svg / canvas 纯度不变）。red。
- **`@retikz/vanilla`**：新增 `hydrate` + `mountCanvas`（public API 增）。red。
- **`@retikz/react`**：Kernel `Node` / `Path` / `Scope` 加事件 props、`Path` 加 `id` prop、`Layout` 加 `handlers` prop + 接线（public API 增）。red。
- **文档（apps/docs）**：`IRPath.id` 是用户可见 IR 字段、`<Path id>` + 事件 props 是公开 API ⇒ 按 AGENTS.md「用户可见改动必须同步文档站」，须**同一改动集**内改文档——Path 组件页 API 表加 `id` 行、新增「水合 / Hydration」reference 页（React 事件 props + vanilla `hydrate` / `mountCanvas` + `<ComponentPreview>` 交互 demo）、双语并行。
- **公开 API**：新增 `hydrate`（vanilla）/ `mountCanvas`（vanilla）/ `hitTest`（render/canvas）/ `@retikz/render/hydration` 子路径 / react 事件 props + `<Path id>` + `<Layout handlers>` / `IRPath.id` / Scene `ScenePrimitive.id`。均 additive、非 breaking。
- **SSR / 序列化**：`IRPath` 新增 id（round-trip + codec 需覆盖）；其余 IR round-trip 不变；SVG 输出多 `data-retikz-id` attribute。非 breaking。
- **版本**：四包 lockstep。

## 不在本 ADR 范围

- **动画**（时间轴动画进 IR + 数据过渡 / 形变）——见 roadmap §动画，候选 v0.4，复用本段 runtime（rAF / 事件）基建。
- **数据过渡 / 形变的 `view.update(nextIr, { transition })` keyed-diff** —— roadmap §动画 B，runtime + Tier 2，更后。
- 键盘 / 焦点 / a11y、拖拽 / pan / 缩放手势、touch 专属事件、惯性。
- Canvas hit-test 的空间索引 / 离屏拾取性能优化（超大图）。
- interaction manifest 的外部工具导出格式。
- AI 增量渲染 / progressive（roadmap §后续，v0.4+），但与水合共用 `update(nextIr)` 通道、本段保持其挂点不被写死。

---

## 实现契约（必填）

### Level

`red`

判级：动 `packages/core/core/src/primitive/*`（Scene 图元加 id）+ `compile/*`（灌 id）→ red；`packages/core/render/src/svg/builders/prim.ts`（emit）+ `render/src/canvas/`（hitTest）+ 新 `render/src/hydration/` 子路径 → red；`@retikz/vanilla`（hydrate / mountCanvas）+ `@retikz/react`（事件 props + 接线）→ red。取最高 → **red**。

### Schema 改动

| 文件 | 操作 | 字段 / 类型 | 说明 |
|---|---|---|---|
| `core/src/primitive/{rect,ellipse,text,path,group}.ts` | 加 | `id?: string`（纯 TS type，非 zod） | Scene 图元稳定挂点；compile 从 IR `id` stamp |
| `core/src/ir/path/path.ts` | 加 | `PathSchema.id`（`z.string().min(1).optional()` + 英文 describe） | **新增**：Path 缺 id、水合需要（评审 P1.1）；触发文档同步 |
| `core/src/ir/{node,coordinate,scope}.ts` | 不动 | — | id 早已存在 |

> ⚠️ 两类改动别混：**Scene 图元 `id?`** 是 compile 产物 TS type、非 zod、不影响 IR 序列化；**`IRPath.id`** 是真正的 zod IR schema 新增（additive optional，round-trip + codec 需覆盖、且**触发文档同步**）。

### 文件 scope

`@retikz/core`：
- `packages/core/core/src/primitive/{rect,ellipse,text,path,group}.ts`（加 `id?: string`）
- `packages/core/core/src/ir/path/path.ts`（加 `PathSchema.id` zod + describe）
- `packages/core/core/src/compile/{node,path/index,path/label,scope}.ts`（emit 时 stamp user `id` 到**每个 top-level 图元**）
- `packages/core/core/tests/compile/scene-id.test.ts`（新建：纯几何 / 文本 Node、Path、Scope 的 id → 图元 id stamp；Coordinate 不 emit）
- `packages/core/core/tests/ir/path-id-roundtrip.test.ts`（新建：`IRPath.id` parse + codec round-trip）

`@retikz/render`：
- `packages/core/render/src/svg/builders/prim.ts`（各分支 emit `data-retikz-id`）
- `packages/core/render/src/canvas/pathGeometry.ts`（**新建**：从 `drawScene.ts` 抽 `buildPath` / `roundedRectPath` / `pathCommand` / `applyClip`）
- `packages/core/render/src/canvas/drawScene.ts`（改：改 import `pathGeometry`，♻️ 行为不变）
- `packages/core/render/src/canvas/hitTest.ts`（新建：复用 `pathGeometry` + isPointInPath/isPointInStroke，逆 z-order）
- `packages/core/render/src/canvas/index.ts`（导出 `hitTest`）
- `packages/core/render/src/hydration/{controller,events,locateSvg}.ts` + `index.ts`（新建子路径；enter/leave 合成内联进 controller，`events.ts` 集中 `HYDRATION_EVENTS` / `EVENT_DOM_TYPE` / 类型）
- `packages/core/render/package.json`（exports 加 `./hydration`）
- `packages/core/render/tests/{svg-data-id,canvas-hittest,hydration-controller}.test.ts`（新建）；`pathGeometry` 抽取的回归由既有 `draw` / `render` 套件承载（纯重构、既有用例继续绿即等价证明），不单建专用文件

`@retikz/vanilla`：
- `packages/core/vanilla/src/hydrate.ts`（新建：svg 水合）
- `packages/core/vanilla/src/mountCanvas.ts`（新建：canvas 直挂 + view.hydrate + client→Scene 坐标映射）
- `packages/core/vanilla/src/index.ts`（导出 `hydrate` / `mountCanvas`）
- `packages/core/vanilla/src/types.ts`（`VanillaView` 加 canvas 侧 hydrate / 坐标映射）
- `packages/core/vanilla/tests/{hydrate-svg,mount-canvas,hydrate-canvas}.test.ts`（新建）

`@retikz/react`：
- `packages/core/react/src/kernel/{Node,Path,Scope}.tsx`（加事件 props；`Path` 加 `id` prop）；**`Coordinate.tsx` 不加 handler**
- `packages/core/react/src/kernel/collectHydrationHandlers.ts`（**新建**：与 buildIR 同源遍历，穿透 Fragment / 展开 Sugar，按 id 收 handler，无 id warn / 重复 id 处理）
- react builder 的 PATH 字段表（PATH_FIELDS 等）加 `id`，使 `<Path id>` 透传 IR
- `packages/core/react/src/kernel/Layout.tsx`（加 `handlers` prop）+ `render/canvasHost.tsx`（收集 / 透传 handler → controller）
- `packages/core/react/tests/{hydration-svg,hydration-canvas,renderer-parity-events,collect-handlers}.test.tsx`（新建）

`@retikz/docs`（用户可见改动同步，AGENTS.md 要求）：
- Path 组件页 mdx（zh/en）API 表加 `id` 行
- 新增「水合 / Hydration」reference 页（zh/en）+ `<ComponentPreview>` 交互 demo + `*.demo.tsx`
- 三处协同（contents + `data/core.ts` + i18n）

### 测试象限

至少 16 个 case：

**id 挂点 / emit（≥ 3，评审 P1.1 / P1.2 / P1.3）**：
- `path-id-roundtrip`：`<Path id="e1">` → `IRPath.id="e1"`，parse + codec round-trip 保 id。
- `plain-node-stamps-each-prim`：纯几何 Node（无文本 / rotate，不包 group）带 `id` → 其平铺 shape 图元都 stamp 同一 id（不强制包 group）；文本 Node → id 在 GroupPrim。
- `coordinate-no-emit-no-handler`：`<Coordinate id>` 不 emit 图元、不可命中（compile scene-id 测试覆盖）；Coordinate 在 **react 类型层就不含任何 `on*` prop**（`CoordinateProps` 无事件 props）→ 误用 handler 编译期即被拒，**无运行时 warn / no-op 分支**。

**Happy path（≥ 3）**：
- `svg-emits-data-id`：带 `id` 的 Node / Path → SVG 输出含 `data-retikz-id="<id>"`；无 id 元素不含。
- `svg-hydrate-click`：`hydrate` 后点击图元 DOM → 对应 id 的 handler 触发（经 closest 反查）。
- `canvas-hittest-hit`：含两个图元的 Scene，hitTest 命中点落在上层图元 → 返回上层 id（逆 z-order）。

**边界（≥ 3）**：
- `enter-leave-synthesis`：pointerEnter / Leave 经 `pointermove` + 命中 id 状态机合成，跨图元移动时旧 id fire leave、新 id fire enter 各一次；同 id 内部移动不重复触发；**SVG 与 Canvas 同一机制、双模等价**（含 relatedTarget 非 null 的 over 场景）。
- `hittest-stroke-only`：fill=none 的 path，点落填充区内不命中、落描边线（含 tolerance）命中。
- `nested-group-id`：命中 GroupPrim 子图元 → 返回最近 id-bearing 祖先（group）id。

**handler 收集（≥ 2，评审 P2.2）**：
- `collect-sugar-fragment`：`collectHydrationHandlers` 穿透 `<Fragment>`、展开 Sugar（如 `<Circle id onClick>`）后 handler 归到承载 id 的 Kernel 元素，与 `buildIR` 同源遍历一致。
- `collect-dup-and-noid`：重复 `id` → dev warn + 合并 / 后覆盖；无 id 带 handler → dev warn + 跳过；`ir` prop 模式经 `<Layout handlers>` 提供、JSX handler 不参与。

**错误 / 退化（≥ 2）**：
- `handler-without-id-warns`：react 元素带 handler 但无 `id` → dev warn、不抛、其余正常绑定。
- `dispose-detaches`：`controller.dispose()` / `view.dispose()` 后事件不再触发、无 listener 泄漏。

**重构回归（≥ 1，评审 P2.1）**：
- `drawscene-after-extract`：`pathGeometry` 抽出后 `drawScene` 既有 svg↔canvas 对照 / 视觉回归全绿（行为零变化）。

**交互 / 等价（≥ 2）**：
- `renderer-parity-events`：同一 `<Node onClick>` 在 `renderer="svg"` 与 `renderer="canvas"` 下点击同一逻辑位置 → 同一 handler 触发（双模等价，roadmap 验收）。
- `coord-mapping`：canvas 在受限容器（meet-fit letterbox）下，client 坐标经逆 fit 映射到正确 Scene 点、hitTest 命中。

**SSR / 透传（≥ 2）**：
- `ssr-then-hydrate`：`renderToSvgString` 产含 `data-retikz-id` 的静态串 → 注入 DOM → `hydrate` 绑定成功（不重渲染）。
- `mount-canvas-render`：`mountCanvas` 把 IR 挂成 canvas、视觉与 `Figure.toCanvas` 一致。

### 依赖的现有元素

- `buildPrim`（`render/src/svg/builders/prim.ts`）—— emit 注入点（各分支 `compact`）。
- `drawScene` 私有几何 helper（`render/src/canvas/drawScene.ts`：`buildPath` / `roundedRectPath` / `pathCommand` / `applyClip`）—— 先抽到 `pathGeometry.ts`，hitTest 与 drawScene 共用（逆 z-order）。
- `CanvasHost`（`react/src/render/canvasHost.tsx`）的 dpr + meet-fit —— canvas 坐标映射 / 事件绑定宿主。
- `mountSvg` / `svgNodeToDom` / `VanillaView`（`vanilla/src/`）—— `hydrate` / `mountCanvas` 对齐其门面与 view 形态。
- `emitNodePrimitives`（`compile/node.ts:671`，`needsGroup` 判定）/ Path emit（`compile/path`）—— stamp id 的位置；**纯几何 Node 平铺、非总 group**（评审 P1.2）。
- IR `id` 字段：`ir/node.ts` / `ir/coordinate.ts` / `ir/scope.ts` 已有；**`ir/path/path.ts` 缺、本段新增**（评审 P1.1）。挂点单一来源（user-provided）。
