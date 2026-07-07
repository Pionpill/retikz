import type { Release } from '../types';

export const kernelV03: Release = {
  minor: 'v0.3',
  stableDate: '2026-06-15',
  packages: [
    {
      pkg: '@retikz/render',
      version: 'v0.3',
      description: {
        zh: '新包：渲染后端命名空间，子路径 ./svg（Scene → SVG descriptor / 字符串）、./canvas（Scene → Canvas 2D），由原 @retikz/svg + @retikz/canvas 合并而来，承接原 React 包的 SVG 渲染核心。',
        en: 'New package: a render-backend namespace — subpaths ./svg (Scene → SVG descriptor / string) and ./canvas (Scene → Canvas 2D), merged from the former @retikz/svg + @retikz/canvas.',
      },
      highlights: [
        {
          label: { zh: 'framework-neutral SVG descriptor', en: 'Framework-neutral SVG descriptor' },
          content: {
            zh: '`./svg` 出 framework-neutral `SvgNode` descriptor + `buildSvgDocument` / `renderToSvgString`，零 React 依赖；React / Vanilla / SSR 共用同一 Scene→SVG 内核。',
            en: '`./svg` exposes a framework-neutral `SvgNode` descriptor + `buildSvgDocument` / `renderToSvgString`, zero React dependency; React / Vanilla / SSR share one Scene→SVG core.',
          },
        },
        {
          label: { zh: 'Canvas 2D 后端', en: 'Canvas 2D backend' },
          content: {
            zh: '`./canvas` 出 `drawScene` / `renderToCanvas`，直接消费 Scene、不走 SVG 中转；gradient / pattern / image / clip / marker 全部真实绘制（含 currentColor / 主题响应 / 弧扫描 / 尺寸对齐 SVG）。',
            en: '`./canvas` exposes `drawScene` / `renderToCanvas`, consuming the Scene directly with no SVG round-trip; gradient / pattern / image / clip / marker are all really drawn (incl. currentColor / theme response / arc sweep / size parity with SVG).',
          },
        },
        {
          label: { zh: '子路径分包', en: 'Subpath packaging' },
          content: {
            zh: 'svg / canvas 走子路径 `@retikz/render/svg` / `@retikz/render/canvas`，互不依赖；为后续 `./webgl` 预留命名空间。',
            en: 'svg / canvas live at subpaths `@retikz/render/svg` / `@retikz/render/canvas`, mutually independent; the namespace reserves room for a future `./webgl`.',
          },
        },
      ],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-06-14',
          summary: {
            zh: '候选发布：公开 API 冻结（IR schema 字段名 / 导出名 / 函数签名 / 公开 type 自此不再破坏性变更）。自 beta.2 起 core 组 src 零功能改动，进入发布候选。',
            en: 'Release candidate: the public API freezes here (IR schema field names / exports / function signatures / public types take no breaking changes from now). No functional source change across the core group since beta.2 — this is the release candidate.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-06-13',
          summary: {
            zh: '动画双端一致性收口：SVG 与 Canvas 在 pathDraw 估长、镜头 track 过滤、keyframe 段内 easing、静态截帧口径与 stop 末态上对齐；行级透明度改用 fill-opacity，oklch 颜色保留 alpha 通道。',
            en: 'Dual-backend animation consistency: SVG and Canvas now align on pathDraw length estimation, camera-track filtering, per-keyframe easing, snapshot semantics, and stop end-state; per-line opacity switches to fill-opacity and oklch colors keep their alpha channel.',
          },
          items: [],
        },
        {
          version: 'beta.1',
          date: '2026-06-12',
          summary: {
            zh: '收口 + 内部收敛：新增 Node Canvas 图片导出入口与 Canvas 动画触发桥；根 `<svg>` 的 width/height 结构化写入（去字符串正则注入）；修复 SVG marker group transform 与 canvas 文本缺省 fill；大量后端无关纯函数（颜色 / 适配矩阵 / clip / 渐变 / 几何）抽到 shared 并补锁定测试。',
            en: 'Cleanup + internal consolidation: adds a Node Canvas image-export entry and a Canvas animation-trigger bridge; root `<svg>` width/height written structurally (no string-regex injection); fixes the SVG marker group transform and canvas default text fill; many backend-agnostic pure functions (color / fit matrix / clip / gradient / geometry) extracted to shared with lock tests.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-07',
          summary: {
            zh: '时间轴动画播放：SVG（load→CSS `@keyframes` 零 JS 自播 / 交互→WAAPI）+ Canvas（`drawScene({time})` 逐帧）+ 共享 `evaluateTrack` 求值引擎 + rAF runtime；水合 handler 升 `(event, context)` 富上下文；静态截帧 `snapshotAt` + canvas per-id 虚拟时钟。',
            en: 'Timeline animation playback: SVG (load→CSS `@keyframes` zero-JS autoplay / interactive→WAAPI) + Canvas (`drawScene({time})` per-frame) + a shared `evaluateTrack` engine + an rAF runtime; the hydration handler upgrades to `(event, context)` rich context; static snapshot `snapshotAt` + a canvas per-id virtual clock.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-07',
          summary: {
            zh: '无源码改动：新形状（polygon / star / arc / sector）与圆角经 compile emit 出既有 `PathPrim` / `RectPrim` / `EllipsePrim`，renderer 消费同一 Scene 不变；`meta` 被忽略（不进 DOM）。补 meta 对照测试，随四包 version lockstep 对齐。',
            en: 'No source change: new shapes (polygon / star / arc / sector) and corner rounding emit existing `PathPrim` / `RectPrim` / `EllipsePrim` at compile time, so renderers consume the same Scene unchanged; `meta` is ignored (never reaches the DOM). A meta parity test is added, aligned under the four-package version lockstep.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-05',
          summary: {
            zh: '水合定位层：svg emit `data-retikz-id`、canvas 新增 `hitTest`（逆 z-order + isPointInPath/Stroke），并新增 renderer 无关的 `@retikz/render/hydration` 子路径（根级委托 + enter/leave 合成）；canvas 几何抽成共享 `pathGeometry`。',
            en: 'Hydration locating layer: svg emits `data-retikz-id`, canvas gains `hitTest` (reverse z-order + isPointInPath/Stroke), plus a renderer-agnostic `@retikz/render/hydration` subpath (root delegation + enter/leave synthesis); canvas geometry is extracted into a shared `pathGeometry`.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-02',
          summary: {
            zh: '无源码改动：Tier 2 已在 compile 期展开成 Tier 1 → Scene，`./svg` / `./canvas` 消费同一 Scene 不变；仅补 tier2 IR → Scene → svg/canvas 对照测试，随四包 version lockstep 对齐。',
            en: 'No source change: Tier 2 is lowered to Tier 1 → Scene at compile time, so `./svg` / `./canvas` consume the same Scene unchanged; only a tier2 IR → Scene → svg/canvas parity test is added, aligned under the four-package version lockstep.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-02',
          summary: {
            zh: '首发：把原 @retikz/svg + @retikz/canvas 合并为 @retikz/render（子路径 ./svg / ./canvas），承接原 React 包的 SVG 渲染核心；Canvas 后端能力超额（gradient / pattern / image / clip / marker 全实现）。',
            en: 'First release: merge the former @retikz/svg + @retikz/canvas into @retikz/render (subpaths ./svg / ./canvas), taking over the React package’s SVG render core; the Canvas backend over-delivers (gradient / pattern / image / clip / marker all implemented).',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/vanilla',
      version: 'v0.3',
      description: {
        zh: '新包：framework-free runtime / SSR。不提供 JSX DSL，只消费 IR / Scene；组合 @retikz/render 内核完成无框架 DOM 挂载与服务端 SVG 字符串输出，并提供命令式具名 builder。',
        en: 'New package: a framework-free runtime / SSR entry. No JSX DSL — it consumes IR / Scene, composing the @retikz/render core for DOM mounting and SSR SVG output, plus an imperative builder.',
      },
      highlights: [
        {
          label: { zh: '无框架 runtime + SSR', en: 'Framework-free runtime + SSR' },
          content: {
            zh: '`mountSvg(container, ir)` 浏览器 DOM 挂载、`renderToSvgString(ir)` 服务端 / 构建期产 SVG 字符串；组合 render 的 svg 内核，不复制渲染逻辑。',
            en: '`mountSvg(container, ir)` mounts into the browser DOM; `renderToSvgString(ir)` produces an SVG string on the server / at build time; composes render’s svg core without duplicating render logic.',
          },
        },
        {
          label: { zh: '命令式具名 builder', en: 'Imperative named builder' },
          content: {
            zh: '`figure` / `node` / `draw` / `coordinate` / `scope` + `Figure`，让无框架用户像 React 一样具名构图、产同一份 IR；`Figure` 自带 `.toSvgString` / `.mount` / `.toCanvas`。',
            en: '`figure` / `node` / `draw` / `coordinate` / `scope` + `Figure` let framework-free users compose by name like in React, producing the same IR; `Figure` carries `.toSvgString` / `.mount` / `.toCanvas`.',
          },
        },
      ],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-06-14',
          summary: {
            zh: '候选发布：公开 API 冻结（IR schema 字段名 / 导出名 / 函数签名 / 公开 type 自此不再破坏性变更）。自 beta.2 起 core 组 src 零功能改动，进入发布候选。',
            en: 'Release candidate: the public API freezes here (IR schema field names / exports / function signatures / public types take no breaking changes from now). No functional source change across the core group since beta.2 — this is the release candidate.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-06-13',
          summary: {
            zh: '对齐 React 与收口：`mountCanvas` 落地 `snapshotAt` 定格截帧；onEvent 水合随 `view.update()` 重建（换图后触发不再陈旧）、`dispose` 统一解绑水合；`FigureConfig` 补根级 `animations` 与级联样式默认；visible-trigger 的 scroll / resize 改 rAF 合帧去抖。',
            en: 'Parity with React and cleanup: `mountCanvas` implements `snapshotAt` freeze-frame; onEvent hydration rebuilds on `view.update()` (triggers no longer stale after a scene swap) and `dispose` unbinds hydrations uniformly; `FigureConfig` gains root-level `animations` and cascading style defaults; visible-trigger scroll / resize now coalesce via rAF.',
          },
          items: [],
        },
        {
          version: 'beta.1',
          date: '2026-06-12',
          summary: {
            zh: '对齐 React 表达力：`Figure` 补 `mountCanvas` 交互挂载、`scope` 接 children 数组；index 补齐 `DrawWay` / 扩展面 / `way` 类型透传（对齐 React）。',
            en: 'Parity with React: `Figure` gains `mountCanvas` interactive mounting and `scope` accepting a children array; the index re-exports `DrawWay` / extension surfaces / `way` types (parity with React).',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-07',
          summary: {
            zh: '无框架动画播放：`mountSvg`（CSS 自播 + WAAPI 桥）/ `mountCanvas`（rAF 时钟逐帧），`view.animation` 命令式句柄；水合升 `(event, context)` 富上下文 + `view.hydrate` / standalone `hydrate`；静态截帧 `snapshotAt`；canvas per-id 虚拟时钟。',
            en: 'Framework-free animation playback: `mountSvg` (CSS autoplay + WAAPI bridge) / `mountCanvas` (rAF per-frame clock), an imperative `view.animation` handle; hydration upgrades to `(event, context)` rich context via `view.hydrate` / standalone `hydrate`; static snapshot `snapshotAt`; a canvas per-id virtual clock.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-07',
          summary: {
            zh: '无源码改动：`node` / `draw` / `scope` 的 config 是 `Omit<IR…>` 派生，core 新增的 shape `{ type, params }` / `boundary` / `cornerRadius` / `meta` 字段经类型自动透传；随四包 version lockstep 对齐。',
            en: "No source change: the `node` / `draw` / `scope` configs derive from `Omit<IR…>`, so core's new shape `{ type, params }` / `boundary` / `cornerRadius` / `meta` fields pass through automatically by type; aligned under the four-package version lockstep.",
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-05',
          summary: {
            zh: '无框架水合：新增 `hydrate(root, { handlers })`（SVG 水合，根级 closest 委托）+ `mountCanvas(container, ir)`（无框架 canvas 直挂，view 自带 `hydrate`，client→Scene 逆 meet-fit 坐标映射 + hitTest 命中）。',
            en: 'Framework-free hydration: a new `hydrate(root, { handlers })` (SVG hydration via root-level closest delegation) + `mountCanvas(container, ir)` (framework-free canvas mount whose view carries `hydrate`, with client→Scene reverse meet-fit coordinate mapping + hitTest).',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-02',
          summary: {
            zh: 'Tier 2 透传：`composites` 随 `CommonOptions = { … } & CompileOptions` 自动透传到 `compileToScene`，无框架 / SSR 渲染含 tier2 节点的 IR 无需额外接线。',
            en: 'Tier 2 passthrough: `composites` flows automatically to `compileToScene` via `CommonOptions = { … } & CompileOptions`; framework-free / SSR rendering of IR with tier2 nodes needs no extra wiring.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-02',
          summary: {
            zh: '首发：SVG runtime 门面（`mountSvg` / `renderToSvgString` / `svgNodeToDom`，组合 render 内核、不复制）+ 命令式 builder（`figure`/`node`/`draw`/`coordinate`/`scope` + `Figure`）。全直接依赖、无 optional peer。',
            en: 'First release: an SVG runtime façade (`mountSvg` / `renderToSvgString` / `svgNodeToDom`, composing the render core without duplication) + an imperative builder (`figure`/`node`/`draw`/`coordinate`/`scope` + `Figure`). All direct deps, no optional peer.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/react',
      version: 'v0.3',
      description: {
        zh: 'SVG 渲染核心下沉到 @retikz/render，React 只保留 DSL / IR 构建 / 生命周期与渲染模式选择；新增 `<Layout renderer="svg"｜"canvas">` 双渲染模式，默认 svg、无 breaking。',
        en: 'The SVG render core moves to @retikz/render; React keeps the DSL / IR build / lifecycle / render-mode choice and adds a `<Layout renderer>` svg|canvas dual mode (svg default, no breaking).',
      },
      highlights: [
        {
          label: { zh: '双渲染模式', en: 'Dual render mode' },
          content: {
            zh: '`<Layout renderer="svg"｜"canvas">`，两路共用同一 `compileToScene` + `browserMeasurer`，同 Scene 保等价；默认 svg，现有代码零改动。',
            en: '`<Layout renderer="svg"｜"canvas">`, both paths sharing one `compileToScene` + `browserMeasurer` for an equivalent Scene; defaults to svg, existing code unchanged.',
          },
        },
        {
          label: { zh: 'SVG 核心下沉', en: 'SVG core moved out' },
          content: {
            zh: 'React 不再拥有 SVG 渲染核心，改消费 `@retikz/render/svg` 的 `SvgNode` descriptor，只做 descriptor→React element 绑定。',
            en: 'React no longer owns the SVG render core; it consumes the `SvgNode` descriptor from `@retikz/render/svg` and only binds descriptor→React element.',
          },
        },
      ],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-06-14',
          summary: {
            zh: '候选发布：公开 API 冻结（IR schema 字段名 / 导出名 / 函数签名 / 公开 type 自此不再破坏性变更）。自 beta.2 起 core 组 src 零功能改动，进入发布候选。',
            en: 'Release candidate: the public API freezes here (IR schema field names / exports / function signatures / public types take no breaking changes from now). No functional source change across the core group since beta.2 — this is the release candidate.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-06-13',
          summary: {
            zh: '水合与收集修复：`<Scope>` 内元素、形状 Sugar 的事件在常见写法下不再静默失效；`<Path>` / `<Node>` 的 children 收集穿透 `React.Fragment`（条件渲染不再丢段或误报）；显式 rotate 不再二次旋转，canvas 换图正确重渲。',
            en: 'Hydration and collection fixes: events on elements inside `<Scope>` and on shape Sugar no longer silently fail in common usage; `<Path>` / `<Node>` child collection penetrates `React.Fragment` (conditional rendering no longer drops segments or misreports); explicit rotate is no longer double-applied, and canvas re-renders correctly on scene swap.',
          },
          items: [],
        },
        {
          version: 'beta.1',
          date: '2026-06-12',
          summary: {
            zh: 'API 收口：移除 `<Circle>` / `<Ellipse>` 的 `boundingBox` 别名 prop，统一用 `box`；一条 path 上出现多个 `EdgeLabel` 时 dev 下告警。0.x 不留别名，旧 `boundingBox` 需改名。',
            en: 'API cleanup: removes the `boundingBox` alias prop on `<Circle>` / `<Ellipse>`, unifying on `box`; warns in dev when a single path carries multiple `EdgeLabel`s. As a 0.x release no alias is kept — old `boundingBox` must be renamed.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-07',
          summary: {
            zh: '`<Layout>` 接通动画：`animate` / `animations`(镜头) / `easings` / `animationProperties` / `snapshotAt` / `animationRef` props；Kernel 事件 handler 升 `(event, context)` 富上下文；canvasHost rAF 时钟 + per-id；re-export 14 个 preset 与动画扩展类型。',
            en: '`<Layout>` wires up animation: `animate` / `animations` (camera) / `easings` / `animationProperties` / `snapshotAt` / `animationRef` props; Kernel event handlers upgrade to `(event, context)` rich context; canvasHost rAF clock + per-id; re-exports the 14 presets and animation extension types.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-07',
          summary: {
            zh: 'Kernel `<Node>` 跟进 core shape 泛化：`shape` 接受 `{ type, params }`、新增 `boundary` / `cornerRadius`（rename）/ `meta` props；均经 builder 字段表透传，vanilla 经 `Omit<IR>` config 自动同步。',
            en: 'Kernel `<Node>` follows the core shape generalization: `shape` accepts `{ type, params }`, plus new `boundary` / `cornerRadius` (renamed) / `meta` props; all forwarded via the builder field table, vanilla auto-synced through its `Omit<IR>` config.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-05',
          summary: {
            zh: '水合事件：Kernel `<Node>` / `<Path>` / `<Scope>` 加事件 props（`onClick` / `onDoubleClick` / `onRightClick` / `onPointerDown`·`Up`·`Move`·`Enter`·`Leave` / `onWheel`），`<Path>` 加 `id` prop，`<Layout handlers>`（ir 模式）；`renderer="svg"｜"canvas"` 双模 handler 等价，handler 不进 IR、只在 runtime。',
            en: 'Hydration events: Kernel `<Node>` / `<Path>` / `<Scope>` gain event props (`onClick` / `onDoubleClick` / `onRightClick` / `onPointerDown`·`Up`·`Move`·`Enter`·`Leave` / `onWheel`), `<Path>` gains an `id` prop, plus `<Layout handlers>` (ir mode); handlers are equivalent across `renderer="svg"｜"canvas"`, never entering IR and living only at runtime.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-02',
          summary: {
            zh: 'Tier 2 透传：`<Layout>` 加可选 `composites` prop，与 `shapes` / `arrows` 同一行透传给 `compileToScene`；含 tier2 节点的 IR 经 `<Layout ir>` 直喂即可渲染。',
            en: 'Tier 2 passthrough: `<Layout>` gains an optional `composites` prop, forwarded to `compileToScene` alongside `shapes` / `arrows`; IR containing tier2 nodes renders when fed via `<Layout ir>`.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-02',
          summary: {
            zh: 'renderer 架构出关：SVG 渲染核心下沉 @retikz/render，依赖从 @retikz/svg + @retikz/canvas 改为单一 @retikz/render；新增 `<Layout renderer>` 双渲染模式（默认 svg、additive、无 breaking）。',
            en: 'Renderer architecture lands: the SVG render core moves to @retikz/render, deps switch from @retikz/svg + @retikz/canvas to a single @retikz/render; adds the `<Layout renderer>` dual mode (svg default, additive, no breaking).',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/core',
      version: 'v0.3',
      description: {
        zh: 'v0.3：renderer 架构出关（alpha.1，core 无 API 变更）后，alpha.2 新增 Tier 2 支撑——可注册的 composite 展开管线（`composites` 注册表 + `lowerComposites`），core 仍零 React / DOM / renderer 依赖、零 chart 语义。',
        en: 'v0.3: after the renderer architecture (alpha.1), alpha.2 adds Tier 2 support — a composite lowering pipeline (`composites` + `lowerComposites`); core stays zero React / DOM / chart semantics.',
      },
      highlights: [
        {
          label: { zh: 'Tier 2 / Composite 支撑', en: 'Tier 2 / Composite support' },
          content: {
            zh: 'core-design §4.3 的 Tier 2 接入面落地为可注册展开管线：`CompositeBaseSchema` + `defineComposite` + `CompileOptions.composites`，`compileToScene` 第一步 `lowerComposites` 把领域高层节点下沉成 Tier 1；`@retikz/plot` 为首个消费者（独立包，不进 core）。',
            en: 'The Tier 2 surface from core-design §4.3 lands as a registrable lowering pipeline: `CompositeBaseSchema` + `defineComposite` + `CompileOptions.composites`; `compileToScene`’s first step `lowerComposites` lowers domain high-level nodes to Tier 1; `@retikz/plot` is the first consumer (a standalone package, not in core).',
          },
        },
        {
          label: { zh: 'Scene 契约多 renderer 验证', en: 'Scene contract validated across renderers' },
          content: {
            zh: 'v0.2 打下的 renderer-agnostic Scene 契约在 alpha.1 被 SVG 与 Canvas 两条后端同时消费，验证 core 不需为单一 renderer 让步。',
            en: 'The renderer-agnostic Scene contract from v0.2 is consumed by both the SVG and Canvas backends in alpha.1, confirming core need not concede to any single renderer.',
          },
        },
      ],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-06-14',
          summary: {
            zh: '候选发布：公开 API 冻结（IR schema 字段名 / 导出名 / 函数签名 / 公开 type 自此不再破坏性变更）。自 beta.2 起 core 组 src 零功能改动，进入发布候选。',
            en: 'Release candidate: the public API freezes here (IR schema field names / exports / function signatures / public types take no breaking changes from now). No functional source change across the core group since beta.2 — this is the release candidate.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-06-13',
          summary: {
            zh: 'beta.2 行为对齐与收口：中段 mark 随 `strokeWidth` 缩放（与端点箭头统一 TikZ 语义）并支持 rectangle / cycle 段；compass anchor 按 shape 区分（圆 / 椭圆贴曲线、其余落 AABB，与 TikZ 一致）；minimum 尺寸改 TikZ 语义（随 scale 缩 + floor 外接框）；schema 收紧（Path / Coordinate / Scope strict、`bendAngle` 限 (-180,180)）；升级 zod v4。',
            en: 'beta.2 behavior alignment and cleanup: mid-path marks scale with `strokeWidth` (unified with endpoint arrows, TikZ semantics) and support rectangle / cycle segments; compass anchors resolve per shape (circle / ellipse on the curve, others on the AABB, matching TikZ); minimum size uses TikZ semantics (scales with scale + floors to the bounding box); tighter schema (Path / Coordinate / Scope strict, `bendAngle` limited to (-180,180)); upgraded to zod v4.',
          },
          items: [],
        },
        {
          version: 'beta.1',
          date: '2026-06-12',
          summary: {
            zh: 'v0.3 进入 beta：能力收口、对齐 TikZ 语义、批量内部收敛与 bug 修复，无新增大特性。`outerSep` 对齐 TikZ outer sep（外推所有 border anchor 并计入布局占位）；新增 `scope` `between` 平移与 `openStealth` 空心箭头；折角 step 判别值 `step`→`fold`；节点文本支持 `\\n` 硬换行。',
            en: 'v0.3 enters beta: capability cleanup, TikZ-semantics alignment, batch internal consolidation and bug fixes, no new major features. `outerSep` aligns with TikZ outer sep (pushes every border anchor outward and counts it into layout); adds `scope` `between` translation and the `openStealth` hollow arrow; the fold step discriminator `step`→`fold`; node text supports `\\n` hard line breaks.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-07',
          summary: {
            zh: '时间轴动画进 IR：声明式 `AnimationTrack`（关键帧 + 时长 / 缓动 / 触发器 timing）+ 元素与 scene 根 `animations?`，编译沿 id-stamp 通路透传进 Scene；14 个具名 preset 工厂。纯数据、可序列化、settled 降级、AI 友好。',
            en: 'Timeline animation enters the IR: a declarative `AnimationTrack` (keyframes + duration / easing / trigger timing) plus element and scene-root `animations?`, stamped into the Scene along the id-stamp path; 14 named preset factories. Pure data, serializable, settled degradation, AI-friendly.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-07',
          summary: {
            zh: 'shape 参数化泛化：`Node.shape` 升为 `string | { type, params }` 可注册扩展；内置形状参数化 + 新增 regular polygon / star / arc / sector；连接面 `boundary` 与视觉形状解耦；统一圆角 `cornerRadius`（rename `roundedCorners`）；新增 `meta` provenance 透传。',
            en: 'Shape parameterization: `Node.shape` becomes `string | { type, params }` (registrable); built-in shapes parameterized + new polygon / star / arc / sector; connection surface `boundary` decoupled from the visual shape; unified `cornerRadius` (was `roundedCorners`); new `meta` provenance passthrough.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-05',
          summary: {
            zh: '水合挂点：`IRPath` 新增可选稳定 `id`（水合 / 引用挂点）；`ScenePrimitive` 加 `id?`，compile 把 user id stamp 到 emit 出的图元——纯几何 Node 逐个平铺图元、文本 / rotate Node 的 group、Path、Scope 都带上 id。',
            en: 'Hydration hooks: `IRPath` gains an optional stable `id` (a hydration / reference hook); `ScenePrimitive` gains `id?`, and compile stamps the user id onto emitted primitives — each tiled primitive of a plain-geometry Node, the group of a text / rotate Node, the Path, and the Scope all carry it.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-02',
          summary: {
            zh: 'Tier 2 支撑：可注册的 composite 展开管线——domain 包（plot 等）注册「领域节点 schema + expand」，compileToScene 第一步据注册表把复合节点下沉成 Tier 1 Kernel；core 仍零 chart 语义。',
            en: 'Tier 2 support: a registrable composite lowering pipeline — domain packages (plot, etc.) register a "domain-node schema + expand"; compileToScene lowers Tier 2 nodes to Tier 1 Kernel as its first step, while core keeps zero chart semantics.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-02',
          summary: {
            zh: 'version lockstep 对齐到 0.3.0-alpha.1，无 IR / 公开 API 变更；与 0.2.0-beta.2 行为一致。',
            en: 'Aligned to 0.3.0-alpha.1 under version lockstep, with no IR / public-API change; behavior identical to 0.2.0-beta.2.',
          },
          items: [],
        },
      ],
    },
  ],
};
