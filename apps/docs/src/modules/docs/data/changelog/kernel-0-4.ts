import type { Release } from '../types';

import { esmOnlyChangeItem } from './esm-only';

export const kernelV04: Release = {
  minor: 'v0.4',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/math',
      version: 'v0.4',
      description: {
        zh: '新包：零依赖纯计算几何（向量 / 仿射 / arc 原语 / 求交 / 三角形内外接圆 / 点在多边形 / 凸包 / 最小外接圆 / 曲线）。纯函数 + 普通对象，零 IR、零 zod、不写 class；被 core 正向依赖、与 core 组同 lockstep。',
        en: 'New zero-dependency geometry package: vectors, affine transforms, arcs, intersections, triangle circles, point-in-polygon, convex hull, enclosing circles, and curves. No IR, Zod, or classes.',
      },
      highlights: [
        {
          label: { zh: '纯几何 API', en: 'Pure geometry API' },
          content: {
            zh: '命名空间风格 `point` / `transform` / `arc` / `intersect` / `circle` / `triangle` / `polygon` / `convexHull`；core 几何的单一真源（`Position` / `DEFAULT_EPSILON` 迁此）。',
            en: 'Namespace-style `point` / `transform` / `arc` / `intersect` / `circle` / `triangle` / `polygon` / `convexHull`; the single source of truth for core geometry (`Position` / `DEFAULT_EPSILON` moved here).',
          },
        },
      ],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-07-19',
          summary: {
            zh: '候选发布：纯几何公开 API 自此冻结；自 beta.2 起无功能改动。',
            en: 'Release candidate: the public geometry API freezes here, with no functional changes since beta.2.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-07-14',
          summary: {
            zh: '修正 `intersect.lineCircle` 的退化方向判断：短但有效的方向向量现在与其单位化写法得到相同交点，不再因向量缩放误返回空结果。',
            en: 'Fixes degenerate-direction detection in `intersect.lineCircle`: short but valid direction vectors now produce the same intersections as their normalized form instead of incorrectly returning no hits.',
          },
          items: [esmOnlyChangeItem],
        },
        {
          version: 'alpha.3',
          date: '2026-06-16',
          summary: {
            zh: '开 `curve/` 子模块：`catmullRomToCubic`（centripetal Catmull-Rom → cubic 贝塞尔），供 core 的 smooth step 编译过点平滑曲线。',
            en: 'Opens the `curve/` submodule: `catmullRomToCubic` (centripetal Catmull-Rom → cubic Bézier), powering core’s smooth step.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-15',
          summary: {
            zh: '新增 `circle.minimalEnclosing`（Welzl）——点集最小外接圆，供 core scope 的 circle 包络。',
            en: 'Adds `circle.minimalEnclosing` (Welzl) — the minimal enclosing circle of a point set, powering core’s circle scope envelope.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-14',
          summary: {
            zh: '新建 `@retikz/math` 包：core 纯几何（向量 / 仿射 / arc 原语 / 私有求交）下沉至此，新增三角形内外接圆 / 点在多边形 / 凸包等能力。',
            en: 'New `@retikz/math` package: core’s pure geometry (vectors / affine / arc primitives / private intersections) sinks here, plus new triangle in-circle / circum-circle helpers / point-in-polygon / convex hull.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/core',
      version: 'v0.4',
      description: {
        zh: 'v0.4 纵向底座深化：纯几何下沉 `@retikz/math`、Tier2 可嵌入机制、path 文法补强（折线圆角 + 过点平滑曲线）、任意轮廓 contour shape，以及可扩展 Path kind / ribbon 带状关系路径。',
        en: 'v0.4 deepens the base: `@retikz/math` geometry, embeddable Tier2, stronger path grammar, contour shape, extensible Path kinds, and ribbon relation paths.',
      },
      highlights: [
        {
          label: { zh: '路径补强', en: 'Path reinforcement' },
          content: {
            zh: '`<Path roundedCorners>` 折线几何圆角；`smooth` step 过点平滑曲线；两者编译期只产既有 PathCommand，renderer 零改动。',
            en: '`<Path roundedCorners>` geometric corner rounding; a `smooth` step for curves through points; both compile to existing PathCommands only, with no renderer change.',
          },
        },
        {
          label: { zh: 'contour shape', en: 'contour shape' },
          content: {
            zh: '任意闭合顶点环作 Node 形状，自动按 AABB 中心居中，经 `boundaryPoint` 与 rectangle / sector 同等可连接。',
            en: 'An arbitrary closed vertex ring as a Node shape, auto-centered on its AABB center, as connectable as rectangle / sector via `boundaryPoint`.',
          },
        },
        {
          label: { zh: 'Path kind / ribbon', en: 'Path kind / ribbon' },
          content: {
            zh: '`Path.kind` 成为一等 provider contract；内置 `ribbon` kind 表达可变宽度带状关系路径，仍 lower 为普通 `PathPrim`。',
            en: '`Path.kind` becomes a first-class provider contract; the built-in `ribbon` kind describes variable-width relation bands while still lowering to ordinary `PathPrim`.',
          },
        },
      ],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-07-19',
          summary: {
            zh: '候选发布：在本轮 boundary 行为修正中补齐 shape-aware 规则连接面拟合与有符号间距；其余 IR schema、导出名、函数签名与公开类型自此冻结。',
            en: 'Release candidate: completes the boundary behavior correction with shape-aware regular-surface fitting and signed spacing; other IR schemas, exports, signatures, and public types freeze here.',
          },
          items: [
            {
              label: { zh: '连接面拟合与间距', en: 'Connection-surface fit and spacing' },
              content: {
                zh: '内置 `circle` / `ellipse` / `rectangle` boundary 新增 `{ fit: "tight" | "bounds", gap }` 参数，默认 `tight`。shape-aware 包络让规则连接面更贴近 ellipse、polygon、star 与 contour；`bounds` 保留包住视觉 AABB 的策略，`gap` 可用有符号有限数继续外扩或内缩。自定义 shape 可用 `connectionEnvelope` 接入 tight，自定义 boundary 可用 `resolveRect` 复用同一包络。',
                en: 'Built-in `circle`, `ellipse`, and `rectangle` boundaries add `{ fit: "tight" | "bounds", gap }`, defaulting to `tight`. Shape-aware envelopes fit regular surfaces more closely around ellipse, polygon, star, and contour shapes; `bounds` preserves visual-AABB enclosure, while signed finite `gap` expands or contracts the result. Custom shapes can implement `connectionEnvelope`, and custom boundaries can reuse it through `resolveRect`.',
              },
            },
          ],
        },
        {
          version: 'beta.2',
          date: '2026-07-14',
          summary: {
            zh: '收紧 Scene 输入边界，并新增 `lowerIRToKernel`，让 adapter 可复用 core 的 composite lowering，把 Tier 2 IR 转成纯 Kernel IR。',
            en: 'Tightens Scene input boundaries and adds `lowerIRToKernel`, allowing adapters to reuse core composite lowering and turn Tier 2 IR into pure Kernel IR.',
          },
          items: [
            esmOnlyChangeItem,
            {
              label: { zh: 'BREAKING：Scene schema 闭合', en: 'BREAKING: closed Scene schemas' },
              content: {
                zh: '依赖 Zod 静默剥离 Scene 或 viewBox 未知字段的调用应改为传入合法字段；外部代码不应调用内部 `__registerChildSchema`，请直接删除相关调用。',
                en: 'Callers that relied on Zod silently stripping unknown Scene or viewBox fields must pass only valid fields. External calls to the internal `__registerChildSchema` should be removed.',
              },
            },
            {
              label: { zh: '公开 Tier 2 lowering', en: 'Public Tier 2 lowering' },
              content: {
                zh: '`lowerIRToKernel(ir, { composites, maxCompositeDepth })` 递归展开 composite 并返回可 JSON 序列化的 Tier 1 IR；缺少 definition 时携带 composite key 与 IR 路径直接抛错。`compileToScene` 原有的告警并跳过行为不变。',
                en: '`lowerIRToKernel(ir, { composites, maxCompositeDepth })` recursively expands composites into JSON-serializable Tier 1 IR. Missing definitions throw with the composite key and IR path, while `compileToScene` keeps its existing warn-and-skip behavior.',
              },
            },
          ],
        },
        {
          version: 'beta.1',
          date: '2026-07-07',
          summary: {
            zh: '编译期契约收敛：确立 compile 文件结构与阶段职责范式，并把 path stroke 相关内部实现拆入更细的 owner；公开 API、IR schema、Scene primitive 与 renderer 行为保持不变。',
            en: 'Compile-contract hardening: establishes the compile file-structure and phase-ownership convention, then moves path stroke internals into narrower owners; public APIs, IR schemas, Scene primitives, and renderer behavior are unchanged.',
          },
          items: [],
        },
        {
          version: 'alpha.8',
          date: '2026-07-03',
          summary: {
            zh: 'v0.4 alpha 收口：六个 kernel 包 lockstep bump 到 `0.4.0-alpha.8`，同步 roadmap / changelog / 完备评测边界，并补齐与 `dashPattern` 配套的 `dashOffset` 通用描边能力和最小内置 path/ribbon provider。',
            en: 'v0.4 alpha wrap-up: the six kernel packages move in lockstep to `0.4.0-alpha.8`, aligning the roadmap, changelog, and completeness-evaluation boundaries while adding the `dashOffset` stroke capability plus minimal built-in path/ribbon providers.',
          },
          items: [
            {
              label: { zh: '内置 parabola / bulge provider', en: 'Built-in parabola / bulge providers' },
              content: {
                zh: '`PathGeneratorDefinition` 增内置 `parabola`（`params.control` + `to` 生成二次贝塞尔），React `<Step kind="generator">` 可直接调用；`RibbonWidthProfileDefinition` 增内置 `bulge`（`base` / `peak` 中点鼓起或收窄）。此前同名自定义 definition 现在会按 provider key contract 报重复注册。',
                en: '`PathGeneratorDefinition` now includes built-in `parabola` (`params.control` + `to` produce a quadratic Bezier), callable through React `<Step kind="generator">`; `RibbonWidthProfileDefinition` includes built-in `bulge` (`base` / `peak` widens or narrows the midpoint). Existing custom definitions with those names now fail under the provider key contract as duplicate registrations.',
              },
            },
          ],
        },
        {
          version: 'alpha.7',
          date: '2026-07-03',
          summary: {
            zh: 'Provider contract 收敛：shape / arrow / pattern / path generator / path kind / ribbon profile / composite 统一为 definition 数组注册；新增 BoundaryDefinition 与 ClipDefinition，一等支持自定义连接面和裁剪区。',
            en: 'Provider contract convergence: shape / arrow / pattern / path generator / path kind / ribbon profile / composite now use definition-array registration; BoundaryDefinition and ClipDefinition add first-class custom connection surfaces and clipping regions.',
          },
          items: [],
        },
        {
          version: 'alpha.6',
          date: '2026-06-28',
          summary: {
            zh: '关系路径底座收口：`Path.kind` 统一 stroke / ribbon / 自定义 provider；内置 `ribbon` 支持可变宽度、单侧对齐、端帽、显式边界、host label 与共享 drawable 契约。',
            en: 'Relation-path foundation: `Path.kind` unifies stroke / ribbon / custom providers; the built-in `ribbon` supports variable width, one-sided alignment, caps, explicit boundaries, host labels, and the shared drawable contract.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-19',
          summary: {
            zh: '新增 `@retikz/tex` 包 + `CompileOptions.lowerTex` 注入：任意文本里用 `$...$`（行内）/ `$$...$$`（display）或显式 `{ runs }` 写 LaTeX 公式，行内 text+math 混排（node 文本 / node label / 边标注全支持），经注入能力渲染成字形路径、三端一致；core 不依赖 MathJax。',
            en: 'New `@retikz/tex` package + `CompileOptions.lowerTex` injection: write LaTeX with `$...$` (inline) / `$$...$$` (display) or explicit `{ runs }` in any text — inline text+math mixing across node text, node labels, and edge labels — rendered to glyph paths via the injected capability, consistent across backends; core does not depend on MathJax.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-16',
          summary: {
            zh: '新增图元级视觉效果 `shadow`（投影）与 `blendMode`（混合模式）：作用于 Node 主形状 / Path 主路径（含端点箭头），renderer-agnostic 编译期透传。',
            en: 'New element-level visual effects `shadow` and `blendMode`: applied to a Node’s shape / a Path’s main path (including endpoint arrows), passed through at compile time and renderer-agnostic.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-16',
          summary: {
            zh: 'path 文法补强 + contour shape：折线圆角 `roundedCorners`、过点平滑曲线 `smooth` step、任意轮廓 `contour` 注册 shape。',
            en: 'Path-grammar reinforcement + contour shape: `roundedCorners`, a `smooth` step, and a registered `contour` shape.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-15',
          summary: {
            zh: 'scope 多态包络：`<Scope boundingShape>` 支持 `circle`（子树点集最小外接圆），连线 / anchor 落圆周；缺省 `rectangle` 行为不变。',
            en: 'Polymorphic scope envelope: `<Scope boundingShape>` supports `circle` (minimal enclosing circle of the subtree), so connections / anchors land on the circle; the default `rectangle` is unchanged.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-14',
          summary: {
            zh: '纯几何下沉 `@retikz/math` 并 re-export（公开面不变）；`point.toPolar` / `point.equalPolar` 移除，能力迁入 `polar`。',
            en: 'Pure geometry sinks to `@retikz/math` and is re-exported (public surface unchanged); `point.toPolar` / `point.equalPolar` are removed, folded into `polar`.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/render',
      version: 'v0.4',
      description: {
        zh: '渲染端落地 Scene 视觉效果：SVG / Canvas 两端把 `shadow` / `blendMode` 翻译成各自原生能力，并校准跨后端视觉口径。',
        en: 'The renderers land Scene visual effects: SVG and Canvas translate `shadow` / `blendMode` to native capabilities and calibrate the cross-backend visual contract.',
      },
      highlights: [],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-07-19',
          summary: {
            zh: '候选发布：修复 Canvas 命名色或 HSL 阴影与独立透明度组合时的 alpha 烘焙，未改变公开 API。',
            en: 'Release candidate: fixes alpha baking for Canvas shadows that combine named or HSL colors with independent opacity, without changing the public API.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-07-14',
          summary: {
            zh: '统一发布为 ESM-only、要求 Node.js 24 或更高版本，并提供跨 React / Vanilla 共用的动画开关三态解析。',
            en: 'Standardizes publishing on ESM-only with Node.js 24 or newer and provides shared tri-state animation resolution for React and Vanilla.',
          },
          items: [
            esmOnlyChangeItem,
            {
              label: { zh: '动画三态解析', en: 'Tri-state animation resolution' },
              content: {
                zh: '`@retikz/render/animation` 新增 `resolveAnimationEnabled(explicit, reducedMotion)`：未传时跟随系统偏好，显式 `true` / `false` 强制开启或关闭；低层 SVG / Canvas renderer 只消费解析后的布尔值。',
                en: '`@retikz/render/animation` adds `resolveAnimationEnabled(explicit, reducedMotion)`: omission follows the system preference, while explicit `true` / `false` forces animation on or off. Low-level SVG and Canvas renderers consume only the resolved boolean.',
              },
            },
          ],
        },
        {
          version: 'alpha.4',
          date: '2026-06-16',
          summary: {
            zh: 'shadow → SVG `<feDropShadow>` filter / Canvas `ctx.shadow*`；blendMode → SVG `mix-blend-mode` / Canvas `globalCompositeOperation`；并修跨后端裁剪与口径校准。',
            en: 'shadow → SVG `<feDropShadow>` filter / Canvas `ctx.shadow*`; blendMode → SVG `mix-blend-mode` / Canvas `globalCompositeOperation`; plus cross-backend clipping & calibration fixes.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/react',
      version: 'v0.4',
      description: {
        zh: 'React adapter 跟进 core v0.4：`<Step kind="smooth">`、`roundedCorners`、`<Path kind="ribbon">`、`pathKinds` 注入，以及 `<Layout>` 可嵌入 Tier2 子组件。',
        en: 'The React adapter follows core v0.4: `<Step kind="smooth">`, `roundedCorners`, `<Path kind="ribbon">`, `pathKinds` injection, plus embeddable Tier2 children in `<Layout>`.',
      },
      highlights: [],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-07-19',
          summary: {
            zh: '候选发布：组件名、props、导出与公开类型自此冻结；自 beta.2 起无功能改动。',
            en: 'Release candidate: component names, props, exports, and public types freeze here, with no functional changes since beta.2.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-07-14',
          summary: {
            zh: '`@retikz/react` 收紧包根公共面，让 Tier 2 IR 可转换为语义等价的 Kernel JSX，并统一动画三态与宿主级覆盖。',
            en: '`@retikz/react` narrows its root public surface, converts Tier 2 IR into semantically equivalent Kernel JSX, and unifies tri-state animation with host-level overrides.',
          },
          items: [
            esmOnlyChangeItem,
            {
              label: { zh: 'BREAKING：移除 renderer internals', en: 'BREAKING: renderer internals removed' },
              content: {
                zh: '`buildPathD`、`buildTransform`、`formatViewBox` 改从 `@retikz/render/svg` 导入。`CanvasHost`、defs wrapper、`renderPrim`、`svgToReact`、browser measurer 不再由 `@retikz/react` 公开；应用继续使用 `<Layout renderer="svg"｜"canvas">`，自定义 renderer 改用 `@retikz/render` 的公开 API。',
                en: 'Import `buildPathD`, `buildTransform`, and `formatViewBox` from `@retikz/render/svg`. `CanvasHost`, defs wrappers, `renderPrim`, `svgToReact`, and the browser measurer are no longer public from `@retikz/react`; applications should keep using `<Layout renderer="svg" | "canvas">`, while custom renderers should use the public `@retikz/render` API.',
              },
            },
            {
              label: { zh: '动画三态与宿主覆盖', en: 'Tri-state animation and host override' },
              content: {
                zh: '省略 `<Layout animate>` 时跟随 `prefers-reduced-motion`，显式 `true` / `false` 强制开关；`AnimationModeProvider` 可用 `system` / `enabled` / `disabled` 覆盖整棵子树，最近 Provider 生效，`snapshotAt` 始终优先。此前依赖“显式 true 仍尊重系统偏好”的调用应改为省略该值。',
                en: 'Omitting `<Layout animate>` follows `prefers-reduced-motion`, while explicit `true` / `false` forces animation on or off. `AnimationModeProvider` can override a subtree with `system`, `enabled`, or `disabled`; the nearest provider wins and `snapshotAt` remains highest priority. Callers that relied on explicit `true` still respecting the system preference should omit the value.',
              },
            },
            {
              label: { zh: 'Tier 2 IR 反向转换', en: 'Tier 2 IR reverse conversion' },
              content: {
                zh: '`convertIRToReactNode(ir, { composites, maxCompositeDepth })` 现在先复用 core lowering，再生成 Kernel JSX。Tier 1 保持结构等价；Tier 2 往返结果与 lowering 后的 Kernel IR 等价。缺少 definition 或 payload 非法时会保留 key 与 IR 路径并抛错。',
                en: '`convertIRToReactNode(ir, { composites, maxCompositeDepth })` now reuses core lowering before producing Kernel JSX. Tier 1 stays structurally equivalent, while Tier 2 roundtrips match the lowered Kernel IR. Missing definitions and invalid payloads throw with the key and IR path.',
              },
            },
          ],
        },
        {
          version: 'alpha.6',
          date: '2026-06-28',
          summary: {
            zh: '`<Path>` 透传 `kind` / `ribbon` / `kindOptions` / host `label`，`<Layout pathKinds>` 注入自定义 Path kind；不新增独立 Ribbon 组件面。',
            en: '`<Path>` passes through `kind` / `ribbon` / `kindOptions` / host `label`, and `<Layout pathKinds>` injects custom Path kinds; no standalone Ribbon component surface is added.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-19',
          summary: {
            zh: '`<Layout lowerTex>` 公式渲染注入通道 + `<Node>` 文本里写 `$...$` / `$$...$$` 行内公式。',
            en: '`<Layout lowerTex>` injection channel for formula rendering + `$...$` / `$$...$$` inline formulas in `<Node>` text.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-16',
          summary: {
            zh: '`<Node>` / `<Path>` / `<Draw>` 透传 `shadow` / `blendMode`（与 core 同一份 schema）。',
            en: '`<Node>` / `<Path>` / `<Draw>` pass through `shadow` / `blendMode` (the same schema as core).',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-16',
          summary: {
            zh: '`<Step kind="smooth">` 过点平滑曲线；`<Draw>` / `<Path>` 暴露 `roundedCorners`。',
            en: '`<Step kind="smooth">` for smooth curves; `<Draw>` / `<Path>` expose `roundedCorners`.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-15',
          summary: {
            zh: '`<Layout>` 支持嵌入 Tier2 子组件：可嵌入适配器以组件静态属性注册，`<Layout>` 汇总后并入 compile，`embeddables` prop 作显式逃生舱。',
            en: '`<Layout>` can embed Tier2 children: an embeddable adapter is registered as a component static property, gathered by `<Layout>` into compile, with an `embeddables` prop as an explicit escape hatch.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/vanilla',
      version: 'v0.4',
      description: {
        zh: 'Vanilla v0.4 以 plain spec 统一无框架作者模型和 runtime 入口，并为分层 metadata、Tier 2 adapter 与后续增量更新建立稳定边界。',
        en: 'Vanilla v0.4 unifies framework-free authoring and runtime around plain specs, establishing stable boundaries for layer metadata, Tier 2 adapters, and future incremental updates.',
      },
      highlights: [],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-07-19',
          summary: {
            zh: '候选发布：plain spec、挂载 API、adapter 与公开类型自此冻结；自 beta.2 起无功能改动。',
            en: 'Release candidate: plain specs, mounting APIs, adapters, and public types freeze here, with no functional changes since beta.2.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-07-14',
          summary: {
            zh: '以可结构化比较的 plain object spec 取代旧 `Figure` builder；新增统一 `mount`、layer metadata、显式 Tier 2 adapter 与动画三态语义，并收紧 Vanilla 包根公共面。',
            en: 'Replaces the old `Figure` builder with structurally comparable plain-object specs; adds unified `mount`, layer metadata, explicit Tier 2 adapters, and tri-state animation semantics while tightening the Vanilla root API.',
          },
          items: [
            esmOnlyChangeItem,
            {
              label: { zh: 'BREAKING：移除 Figure builder', en: 'BREAKING: Figure builder removed' },
              content: {
                zh: '原 `.node()` / `.draw()` / `.mount()` / `.toSvgString()` 链式写法改为 `figure({ children | layers })` 配合独立的 `mount()` / `renderToSvgString()`；`draw()` 改用与 core IR 对齐的 `path()`。旧 builder、内部品牌字段和 core 能力转发不再从 `@retikz/vanilla` 导出。',
                en: 'Replace chained `.node()` / `.draw()` / `.mount()` / `.toSvgString()` calls with `figure({ children | layers })` plus standalone `mount()` / `renderToSvgString()`, and replace `draw()` with the core-IR-aligned `path()`. The old builder, internal brands, and forwarded core capabilities are no longer exported from `@retikz/vanilla`.',
              },
            },
            {
              label: { zh: 'BREAKING：standalone hydrate 仅支持 SVG', en: 'BREAKING: standalone hydrate is SVG-only' },
              content: {
                zh: '`hydrate(svg, options)` 的首参收窄为 `SVGSVGElement`，并移除 `HydrateOptions.renderer`。SSR SVG 调用方传入注入后取得的 `<svg>` 根；Canvas 调用方改用 `mountCanvas(...).hydrate({ handlers })`，由 view 提供命中查询与坐标映射。',
                en: 'The first argument of `hydrate(svg, options)` is narrowed to `SVGSVGElement`, and `HydrateOptions.renderer` is removed. SSR SVG callers should pass the injected `<svg>` root; Canvas callers should use `mountCanvas(...).hydrate({ handlers })`, whose view provides hit testing and coordinate mapping.',
              },
            },
            {
              label: { zh: 'Layer 与 Tier 2 边界', en: 'Layer and Tier 2 boundaries' },
              content: {
                zh: '`layer()` 保留 cache、顺序和 identity metadata 而不污染 core IR；`embed()` 通过显式 `VanillaTier2Adapter` 聚合 datasets 与 composite definitions。`view.update()` 当前仍整图重绘，但保持根元素 identity 与 live hydration context。',
                en: '`layer()` preserves cache, ordering, and identity metadata without polluting core IR, while `embed()` aggregates datasets and composite definitions through an explicit `VanillaTier2Adapter`. `view.update()` still redraws the full figure, but preserves root identity and live hydration context.',
              },
            },
            {
              label: { zh: '动画三态语义', en: 'Tri-state animation semantics' },
              content: {
                zh: '省略 `animation.enabled` 时跟随系统偏好，显式 `true` / `false` 强制开启或关闭；`snapshotAt` 仍优先输出静态截帧。SSR 或无 `matchMedia` 环境按系统未要求减少动态效果处理，因此省略时默认开启。',
                en: 'Omitting `animation.enabled` follows the system preference, while explicit `true` / `false` forces animation on or off; `snapshotAt` still takes priority and produces a static frame. SSR or environments without `matchMedia` are treated as not requesting reduced motion, so omission defaults to enabled.',
              },
            },
          ],
        },
        {
          version: 'alpha.6',
          date: '2026-06-28',
          summary: {
            zh: '`draw` 支持 `kind: "ribbon"` 与 `ribbon` 参数，复用 core way DSL；vanilla builder 明确不暴露独立 `ribbon()` helper。',
            en: '`draw` supports `kind: "ribbon"` with `ribbon` options and reuses the core way DSL; the vanilla builder deliberately does not expose a standalone `ribbon()` helper.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-17',
          summary: {
            zh: '`toScene` / `renderToString` 等经 `lowerTex` 选项渲染节点公式（`@retikz/tex` 提供能力）。',
            en: '`toScene` / `renderToString` render node tex via the `lowerTex` option (capability provided by `@retikz/tex`).',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-16',
          summary: {
            zh: '`node` / `draw` config 可直接写 `shadow` / `blendMode`（预设 / 对象 / 枚举），无需额外 API。',
            en: '`node` / `draw` config can write `shadow` / `blendMode` directly (preset / object / enum), with no extra API.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/tex',
      version: 'v0.4',
      description: {
        zh: '新包：LaTeX 数学公式经 MathJax SVG 降解成 renderer-agnostic 字形路径，接入 core 的 lowerTex 注入。',
        en: 'New package: LaTeX formulas lowered via MathJax SVG into renderer-agnostic glyph paths, plugging into core’s lowerTex injection.',
      },
      highlights: [],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-07-19',
          summary: {
            zh: '候选发布：TeX 引擎、lowering、React hook 与公开类型自此冻结；自 beta.2 起无功能改动。',
            en: 'Release candidate: the TeX engine, lowering API, React hook, and public types freeze here, with no functional changes since beta.2.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-07-14',
          summary: {
            zh: '`useLowerTex` 现在保留 MathJax 初始化原始错误、同次失败只报告一次，并在后续挂载时重试。',
            en: '`useLowerTex` now preserves the original MathJax startup error, reports each shared failure once, and retries on a later mount.',
          },
          items: [esmOnlyChangeItem],
        },
        {
          version: 'alpha.5',
          date: '2026-06-17',
          summary: {
            zh: '首切：MathJax→字形路径引擎 + `createLowerTex` 注入 + `./react` 子入口 `useLowerTex`。',
            en: 'First cut: a MathJax→glyph-path engine + `createLowerTex` injection + a `./react` subpath `useLowerTex`.',
          },
          items: [],
        },
      ],
    },
  ],
};
