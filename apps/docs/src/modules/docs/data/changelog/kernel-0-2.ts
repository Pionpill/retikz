import type { Release } from '../types';

export const kernelV02: Release = {
  minor: 'v0.2',
  stableDate: '2026-06-03',
  packages: [
    {
      pkg: '@retikz/core',
      version: 'v0.2',
      description: {
        zh: 'v0.2:形状 / 箭头 / 图案 / 路径生成器四注册面 + Paint 填充(渐变 / 图案 / 图片),Scope 样式默认、zIndex、Node 换行 / 引脚,Path out/in·自环 / 变换 / 中段标记。',
        en: 'v0.2: shape / arrow / pattern / path-generator registries + Paint fills (gradients / pattern / image), Scope style defaults, zIndex, Node wrapping / pins, and Path out/in / transform / marks.',
      },
      highlights: [
        {
          label: { zh: 'Paint 填充服务', en: 'Paint fill service' },
          content: {
            zh: '`fill` 升 `PaintValue` + `SceneResource` 资源表,支持渐变 / 图案 pattern / 图片 image,渲染目标无关(`<defs>` 由 adapter 物化)[Node 概览](/kernel/components/node/overview)',
            en: '`fill` upgrades to `PaintValue` + a `SceneResource` table supporting gradients / pattern / image, render-target agnostic (`<defs>` materialized by the adapter) [Node overview](/kernel/components/node/overview)',
          },
        },
        {
          label: { zh: '形状注册', en: 'Shape registry' },
          content: {
            zh: 'ShapeDefinition 四方法,内置 4 形状改注册项,可发第三方形状库 [自定义形状](/kernel/components/shapes/custom-shape)',
            en: 'Four-method ShapeDefinition; the 4 built-ins become registry entries; third-party shape libs possible [shape registry](/kernel/components/shapes/custom-shape)',
          },
        },
        {
          label: { zh: '箭头 / 图案 / 生成器注册面', en: 'Arrow / pattern / generator registries' },
          content: {
            zh: 'ArrowDefinition(自定义箭头,emit-in-compile,内置 7 降注册项)+ PatternDefinition(自定义图案 motif,复用 MarkerPrimitive)+ PathGeneratorDefinition(外部曲线包,JSON params 双 parse 护栏),与形状注册面同构 [自定义箭头](/kernel/components/draw/custom-arrow)',
            en: 'ArrowDefinition (custom arrows, emit-in-compile, the 7 built-ins demoted to entries) + PatternDefinition (custom pattern motifs, reusing MarkerPrimitive) + PathGeneratorDefinition (external curve packages, JSON params with a double-parse guard), isomorphic to the shape registry [custom arrows](/kernel/components/draw/custom-arrow)',
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
        {
          label: { zh: 'Scene / Position 能力完善', en: 'Scene / Position completion' },
          content: {
            zh: 'clip 裁切（Scope 级 ClipResource + clipRef）+ 自定义 viewBox override + 比例 partway 定位 `{ between, fraction }`（自包含 AbsoluteTarget）[Scope](/kernel/components/layout/scope)',
            en: 'Clipping (Scope-level ClipResource + clipRef) + custom viewBox override + proportional partway positioning `{ between, fraction }` (self-contained AbsoluteTarget) [Scope](/kernel/components/layout/scope)',
          },
        },
      ],
      subVersions: [
        {
          version: 'rc.1',
          date: '2026-06-02',
          summary: {
            zh: '候选发布：公开 API 冻结（IR schema 字段名 / 导出名 / 函数签名 / 公开 type 自此不再破坏性变更）。能力补全（alpha.7–9）+ beta 收口后无新增功能，进入发布候选。',
            en: 'Release candidate: the public API freezes here (IR schema field names / exports / function signatures / public types take no breaking changes from now). After the capability completion (alpha.7–9) and beta cleanup there are no new features — this is the release candidate.',
          },
          items: [],
        },
        {
          version: 'beta.1',
          date: '2026-05-24',
          summary: {
            zh: '优化窗口 + 最后破坏性清理：makeRound -0 归一（Scene JSON round-trip 在 Object.is 层稳定）；IR discriminator 命名约定文档化（实体 / paint = type、子变体 = kind）。',
            en: 'Optimization window + final breaking cleanup: makeRound -0 normalization (stable Scene JSON round-trip under Object.is); IR discriminator convention documented (entity / paint = type, sub-variant = kind).',
          },
          items: [],
        },
        {
          version: 'alpha.9',
          date: '2026-05-24',
          summary: {
            zh: 'Scene / Position 能力完善：clip 裁切（renderer-agnostic ClipResource + clipRef，Scope 级）+ 自定义 viewBox override（IR 根 viewBox 覆盖自动算、忽略 padding）+ 比例 partway 定位（{ between:[A,B], t }，自包含 AbsoluteTarget）。',
            en: 'Scene / Position completion: clip (renderer-agnostic ClipResource + clipRef, Scope-level) + custom viewBox override (IR-root viewBox overriding the auto layout, ignoring padding) + proportional partway positioning ({ between:[A,B], t } with a self-contained AbsoluteTarget).',
          },
          items: [],
        },
        {
          version: 'alpha.8',
          date: '2026-05-24',
          summary: {
            zh: '两大注册面:自定义箭头 ArrowDefinition(emit-in-compile,内置 7 降注册项)+ 路径生成器 PathGeneratorDefinition(外部曲线包,params 限 JSON 双 parse 护栏);Path 搭车 out/in·自环 / 整体变换 / 中段 marking。',
            en: 'Two registries: custom arrows via ArrowDefinition (emit-in-compile, the 7 built-ins demoted to entries) and path generators via PathGeneratorDefinition (external curve packages, JSON-only params with a double-parse guard); plus Path out/in·self-loop / transform / mid-path marking.',
          },
          items: [],
        },
        {
          version: 'alpha.7',
          date: '2026-05-24',
          summary: {
            zh: 'Paint 填充服务(线性 / 径向渐变 + 图案 pattern + 图片 image),Node `maxTextWidth` 自动换行,以及 `pin` 引脚(从节点边界牵引线到 label)。',
            en: 'A Paint fill service (linear / radial gradients + pattern + image), Node `maxTextWidth` auto-wrapping, and `pin` leaders (a line from the node border to the label).',
          },
          items: [],
        },
        {
          version: 'alpha.6',
          date: '2026-05-23',
          summary: {
            zh: '结构化 Target / Anchor:path target 对象唯一(去 z.string)+ AnchorRef(命名 / 角度 / 边上比例点 `{ side, fraction }`)+ offset;`{ side, fraction }` 落 shape 真实边界。',
            en: 'Structured Target / Anchor: object-only path target (drops z.string) + AnchorRef (named / angle / edge-proportional `{ side, fraction }`) + offset; `{ side, fraction }` lands on the real shape boundary.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-05-23',
          summary: {
            zh: '扩张 Path IR 支撑几何形 sugar:arc 显式 center + 椭圆弧、circlePath / ellipsePath 部分裁剪、新增 rectangle step。本版后 IR 进入冻结准备。',
            en: 'Expand Path IR to back geometric-shape sugar: arc explicit center + elliptical arc, circlePath / ellipsePath partial clipping, a new rectangle step.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-05-23',
          summary: {
            zh: 'compile IR 顺序回归 + emit 层增强(zIndex / 文本 Node 包 g / label rotate)。',
            en: 'compile IR-order regression + emit-layer enhancements (zIndex / wrap text nodes in g / label rotate).',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-05-23',
          summary: {
            zh: 'Shape Registry——node 形状从内置 4 种推进到可注册、可第三方注入。',
            en: 'Shape Registry — node shapes go from 4 built-ins to registrable / third-party injectable.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-05-22',
          summary: {
            zh: '把 Scope 升级为样式默认值挂点:主色级联 + 四类默认样式。',
            en: 'Scope becomes a style-default host: primary-color cascade + four default channels.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-05-21',
          summary: {
            zh: '引入 IR 层 `<Scope>` 分组容器,承接 TikZ `\\begin{scope}` 的分组 + 局部 transform。',
            en: 'Introduce an IR-level `<Scope>` container for TikZ `\\begin{scope}` grouping + local transform.',
          },
          items: [],
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
          content: {
            zh: '透传 `CompileOptions.shapes`,自定义 shape 端到端可用',
            en: 'Pass through `CompileOptions.shapes`; custom shapes work end to end',
          },
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
          version: 'rc.1',
          date: '2026-06-02',
          summary: {
            zh: '候选发布：公开 API（组件名 / props / 扩展面导出）冻结。含 beta.2 的 `<Layout>` 顶层级联样式，无新增功能。',
            en: 'Release candidate: the public API (component names / props / extension-surface exports) freezes here. Includes the beta.2 `<Layout>` cascade styling; no new features.',
          },
          items: [],
        },
        {
          version: 'beta.2',
          date: '2026-06-01',
          summary: {
            zh: '`<Layout>` 顶层直接接受 `<Scope>` 级联样式子集——全图默认样式不必再手写一层根 `<Scope>`。纯增量、非破坏。',
            en: '`<Layout>` directly accepts the `<Scope>` cascade style subset — whole-figure defaults no longer need a hand-written root `<Scope>`. Additive, non-breaking.',
          },
          items: [],
        },
        {
          version: 'beta.1',
          date: '2026-05-24',
          summary: {
            zh: 'BREAKING：删 `<TikZ>` deprecated alias（迁移 `<Layout>`）；修 unbuilder path round-trip 丢 rotate / scale / marks。',
            en: 'BREAKING: the `<TikZ>` deprecated alias is removed (migrate to `<Layout>`); fixed the unbuilder path round-trip dropping rotate / scale / marks.',
          },
          items: [],
        },
        {
          version: 'alpha.9',
          date: '2026-05-24',
          summary: {
            zh: 'adapter 物化 clip：ClipDefs 产 `<clipPath>`、group 挂 `clip-path`；`<Layout viewBox>` prop；`<Node>` / `<Coordinate>` position 接 `{ between, fraction }`。',
            en: 'The adapter materializes clip: ClipDefs emits `<clipPath>` and the group gains `clip-path`; a `<Layout viewBox>` prop; `<Node>` / `<Coordinate>` position accept `{ between, fraction }`.',
          },
          items: [],
        },
        {
          version: 'alpha.8',
          date: '2026-05-24',
          summary: {
            zh: 'adapter 跟进 emit-in-compile:物化已解析的 `ArrowEndSpec.marker`(含 arc / ellipseArc),`<Layout>` 加 `arrows` / `pathGenerators` 注入;`<Path rotate/scale/marks>`、`<Step bend out/in/looseness>`(bendDirection 改 optional)。',
            en: 'The adapter follows emit-in-compile: it materializes the resolved `ArrowEndSpec.marker` (incl. arc / ellipseArc), `<Layout>` gains `arrows` / `pathGenerators` injection; `<Path rotate/scale/marks>`, `<Step bend out/in/looseness>` (bendDirection now optional).',
          },
          items: [],
        },
        {
          version: 'alpha.7',
          date: '2026-05-24',
          summary: {
            zh: '物化 Paint 资源表为 `<defs>`(渐变 / pattern / image)、`renderPrim` 按 `PaintValue` 分派 `fill`,并透传 Node `maxTextWidth`。',
            en: 'Materialize the Paint resource table into `<defs>` (gradients / pattern / image), dispatch `fill` by `PaintValue` in `renderPrim`, and forward Node `maxTextWidth`.',
          },
          items: [],
        },
        {
          version: 'alpha.6',
          date: '2026-05-23',
          summary: {
            zh: '`<TikZ>` → `<Layout>` 改名(`<TikZ>` 保留为 deprecated 别名,致敬 LaTeX TikZ);Step target 接受对象形态 + 字符串 shorthand。',
            en: '`<TikZ>` → `<Layout>` rename (`<TikZ>` kept as a deprecated alias, a nod to LaTeX TikZ); Step targets accept the object form plus string shorthand.',
          },
          items: [],
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
              content: {
                zh: '透传自定义 shapes;`<Node shape>` 接受任意字符串名',
                en: 'pass custom shapes; `<Node shape>` accepts any string name',
              },
            },
          ],
        },
        {
          version: 'alpha.2',
          date: '2026-05-22',
          items: [
            {
              label: { zh: 'Scope 样式 props', en: 'Scope style props' },
              content: {
                zh: '`<Scope>` 加 12 个样式 props;`<Node>` / `<Path>` 加主色 `color`',
                en: '12 style props on `<Scope>`; primary `color` on `<Node>` / `<Path>`',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-05-21',
          items: [
            {
              label: { zh: '<Scope> Kernel 组件', en: '<Scope> kernel component' },
              content: {
                zh: '接收 `transforms` / `id` / `localNamespace` / children',
                en: 'takes `transforms` / `id` / `localNamespace` / children',
              },
            },
          ],
        },
      ],
    },
  ],
};
