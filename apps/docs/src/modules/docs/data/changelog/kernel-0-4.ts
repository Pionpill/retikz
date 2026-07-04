import type { Release } from '../types';

export const kernelV04: Release = {
    minor: 'v0.4',
    stableDate: null,
    packages: [
      {
        pkg: '@retikz/math',
        version: 'v0.4',
        description: {
          zh: '新包：零依赖纯计算几何（向量 / 仿射 / arc 原语 / 求交 / 三角形内外接圆 / 点在多边形 / 凸包 / 最小外接圆 / 曲线）。纯函数 + 普通对象，零 IR、零 zod、不写 class；被 core 正向依赖、与 core 组同 lockstep。',
          en: 'New zero-dependency pure-geometry package: vectors / affine / arc / intersections / triangle in-&-circumcircle / point-in-polygon / convex hull / min enclosing circle / curves. No IR / zod / class.',
        },
        highlights: [
          {
            label: { zh: '纯几何 API', en: 'Pure geometry API' },
            content: {
              zh: '命名空间风格 `point` / `transform` / `arc` / `intersect` / `triangle` / `polygon` / `convexHull` / `enclose`；core 几何的单一真源（`Position` / `DEFAULT_EPSILON` 迁此）。',
              en: 'Namespace-style `point` / `transform` / `arc` / `intersect` / `triangle` / `polygon` / `convexHull` / `enclose`; the single source of truth for core geometry (`Position` / `DEFAULT_EPSILON` moved here).',
            },
          },
        ],
        subVersions: [
          {
            version: 'alpha.3',
            date: '2026-06-16',
            summary: {
              zh: '开 `curve/` 子模块：`catmullRomToCubic`（centripetal Catmull-Rom → cubic 贝塞尔），供 core 的 smooth step 编译过点平滑曲线。',
              en: 'Opens the `curve/` submodule: `catmullRomToCubic` (centripetal Catmull-Rom → cubic Bézier), powering core’s smooth step.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.2',
            date: '2026-06-15',
            summary: {
              zh: '新增 `minimalEnclosingCircle`（Welzl）——点集最小外接圆，供 core scope 的 circle 包络。',
              en: 'Adds `minimalEnclosingCircle` (Welzl) — the minimal enclosing circle of a point set, powering core’s circle scope envelope.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.1',
            date: '2026-06-14',
            summary: {
              zh: '新建 `@retikz/math` 包：core 纯几何（向量 / 仿射 / arc 原语 / 私有求交）下沉至此，新增三角形内外接圆 / 点在多边形 / 凸包等能力。',
              en: 'New `@retikz/math` package: core’s pure geometry (vectors / affine / arc primitives / private intersections) sinks here, plus new triangle in-&-circumcircle / point-in-polygon / convex hull.',
            },
            items: [

            ],
          }
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
            version: 'alpha.8',
            date: '2026-07-03',
            summary: {
              zh: 'v0.4 alpha 收口：六个 kernel 包 lockstep bump 到 `0.4.0-alpha.8`，同步 roadmap / changelog / 完备评测边界，并补齐与 `dashPattern` 配套的 `dashOffset` 通用描边能力。',
              en: 'v0.4 alpha wrap-up: the six kernel packages move in lockstep to `0.4.0-alpha.8`, aligning the roadmap, changelog, and completeness-evaluation boundaries while adding the `dashOffset` stroke capability that pairs with `dashPattern`.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.7',
            date: '2026-07-03',
            summary: {
              zh: 'Provider contract 收敛：shape / arrow / pattern / path generator / path kind / ribbon profile / composite 统一为 definition 数组注册；新增 BoundaryDefinition 与 ClipDefinition，一等支持自定义连接面和裁剪区。',
              en: 'Provider contract convergence: shape / arrow / pattern / path generator / path kind / ribbon profile / composite now use definition-array registration; BoundaryDefinition and ClipDefinition add first-class custom connection surfaces and clipping regions.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.6',
            date: '2026-06-28',
            summary: {
              zh: '关系路径底座收口：`Path.kind` 统一 stroke / ribbon / 自定义 provider；内置 `ribbon` 支持可变宽度、单侧对齐、端帽、显式边界、host label 与共享 drawable 契约。',
              en: 'Relation-path foundation: `Path.kind` unifies stroke / ribbon / custom providers; the built-in `ribbon` supports variable width, one-sided alignment, caps, explicit boundaries, host labels, and the shared drawable contract.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.5',
            date: '2026-06-19',
            summary: {
              zh: '新增 `@retikz/tex` 包 + `CompileOptions.lowerTex` 注入：任意文本里用 `$...$`（行内）/ `$$...$$`（display）或显式 `{ runs }` 写 LaTeX 公式，行内 text+math 混排（node 文本 / node label / 边标注全支持），经注入能力渲染成字形路径、三端一致；core 不依赖 MathJax。',
              en: 'New `@retikz/tex` package + `CompileOptions.lowerTex` injection: write LaTeX with `$...$` (inline) / `$$...$$` (display) or explicit `{ runs }` in any text — inline text+math mixing across node text, node labels, and edge labels — rendered to glyph paths via the injected capability, consistent across backends; core does not depend on MathJax.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.4',
            date: '2026-06-16',
            summary: {
              zh: '新增图元级视觉效果 `shadow`（投影）与 `blendMode`（混合模式）：作用于 Node 主形状 / Path 主路径（含端点箭头），renderer-agnostic 编译期透传。',
              en: 'New element-level visual effects `shadow` and `blendMode`: applied to a Node’s shape / a Path’s main path (including endpoint arrows), passed through at compile time and renderer-agnostic.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.3',
            date: '2026-06-16',
            summary: {
              zh: 'path 文法补强 + contour shape：折线圆角 `roundedCorners`、过点平滑曲线 `smooth` step、任意轮廓 `contour` 注册 shape。',
              en: 'Path-grammar reinforcement + contour shape: `roundedCorners`, a `smooth` step, and a registered `contour` shape.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.2',
            date: '2026-06-15',
            summary: {
              zh: 'scope 多态包络：`<Scope boundingShape>` 支持 `circle`（子树点集最小外接圆），连线 / anchor 落圆周；缺省 `rectangle` 行为不变。',
              en: 'Polymorphic scope envelope: `<Scope boundingShape>` supports `circle` (minimal enclosing circle of the subtree), so connections / anchors land on the circle; the default `rectangle` is unchanged.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.1',
            date: '2026-06-14',
            summary: {
              zh: '纯几何下沉 `@retikz/math` 并 re-export（公开面不变）；`point.toPolar` / `point.equalPolar` 移除，能力迁入 `polar`。',
              en: 'Pure geometry sinks to `@retikz/math` and is re-exported (public surface unchanged); `point.toPolar` / `point.equalPolar` are removed, folded into `polar`.',
            },
            items: [

            ],
          }
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
            version: 'alpha.4',
            date: '2026-06-16',
            summary: {
              zh: 'shadow → SVG `<feDropShadow>` filter / Canvas `ctx.shadow*`；blendMode → SVG `mix-blend-mode` / Canvas `globalCompositeOperation`；并修跨后端裁剪与口径校准。',
              en: 'shadow → SVG `<feDropShadow>` filter / Canvas `ctx.shadow*`; blendMode → SVG `mix-blend-mode` / Canvas `globalCompositeOperation`; plus cross-backend clipping & calibration fixes.',
            },
            items: [

            ],
          }
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
            version: 'alpha.6',
            date: '2026-06-28',
            summary: {
              zh: '`<Path>` 透传 `kind` / `ribbon` / `kindOptions` / host `label`，`<Layout pathKinds>` 注入自定义 Path kind；不新增独立 Ribbon 组件面。',
              en: '`<Path>` passes through `kind` / `ribbon` / `kindOptions` / host `label`, and `<Layout pathKinds>` injects custom Path kinds; no standalone Ribbon component surface is added.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.5',
            date: '2026-06-19',
            summary: {
              zh: '`<Layout lowerTex>` 公式渲染注入通道 + `<Node>` 文本里写 `$...$` / `$$...$$` 行内公式。',
              en: '`<Layout lowerTex>` injection channel for formula rendering + `$...$` / `$$...$$` inline formulas in `<Node>` text.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.4',
            date: '2026-06-16',
            summary: {
              zh: '`<Node>` / `<Path>` / `<Draw>` 透传 `shadow` / `blendMode`（与 core 同一份 schema）。',
              en: '`<Node>` / `<Path>` / `<Draw>` pass through `shadow` / `blendMode` (the same schema as core).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.3',
            date: '2026-06-16',
            summary: {
              zh: '`<Step kind="smooth">` 过点平滑曲线；`<Draw>` / `<Path>` 暴露 `roundedCorners`。',
              en: '`<Step kind="smooth">` for smooth curves; `<Draw>` / `<Path>` expose `roundedCorners`.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.2',
            date: '2026-06-15',
            summary: {
              zh: '`<Layout>` 支持嵌入 Tier2 子组件：可嵌入适配器以组件静态属性注册，`<Layout>` 汇总后并入 compile，`embeddables` prop 作显式逃生舱。',
              en: '`<Layout>` can embed Tier2 children: an embeddable adapter is registered as a component static property, gathered by `<Layout>` into compile, with an `embeddables` prop as an explicit escape hatch.',
            },
            items: [

            ],
          }
        ],
      },
      {
        pkg: '@retikz/vanilla',
        version: 'v0.4',
        description: {
          zh: 'Vanilla DSL 跟进 core v0.4：`node` / `draw` config 经 `Omit<IR*>` 自动获得 `shadow` / `blendMode`、Path kind / ribbon 等核心字段。',
          en: 'The vanilla DSL follows core v0.4: `node` / `draw` config get core fields such as `shadow` / `blendMode`, Path kind, and ribbon through `Omit<IR*>`.',
        },
        highlights: [],
        subVersions: [
          {
            version: 'alpha.6',
            date: '2026-06-28',
            summary: {
              zh: '`draw` 支持 `kind: "ribbon"` 与 `ribbon` 参数，复用 core way DSL；vanilla builder 明确不暴露独立 `ribbon()` helper。',
              en: '`draw` supports `kind: "ribbon"` with `ribbon` options and reuses the core way DSL; the vanilla builder deliberately does not expose a standalone `ribbon()` helper.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.5',
            date: '2026-06-17',
            summary: {
              zh: '`toScene` / `renderToString` 等经 `lowerTex` 选项渲染节点公式（`@retikz/tex` 提供能力）。',
              en: '`toScene` / `renderToString` render node tex via the `lowerTex` option (capability provided by `@retikz/tex`).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.4',
            date: '2026-06-16',
            summary: {
              zh: '`node` / `draw` config 可直接写 `shadow` / `blendMode`（预设 / 对象 / 枚举），无需额外 API。',
              en: '`node` / `draw` config can write `shadow` / `blendMode` directly (preset / object / enum), with no extra API.',
            },
            items: [

            ],
          }
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
            version: 'alpha.5',
            date: '2026-06-17',
            summary: {
              zh: '首切：MathJax→字形路径引擎 + `createLowerTex` 注入 + `./react` 子入口 `useLowerTex`。',
              en: 'First cut: a MathJax→glyph-path engine + `createLowerTex` injection + a `./react` subpath `useLowerTex`.',
            },
            items: [

            ],
          }
        ],
      }
    ],
  };
