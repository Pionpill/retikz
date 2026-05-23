import type { Localized, Release } from './changelog.types';

/** changelog 页副标题(替代原 mdx frontmatter description) */
export const changelogPageDescription: Localized = {
  zh: 'retikz 历版发布记录,按中版本聚合、倒序排列。左侧时间线标 stable 日期,右侧按包筛选;预发布默认折叠。',
  en: 'retikz release history, grouped by minor version, newest first. Stable dates on the left timeline, filter by package on the right; pre-releases collapsed by default.',
};

export const changelog: Array<Release> = [
  {
    minor: 'v0.2',
    stableDate: null,
    packages: [
      {
        pkg: '@retikz/core',
        version: 'v0.2',
        description: {
          zh: 'Scope 升级为样式默认值挂点、形状可注册第三方注入,补齐 zIndex / label rotate 等 emit 层能力,并扩张 Path IR 支撑几何形 sugar(椭圆弧 / 部分圆椭圆 / 圆角矩形)。',
          en: 'Scope becomes a style-default host, shapes are registrable, emit adds zIndex / label rotate, plus Path IR expansion backing shape sugar (elliptical arc / partial circle / rounded rect).',
        },
        highlights: [
          {
            label: { zh: '形状注册', en: 'Shape registry' },
            content: {
              zh: 'ShapeDefinition 四方法,内置 4 形状改注册项,可发第三方形状库 [自定义形状](/core/reference/extending/shape-registry)',
              en: 'Four-method ShapeDefinition; the 4 built-ins become registry entries; third-party shape libs possible [shape registry](/core/reference/extending/shape-registry)',
            },
          },
          {
            label: { zh: '样式继承', en: 'Style inheritance' },
            content: {
              zh: '主色级联 + 四类默认样式(`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`)+ `resetStyle` 屏障',
              en: 'Primary-color cascade + four default channels (`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`) + a `resetStyle` barrier',
            },
          },
          {
            label: { zh: '显式 zIndex', en: 'Explicit zIndex' },
            content: {
              zh: 'Node / Path / Scope 栈序覆盖,补 SVG 无 z-index 的能力',
              en: 'Node / Path / Scope stacking override, filling SVG’s lack of z-index',
            },
          },
          {
            label: { zh: 'Path IR 几何扩张', en: 'Path IR geometry' },
            content: {
              zh: 'arc 显式 center + 椭圆弧、circlePath / ellipsePath 部分裁剪、新增 rectangle step,几何下沉 `core/geometry/`',
              en: 'arc explicit center + elliptical arc, circlePath / ellipsePath partial clipping, a new rectangle step, geometry moved to `core/geometry/`',
            },
          },
        ],
        subVersions: [
          {
            version: 'alpha.6',
            date: '2026-05-23',
            summary: {
              zh: '结构化 Target / Anchor:path target 对象唯一(去 z.string)+ AnchorRef(命名 / 角度 / 边上比例点 { side, t })+ offset;{ side, t } 落 shape 真实边界。',
              en: 'Structured Target / Anchor: object-only path target (drops z.string) + AnchorRef (named / angle / edge-proportional { side, t }) + offset; { side, t } lands on the real shape boundary.',
            },
            items: [
              {
                label: { zh: '对象唯一 path target', en: 'Object-only path target' },
                content: {
                  zh: '`TargetSchema` 删 `z.string()` 分支,节点引用主契约改 `{ id, anchor?, offset? }`;`parseNodeTarget`(parsers/)是字符串 shorthand → 对象的单一真源,core ir / compile 只见对象',
                  en: '`TargetSchema` drops its `z.string()` branch; node references become `{ id, anchor?, offset? }`; `parseNodeTarget` (parsers/) is the single source for string-shorthand → object, so core ir / compile only ever see objects',
                },
              },
              {
                label: { zh: 'AnchorRef + offset', en: 'AnchorRef + offset' },
                content: {
                  zh: '`anchor` 支持命名 anchor / 角度 / `{ side, t }` 边上比例点;`offset` 在 anchor 解析后世界系叠加(不随节点 rotate 旋转)',
                  en: '`anchor` accepts a named anchor / angle / `{ side, t }` edge-proportional point; `offset` adds a world-space delta after the anchor resolves (not rotated by the node)',
                },
              },
              {
                label: { zh: '{ side, t } 真实边界几何', en: '{ side, t } real-boundary geometry' },
                content: {
                  zh: '`ShapeDefinition.edgePoint?` + `resolveEdgePoint`:rect 直边 / circle·ellipse 周长弧段(等角)/ diamond 过顶点折线;不支持的 shape / 零尺寸 Coordinate 报明确错',
                  en: '`ShapeDefinition.edgePoint?` + `resolveEdgePoint`: rect straight edge / circle·ellipse perimeter arc (equiangular) / diamond via-vertex polyline; clear errors for unsupported shapes / zero-size Coordinates',
                },
              },
            ],
          },
          {
            version: 'alpha.5',
            date: '2026-05-23',
            summary: {
              zh: '扩张 Path IR 支撑几何形 sugar:arc 显式 center + 椭圆弧、circlePath / ellipsePath 部分裁剪、新增 rectangle step。本版后 IR 进入冻结准备。',
              en: 'Expand Path IR to back geometric-shape sugar: arc explicit center + elliptical arc, circlePath / ellipsePath partial clipping, a new rectangle step.',
            },
            items: [
              {
                label: { zh: 'arc 显式 center + 椭圆弧', en: 'arc explicit center + elliptical arc' },
                content: {
                  zh: '`arc` step 加显式 `center`(不再隐式取前一锚点)+ `radiusX` / `radiusY`(椭圆弧,与 `radius` 互斥)',
                  en: '`arc` step gains explicit `center` (no longer implicitly the previous anchor) + `radiusX` / `radiusY` (elliptical arc, mutually exclusive with `radius`)',
                },
              },
              {
                label: { zh: 'circlePath / ellipsePath 部分裁剪', en: 'circlePath / ellipsePath partial clipping' },
                content: {
                  zh: '加 `startAngle` / `endAngle` / `sweepAngle` / `closed`(`closed` / `chord` / `open`),支持半圆 / 1/4 椭圆 / 弓形',
                  en: 'gain `startAngle` / `endAngle` / `sweepAngle` / `closed` (`closed` / `chord` / `open`) for half circles / quarter ellipses / segments',
                },
              },
              {
                label: { zh: '新增 rectangle step', en: 'new rectangle step' },
                content: {
                  zh: '`from` / `to` / `roundedCorners`,圆角矩形 outline 由 compile 一次算;几何下沉 `core/geometry/`(ellipseArc / rectOutline)',
                  en: '`from` / `to` / `roundedCorners`; rounded-rect outline computed once at compile; geometry moved to `core/geometry/` (ellipseArc / rectOutline)',
                },
              },
            ],
          },
          {
            version: 'alpha.4',
            date: '2026-05-23',
            summary: {
              zh: 'compile IR 顺序回归 + emit 层增强(zIndex / 文本 Node 包 g / label rotate)。',
              en: 'compile IR-order regression + emit-layer enhancements (zIndex / wrap text nodes in g / label rotate).',
            },
            items: [
              {
                label: { zh: '显式 zIndex', en: 'Explicit zIndex' },
                content: {
                  zh: '`Node` / `Path` / `Scope` 加可选 `zIndex`,compile 末端按 `zIndex ?? 0` 稳定排序、同值保持 IR 顺序',
                  en: '`Node` / `Path` / `Scope` gain optional `zIndex`; compile does a stable sort by `zIndex ?? 0`, ties keep IR order',
                },
              },
              {
                label: { zh: '带文本 Node 包 g', en: 'Text nodes wrapped in g' },
                content: {
                  zh: '有文本或有 rotate 的 Node emit 成单层 `GroupPrim`,给语义节点稳定的 DOM / stacking 边界',
                  en: 'Nodes with text or rotate emit as a single `GroupPrim`, giving semantic nodes a stable DOM / stacking unit',
                },
              },
              {
                label: { zh: 'Node label rotate', en: 'Node label rotate' },
                content: {
                  zh: '`NodeLabelSchema` 加 `rotate`(`none` / `radial` / `tangent` / 数字度数)+ `keepUpright`',
                  en: '`NodeLabelSchema` gains `rotate` (`none` / `radial` / `tangent` / numeric degrees) + `keepUpright`',
                },
              },
            ],
          },
          {
            version: 'alpha.3',
            date: '2026-05-23',
            summary: {
              zh: 'Shape Registry——node 形状从内置 4 种推进到可注册、可第三方注入。',
              en: 'Shape Registry — node shapes go from 4 built-ins to registrable / third-party injectable.',
            },
            items: [
              {
                label: { zh: 'ShapeDefinition 扩展面', en: 'ShapeDefinition surface' },
                content: {
                  zh: '四方法 `circumscribe` / `boundaryPoint` / `anchor` / `emit`,统一操作外接 `Rect`',
                  en: 'Four methods `circumscribe` / `boundaryPoint` / `anchor` / `emit`, all over a bounding `Rect`',
                },
              },
              {
                label: { zh: 'shape 字段开放为字符串', en: 'shape field opened to string' },
                content: {
                  zh: '`NodeSchema.shape` 由闭合枚举改 `z.string().min(1)`,未注册名 compile 期 throw',
                  en: '`NodeSchema.shape` changes from a closed enum to `z.string().min(1)`; unregistered names throw at compile',
                },
              },
            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-22',
            summary: {
              zh: '把 Scope 升级为样式默认值挂点:主色级联 + 四类默认样式。',
              en: 'Scope becomes a style-default host: primary-color cascade + four default channels.',
            },
            items: [
              {
                label: { zh: '主色 color', en: 'Primary color' },
                content: {
                  zh: 'Scope / Node / Path 上的 `color`(TikZ `color=`),stroke / fill / 文字 / 箭头 / 标注未单设则随它',
                  en: '`color` on Scope / Node / Path (TikZ `color=`); stroke / fill / text / arrow / label follow it unless set individually',
                },
              },
              {
                label: { zh: '四类默认样式', en: 'Four default channels' },
                content: {
                  zh: '`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`,按元素类型分发',
                  en: '`nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`, dispatched by element type',
                },
              },
            ],
          },
          {
            version: 'alpha.1',
            date: '2026-05-21',
            summary: {
              zh: '引入 IR 层 `<Scope>` 分组容器,承接 TikZ `\\begin{scope}` 的分组 + 局部 transform。',
              en: 'Introduce an IR-level `<Scope>` container for TikZ `\\begin{scope}` grouping + local transform.',
            },
            items: [
              {
                label: { zh: '新增 Scope IR 容器', en: 'New Scope IR container' },
                content: {
                  zh: '`IRScope` 作为第 4 类 IRChild,支持任意深度嵌套,compile 下沉为 `GroupPrim`',
                  en: '`IRScope` as a 4th IRChild, arbitrarily nestable, lowered to a `GroupPrim` at compile',
                },
              },
            ],
          },
        ],
      },
      {
        pkg: '@retikz/react',
        version: 'v0.2',
        description: {
          zh: '透传 core 新增能力:Scope 样式 props、自定义 shapes、zIndex / label rotate,并新增 8 个一行画几何形的 sugar 组件。',
          en: 'Pass through new core capabilities — Scope style props, custom shapes, zIndex / label rotate — plus 8 one-line geometric-shape sugar components.',
        },
        highlights: [
          {
            label: { zh: '<Scope> 样式 props', en: '<Scope> style props' },
            content: { zh: '加 12 个样式 props + `resetStyle`', en: '12 style props + `resetStyle`' },
          },
          {
            label: { zh: '<TikZ shapes>', en: '<TikZ shapes>' },
            content: { zh: '透传 `CompileOptions.shapes`,自定义 shape 端到端可用', en: 'Pass through `CompileOptions.shapes`; custom shapes work end to end' },
          },
          {
            label: { zh: '8 个形状 sugar', en: '8 shape sugar components' },
            content: {
              zh: 'Circle / Ellipse / Arc / Sector / Rectangle / Grid / RegularPolygon / Star,一行画 TikZ 习语级图元',
              en: 'Circle / Ellipse / Arc / Sector / Rectangle / Grid / RegularPolygon / Star — TikZ-idiom shapes in one line',
            },
          },
        ],
        subVersions: [
          {
            version: 'alpha.6',
            date: '2026-05-23',
            summary: {
              zh: '`<TikZ>` → `<Layout>` 改名(`<TikZ>` 保留为 deprecated 别名,致敬 LaTeX TikZ);Step target 接受对象形态 + 字符串 shorthand。',
              en: '`<TikZ>` → `<Layout>` rename (`<TikZ>` kept as a deprecated alias, a nod to LaTeX TikZ); Step targets accept the object form plus string shorthand.',
            },
            items: [
              {
                label: { zh: '<TikZ> → <Layout>', en: '<TikZ> → <Layout>' },
                content: {
                  zh: '顶层容器更名 `<Layout>`(贴近"声明布局交给渲染器输出");`<TikZ>` 作 deprecated 别名保留,旧代码无需改动,dev 下一次性更名提示',
                  en: 'The top-level container is renamed `<Layout>` ("declare a layout, hand it to the renderer"); `<TikZ>` stays as a deprecated alias so existing code keeps working, with a one-time dev notice',
                },
              },
              {
                label: { zh: 'DslTarget 字符串 shorthand', en: 'DslTarget string shorthand' },
                content: {
                  zh: 'Step `to` / `from` / `center` 类型 `DslTarget = IRTarget | string`:JSX / Draw way 可写 `\'A.north\'` 等字符串,react 层 eager 解析成对象 IR',
                  en: 'Step `to` / `from` / `center` are typed `DslTarget = IRTarget | string`: JSX / Draw way may use `\'A.north\'`-style strings, eager-parsed into object IR at the react layer',
                },
              },
            ],
          },
          {
            version: 'alpha.5',
            date: '2026-05-23',
            items: [
              {
                label: { zh: '8 个形状 sugar', en: '8 shape sugar components' },
                content: {
                  zh: '`<Circle>` / `<Ellipse>` / `<Arc>` / `<Sector>` / `<Rectangle>` / `<Grid>` / `<RegularPolygon>` / `<Star>`,派发为等价 `<Path>` IR;可计算形态限 literal 笛卡尔、透传形态接任意 Target',
                  en: '`<Circle>` / `<Ellipse>` / `<Arc>` / `<Sector>` / `<Rectangle>` / `<Grid>` / `<RegularPolygon>` / `<Star>`, dispatched to equivalent `<Path>` IR; computed forms take literal Cartesian only, passthrough forms take any Target',
                },
              },
              {
                label: { zh: 'Sector innerRadius', en: 'Sector innerRadius' },
                content: {
                  zh: '`<Sector>` 加 `innerRadius`,画空心扇形 / 环形扇区',
                  en: '`<Sector>` gains `innerRadius` for hollow sectors / annular wedges',
                },
              },
            ],
          },
          {
            version: 'alpha.4',
            date: '2026-05-23',
            items: [
              {
                label: { zh: 'zIndex / label rotate 透传', en: 'zIndex / label rotate passthrough' },
                content: {
                  zh: '`<Node>` / `<Path>` / `<Scope>` 加 `zIndex`;`<Node label>` 的 `rotate` / `keepUpright` 透传',
                  en: '`zIndex` on `<Node>` / `<Path>` / `<Scope>`; `rotate` / `keepUpright` on `<Node label>` passthrough',
                },
              },
            ],
          },
          {
            version: 'alpha.3',
            date: '2026-05-23',
            items: [
              {
                label: { zh: '<TikZ shapes>', en: '<TikZ shapes>' },
                content: { zh: '透传自定义 shapes;`<Node shape>` 接受任意字符串名', en: 'pass custom shapes; `<Node shape>` accepts any string name' },
              },
            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-22',
            items: [
              {
                label: { zh: 'Scope 样式 props', en: 'Scope style props' },
                content: { zh: '`<Scope>` 加 12 个样式 props;`<Node>` / `<Path>` 加主色 `color`', en: '12 style props on `<Scope>`; primary `color` on `<Node>` / `<Path>`' },
              },
            ],
          },
          {
            version: 'alpha.1',
            date: '2026-05-21',
            items: [
              {
                label: { zh: '<Scope> Kernel 组件', en: '<Scope> kernel component' },
                content: { zh: '接收 `transforms` / `id` / `localNamespace` / children', en: 'takes `transforms` / `id` / `localNamespace` / children' },
              },
            ],
          },
        ],
      },
      {
        pkg: 'docs',
        version: 'v0.2',
        description: {
          zh: 'Scope 样式继承章节、自定义形状参考页,API 词典补 zIndex / label rotate。',
          en: 'Scope style-inheritance chapter, a custom-shape reference page, and API dictionary entries for zIndex / label rotate.',
        },
        highlights: [
          {
            label: { zh: '自定义形状参考页', en: 'Custom-shape reference page' },
            content: {
              zh: '注入 / 覆盖 / 未知名行为 + hexagon live demo [自定义形状](/core/reference/extending/shape-registry)',
              en: 'inject / override / unknown-name behavior + a hexagon live demo [shape registry](/core/reference/extending/shape-registry)',
            },
          },
        ],
        subVersions: [
          {
            version: 'alpha.6',
            date: '2026-05-23',
            summary: {
              zh: '文档全量切 `<Layout>`、路由 `/components/tikz` → `/layout`;anchors 概念页主推对象形态 Target + `{ side, t }` 边上比例点。',
              en: 'Docs switch to `<Layout>` throughout, route `/components/tikz` → `/layout`; the anchors page leads with object-form targets + `{ side, t }` edge-proportional points.',
            },
            items: [
              {
                label: { zh: 'demo / 路由切 Layout', en: 'demos / route to Layout' },
                content: {
                  zh: '全部 demo / mdx 的 `<TikZ>` → `<Layout>`;组件页路由 `/core/components/tikz` → `/layout`;AST 白名单 + system prompt 主推 `Layout`(`TikZ` 仍为别名)',
                  en: 'All demos / mdx switch `<TikZ>` → `<Layout>`; the component page route `/core/components/tikz` → `/layout`; AST whitelist + system prompt lead with `Layout` (`TikZ` still an alias)',
                },
              },
              {
                label: { zh: 'anchors 页对象形态 + { side, t }', en: 'anchors page object form + { side, t }' },
                content: {
                  zh: 'anchors 概念页主推对象形态 `{ id, anchor?, offset? }`、字符串 shorthand 降级为 DSL 便捷写法,新增「边上比例点 { side, t }」小节 + demo',
                  en: 'The anchors page leads with `{ id, anchor?, offset? }`, demotes string shorthand to DSL convenience, and adds an "edge-proportional { side, t }" section + demo',
                },
              },
            ],
          },
          {
            version: 'alpha.5',
            date: '2026-05-23',
            items: [
              {
                label: { zh: '形状 sugar 页 + AST 白名单', en: 'Shape sugar pages + AST whitelist' },
                content: {
                  zh: '8 个形状 sugar 合并为 `draw/shapes` 单页(含空心扇形)+ demo + schema 引用;AST 白名单 9→17、system prompt 同步',
                  en: '8 shape sugar components on a single `draw/shapes` page (incl. hollow sector) + demos + schema refs; AST whitelist 9→17 and system prompt synced',
                },
              },
              {
                label: { zh: 'changelog 重设计', en: 'Changelog redesign' },
                content: {
                  zh: '改为结构化数据驱动:中版本时间线 + 包筛选 + 预发布折叠 + markdown 序列化',
                  en: 'Rebuilt as structured data: minor-version timeline + package filter + collapsible pre-releases + markdown serialization',
                },
              },
            ],
          },
          {
            version: 'alpha.4',
            date: '2026-05-23',
            items: [
              {
                label: { zh: 'API 补 zIndex / rotate', en: 'API: zIndex / rotate' },
                content: { zh: 'Node / Path / Scope 参考加 `zIndex`;Node label 文档加 `rotate` / `keepUpright`', en: '`zIndex` on Node / Path / Scope refs; `rotate` / `keepUpright` in Node label docs' },
              },
            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-22',
            items: [
              {
                label: { zh: 'Scope 样式继承章节', en: 'Scope style-inheritance chapter' },
                content: { zh: '主色级联 / 四通道 every-X / resetStyle 屏障 + 优先级链,配 3 个 demo', en: 'primary cascade / four every-X channels / resetStyle barrier + priority chain, with 3 demos' },
              },
            ],
          },
        ],
      },
    ],
  },

  {
    minor: 'v0.1',
    stableDate: '2026-05-20',
    packages: [
      {
        pkg: '@retikz/core',
        version: 'v0.1',
        description: {
          zh: '从 IR 重构基线出发,逐 alpha 补齐节点形状 / Path 增强 / 节点关系层,到 alpha.5 冻结 schema、beta 收敛命名、rc 冻结 API,最终切到稳定版。',
          en: 'From the IR redesign baseline, alphas add node shapes / path enhancements / the node-relations layer, alpha.5 freezes the schema, betas converge naming, rc freezes the API, ending at the stable cut.',
        },
        highlights: [
          {
            label: { zh: 'IR + Scene 编译器', en: 'IR + scene compiler' },
            content: {
              zh: 'framework-agnostic 的中间表示与编译器,零 React、零 DOM,IR 可序列化为 JSON',
              en: 'A framework-agnostic intermediate representation and compiler — zero React, zero DOM — with IR serializable to JSON',
            },
          },
          {
            label: { zh: '节点与 Path 全集', en: 'Node + path feature set' },
            content: {
              zh: '4 种节点形状 + 多行文本 / 字体 / 颜色;Path 折角 / 曲线三件套 / 路径级形状 / 箭头 / 边标注',
              en: '4 node shapes + multi-line text / font / color; path folds / the curve trio / path-level shapes / arrows / edge labels',
            },
          },
          {
            label: { zh: '节点关系层', en: 'Node-relations layer' },
            content: {
              zh: '节点间相对定位、`<Coordinate>` 占位节点、Node 边挂标签,以及 4 种相对定位形态',
              en: 'Relative positioning between nodes, the `<Coordinate>` placeholder, node-attached labels, and four relative-positioning forms',
            },
          },
          {
            label: { zh: 'schema 冻结与渲染目标无关化', en: 'Schema freeze + render-neutral core' },
            content: {
              zh: 'Scene primitive 去 SVG 字符串(结构化 `PathCommand` / `Transform`),Scene 边界改 `Layout`、dash 改 `dashPattern`',
              en: 'Scene primitives drop SVG strings (structured `PathCommand` / `Transform`); Scene bounds become `Layout`, dash becomes `dashPattern`',
            },
          },
        ],
        subVersions: [
          {
            version: '0',
            date: '2026-05-20',
            summary: {
              zh: '从 rc 通道切到稳定版本号,继承 rc.2 的 API surface 与文档体验,不引入破坏性变更。',
              en: 'Move from the rc channel to the stable version number, keeping the rc.2 API surface and docs experience with no breaking changes.',
            },
            items: [
              {
                label: { zh: '稳定版版本号', en: 'Stable version number' },
                content: {
                  zh: '`@retikz/core` 从 `0.1.0-rc.2` 切到 `0.1.0`,进入 v0.1 的 SemVer 兼容维护线',
                  en: '`@retikz/core` moves from `0.1.0-rc.2` to `0.1.0`, entering the SemVer-compatible v0.1 maintenance line',
                },
              },
            ],
          },
          {
            version: 'rc.2',
            date: '2026-05-19',
            summary: {
              zh: '库代码限于渲染管线缺陷修复,无 schema / 公开 API 变更。',
              en: 'Library changes are limited to render-pipeline fixes; no schema / public API changes.',
            },
            items: [
              {
                label: { zh: '编译 z-order 跟随 IR / JSX 顺序', en: 'Compile z-order follows IR / JSX order' },
                content: {
                  zh: '重构为「pass 1 仅 layout 注册 nodeIndex、pass 2 按 IR 顺序交错发 primitive」,SVG z-order 严格等于 JSX 顺序',
                  en: 'Refactored to a single layout pass registering `nodeIndex`, then an emit pass walking IR order, so SVG z-order strictly equals JSX order',
                },
              },
            ],
          },
          {
            version: 'rc.1',
            date: '2026-05-16',
            summary: {
              zh: '公开 API surface 自此冻结,进入候选发布窗口;无 schema / 公开 API 变更。',
              en: 'The public API surface freezes here, entering the release-candidate window; no schema / public API changes.',
            },
            items: [
              {
                label: { zh: 'API 冻结', en: 'API freeze' },
                content: {
                  zh: 'IR schema 字段、公开导出名、公开函数签名自此不再做破坏性变更;后续 rc.N 与 0.1.0 stable 保持兼容',
                  en: 'IR schema fields, public exports, and function signatures take no breaking changes from here; later rc.N and 0.1.0 stable stay compatible',
                },
              },
            ],
          },
          {
            version: 'beta.2',
            date: '2026-05-14',
            summary: {
              zh: '第二轮命名收敛:把公开 API 从 SVG / 历史大小写细节中抽离,为 rc 前的冻结做准备。',
              en: 'Second naming pass: lift public APIs out of SVG / historical-casing details ahead of the pre-rc freeze.',
            },
            items: [
              {
                label: { zh: 'BREAKING:Scene 边界改 Layout', en: 'BREAKING: Scene bounds become Layout' },
                content: {
                  zh: '`ViewBox` / `Scene.viewBox` / `computeViewBox` 分别改为 `Layout` / `Scene.layout` / `computeLayout`,公开类型改用渲染目标无关命名',
                  en: '`ViewBox` / `Scene.viewBox` / `computeViewBox` become `Layout` / `Scene.layout` / `computeLayout`; public types use render-target-neutral naming',
                },
              },
              {
                label: { zh: 'BREAKING:dash 字段改 dashPattern', en: 'BREAKING: dash fields become dashPattern' },
                content: {
                  zh: 'IRPath / PathPrim / RectPrim / EllipsePrim 的 `strokeDasharray` 改为 `dashPattern: Array<number>`,renderer 内部仍映射到 SVG `stroke-dasharray`',
                  en: '`strokeDasharray` on IRPath / PathPrim / RectPrim / EllipsePrim becomes `dashPattern: Array<number>`; the renderer still maps it to SVG `stroke-dasharray` internally',
                },
              },
            ],
          },
          {
            version: 'beta.1',
            date: '2026-05-13',
            summary: {
              zh: '在 alpha.5 schema 收尾后,集中做渲染目标无关化、公开类型 / JSDoc 补强、几何去重、性能优化与诊断加固;不新增公开能力。',
              en: 'After the alpha.5 schema wrap-up, focus on render-neutral wording, public types / JSDoc, geometry dedup, performance, and diagnostics; no new public capability.',
            },
            items: [
              {
                label: { zh: '渲染目标无关 core 契约', en: 'Render-neutral core contract' },
                content: {
                  zh: '清理 core 注释与 zod `.describe()` 中的 SVG-imposing 表述,让 IR / Scene primitive 描述保持渲染目标无关',
                  en: 'Clean SVG-imposing wording from core comments and zod `.describe()` text so IR / Scene primitive descriptions stay render-target agnostic',
                },
              },
              {
                label: { zh: '公开类型与 JSDoc 补强', en: 'Public types + JSDoc' },
                content: {
                  zh: '为 `PathCommand` / `Transform` / `TextLine` 等公开 union 拆命名子类型并补字段 JSDoc',
                  en: 'Split public unions such as `PathCommand` / `Transform` / `TextLine` into named variants with field-level JSDoc',
                },
              },
              {
                label: { zh: '诊断与测试加固', en: 'Diagnostics + test hardening' },
                content: {
                  zh: '增加 `CompileOptions.onWarn` warning 收集路径,补边界 / error path 测试,并锁定 IR JSON 必须可序列化(拒 `Infinity`)',
                  en: 'Add the `CompileOptions.onWarn` collector path, cover boundary / error paths, and lock IR JSON serializability (reject `Infinity`)',
                },
              },
            ],
          },
          {
            version: 'alpha.5',
            date: '2026-05-13',
            summary: {
              zh: '破坏性窗口最后一站:Scene primitive 去 SVG 字符串、箭头视觉规格对象化、StepLabel 位置扩展、新增 OffsetPosition。本版后 IR schema 冻结。',
              en: 'The last breaking window: structured Scene primitives, object-shaped arrow spec, expanded StepLabel position, and OffsetPosition. The IR schema freezes after this.',
            },
            items: [
              {
                label: { zh: 'Scene PathPrim 结构化', en: 'Structured Scene PathPrim' },
                content: {
                  zh: '`PathPrim.d: string` 改为 `commands: Array<PathCommand>`,`GroupPrim.transform?: string` 改为 `transforms?: Array<Transform>`;core 内部不再持 SVG mini-language',
                  en: '`PathPrim.d: string` becomes `commands: Array<PathCommand>`, `GroupPrim.transform?: string` becomes `transforms?: Array<Transform>`; core no longer holds an SVG mini-language',
                },
              },
              {
                label: { zh: 'StepLabel.position 扩充', en: 'Expanded StepLabel.position' },
                content: {
                  zh: '从 3 个 keyword 升到 7 keyword + 任意 t∈[0, 1],与 TikZ `pos=<float>` 对齐',
                  en: 'From 3 keywords to 7 keywords + any t∈[0, 1], aligned with TikZ `pos=<float>`',
                },
              },
              {
                label: { zh: 'Path 箭头重设计', en: 'Path arrow redesign' },
                content: {
                  zh: '删 `arrowShape`、加 `arrowDetail` 对象,一个字段承载 shape / scale / length / width / color / fill / opacity / lineWidth,起末两端逐字段 merge',
                  en: 'Drop `arrowShape`, add an `arrowDetail` object carrying shape / scale / length / width / color / fill / opacity / lineWidth; start / end per-field merge',
                },
              },
              {
                label: { zh: 'OffsetPosition 第 4 种相对定位', en: 'OffsetPosition (4th relative form)' },
                content: {
                  zh: '新增 `{ of, offset: [dx, dy] }`,`of` 三态(节点 id / 笛卡尔 / PolarPosition),同步进 `IRTarget` union',
                  en: 'New `{ of, offset: [dx, dy] }`, where `of` is node id / Cartesian / PolarPosition; also added to the `IRTarget` union',
                },
              },
              {
                label: { zh: 'IRTarget 字段去缩写(BREAKING)', en: 'IRTarget abbreviation cleanup (BREAKING)' },
                content: {
                  zh: '`{ rel }` / `{ relAccumulate }` → `{ relative }` / `{ relativeAccumulate }`;sugar 字符串 `+x,y` / `++x,y` 公开输入面不变',
                  en: '`{ rel }` / `{ relAccumulate }` → `{ relative }` / `{ relativeAccumulate }`; sugar strings `+x,y` / `++x,y` on the public input surface stay the same',
                },
              },
            ],
          },
          {
            version: 'alpha.4',
            date: '2026-05-12',
            summary: {
              zh: '节点关系层一次到位:节点间相对定位、Coordinate 占位节点、Node 边挂标签。',
              en: 'The node-relations layer in one wave: relative positioning between nodes, the Coordinate placeholder, and node-attached labels.',
            },
            items: [
              {
                label: { zh: '节点间相对定位', en: 'Relative positioning between nodes' },
                content: {
                  zh: '`Node.position` 接受 `{ direction, of, distance? }`,对应 TikZ `[<direction>=<distance> of <id>]`;direction 走 8 方向枚举',
                  en: '`Node.position` accepts `{ direction, of, distance? }`, mirroring TikZ `[<direction>=<distance> of <id>]`; `direction` ranges over the 8-direction enum',
                },
              },
              {
                label: { zh: '<Coordinate> 占位节点', en: '<Coordinate> placeholder' },
                content: {
                  zh: '新增 `IRChild` discriminator `coordinate`(仅 id + position),不发 primitive 但注册到 nodeIndex,可被 path target / `at.of` 引用',
                  en: 'New `IRChild` discriminator `coordinate` (only id + position); emits no primitive but registers in `nodeIndex`, referenceable by path target / `at.of`',
                },
              },
              {
                label: { zh: 'Node 边挂标签', en: 'Node-attached labels' },
                content: {
                  zh: '`Node.label?` 接 `NodeLabel` 单对象或数组,每条接 `text` / `position?` / `distance?` / `textColor?` / `opacity?` / `font?`',
                  en: '`Node.label?` takes a `NodeLabel` object or array; each takes `text` / `position?` / `distance?` / `textColor?` / `opacity?` / `font?`',
                },
              },
            ],
          },
          {
            version: 'alpha.3',
            date: '2026-05-10',
            summary: {
              zh: 'Path 增强一波到位:曲线三件套、路径级形状、相对坐标、边标注、视觉属性补齐。',
              en: 'Path enhancements in one wave: the curve trio, path-level shapes, relative coordinates, edge labels, and visual-prop fill-out.',
            },
            items: [
              {
                label: { zh: 'Path 曲线三件套', en: 'Path curve trio' },
                content: {
                  zh: '`Step.kind` 加 `curve`(quadratic)/ `cubic`(cubic)/ `bend`(弧形简记,方向 + 角度自动算控制点退到 cubic)',
                  en: '`Step.kind` adds `curve` (quadratic) / `cubic` (cubic) / `bend` (arc shorthand — direction + angle lowered to cubic)',
                },
              },
              {
                label: { zh: 'Path-level 形状', en: 'Path-level shapes' },
                content: {
                  zh: '`Step.kind` 加 `arc` / `circlePath` / `ellipsePath`,以游标为圆心;arc 留笔在弧终点,circle / ellipse 留笔回圆心',
                  en: '`Step.kind` adds `arc` / `circlePath` / `ellipsePath`, centered on the cursor; `arc` leaves the pen at the arc end, `circle` / `ellipse` return it to the center',
                },
              },
              {
                label: { zh: '相对坐标', en: 'Relative coordinates' },
                content: {
                  zh: '`IRTarget` 加 `{ rel }`(不推进 prevEnd,TikZ `(+x, +y)`)/ `{ relAccumulate }`(累积,TikZ `(++x, ++y)`)两变体',
                  en: '`IRTarget` gains `{ rel }` (does not advance prevEnd, TikZ `(+x, +y)`) and `{ relAccumulate }` (accumulates, TikZ `(++x, ++y)`)',
                },
              },
              {
                label: { zh: '边标注', en: 'Edge labels' },
                content: {
                  zh: '除 `move` / `cycle` 外八种 step kind 加 `label?: { text, position?, side? }`,compile 出 TextPrim(sloped 裹 group rotate)',
                  en: 'Every step kind except `move` / `cycle` accepts `label?: { text, position?, side? }`, compiled to a TextPrim (sloped wrapped in a group rotate)',
                },
              },
            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-09',
            summary: {
              zh: 'Node 美化层 P1 全集:多行文本、字体对象、分轴边距、颜色 / 不透明度 / 描边样式 / 尺寸约束 / 缩放。',
              en: 'Node visual P1 in full: multi-line text, font object, axis-specific seps, color / opacity / stroke style / size constraints / scaling.',
            },
            items: [
              {
                label: { zh: 'BREAKING:font 嵌套对象', en: 'BREAKING: font nested object' },
                content: {
                  zh: '`<Node fontSize={n}>` 改为 `<Node font={{ size: n }}>`,IR `NodeSchema.fontSize` 字段直接删除,alpha 期不留 deprecate 共存窗口',
                  en: '`<Node fontSize={n}>` becomes `<Node font={{ size: n }}>`; the IR `NodeSchema.fontSize` field is removed with no deprecation window in alpha',
                },
              },
              {
                label: { zh: 'Node 多行文本', en: 'Node multi-line text' },
                content: {
                  zh: '`text: string | Array<string | LineSpec>`,行级可覆盖 `fill` / `opacity` / `font`,配 `align` + `lineHeight`',
                  en: '`text: string | Array<string | LineSpec>` with per-line `fill` / `opacity` / `font` overrides plus `align` + `lineHeight`',
                },
              },
              {
                label: { zh: 'Node 分轴边距与尺寸', en: 'Node axis seps + size' },
                content: {
                  zh: '`innerXSep` / `innerYSep` / `outerSep` + `roundedCorners` / `minimumWidth` / `minimumHeight`,`padding` / `margin` 为对称别名',
                  en: '`innerXSep` / `innerYSep` / `outerSep` + `roundedCorners` / `minimumWidth` / `minimumHeight`; `padding` / `margin` are symmetric aliases',
                },
              },
              {
                label: { zh: 'Node 颜色 / 描边 / 缩放', en: 'Node color / stroke / scale' },
                content: {
                  zh: '`textColor` / `opacity` / `fillOpacity` / `drawOpacity`,`dashed` / `dotted` / `dashArray`,`scale` / `xScale` / `yScale`',
                  en: '`textColor` / `opacity` / `fillOpacity` / `drawOpacity`, `dashed` / `dotted` / `dashArray`, `scale` / `xScale` / `yScale`',
                },
              },
            ],
          },
          {
            version: 'alpha.1',
            date: '2026-05-09',
            summary: {
              zh: 'P0 + P1 流程图 / UML / 状态机刚需:节点 4 形状、path 折角 / 闭合 / 多端箭头 / 区域填色、显式锚点引用。',
              en: 'P0 + P1 essentials for flow charts / UML / state machines: 4 node shapes, path folds / closing / multi-end arrows / region fills, explicit anchor references.',
            },
            items: [
              {
                label: { zh: 'Step kind 扩到 4 种', en: 'Step kind grows to 4' },
                content: {
                  zh: '`move` / `line` / `step`(折角,TikZ `(A) -| (B)` 风格)/ `cycle`(闭合到起点)',
                  en: '`move` / `line` / `step` (fold, TikZ `(A) -| (B)` style) / `cycle` (close to start)',
                },
              },
              {
                label: { zh: 'Node shape 多态', en: 'Node shape polymorphism' },
                content: {
                  zh: '`rectangle` / `circle` / `ellipse` / `diamond` 4 种几何 + boundaryPoint 多态,外接形状包住 text + padding',
                  en: '`rectangle` / `circle` / `ellipse` / `diamond` with multimorphic `boundaryPoint`; the outer shape circumscribes text + padding',
                },
              },
              {
                label: { zh: 'Path 路径级视觉', en: 'Path-level visuals' },
                content: {
                  zh: '`arrow`(4 方向)+ `arrowShape`(7 种,含 hollow shape 自动 shrink)+ `fill` / `fillRule`',
                  en: '`arrow` (4 directions) + `arrowShape` (7 shapes, hollow shapes auto-shrink) + `fill` / `fillRule`',
                },
              },
              {
                label: { zh: 'Target 字符串扩展', en: 'Target string syntax' },
                content: {
                  zh: '`A`(auto-clip)/ `A.<anchor>`(命名 anchor)/ `A.<deg>`(角度边界)',
                  en: '`A` (auto-clip) / `A.<anchor>` (named anchor) / `A.<deg>` (angle border)',
                },
              },
            ],
          },
          {
            version: 'alpha.0',
            date: '2026-05-08',
            summary: {
              zh: '首版 npm 发布。retikz v0.1 重构基线,IR 居中——为后续 alpha 迭代打底。',
              en: 'First npm release. The retikz v0.1 redesign baseline with IR at the center — the foundation for upcoming alpha iterations.',
            },
            items: [
              {
                label: { zh: 'IR + Scene 编译器', en: 'IR + scene compiler' },
                content: {
                  zh: 'framework-agnostic 的中间表示与编译器,零 React、零 DOM',
                  en: 'A framework-agnostic intermediate representation and compiler, zero React and zero DOM',
                },
              },
              {
                label: { zh: '持久化形式', en: 'Persistence' },
                content: {
                  zh: '内部 React state → 可序列化 IR JSON,跨平台、可被 LLM 直接读写',
                  en: 'Internal React state → serializable IR JSON, cross-platform and directly readable / writable by LLMs',
                },
              },
            ],
          },
        ],
      },
      {
        pkg: '@retikz/react',
        version: 'v0.1',
        description: {
          zh: '从单包组件库重构为薄 React adapter,Kernel + Sugar 双层 JSX 一对一映射 IR,逐 alpha 透传 core 新字段并补齐 sugar,到 rc / stable 冻结 API。',
          en: 'Refactored from a single component library into a thin React adapter; Kernel + Sugar JSX maps 1:1 to IR, forwarding new core fields and sugar across alphas, frozen at rc / stable.',
        },
        highlights: [
          {
            label: { zh: '薄 React adapter', en: 'Thin React adapter' },
            content: {
              zh: 'core 与 React 解耦,Kernel 直对应 IR 节点、Sugar 编译期展开为 Kernel',
              en: 'Core decoupled from React; Kernel maps 1:1 to IR nodes and Sugar compiles down to Kernel',
            },
          },
          {
            label: { zh: 'sugar 组件', en: 'Sugar components' },
            content: {
              zh: '`<Text>` 行级覆盖、`<EdgeLabel>` 边标注、`<Coordinate>` 占位节点,以及 Draw way DSL',
              en: '`<Text>` per-line overrides, `<EdgeLabel>`, the `<Coordinate>` placeholder, and the Draw way DSL',
            },
          },
          {
            label: { zh: 'BREAKING:命名收敛', en: 'BREAKING: naming convergence' },
            content: {
              zh: '顶层组件 `<Tikz>` → `<TikZ>`;`<Path>` / `<Draw>` 的 dash prop 改 `dashPattern`(数组)',
              en: 'Top-level `<Tikz>` → `<TikZ>`; the `<Path>` / `<Draw>` dash prop becomes `dashPattern` (an array)',
            },
          },
        ],
        subVersions: [
          {
            version: '0',
            date: '2026-05-20',
            summary: {
              zh: '切到稳定版本号,用户可直接安装 latest。',
              en: 'Move to the stable version number; users can install latest directly.',
            },
            items: [
              {
                label: { zh: '稳定版版本号', en: 'Stable version number' },
                content: {
                  zh: '`@retikz/react` 从 `0.1.0-rc.2` 切到 `0.1.0`,可直接 `pnpm add @retikz/react react react-dom` 安装 latest',
                  en: '`@retikz/react` moves from `0.1.0-rc.2` to `0.1.0`; install latest directly with `pnpm add @retikz/react react react-dom`',
                },
              },
            ],
          },
          {
            version: 'rc.2',
            date: '2026-05-19',
            summary: {
              zh: '三处渲染管线缺陷修复,无公开 API 变更。',
              en: 'Three render-pipeline fixes; no public API changes.',
            },
            items: [
              {
                label: { zh: 'buildIR 透明展开 Fragment', en: 'buildIR unwraps Fragment' },
                content: {
                  zh: '`React.Fragment` 在 IR 构建时递归解开,子节点照原序进入;覆盖直接 / `.map` / 嵌套 / 混合四种形态',
                  en: '`React.Fragment` is recursively unwrapped during IR construction so children flow through in source order; covers direct / `.map` / nested / mixed forms',
                },
              },
              {
                label: { zh: 'CSS var() 颜色走 inline style', en: 'CSS var() colors via inline style' },
                content: {
                  zh: '`renderPrim` 检测 `fill` / `stroke` 含 `var(` 时改走 inline `style`,`fill="var(--background)"` 等主题色直接生效',
                  en: '`renderPrim` routes `fill` / `stroke` containing `var(` through inline `style`, so theme colors like `fill="var(--background)"` work directly',
                },
              },
              {
                label: { zh: 'arrow spec 收集加 null 防御', en: 'arrow spec collection null defense' },
                content: {
                  zh: '`collectArrowSpecs` visitor 在 fragment / 空 children 场景下加 null 防护,避免 AI 流式生成中间态崩溃',
                  en: 'The `collectArrowSpecs` visitor tolerates fragment / empty children, preventing crashes during AI streaming intermediate states',
                },
              },
            ],
          },
          {
            version: 'rc.1',
            date: '2026-05-16',
            summary: {
              zh: '组件名 / prop 名 / 公开类型自此冻结。',
              en: 'Component names / prop names / public types freeze here.',
            },
            items: [
              {
                label: { zh: 'API 冻结', en: 'API freeze' },
                content: {
                  zh: '组件名、prop 名、公开类型自此不再做破坏性变更;后续 rc.N 与 0.1.0 stable 保持兼容',
                  en: 'Component names, prop names, and public types take no breaking changes from here; later rc.N and 0.1.0 stable stay compatible',
                },
              },
            ],
          },
          {
            version: 'beta.2',
            date: '2026-05-14',
            summary: {
              zh: '命名收敛:顶层组件大小写与 dash prop 对齐 TikZ 术语。',
              en: 'Naming convergence: top-level casing and the dash prop align with TikZ terminology.',
            },
            items: [
              {
                label: { zh: 'BREAKING:<Tikz> → <TikZ>', en: 'BREAKING: <Tikz> → <TikZ>' },
                content: {
                  zh: '`Tikz` / `TikzProps` 分别改为 `TikZ` / `TikZProps`,与 LaTeX TikZ 原品牌大小写一致,迁移只需替换 import 与 JSX 标签',
                  en: '`Tikz` / `TikzProps` become `TikZ` / `TikZProps`, matching the original LaTeX TikZ casing; migration is a direct import and tag rename',
                },
              },
              {
                label: { zh: 'BREAKING:dash prop 改 dashPattern', en: 'BREAKING: dash prop becomes dashPattern' },
                content: {
                  zh: '把 `strokeDasharray="4 2"` 替换为 `dashPattern={[4, 2]}`;`Node.dashArray` 也从字符串改为 `Array<number>`',
                  en: 'Replace `strokeDasharray="4 2"` with `dashPattern={[4, 2]}`; `Node.dashArray` also changes from a string to `Array<number>`',
                },
              },
            ],
          },
          {
            version: 'beta.1',
            date: '2026-05-13',
            summary: {
              zh: 'unbuilder round-trip 覆盖补齐、字段表类型互锁、builder cast 收敛与命名清理。',
              en: 'Fill out unbuilder round-trip coverage, lock field-list types, narrow builder casts, and clean naming.',
            },
            items: [
              {
                label: { zh: 'unbuilder 覆盖补齐', en: 'unbuilder coverage' },
                content: {
                  zh: '补 alpha.5 新增形态 round-trip 覆盖,包括 AtPosition / OffsetPosition / `arrowDetail` / 扩展 StepLabel position',
                  en: 'Add round-trip coverage for the alpha.5 forms including AtPosition / OffsetPosition / `arrowDetail` / expanded StepLabel positions',
                },
              },
              {
                label: { zh: '字段表类型互锁与 cast 收敛', en: 'Field-list type locks + cast narrowing' },
                content: {
                  zh: '让 builder / unbuilder 镜像字段与 arrow marker `stableSpecKey` 字段表与类型同步,并减少 `_builder.ts` 分散 `as` cast',
                  en: 'Tie builder / unbuilder mirrored fields and arrow marker `stableSpecKey` to their types, and reduce scattered `as` casts in `_builder.ts`',
                },
              },
            ],
          },
          {
            version: 'alpha.5',
            date: '2026-05-13',
            summary: {
              zh: '透传 alpha.5 新字段:arrowDetail 对象、扩展 StepLabel position、OffsetPosition,并新增结构化 SVG 翻译 helper。',
              en: 'Forward the alpha.5 fields: the arrowDetail object, expanded StepLabel position, OffsetPosition, plus new structured-to-SVG translation helpers.',
            },
            items: [
              {
                label: { zh: '<Path arrowDetail>', en: '<Path arrowDetail>' },
                content: {
                  zh: 'prop 接 `ArrowDetail` 对象(替代旧 `arrowShape` 单字段);marker id 纳入 detail hash',
                  en: 'The prop takes the `ArrowDetail` object (replacing the old single `arrowShape`); the marker id hashes the detail object',
                },
              },
              {
                label: { zh: 'StepLabel / OffsetPosition 透传', en: 'StepLabel / OffsetPosition passthrough' },
                content: {
                  zh: '`<Step label={{ position: 0.3 }}>` / `<EdgeLabel position="very-near-start" />` 与 `<Node position={{ of, offset }}>` 接受新形态',
                  en: '`<Step label={{ position: 0.3 }}>` / `<EdgeLabel position="very-near-start" />` and `<Node position={{ of, offset }}>` accept the new forms',
                },
              },
              {
                label: { zh: '结构化 → SVG helper', en: 'Structured → SVG helpers' },
                content: {
                  zh: '新增 `path-d-builder` / `transform-builder`,把 `PathCommand[]` / `Transform[]` 翻译为 SVG `d` / `transform`',
                  en: 'New `path-d-builder` / `transform-builder` translate `PathCommand[]` / `Transform[]` into SVG `d` / `transform`',
                },
              },
            ],
          },
          {
            version: 'alpha.4',
            date: '2026-05-12',
            summary: {
              zh: '透传节点关系层:nodeDistance、相对定位、新增 <Coordinate> kernel 组件、Node 边标签。',
              en: 'Forward the node-relations layer: nodeDistance, relative positioning, the new <Coordinate> kernel component, and node labels.',
            },
            items: [
              {
                label: { zh: 'nodeDistance + 相对定位', en: 'nodeDistance + relative positioning' },
                content: {
                  zh: '`<TikZ>` 加 `nodeDistance` prop;`<Node position={{ direction, of, distance? }}>` 接受相对定位形态',
                  en: '`<TikZ>` gains `nodeDistance`; `<Node position={{ direction, of, distance? }}>` accepts the relative-positioning form',
                },
              },
              {
                label: { zh: '<Coordinate> kernel 组件', en: '<Coordinate> kernel component' },
                content: {
                  zh: '新增第三件 kernel `<Coordinate id="..." position={...} />`,与 `<Node>` / `<Path>` 平级,builder / unbuilder 全链路 round-trip',
                  en: 'New third kernel `<Coordinate id="..." position={...} />`, peer of `<Node>` / `<Path>`, with full builder / unbuilder round-trip',
                },
              },
            ],
          },
          {
            version: 'alpha.3',
            date: '2026-05-10',
            summary: {
              zh: '透传 Path 增强:曲线 / 形状 / 相对坐标 / 边标注,新增 <EdgeLabel> sugar,Draw way DSL 一并支持。',
              en: 'Forward path enhancements: curves / shapes / relative coords / edge labels, with the new <EdgeLabel> sugar and Draw way DSL support.',
            },
            items: [
              {
                label: { zh: '<EdgeLabel> sugar', en: '<EdgeLabel> sugar' },
                content: {
                  zh: '作为 `<Step>` child 等价于 `<Step label={...}>`,prop 优先;不可逆(unbuilder 只产 prop 形态)',
                  en: 'As a `<Step>` child it equals `<Step label={...}>` with the prop winning; one-way (unbuilder only emits the prop form)',
                },
              },
              {
                label: { zh: '透传新字段与 Draw DSL', en: 'Forward new fields + Draw DSL' },
                content: {
                  zh: 'Step / Path / Draw 透传所有新字段,Draw way DSL 一并支持 label / 曲线 / 形状 / 相对坐标 sugar',
                  en: 'Step / Path / Draw forward every new field; the Draw way DSL also supports label / curves / shapes / relative-coord sugar',
                },
              },
            ],
          },
          {
            version: 'alpha.2',
            date: '2026-05-09',
            summary: {
              zh: '新增 <Text> 行级覆盖 sugar,Node children 直接支持多行,renderer 改多 tspan 渲染。',
              en: 'Add the <Text> per-line sugar, support multi-line Node children directly, and render with multiple tspans.',
            },
            items: [
              {
                label: { zh: '<Text> sugar 与多行 children', en: '<Text> sugar + multi-line children' },
                content: {
                  zh: '`<Node>` 内行级样式覆盖;children 直接支持 `\\n` 字符串 / 数组 / 混 `<Text>` 三种写法',
                  en: 'Per-line overrides inside `<Node>`; children accept `\\n` strings / arrays / mixed `<Text>`',
                },
              },
              {
                label: { zh: 'renderer 多 tspan', en: 'renderer multi-tspan' },
                content: {
                  zh: 'renderer `<text>` 改为多 `<tspan>` 渲染,按 `baseline` 自动反推首行 `dy` 实现块级垂直对齐',
                  en: 'The renderer emits `<text>` with one `<tspan>` per line, deriving the first-line `dy` from `baseline` for block vertical alignment',
                },
              },
            ],
          },
          {
            version: 'alpha.1',
            date: '2026-05-09',
            summary: {
              zh: '透传节点形状 / path 视觉新字段,TikZ 容器按需注入 SVG marker,renderer 加 ellipse 与 GroupPrim 支持。',
              en: 'Forward node-shape / path-visual fields, inject SVG markers on demand, and add ellipse / GroupPrim support to the renderer.',
            },
            items: [
              {
                label: { zh: '透传新 IR 字段', en: 'Forward new IR fields' },
                content: {
                  zh: 'Path / Draw / Step / Node 透传所有新 IR 字段;`DrawWay` 与 IR 字面量类型完全互通',
                  en: 'Path / Draw / Step / Node forward all new IR fields; `DrawWay` is fully interchangeable with IR string literals',
                },
              },
              {
                label: { zh: '按需注入 SVG marker', en: 'On-demand SVG markers' },
                content: {
                  zh: 'TikZ 容器按需注入 `<defs><marker>`(每种用到的 arrow shape 一份,`useId()` 防多实例冲突)',
                  en: 'The TikZ container injects `<defs><marker>` on demand (one per arrow shape used, `useId()` keeps ids unique)',
                },
              },
              {
                label: { zh: 'renderer ellipse / GroupPrim', en: 'renderer ellipse / GroupPrim' },
                content: {
                  zh: '新增 `ellipse` primitive case;支持 GroupPrim 把多 sub-path 包起来,只首段 / 末段挂 marker',
                  en: 'New `ellipse` primitive case; GroupPrim wraps multi-sub-path paths so markers attach only to the first / last segment',
                },
              },
            ],
          },
          {
            version: 'alpha.0',
            date: '2026-05-08',
            summary: {
              zh: '架构拆分:从单包组件库改为薄 React adapter,Kernel + Sugar 双层 JSX。',
              en: 'Architecture split: from a single component library to a thin React adapter with Kernel + Sugar JSX layers.',
            },
            items: [
              {
                label: { zh: '架构拆分', en: 'Architecture split' },
                content: {
                  zh: '从单包 React 组件库改为薄 React adapter,core 与 React 解耦;peerDep React 18+',
                  en: 'From a single React component library to a thin React adapter; core decoupled from React; peerDep React 18+',
                },
              },
              {
                label: { zh: 'Kernel + Sugar 双层 JSX', en: 'Kernel + Sugar JSX' },
                content: {
                  zh: 'Kernel 直对应 IR 节点,Sugar 编译期展开为 Kernel',
                  en: 'Kernel maps 1:1 to IR nodes; Sugar compiles down to Kernel',
                },
              },
            ],
          },
        ],
      },
      {
        pkg: 'docs',
        version: 'v0.1',
        description: {
          zh: '随库逐 alpha 补齐组件 / Reference 文档,rc.2 一轮大改造:Examples / Recipes 分组、mdx 正文搜索、Copilot 风格 AI 助手与多会话持久化、AI 直接渲染、Blog 分区。',
          en: 'Docs grow with the library across alphas; rc.2 brings a big overhaul: Examples / Recipes, mdx-body search, a Copilot-style AI assistant with persistence, AI direct rendering, and a Blog section.',
        },
        highlights: [
          {
            label: { zh: 'Examples / Recipes 与搜索', en: 'Examples / Recipes + search' },
            content: {
              zh: '`/core/examples/` 场景示例分组;搜索从 frontmatter 升级到正文 / 标题 / inline code 全覆盖',
              en: '`/core/examples/` scenario grouping; search upgraded from frontmatter to full body / heading / inline-code coverage',
            },
          },
          {
            label: { zh: 'AI 助手', en: 'AI assistant' },
            content: {
              zh: 'Copilot 风格输入框、多会话 IndexedDB 持久化、AI 回复直接渲染 retikz 图(IR / TSX 双协议)',
              en: 'Copilot-style input, multi-conversation IndexedDB persistence, and AI replies that render retikz diagrams (IR / TSX dual protocol)',
            },
          },
          {
            label: { zh: 'Arrow 专页与 Blog', en: 'Arrow page + Blog' },
            content: {
              zh: '新增 Arrow 专页讲箭头 shape / 颜色 / 异形 / 缩放;`/blog/` 设计 / 历程两 section 上线',
              en: 'A dedicated Arrow page on shape / color / heterogeneous ends / scale; the `/blog/` design / journey sections go live',
            },
          },
        ],
        subVersions: [
          {
            version: '0',
            date: '2026-05-20',
            summary: {
              zh: '版本标识去 rc:徽章、概览、安装命令与起点文章同步切到 v0.1 稳定表述。',
              en: 'Drop rc from version wording: badge, overview, install command, and origin article move to stable v0.1.',
            },
            items: [
              {
                label: { zh: '版本标识去 rc', en: 'Remove rc from wording' },
                content: {
                  zh: '站点版本徽章、About 概览、快速开始安装命令与起点文章同步切到 `v0.1` 稳定表述',
                  en: 'The site version badge, About overview, Get Started install command, and origin article move to stable `v0.1` wording',
                },
              },
            ],
          },
          {
            version: 'rc.2',
            date: '2026-05-19',
            summary: {
              zh: '文档站一轮大改造:Examples / Recipes 分组、正文搜索、Copilot 风格 AI 助手 + 多会话持久化、AI 直接渲染、Blog 分区。',
              en: 'A docs overhaul: Examples / Recipes, body search, a Copilot-style AI assistant + persistence, AI direct rendering, and a Blog section.',
            },
            items: [
              {
                label: { zh: 'Examples / Recipes 分组', en: 'Examples / Recipes section' },
                content: {
                  zh: '`/core/examples/` 新增分组,首例 Karl 单位圆;配套 `docs-doc-example` skill 供后续续加',
                  en: 'New `/core/examples/` grouping with the first entry — Karl’s unit circle; backed by a `docs-doc-example` skill for more',
                },
              },
              {
                label: { zh: '<ComponentPreview> 增强', en: '<ComponentPreview> enhancements' },
                content: {
                  zh: 'diff 模式 / SVG 下载 / Ask AI 按钮 / size picker;移动端 tap 呼工具条 + 双指 pinch + 全局拖动',
                  en: 'diff mode / SVG download / Ask AI / size picker; on mobile, tap-to-summon toolbar + pinch zoom + global pan',
                },
              },
              {
                label: { zh: '搜索覆盖 mdx 正文', en: 'mdx-body search' },
                content: {
                  zh: '从只索引 frontmatter 升级为正文 / `##` `###` 标题 / inline code 全覆盖,命中带高亮 + snippet',
                  en: 'From frontmatter-only to full body / `##` `###` headings / inline code, with highlight + snippet on hits',
                },
              },
              {
                label: { zh: 'Copilot 风格 AI 助手', en: 'Copilot-style AI assistant' },
                content: {
                  zh: '输入框三段式,Model / Context Mode / Diagram Format 三个 picker、润色按钮、麦克风、上下文用量圆环',
                  en: 'A three-segment input with Model / Context Mode / Diagram Format pickers, a polish button, a mic, and a context-usage ring',
                },
              },
              {
                label: { zh: 'AI 多会话持久化', en: 'AI multi-conversation persistence' },
                content: {
                  zh: 'IndexedDB 存储,history 视图(list / 切换 / 重命名 / 删除),cap 20 条按 `updatedAt` 自动淘汰',
                  en: 'IndexedDB storage, a history view (list / switch / rename / delete), and a 20-conversation cap evicted by `updatedAt`',
                },
              },
              {
                label: { zh: 'AI 直接渲染 retikz 图', en: 'AI direct diagram rendering' },
                content: {
                  zh: 'AI 回复里 `retikz-ir` / `retikz-tsx` 围栏块走双协议——IR 走 `JSON.parse`,TSX 走 AST 解析(白名单组件,无 eval)→ 转 IR 渲染',
                  en: 'AI replies use `retikz-ir` / `retikz-tsx` fences — IR via `JSON.parse`, TSX via AST parse (whitelisted components, no eval) → IR → render',
                },
              },
              {
                label: { zh: 'Blog 分区上线', en: 'Blog section' },
                content: {
                  zh: '`/blog/` 新增设计 / 历程两 section,首发 `core-philosophy` 与 `origin` 两篇中英正文',
                  en: 'New `/blog/` with design / journey sub-sections; ships `core-philosophy` and `origin` as the first two zh + en posts',
                },
              },
            ],
          },
          {
            version: 'alpha.5',
            date: '2026-05-13',
            summary: {
              zh: '新增 Arrow 专页,Path / Draw 页对应段精简引用。',
              en: 'Add a dedicated Arrow page; the Path / Draw pages link to it with a short summary.',
            },
            items: [
              {
                label: { zh: 'Arrow 专页', en: 'Arrow page' },
                content: {
                  zh: '新增 [Arrow 专页](/core/components/draw/arrow) 讲箭头 shape / 颜色 / 起末异形 / 缩放 / 半透明;Path / Draw 页精简引用',
                  en: 'New [Arrow page](/core/components/draw/arrow) on shape / color / heterogeneous ends / scale / opacity; Path / Draw pages link to it',
                },
              },
            ],
          },
        ],
      },
    ],
  },

  {
    minor: 'v0.0',
    stableDate: '2025-04-30',
    packages: [
      {
        pkg: '@retikz/core',
        version: 'v0.0',
        description: {
          zh: '第一个公开版本系列,从 `rc.0` 迭代到 `rc.3`。只发了 React 单包,没有 IR 与跨框架架构。',
          en: 'The first public series, iterating from `rc.0` through `rc.3`. A single React package — no IR, no cross-framework architecture.',
        },
        highlights: [
          {
            label: { zh: 'React 单包起点', en: 'Single React package' },
            content: {
              zh: '最初的 React 组件库形态,补齐箭头类型与竖向 way 类型、兼容 React 18',
              en: 'The original React component library form — adds arrow / vertical way types and React 18 compatibility',
            },
          },
        ],
        subVersions: [
          {
            version: 'rc.0–rc.3',
            date: '2025-04-30',
            summary: {
              zh: 'React 单包系列,补能力 + 兼容 React 18 + 修若干 bug。',
              en: 'The single-package React series — adds capabilities, React 18 compatibility, and several bug fixes.',
            },
            items: [
              {
                label: { zh: '新增', en: 'Added' },
                content: {
                  zh: '箭头类型 `Circle`;竖向 way 类型 `|-|` / `-|-`',
                  en: 'Arrow type `Circle`; vertical way types `|-|` / `-|-`',
                },
              },
              {
                label: { zh: '变更', en: 'Changed' },
                content: {
                  zh: '兼容 React 18',
                  en: 'React 18 compatibility',
                },
              },
              {
                label: { zh: '修复', en: 'Fixed' },
                content: {
                  zh: '修复 way 转换 bug、`ScopeContext` 透传问题、若干 TypeScript 错误与告警,以及个别非功能性参数透传错误',
                  en: 'Fixed a converted-way bug, `ScopeContext` propagation, various TypeScript errors / warnings, and non-functional prop forwarding regressions',
                },
              },
              {
                label: { zh: '移除', en: 'Removed' },
                content: {
                  zh: '构建产物移除对 `react/jsx-runtime` 的依赖',
                  en: 'Dropped the `react/jsx-runtime` dependency from build output',
                },
              },
            ],
          },
        ],
      },
    ],
  },
];
