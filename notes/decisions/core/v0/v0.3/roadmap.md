# v0.3 总计划：Renderer 架构拆分 + Vanilla runtime + 水合 + Tier 2 支撑

> 写于 2026-05-26。承接 v0.2 已完成的 renderer-agnostic Scene 契约、Paint / clip 资源表、MarkerPrimitive、`viewBox` override 与 `compileToScene` 纯函数边界。
>
> 关联：[`v0 roadmap`](../roadmap.md) · [`v0.2 总计划`](../v0.2/roadmap.md) · [`架构 core-design.md §2.1 / §5 / §6`](../../../../architecture/core-design.md) · [`tikz-gap-analysis`](../../../../analysis/tikz-gap-analysis.md)

> 本文件记录 v0.3 的完整计划：renderer 架构拆分、`@retikz/vanilla`、水合、Tier 2 支撑（`@retikz/plot` 为首个消费者），以及 React 双渲染模式与 Canvas renderer MVP。
>
> **进度（2026-06-05）**：renderer 架构核心已在 alpha.1 一次交付（svg / canvas / vanilla-SVG + React 双渲染模式，见 [ADR-01~04](./alpha.1/)）；**alpha.2 Tier 2 支撑**（可注册 composite 展开管线，见 [ADR-01](./alpha.2/01-tier2-support.md)）、**alpha.3 水合**（SVG + Canvas 统一事件绑定，见 [ADR-01](./alpha.3/01-hydration.md)）均已完成。canvas / svg 能力在 alpha.1 已**超额交付**（gradient / pattern / image / clip / marker 全部真实现、无降级遗留——剩余 `warnUnsupported` 仅为缺配置 / 悬空引用的可诊断降级，非能力缺口），原拟的 **alpha.4「canvas/svg 能力补全」已退役**（2026-06-05）；其唯一残值 SVG↔Canvas 对照测试并入 beta.1。剩余主线重排为 **alpha.4（core shape 参数化泛化）→ alpha.5（时间轴动画，§动画 A 转正）→ beta.1（加固）**,详见 §Alpha 切分。命令式 builder（ADR-04）属 alpha.1、已实现。

## 定位

本部分关注 v0.3 的 **renderer 架构出关**：把现有 `@retikz/react` 中的 SVG 渲染能力拆出，与 Canvas 一起放进独立的 `@retikz/render` 包（子路径 `./svg` / `./canvas`），同时新增 `@retikz/vanilla` 原生 runtime；`@retikz/react` 在此之上支撑 SVG 与 Canvas 两套渲染模式。

Vanilla runtime 面向两个场景：

1. **无框架渲染**：不依赖 React / Vue / Svelte 等任何 UI 框架，用户只用普通 JavaScript 就能把 retikz 图形挂到 DOM 或绘制到 Canvas。
2. **SSR 渲染**：服务端可以直接通过它把 IR / Scene 渲染成可返回的 SVG 字符串，或在可用 Canvas runtime 时导出图片。

这部分工作不以继续堆 core 图形能力为主，而是验证 v0.2 打下的 Scene 契约是否真的能同时服务多 renderer：

```text
@retikz/core
  IR / schema / compileToScene / Scene / resources
        |
        +--> @retikz/render   Scene -> 渲染后端（子路径）
        |       ./svg      Scene -> SVG（descriptor / 字符串）
        |       ./canvas   Scene -> Canvas 2D
        |       (./webgl   后续)
        |
        +--> @retikz/vanilla  framework-free runtime / SSR entry
        |
        +--> @retikz/react    Kernel / Sugar JSX + renderer glue
```

> renderer 打包：`@retikz/svg` / `@retikz/canvas` 已合并为 `@retikz/render`，按后端走子路径 `@retikz/render/svg` / `@retikz/render/canvas`（见 [alpha.1 ADR-05](./alpha.1/05-renderer-repackage.md)）。

**衡量标准**：同一份 IR 经 `compileToScene` 后，可以被 SVG 与 Canvas 两条 renderer 路径消费；Vanilla 用户不经任何框架也能完成渲染；SSR 可以直接拿到 SVG 字符串等服务端输出；`@retikz/react` 不再拥有 SVG 渲染核心，只负责 React DSL、IR 构建、生命周期与渲染模式选择。

## 包拆分目标

| 包                | v0.3 职责                                                                                                    | 不做                                                                  | 依赖项                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------ |
| `@retikz/core`    | 继续提供 IR、zod schema、Scene primitive、资源表、`compileToScene`、几何与 parser                            | 不依赖 React / DOM / SVG / Canvas；不做 renderer 专属布局             | `zod`                                                  |
| `@retikz/render`  | 新包，渲染后端命名空间；子路径 `./svg`（Scene → SVG descriptor / 字符串）、`./canvas`（Scene → Canvas 2D），后续 `./webgl`；承接现有 React 包中的 SVG 渲染核心 | 不负责 JSX DSL；不重新编译 IR；子路径后端互不依赖（svg 不走 canvas、canvas 不走 SVG 中转） | `@retikz/core`，`csstype`[type] |
| `@retikz/vanilla` | 新包，framework-free runtime；提供 DOM 挂载、Canvas 挂载、SSR 字符串渲染等普通 JS 入口                       | 不提供组件 DSL；不绑定任何 UI 框架；不复制 render 内核 | `@retikz/core`，`@retikz/render`        |
| `@retikz/react`   | React Kernel / Sugar 组件、IR builder、`Layout` runtime；对接 `@retikz/render/svg` 与 `@retikz/render/canvas` 两套渲染模式 | 不内置 SVG renderer 细节；不复制 Canvas 绘制逻辑                      | `@retikz/core`，`@retikz/render`，React |

> 包名 `@retikz/vanilla` 作为当前首选命名；若后续 ADR 评审认为更合适，仍可再调整。`@retikz/svg` / `@retikz/canvas` 已合并为 `@retikz/render`（子路径后端，见 [alpha.1 ADR-05](./alpha.1/05-renderer-repackage.md)）。

## React API 方向

默认保持现有用户体验：`<Layout>` 继续默认渲染 SVG，降低迁移成本。

新增渲染模式选择：

```tsx
<Layout renderer="svg">...</Layout>
<Layout renderer="canvas">...</Layout>
```

同时保留讨论空间：是否新增更显式的 `<SvgLayout>` / `<CanvasLayout>` 组件，作为后续文档推荐或 advanced API。

初步倾向：

- `renderer="svg"` 为默认值，现有 demo / docs 可以渐进迁移。
- `renderer="canvas"` 使用同一套 Kernel / Sugar JSX 构建 IR，只在最终 Scene 渲染阶段切换输出目标。
- React 包中与 DSL 无关的 SVG helpers 下沉到 `@retikz/svg`，React 只保留必要的 React element 绑定层。

## SVG 包拆分范围

`@retikz/svg` 从现有 `packages/react/src/render/` 中抽出与 React 无关或可 React 无关化的逻辑：

- path `d` 构造；
- transform 字符串构造；
- `viewBox` 格式化；
- Paint resource -> SVG paint definitions；
- Clip resource -> SVG clipPath definitions；
- MarkerPrimitive / arrow marker -> SVG marker definitions；
- ScenePrimitive -> SVG 节点描述或 SVG 字符串。

待设计的关键点：

1. `@retikz/svg` 的主输出形态是 SVG 字符串、轻量 vnode descriptor，还是同时提供两者。
2. React 是否直接消费 `@retikz/svg` 的 descriptor，再映射成 React elements。
3. 现有 `renderPrim.tsx` 这类 React JSX 文件如何拆分为 renderer-neutral builder + React binding。

## Canvas 包首版范围

`@retikz/canvas` 首版目标是浏览器 Canvas 2D：

- 接收 `Scene` 或 IR + compile options；
- 绘制基础 primitives：rect / ellipse / path / text / group；
- 支持 transform、opacity、stroke、fill；
- 支持 Paint resources 的 Canvas 等价物：solid / linear gradient / radial gradient / pattern / image 的可行子集；
- 支持 clip resources 的 Canvas clipping；
- 支持 marker / arrow 的 Canvas 绘制；
- 提供导出路径：浏览器 `canvas.toBlob()`。

Node Canvas / `@napi-rs/canvas` 可以作为后续 alpha 或 beta 再进，不抢首版闭环。

Canvas 不走 SVG 中转。SVG 与 Canvas 是并列 renderer，共享上游 Scene，而不是父子关系。

## Vanilla runtime 范围

Vanilla runtime 是 `@retikz/react` 之外的基础 runtime，供无框架应用与 SSR 直接使用。它不提供 JSX DSL，只消费 IR 或 Scene。

候选 API 形态：

```ts
import { renderToSvgString, mountSvg } from '@retikz/vanilla';

const svg = renderToSvgString(ir);

mountSvg(document.querySelector('#diagram'), ir);
```

职责边界：

- `renderToSvgString(ir | scene, options)`：服务端 / 构建期直接产 SVG 字符串。
- `mountSvg(container, ir | scene, options)`：浏览器无框架 DOM 挂载 SVG。
- 复用 `@retikz/svg` 与 `@retikz/canvas` 的 renderer 核心，不自己维护另一套渲染逻辑。
- 可选提供 `update*` / `dispose` 之类 lifecycle API，但首版先以一次性渲染闭环为主。

SSR 首版优先保证 SVG 字符串输出。Canvas 服务端图片导出依赖 Node Canvas runtime，可以后续作为单独入口或可选依赖处理。

## 水合

v0.3 的另一个重点是支持水合：服务端或静态环境先把图形渲染出来，客户端再把事件函数、动作回调绑定回对应图元。

核心原则：

- **函数不进 IR**：IR 仍然只保存可序列化的图形描述，不能写入 function / closure / framework ref。
- **IR / Scene 提供稳定挂点**：可交互图元需要稳定 `id`，renderer 输出时保留 `data-retikz-id` 等可定位标记。
- **绑定表在 runtime 层**：函数回调由 `@retikz/vanilla` / `@retikz/react` 等 runtime 接收，不进入 core schema。
- **SSR 只输出静态结构**：服务端可以输出 SVG 字符串和可选 interaction manifest，但不执行、不序列化函数。
- **客户端完成水合**：浏览器端根据图元 id 和事件名，把用户提供的 handler 绑定到对应图元——SVG 绑到已存在的 DOM、Canvas 经 hit-test 命中。SVG 与 Canvas 水合在 alpha.3 一起落地（共用上层绑定语义，定位层各自实现）。

候选 API 形态：

```ts
// server
const svg = renderToSvgString(ir, {
  interactions: {
    nodeA: ['click', 'pointerenter'],
    edgeB: ['click'],
  },
});

// client
hydrate(container, {
  handlers: {
    nodeA: {
      click: event => openPanel(event),
      pointerenter: event => highlightNode(event),
    },
    edgeB: {
      click: event => selectEdge(event),
    },
  },
});
```

SVG 与 Canvas 水合在 alpha.3 一起落地，共用同一套绑定语义；区别只在「如何把 pointer 事件定位到图元 id」这一定位层：

- **绑定语义（renderer 无关，两条共用）**：runtime 维护 `id → { event → handler }` 注册表；根级单 listener 接 pointer / click 等事件，定位出图元 id 后查表分发；非冒泡事件（`pointerenter/leave`）用 `pointerover/out` + `relatedTarget` 在根层合成。
- **SVG 定位层**：事件 target 经 `closest('[data-retikz-id]')` 反查图元 id（图元已是真实 DOM）。
- **Canvas 定位层**：Canvas 无逐图元 DOM，需 hit-test——`pointer(x,y) → 命中图元 id`（候选：几何 point-in-shape 测试 / 离屏 pick canvas 唯一色编码 / bbox 空间索引，见待决策 #14）。
- **React**：组件 props 中的 handler 不落 IR，最终映射到同一套 runtime binding 注册表（与 vanilla 命令式 handler 同源）。

水合不是完整框架 hydration：retikz 不需要重建 React 组件树，也不接管页面应用状态；它只负责把 retikz 图形输出与用户函数绑定起来。

## alpha.2：Tier 2 支撑能力（plot 为首个消费者）

alpha.2 把 v0.2 起的 **Tier 2 / Composite** 接入面（core-design §4.3：domain 包的高层节点，进 IR 持久化、compile 时经 `lowerComposites` 下沉成 Tier 1 Kernel）**做成可注册的展开管线**：每个 Tier 2 type（及其所属 domain 包）**注册自己的展开 / lowering 逻辑**，`compileToScene` 据注册表把 Tier 2 节点解析、展开成 Tier 1，core 自身仍不认识任何具体 chart / domain 语义。

`@retikz/plot` 是**首个消费者**——提供 axis / panel / mark 等 plot Tier 2 type 及其展开逻辑。本阶段只补「Tier 2 跑通所需的底层能力 + 接入边界」，不在 core 做 chart 本体。

### 需要提前具备的能力

| 能力                      | 作用                               | 说明                                                                                      |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| 坐标化层支持              | 承载多坐标系图表                   | 让 `Scope` / local coordinate 的使用方式更适合 plot 的 coordinate scope、axis、panel 结构 |
| Data / scale 接入面       | 让 plot 能带数据和映射             | 预留 dataRef、scale registry、encoding 之类的接入点，但不把 chart type 塞进 core          |
| Layer / z-order 语义      | 组织 guide、mark、annotation       | plot 需要稳定的层次叠加与可控顺序，继续复用现有 IR 顺序和 `zIndex` 语义                   |
| 可注册的展开管线          | 让 Tier 2 type 下沉成 Tier 1       | 把 `lowerComposites` 钩子泛化成「Tier 2 type → 展开函数」注册表，domain 包注册各自展开逻辑 |
| Anchor / locator 语义     | 让 guide、label、annotation 可引用 | plot 会大量依赖 axis、panel、datum、series 的定位与锚点引用                               |
| Text / guide / paint 基础 | 让图表能画出来                     | axis label、legend、grid、series fill、highlight region 都会用到现有基础能力              |

### 这部分不做什么

- 不在 v0.3 直接实现 `@retikz/plot` 本体。
- 不把 `lineChart` / `barChart` 这类 chart type 当成 core 的一等原语。
- 不把 scale / axis / encoding 的完整 API 直接塞进 `@retikz/core`。
- 不让 plot 绑定专属 renderer，仍然通过 core Scene 走 SVG / Canvas / Vanilla / React。

### 排期（alpha.2，紧接 renderer 出关之后）

renderer 架构（alpha.1）一稳，Tier 2 支撑就是下一段：

1. alpha.2 落「可注册展开管线」+ plot 所需的坐标化、锚点 / locator、层次 / z-order、数据接入面。
2. `@retikz/plot` 随后作为独立子包进场——注册自己的 Tier 2 type 与展开逻辑，不和 core 绑死。
3. 水合（alpha.3）、shape 参数化泛化（alpha.4）、时间轴动画（alpha.5，原「canvas/svg 能力补全」已退役，见 §动画）在其后。

## 后续方向：AI 增量渲染预留

AI 增量渲染不作为 v0.3 的正式交付能力，但 v0.3 拆 renderer / runtime / hydration / Tier 2 支撑时需要预留条件，避免后续重构。

后续目标是让 AI 可以按步骤输出图形内容，例如先渲染坐标轴，再渲染圆，再渲染角度、标签和说明，而不是等待完整图形一次性生成完。

v0.3 需要注意：

- renderer 输出应保留稳定 `data-retikz-id` 或等价定位信息。
- IR / lowering 应鼓励稳定 id、layer、`meta` 来源信息，方便后续按块更新。
- `@retikz/vanilla` 返回的 view 对象可以预留 `update(nextIr)` 这类整图更新入口，但不承诺 patch stream。
- SVG renderer 拆分时避免把“整图字符串输出”写死成唯一模式，后续应能扩展到局部 DOM 替换。
- Canvas renderer 首版可以全量重绘，但设计上不要阻断后续 layer canvas / dirty rect / hit-test cache。
- Tier 2 支撑中的 layer / mark / guide 来源信息，应为后续 progressive layer rendering 留空间。

正式的 Progressive IR / JSON Patch stream / append layer / AI step protocol / SVG 局部更新优化，放到 v0.4 或后续版本再设计和实现。

## 动画（A 时间轴动画 → v0.3-alpha.5 转正；B 数据过渡留 runtime + Tier 2）

> **2026-06-05 重排**：原拟 alpha.4「canvas/svg 能力补全」退役（alpha.1 已超额交付），本节 **A（时间轴动画）转正为 alpha.4**；B（数据过渡 / 形变）仍是 runtime + Tier 2 的后续候选，不进 core。
> **2026-06-06 顺延**：core shape 参数化泛化插入为 **v0.3-alpha.4**（见 [v0.3-alpha.4 roadmap](./alpha.4/roadmap.md)），本节 A（时间轴动画）顺延为 **v0.3-alpha.5**。

动画是「时间 → 属性插值」的纯数据，与水合的「事件 → handler 函数」正交：**声明式动画进 IR 持久化**（可序列化、SSR 可纯 CSS 自播、AI 可声明），**播放控制 / 事件触发留 runtime**（与水合同源，函数不进 IR）。排在水合之后，复用其 runtime 基建（rAF 循环、事件绑定）。

对标提炼：数据模型抄 **WAAPI**（keyframes + timing options），多端范式抄 **Lottie**（一份描述，SVG 走 WAAPI/CSS、Canvas 走 rAF 时间线），高层词汇抄 **Manim / Framer**（`drawOn` / `fadeIn` / `morph`），声明式时间轴 + 数学图动画词汇参照 **TikZ `animate` 库**——但**不绑 SMIL**（TikZ 动画仅 SVG、Canvas 上不存在，故 IR 保持 renderer 无关）。

分两块，机制不同、归属不同：

### A. 时间轴动画（core IR + renderer）—— v0.3-alpha.5

固定元素按时间打关键帧——入场（fadeIn / scaleIn）、路径画出（drawOn）、循环（pulse）、沿路径运动、镜头（动 IR 根 `viewBox`）。

- **IR（Kernel）**：元素加 `animations?: Array<AnimationTrack>`；`AnimationTrack = { property, keyframes: [{ at: 0..1, value, easing? }], duration, delay, easing, repeat, direction, fill, trigger }`。`property` 为 renderer 无关枚举（`opacity` / `fill` / `stroke` / `strokeWidth` / `translateX|Y` / `rotate` / `scale` / **`pathDraw` 0..1**）；关键帧时间归一化（抄 WAAPI offset，与 duration 解耦）；颜色按 oklch 插值。
- **`pathDraw` 用 0..1 进度而非 `dashOffset`**：SVG 翻成 `pathLength=1` + dashoffset、Canvas 按几何 lerp 部分路径——保持 renderer 无关。
- **`trigger` 是枚举/数据**：`load`（渲染即播，SSR 友好）/ `visible`（runtime 用 IntersectionObserver 实现）/ `manual`（runtime API 控）/ `{ onEvent }`（桥水合，runtime 绑事件）；**回调函数（onComplete 等）绝不进 IR，留 runtime**。
- **Sugar**：`drawOn` / `fadeIn` / `scaleIn` / `slideIn` / `pulse` / `loop` 展开成 track（react sugar + 共享 parser，配等价性测试）。
- **renderer 实现**：SVG 主走 WAAPI，`trigger:'load'` 额外 emit CSS `@keyframes`（零 JS / SSR）；Canvas `drawScene(ctx, scene, { time })` 加可选 `time` 参、runtime 跑 rAF 推进（additive，默认静态）。**motion-along-path 与 Scene 级共享时钟 / timeline 需一等**——编排式入场（如 D3 connected-scatterplot：线头画出 + 圆点同步移动 + 标签错峰浮现）要求多 track 走同一时钟。
- **静态截帧**（抄 TikZ `snapshot`）：`renderToSvgString(ir, { at: t })` / canvas `{ at: t }` 渲染某时刻一帧，供 SSR / Node 导出 / 封面。
- **layout / viewBox 按静止态算**，动画可瞬态溢出（不让动画影响 bbox，否则布局不可定）。

### B. 数据过渡 / 形变（runtime + Tier 2，本段只备注，排更后）

> 老数据 → 新数据的平滑过渡（柱子改高、折线 morph、饼图重分片，echarts / recharts 招牌）是 **keyed-diff + 几何插值**，机制不同于 A 的固定元素关键帧，**不做成持久化 IR 字段**（无"两个状态塞一份 IR"之理），是 **runtime + Tier 2** 的事，本段仅备注待决策：
>
> - **runtime**：给已预留的 `view.update(nextIr, { transition })` 入口加语义——按稳定 `id` diff IR_old/new，分 enter / update / exit；update 的元素**生成 `AnimationTrack` 喂给同一 renderer animator**（复用 A 的底座）。与「水合」「AI 增量渲染」共用 `update(nextIr)` 通道。
> - **Tier 2（plot）要做的**：① path morph 的形状插值算法（不同点数重采样，flubber / d3-interpolate-path 那类）是 **plot 包依赖、不进 core**（core 仅 zod）；新增 `pathMorph` track 类型，core 只认类型、不实现算法。② plot 须给数据绑定元素**派稳定 id**（datum key → 元素 id），diff 才配得上对（与 plot 的 locator / dataRef 接入面一致）。
>
> core 只背"可持久化的时间轴动画"（A）；"数据驱动的过渡 / 形变"（B）按 Tier 2 边界推给 plot + runtime，不撑爆 core 与 LLM schema。

## Alpha 切分（2026-06-01 按实际进度重排）

> 原计划把 renderer 架构拆成 alpha.1–alpha.7 七段递进。实际推进中,alpha.1 的 renderer 决策簇（[ADR-01](./alpha.1/01-svg-descriptor-contract.md) / [02](./alpha.1/02-canvas-renderer-and-react-canvas-mode.md) / [03](./alpha.1/03-vanilla-runtime-and-dependency-graph.md) / [04](./alpha.1/04-vanilla-imperative-builder.md)）一次定清,实现**提前贯通**了原 alpha.2（SVG 下沉）、alpha.6（React 双渲染模式）、alpha.7（Canvas MVP，且超额）与 alpha.3 的 SVG runtime。故此处把**已交付的都归入 alpha.1**,并对**剩余功能重新分段**。

### alpha.1 ✅ 已完成：renderer 架构出关（ADR-01/02/03/04 全部实现）

一次决策 + 实现贯通,交付 v0.3 renderer 架构核心(原 alpha.1/2/6/7 + alpha.3-SVG 合并于此;命令式 builder 亦归本段):

- **`@retikz/render/svg`**（[ADR-01](./alpha.1/01-svg-descriptor-contract.md)，原 alpha.1+2；并入 `@retikz/render` 见 [ADR-05](./alpha.1/05-renderer-repackage.md)）：framework-neutral `SvgNode` descriptor + `buildSvgDocument` / `renderToSvgString`；react SVG 渲染核心下沉、改消费 descriptor,现有 SVG 行为回归全绿;零 React 依赖。
- **`@retikz/render/canvas` + React 双渲染模式**（[ADR-02](./alpha.1/02-canvas-renderer-and-react-canvas-mode.md)，原 alpha.6+7）：`drawScene` / `renderToCanvas`（消费 Scene、不走 SVG 中转）；`<Layout renderer="svg"｜"canvas">`，默认 svg、无 breaking；**超额**——gradient / pattern / image / clip / marker 全部真实实现（含 currentColor / 主题响应 / 文本基线统一 / 弧扫描 / 尺寸对齐 SVG）。react 两路共用 `compileToScene` + `browserMeasurer`,同 Scene 保等价。
- **`@retikz/vanilla` SVG runtime + 依赖图**（[ADR-03](./alpha.1/03-vanilla-runtime-and-dependency-graph.md)，原 alpha.3-SVG）：`mountSvg` / `renderToSvgString` / `svgNodeToDom`（runtime 门面、组合 svg 内核,不复制）、12 测试绿；全直接依赖、无 optional peer。
- **vanilla 命令式 builder**（[ADR-04](./alpha.1/04-vanilla-imperative-builder.md)）：**alpha.1 的第 4 条 renderer ADR**——`figure`/`node`/`draw`/`coordinate`/`scope` + `Figure`,让无框架用户像 React 一样具名构图、产同一份 IR。**已实现**(`Figure` 含 `.toSvgString`/`.mount`/`.toCanvas`,vanilla 39 测试全绿)。

衡量标准（见§定位）已达：同一 IR 经 `compileToScene` 后被 SVG 与 Canvas 两条 renderer 消费；vanilla 无框架完成 SVG 渲染；SSR 拿到 SVG 字符串；`@retikz/react` 不再拥有 SVG 渲染核心。

### alpha.2 ✅ 已完成：Tier 2 支撑——可注册的 composite 展开管线（[ADR-01](./alpha.2/01-tier2-support.md)）

把 core-design §4.3 的 Tier 2 / Composite 接入面落地为**可注册的展开（lowering）管线**——domain 包注册「领域节点 schema + expand」，`compileToScene` 第一步据注册表把 Tier 2 节点下沉成 Tier 1 Kernel，core 仍零 chart 语义：

- **core（[ADR-01](./alpha.2/01-tier2-support.md)，red）**：`CompositeBaseSchema`（domain 用 zod `.extend()` 继承必填 `namespace` / `type`）+ `defineComposite({ schema, expand })`；`CompileOptions.composites` 注册表 + `lowerComposites`（compile 第一步，据 `${namespace}.${type}` 查表 → `schema.parse` → `expand` → 递归 fixpoint）；`ChildSchema` 由严格 4-way `discriminatedUnion` 放宽为 `union(core4 + 开放 composite 节点)`，**判别靠有无 `namespace`**（tier2 必有、core4 没有，core4 零改动）；未注册 namespace/type → `onWarn(COMPOSITE_NOT_REGISTERED)` + 跳过（非硬失败），环 / 超深度（默认 32、`maxCompositeDepth` 可配）才 throw。core 不内置任何 composite。
- **render**：零源码改动——Tier 2 已在 compile 期展开成 Scene，`./svg` / `./canvas` 消费同一 Scene；补 tier2 IR → Scene → svg/canvas 对照测试。
- **react / vanilla**：`<Layout composites>` 透传（react）/ `composites` 随 `& CompileOptions` 自动透传（vanilla）。
- **文档**：reference 新增「复合 / Composite」分组（extending 后 schema 前）+ Tier 2 节点页。
- **自测**：core 18 测试全绿（10 功能 + 8 对抗：注册校验 / 环 / 深度 / scope 嵌套 / 判别陷阱）。

**本段刻意收窄**（见 [ADR-01](./alpha.2/01-tier2-support.md) §不在本 ADR 范围）：`@retikz/plot` 本体（axis / panel / mark 等具体 Tier 2 节点及其 `expand`）→ 后续独立子包；`dataRef` / `scale registry` / `encoding` 接入面 → 划归 plot 包、不进 core；`<Composite>` JSX authoring 通道 / `expand` ctx / lowering 缓存 / vanilla `composite()` 糖 → [ADR-02](./alpha.2/02-composite-authoring-context-cache.md)（已采纳延后、未排期）。本段只交付「Tier 2 跑通所需的底层注册管线 + 端到端 fixture 验证 + runtime 透传」。

### alpha.3 ✅ 已完成：水合——SVG + Canvas 统一事件绑定（[ADR-01](./alpha.3/01-hydration.md)）

SSR / 静态先渲染出图，客户端把用户 handler 绑回图元——函数不进 IR、只在 runtime；SVG + Canvas 共用同一绑定语义，差异只在「如何把 pointer 事件定位到图元 id」这一定位层：

- **core（red）**：`IRPath` 新增可选 `id`（水合 / 引用挂点；Node / Coordinate / Scope 早有）；`ScenePrimitive` 加 `id?`，compile 把 user id stamp 到 emit 出的每个 top-level 图元（纯几何 Node 逐个平铺图元、文本 / rotate Node 的 GroupPrim、Path 的 PathPrim、Scope 的 GroupPrim）。
- **render（red）**：svg emit `data-retikz-id`；canvas 新增纯函数 `hitTest`（逆 z-order + 原生 `isPointInPath`/`isPointInStroke`，复用抽出的共享 `pathGeometry`）；新子路径 `@retikz/render/hydration`——`createHydrationController`（根级单 listener 委托 + `pointerEnter`/`pointerLeave` 经 **`pointermove` + 命中 id 状态机**合成，renderer 无关）+ `locateSvg`。
- **vanilla（red）**：`hydrate(root, { handlers })`（SVG，closest 委托）+ `mountCanvas(container, ir)`（无框架 canvas 直挂，view 自带 `hydrate`，client→Scene 逆 meet-fit 坐标映射 + hitTest 命中）。
- **react（red）**：Kernel `<Node>` / `<Path>` / `<Scope>` 加事件 props（`onClick` / `onDoubleClick` / `onRightClick` / `onPointerDown`·`Up`·`Move`·`Enter`·`Leave` / `onWheel`，全程命名、仅有 `id` 可绑，Coordinate 类型层排除）；`<Path id>`；`collectHydrationHandlers`（穿透 Fragment / 展开 Sugar / 无 id warn / 重复 id 合并）；`<Layout handlers>`（ir 模式）；**`renderer="svg"｜"canvas"` 双模 handler 等价**。
- **文档**：reference 新增「水合 / Hydration」单页（事件 props + vanilla hydrate / mountCanvas + 交互 demo）+ Path 页 `id` 行。
- **自测**：4 包全绿（core 1607 / render 83 / vanilla 56 / react 328）。Adversarial 两关——第一关修 1 BLOCKING（canvas enter/leave 用 over/out 合成失效 → 改 pointermove 状态机）+ W1（状态机抗 handler 异常）/ I1（stale JSDoc）；第二关 contract 对账无 BLOCKING。

**待决策落定**：#5 命名 = `hydrate`；#6 manifest = 不进 IR（挂点 = user id 存在性 + runtime handlers map）；#14 hit-test = 几何 pick + 原生 isPointInPath/Stroke。事件集对标 ECharts / Highcharts / Vega 无缺失（Pointer Events 统一 touch）。

**本段延后**：键盘 / 焦点 / a11y、拖拽 / brush / pan / 缩放手势编排、touch 多指、hit-test 空间索引性能优化、整图 leave hook、interaction manifest 外部导出。数据过渡 / 形变（keyed-diff + morph）归 [§动画 B](#动画a-时间轴动画--v03-alpha5-转正b-数据过渡留-runtime--tier-2)（runtime + Tier 2）。

### 后续分段（重新设计）

| 子版本         | 主题                | 内容                                                                                                                                                                                                                                    | 依赖 / 待决策                                                                                    |
| -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| v0.3.0-alpha.4 | shape 参数化泛化 | `Node.shape` 从 Rect-only 升为「type + 自定义 params」可注册扩展（passthrough + 泛型 `ShapeDefinition<TParams>` + 编译期 `paramsSchema.parse`）；内置形状参数化：circle/ellipse、arc/sector、rectangle/polygon、star（`diamond` ≡ polygon 别名）。详见 [v0.3-alpha.4 roadmap](./alpha.4/roadmap.md) | ADR-01 架构先行，02-05 各形状并发 |
| v0.3.0-alpha.5 | 时间轴动画（§动画 A 转正） | 元素 `animations?: Array<AnimationTrack>`（renderer 无关 property 枚举 + 归一化关键帧 + `trigger`）；SVG 走 WAAPI、`trigger:'load'` emit CSS `@keyframes`（零 JS / SSR）；Canvas `drawScene(…, { time })` + runtime rAF + 共享时钟编排；`drawOn` / `fadeIn` 等 sugar；静态截帧 `{ at: t }`。详见 §动画 A | core IR schema 扩展；多 track 共享时钟；layout 按静止态算 |
| v0.3.0-beta.1  | 体验加固 | 文档 demo、**SVG↔Canvas 对照 / parity 测试**（原 alpha.4 残值）、Node canvas / `@napi-rs` 服务端导出、包体与 public API 清理、release | — |

每段保持一个可验证闭环;切分可在开工前微调。

## 验收标准

- `@retikz/core` 仍然零 React、零 DOM、零 renderer runtime 依赖。
- `@retikz/svg` 可以不经 React 产出 SVG 输出。
- `@retikz/canvas` 可以不经 SVG 中转绘制同一份 Scene。
- `@retikz/vanilla` 可以在无框架浏览器环境中挂载 SVG / Canvas。
- `@retikz/vanilla` 可以在 SSR / Node 环境中直接产出 SVG 字符串。
- SSR / 静态 SVG 输出可以在客户端通过水合绑定事件函数。
- Canvas 渲染输出可以通过 hit-test 把 pointer 事件命中到图元 id 并绑定 handler，与 SVG 共用上层绑定语义。
- React props 形式的 handler 与 Vanilla 命令式 handler 共享同一套绑定语义（SVG / Canvas 皆然）。
- `@retikz/plot` 可以作为独立子包通过 lowering 接入 core，不需要 core 认识 chart type。
- plot 所需的 layer、locator / anchor、dataRef / scale 接入边界有明确 ADR 或接口草案。
- `@retikz/react` 支持 SVG 与 Canvas 两套渲染模式，且默认 SVG 兼容现有用户代码。
- 现有 SVG 文档 demo 在拆包后视觉与行为保持一致。
- 至少新增一组 SVG / Canvas 对照 demo，用于验证同 IR 多 renderer。
- Paint / clip / marker / text / group transform 这些 v0.2 重能力，在两个 renderer 下都有明确实现或明确、可诊断的降级。

## 不做

- 不把高级定位作为 v0.3 主线；projection / intersections / 完整 calc 可以另开后续版本或扩展包讨论。
- 不通过 SVG 字符串实现 Canvas renderer。
- 不把 Canvas-only API 塞进 Scene。
- 不在 `@retikz/react` 里复制一套 Canvas 绘制逻辑。
- 不让 `@retikz/vanilla` 变成第二套 renderer 内核；它只是组合 `@retikz/svg` / `@retikz/canvas` 的 runtime 入口。
- 不把函数、closure、framework ref 写进 IR。
- 不做完整应用框架式 hydration，只做 retikz 图元到 handler 的绑定。
- 不在 core 中实现 plot 本体或 chart type。
- 不启动 flow / graph domain 包。
- 不做可视化编辑器。

## 待决策

1. ~~`@retikz/svg` 的公开 API：只出 `renderToSvgString`，还是同时出 descriptor / React helper。~~ ✅ **已决（→ [alpha.1 ADR-01](./alpha.1/01-svg-descriptor-contract.md)）**：以 framework-neutral `SvgNode` descriptor 为核心,出 `buildSvgDocument` + `renderToSvgString`,公开 `SvgNode` 类型;**不出 React helper**（svg 包零 React 依赖,React 映射留在 `@retikz/react`）。同时解掉「`renderPrim` 拆 neutral builder + React binding」。
2. ~~`@retikz/canvas` 的公开 API：接收 IR、Scene，还是两者都支持。~~ ✅ **已决（→ [alpha.1 ADR-02](./alpha.1/02-canvas-renderer-and-react-canvas-mode.md)）**：**接收已编译 `Scene`**（与 svg 对称,`compile` 留 core/runtime）；`drawScene(ctx, scene)` 低层核心 + `renderToCanvas(canvas, scene)` 便利。不接 IR、不在包内 compile。
3. ~~`@retikz/vanilla` 是否直接 re-export `@retikz/svg` / `@retikz/canvas` 的核心 API，还是只提供 runtime 封装。~~ ✅ **已决（→ [alpha.1 ADR-03](./alpha.1/03-vanilla-runtime-and-dependency-graph.md)）**：**runtime 门面（组合）**——`renderToSvgString` 薄包 svg、`mountSvg` 经 `buildSvgDocument` + `svgNodeToDom` 物化 DOM；Scene→SVG 内核仍单一留 svg 包，不纯 re-export、不复制内核。
4. ~~`@retikz/vanilla` 是否同时覆盖 SVG DOM 挂载与 SSR 字符串输出，还是拆成更细入口。~~ ✅ **已决（→ [ADR-03](./alpha.1/03-vanilla-runtime-and-dependency-graph.md)）**：**单包多 named export**（`renderToSvgString` + `mountSvg` 同包）；Canvas 侧入口（`mountCanvas` / 导出）排 **alpha.3**（随 Canvas 水合一起，作其挂载基座；见 §Alpha 切分）。
5. 水合 API 命名：`hydrate` / `hydrateInteractions` / `bind` / `attachHandlers`。
6. interaction manifest 是否进入 IR，还是只作为 `renderToSvgString` 的 runtime options。
7. Tier 2 支撑（plot）应只写接口草案，还是在 v0.3 里落最小实现。
8. `lowerComposites` 是否足够支撑 plot，还是需要更明确的 domain lowering pipeline。
9. plot semantic locator（panel / axis / datum / series）应由 core 预留通用形态，还是完全留给 plot 包。
10. ~~React API 是否只用 `<Layout renderer="...">`，还是同时新增 `<SvgLayout>` / `<CanvasLayout>`。~~ ✅ **已决（→ [alpha.1 ADR-02](./alpha.1/02-canvas-renderer-and-react-canvas-mode.md)）**：**只用 `<Layout renderer="svg"｜"canvas">`**（默认 svg、additive、无 breaking）；不新增 `<SvgLayout>` / `<CanvasLayout>` 组件,缩小 API 面。
11. ~~Canvas 文本测量如何与现有 browser measurer 协作，是否需要把 measurer 再抽一层公共接口。~~ ✅ **已决（→ [ADR-02](./alpha.1/02-canvas-renderer-and-react-canvas-mode.md)）**：react canvas 路与 svg 路**共用同一 `compileToScene` + 同一 `browserMeasurer`** → 同一份 Scene → 两 renderer 等价;`drawScene` 收已编译 Scene、不自己测量。非 react 环境是否抽 measurer 公共接口留后续。
12. ~~Canvas 对 pattern / image / marker 的首版支持范围，以及哪些行为允许降级。~~ ✅ **已决（→ [ADR-02](./alpha.1/02-canvas-renderer-and-react-canvas-mode.md)）**：ADR 定"核心 primitives 真绘制 + 高级能力可诊断降级（不静默）";**实现超额**——gradient / pattern / image / clip / marker 已全部转真实 Canvas 实现（+ currentColor / 主题响应 / 文本基线统一 / 弧扫描方向 / 尺寸对齐 SVG），无降级遗留。
13. ~~包依赖方向：`@retikz/react` 是否直接依赖 `@retikz/svg` / `@retikz/canvas` / `@retikz/vanilla`，还是把 Canvas 作为可选 peer 以控制默认安装体积。~~ ✅ **已决（→ [ADR-03](./alpha.1/03-vanilla-runtime-and-dependency-graph.md)）**：**全直接依赖、无 optional peer**（react → core/svg/canvas；vanilla → core/svg/canvas；react 不依赖 vanilla）。canvas 仅 core 依赖、极轻，dual-renderer 零配置优先；体积靠 renderer 已拆包的 tree-shaking，optional peer 留 v0.4 再议。
14. **Canvas 水合 hit-test 策略**（alpha.3，Canvas 一起上后新增）：`pointer(x,y) → 图元 id` 怎么实现——(a) 几何 point-in-shape 测试（用 Scene primitive 几何 + bbox 预筛）；(b) 离屏 pick canvas（每图元唯一色重绘一遍，读 (x,y) 像素反查 id，需同步重绘）；(c) bbox 空间索引（quadtree / R-tree，先粗筛再精测）。命中口径（描边宽容差 / 透明填充是否可点 / z-order 取最上层）一并在 alpha.3 ADR 定。

## 备注

公开博客中曾写过"v0.3 上高级定位，v0.4 引入 TikZ libraries 与 decorations"。本文件先记录一次候选路线调整：v0.2 已补齐大部分通用定位能力，v0.3 至少应包含 renderer 架构拆分；高级定位类能力是否仍作为 v0.3 另一部分，需要后续和完整 v0.3 总计划一起讨论。
