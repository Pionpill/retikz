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
          zh: 'v0.2:形状 / 箭头 / 图案 / 路径生成器四注册面 + Paint 填充(渐变 / 图案 / 图片),Scope 样式默认、zIndex、Node 换行 / 引脚,Path out/in·自环 / 变换 / 中段标记。',
          en: 'v0.2: shape / arrow / pattern / path-generator registries + Paint fills (gradients / pattern / image), Scope style defaults, zIndex, Node wrapping / pins, and Path out/in / transform / marks.',
        },
        highlights: [
          {
            label: { zh: 'Paint 填充服务', en: 'Paint fill service' },
            content: {
              zh: '`fill` 升 `PaintValue` + `SceneResource` 资源表,支持渐变 / 图案 pattern / 图片 image,渲染目标无关(`<defs>` 由 adapter 物化)[Node 概览](/core/components/node/overview)',
              en: '`fill` upgrades to `PaintValue` + a `SceneResource` table supporting gradients / pattern / image, render-target agnostic (`<defs>` materialized by the adapter) [Node overview](/core/components/node/overview)',
            },
          },
          {
            label: { zh: '形状注册', en: 'Shape registry' },
            content: {
              zh: 'ShapeDefinition 四方法,内置 4 形状改注册项,可发第三方形状库 [自定义形状](/core/reference/extending/shape-registry)',
              en: 'Four-method ShapeDefinition; the 4 built-ins become registry entries; third-party shape libs possible [shape registry](/core/reference/extending/shape-registry)',
            },
          },
          {
            label: { zh: '箭头 / 图案 / 生成器注册面', en: 'Arrow / pattern / generator registries' },
            content: {
              zh: 'ArrowDefinition(自定义箭头,emit-in-compile,内置 7 降注册项)+ PatternDefinition(自定义图案 motif,复用 MarkerPrimitive)+ PathGeneratorDefinition(外部曲线包,JSON params 双 parse 护栏),与形状注册面同构 [自定义箭头](/core/reference/extending/custom-arrow)',
              en: 'ArrowDefinition (custom arrows, emit-in-compile, the 7 built-ins demoted to entries) + PatternDefinition (custom pattern motifs, reusing MarkerPrimitive) + PathGeneratorDefinition (external curve packages, JSON params with a double-parse guard), isomorphic to the shape registry [custom arrows](/core/reference/extending/custom-arrow)',
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
              zh: 'clip 裁切（Scope 级 ClipResource + clipRef）+ 自定义 viewBox override + 比例 partway 定位 `{ between, t }`（自包含 AbsoluteTarget）[Scope](/core/components/layout/scope)',
              en: 'Clipping (Scope-level ClipResource + clipRef) + custom viewBox override + proportional partway positioning `{ between, t }` (self-contained AbsoluteTarget) [Scope](/core/components/layout/scope)',
            },
          },
        ],
        subVersions: [
          {
            version: 'beta.1',
            date: '2026-05-24',
            summary: {
              zh: '优化窗口 + 最后破坏性清理：makeRound -0 归一（Scene JSON round-trip 在 Object.is 层稳定）；IR discriminator 命名约定文档化（实体 / paint = type、子变体 = kind）。',
              en: 'Optimization window + final breaking cleanup: makeRound -0 normalization (stable Scene JSON round-trip under Object.is); IR discriminator convention documented (entity / paint = type, sub-variant = kind).',
            },
            items: [
              {
                label: { zh: 'makeRound -0 归一', en: 'makeRound -0 normalization' },
                content: {
                  zh: '`makeRound` 末端 `-0` → `+0`——负的亚精度值 round 出 `-0`、`JSON.stringify(-0) = "0"` 让 Scene round-trip 在 `Object.is` 层失真；归一后序列化往返稳定（数值 / 渲染无影响）',
                  en: '`makeRound` normalizes `-0` → `+0` at the end — negative sub-precision values round to `-0` and `JSON.stringify(-0) = "0"` made the Scene round-trip diverge under `Object.is`; normalization keeps serialization stable (no numeric / render effect)',
                },
              },
            ],
          },
          {
            version: 'alpha.9',
            date: '2026-05-24',
            summary: {
              zh: 'Scene / Position 能力完善：clip 裁切（renderer-agnostic ClipResource + clipRef，Scope 级）+ 自定义 viewBox override（IR 根 viewBox 覆盖自动算、忽略 padding）+ 比例 partway 定位（{ between:[A,B], t }，自包含 AbsoluteTarget）。',
              en: 'Scene / Position completion: clip (renderer-agnostic ClipResource + clipRef, Scope-level) + custom viewBox override (IR-root viewBox overriding the auto layout, ignoring padding) + proportional partway positioning ({ between:[A,B], t } with a self-contained AbsoluteTarget).',
            },
            items: [
              {
                label: { zh: 'clip 裁切', en: 'Clipping' },
                content: {
                  zh: '`Scope.clip` 接 rect / circle / ellipse / polygon 四形状（scope 局部坐标）；compile 去重成 `ClipResource` 进 Scene 资源表（`clip-N`，与 paint 同表）+ scope GroupPrim 挂 `clipRef`，`<clipPath>` 物化只在 adapter；finite 守卫 + 带 clip 不 prune [Scope](/core/components/layout/scope)',
                  en: '`Scope.clip` takes rect / circle / ellipse / polygon (scope-local coords); compile dedups it into a `ClipResource` in the Scene resource table (`clip-N`, same table as paint) and attaches `clipRef` to the scope GroupPrim, `<clipPath>` materialized only in the adapter; finite guards + a clipped scope is never pruned [Scope](/core/components/layout/scope)',
                },
              },
              {
                label: { zh: '自定义 viewBox', en: 'Custom viewBox' },
                content: {
                  zh: 'IR 根加可选 `viewBox`（{ x, y, width, height }）；有值则直接用作 `Scene.layout`、忽略 padding（固定尺寸 / 裁剪 / 多图对齐），round 后复检 finite 守 round-trip [Layout](/core/components/layout/overview)',
                  en: 'The IR root gains an optional `viewBox` ({ x, y, width, height }); when set it becomes `Scene.layout` directly and ignores padding (fixed size / clipping / multi-figure alignment), re-checked finite after rounding to guard round-trip [Layout](/core/components/layout/overview)',
                },
              },
              {
                label: { zh: '比例 partway 定位', en: 'Proportional partway' },
                content: {
                  zh: '`{ between: [A, B], t }` 比例定位 `lerp(A, B, t)`，进 `Node.position` / `Coordinate.position` / path `Step.to`；端点用自包含 `AbsoluteTarget`（笛卡尔 / 极坐标 / 节点引用 / offset / 嵌套 between，排除 path-relative，z.lazy 化解 schema 环）；复用 `refPointOfTarget` + `lerpPoint` + finite 守卫 [Coordinate](/core/components/node/coordinate)',
                  en: '`{ between: [A, B], t }` proportional positioning `lerp(A, B, t)`, admitted into `Node.position` / `Coordinate.position` / path `Step.to`; endpoints use a self-contained `AbsoluteTarget` (Cartesian / polar / node ref / offset / nested between, excluding path-relative, z.lazy breaks the schema cycle); reuses `refPointOfTarget` + `lerpPoint` with finite guards [Coordinate](/core/components/node/coordinate)',
                },
              },
            ],
          },
          {
            version: 'alpha.8',
            date: '2026-05-24',
            summary: {
              zh: '两大注册面:自定义箭头 ArrowDefinition(emit-in-compile,内置 7 降注册项)+ 路径生成器 PathGeneratorDefinition(外部曲线包,params 限 JSON 双 parse 护栏);Path 搭车 out/in·自环 / 整体变换 / 中段 marking。',
              en: 'Two registries: custom arrows via ArrowDefinition (emit-in-compile, the 7 built-ins demoted to entries) and path generators via PathGeneratorDefinition (external curve packages, JSON-only params with a double-parse guard); plus Path out/in·self-loop / transform / mid-path marking.',
            },
            items: [
              {
                label: { zh: 'ArrowDefinition 注册面', en: 'ArrowDefinition registry' },
                content: {
                  zh: '`arrowDetail.shape` 开放为 string;`CompileOptions.arrows` 注入 ArrowDefinition;`emit` 在 compile 期调,产 `MarkerPrimitive[]` 窄子集(path / ellipse / rect / group,fill 限 `string | contextStroke`)写进 `ArrowEndSpec`,adapter 纯物化、不再 switch;内置 7 降为注册项,颜色经 `contextStroke` 跟随 path 描边',
                  en: '`arrowDetail.shape` opens to a string; `CompileOptions.arrows` injects an ArrowDefinition; `emit` runs at compile time, producing a `MarkerPrimitive[]` narrow subset (path / ellipse / rect / group, fill limited to `string | contextStroke`) into `ArrowEndSpec` for the adapter to just materialize (no more switch); the 7 built-ins become registry entries, color follows the path stroke via `contextStroke`',
                },
              },
              {
                label: { zh: 'PathGeneratorDefinition 注册面', en: 'PathGeneratorDefinition registry' },
                content: {
                  zh: '新 `generator` step kind + `CompileOptions.pathGenerators`;外部包用 `definePathGenerator` 注册曲线(parabola / sin…),core 不内置任何曲线;`params` 限 `JsonObjectSchema`(递归 JSON,守序列化),paramsSchema + JsonObjectSchema 双 parse 护栏拦非 JSON 输出;`targetParams` 顶层 key 先 resolve 成世界坐标喂 `generate`',
                  en: 'A new `generator` step kind + `CompileOptions.pathGenerators`; external packages register curves (parabola / sin…) via `definePathGenerator`, with no curve built into core; `params` is limited to `JsonObjectSchema` (recursive JSON, serialization-safe) with a paramsSchema + JsonObjectSchema double-parse guard against non-JSON output; `targetParams` top-level keys resolve to world coordinates before feeding `generate`',
                },
              },
              {
                label: { zh: 'Path out/in·自环 / 变换 / marking', en: 'Path out/in·self-loop / transform / marking' },
                content: {
                  zh: '`bend` step 加 `outAngle` / `inAngle` / `looseness`(out/in 优先于 bendDirection,`from==to` 退化为自环);`PathSchema` 加 `rotate` / `scale`(绕包围盒中心)与 `marks`(沿 `pos∈[0,1]` 放箭头、朝向随切线);非 finite 几何(NaN / Infinity / 溢出)编译期拦截,守 Scene 100% JSON 可序列化',
                  en: '`bend` step gains `outAngle` / `inAngle` / `looseness` (out/in takes precedence over bendDirection, `from==to` degenerates to a self-loop); `PathSchema` gains `rotate` / `scale` (around the bbox center) and `marks` (arrows at `pos∈[0,1]`, tangent-oriented); non-finite geometry (NaN / Infinity / overflow) is rejected at compile to keep the Scene 100% JSON-serializable',
                },
              },
              {
                label: { zh: 'PatternDefinition 注册面', en: 'PatternDefinition registry' },
                content: {
                  zh: '`pattern.shape` 开放为 string + `CompileOptions.patterns`;内置 lines / dots / grid 降注册项;复用 ADR-01 的 `MarkerPrimitive` emit + emit-in-compile——compile 调 `def.emit` 产 motif tile 写进 `SceneResource.tile`,adapter 物化 `<pattern>`;motif 颜色缺省 `currentColor`;size / rotation / motif 坐标 finite 守卫',
                  en: '`pattern.shape` opens to a string + `CompileOptions.patterns`; built-in lines / dots / grid become registry entries; reuses ADR-01’s `MarkerPrimitive` emit + emit-in-compile — compile calls `def.emit` to produce the motif tile into `SceneResource.tile`, the adapter materializes the `<pattern>`; motif color defaults to `currentColor`; size / rotation / motif coordinates are finite-guarded',
                },
              },
            ],
          },
          {
            version: 'alpha.7',
            date: '2026-05-24',
            summary: {
              zh: 'Paint 填充服务(线性 / 径向渐变 + 图案 pattern + 图片 image),Node `maxTextWidth` 自动换行,以及 `pin` 引脚(从节点边界牵引线到 label)。',
              en: 'A Paint fill service (linear / radial gradients + pattern + image), Node `maxTextWidth` auto-wrapping, and `pin` leaders (a line from the node border to the label).',
            },
            items: [
              {
                label: { zh: 'Paint 填充服务', en: 'Paint fill service' },
                content: {
                  zh: '`fill` 从纯色升为 `PaintValue`(纯色 / `resourceRef` / `contextStroke`)+ Scene 级 `SceneResource` 资源表;`PaintSpec` 支持 `linearGradient` / `radialGradient` / `pattern`(lines / dots / grid)/ `image`(URL);compile 端 `createPaintRegistry` 按结构去重、派稳定 id,渲染目标无关(`<defs>` 由 adapter 物化)',
                  en: '`fill` upgrades from a plain color to `PaintValue` (solid / `resourceRef` / `contextStroke`) plus a Scene-level `SceneResource` table; `PaintSpec` supports `linearGradient` / `radialGradient` / `pattern` (lines / dots / grid) / `image` (URL); compile-side `createPaintRegistry` dedups by structure and assigns stable ids, render-target agnostic (`<defs>` materialized by the adapter)',
                },
              },
              {
                label: { zh: 'maxTextWidth 自动换行', en: 'maxTextWidth auto-wrapping' },
                content: {
                  zh: '`NodeSchema.maxTextWidth` 折行阈值(user units):超过才折行、短文本盒收缩到内容(非固定段落宽);西文按词 / CJK 按字,折出物理行继承逻辑行 `LineSpec` 样式并走现有 `align` / `lineHeight`',
                  en: '`NodeSchema.maxTextWidth` is a wrap threshold (user units): wraps only past it and shrinks the box to content for short text (not a fixed paragraph width); western by word / CJK by character, wrapped physical lines inherit the logical line’s `LineSpec` style and reuse existing `align` / `lineHeight`',
                },
              },
              {
                label: { zh: 'pin 引脚', en: 'pin leaders' },
                content: {
                  zh: '`NodeLabelSchema.pin`(`boolean | { stroke?, strokeWidth?, dashPattern? }`)从节点边界朝 label 方向牵一条引线,复用 label 的 placement / distance / rotate;label 与 pin 计入 layout 外接框(不被自动 viewBox 裁)',
                  en: '`NodeLabelSchema.pin` (`boolean | { stroke?, strokeWidth?, dashPattern? }`) draws a leader from the node border toward the label, reusing the label’s placement / distance / rotate; labels and pins count into the layout bounding box (not clipped by the auto viewBox)',
                },
              },
            ],
          },
          {
            version: 'alpha.6',
            date: '2026-05-23',
            summary: {
              zh: '结构化 Target / Anchor:path target 对象唯一(去 z.string)+ AnchorRef(命名 / 角度 / 边上比例点 `{ side, t }`)+ offset;`{ side, t }` 落 shape 真实边界。',
              en: 'Structured Target / Anchor: object-only path target (drops z.string) + AnchorRef (named / angle / edge-proportional `{ side, t }`) + offset; `{ side, t }` lands on the real shape boundary.',
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
                label: { zh: '`{ side, t }` 真实边界几何', en: '`{ side, t }` real-boundary geometry' },
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
            version: 'beta.2',
            date: '2026-06-01',
            summary: {
              zh: '`<Layout>` 顶层直接接受 `<Scope>` 级联样式子集——全图默认样式不必再手写一层根 `<Scope>`。纯增量、非破坏。',
              en: '`<Layout>` directly accepts the `<Scope>` cascade style subset — whole-figure defaults no longer need a hand-written root `<Scope>`. Additive, non-breaking.',
            },
            items: [
              {
                label: { zh: '<Layout> 全图默认样式', en: '<Layout> whole-figure defaults' },
                content: {
                  zh: '`<Layout>` 加 11 个级联样式 props（`color` / `stroke` / `fill` / `strokeWidth` / `opacity` / `fillOpacity` / `drawOpacity` + `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`）；设任一项时把 children 包进合成的隐式根 `<Scope>`，编译产物与手写根 `<Scope>` 完全同一 IR，内层 `<Scope>` / 图元显式属性照常级联覆盖。与 `ir` prop 并用时样式被忽略（dev 警告）[Layout 概览](/core/components/layout/overview)',
                  en: '`<Layout>` gains 11 cascade style props (`color` / `stroke` / `fill` / `strokeWidth` / `opacity` / `fillOpacity` / `drawOpacity` + `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault`); setting any wraps children in a synthetic implicit root `<Scope>` producing the exact same IR as a hand-written root `<Scope>`, with inner `<Scope>` / explicit primitive props cascading over it. Ignored (dev warning) when combined with the `ir` prop [Layout overview](/core/components/layout/overview)',
                },
              },
            ],
          },
          {
            version: 'beta.1',
            date: '2026-05-24',
            summary: {
              zh: 'BREAKING：删 `<TikZ>` deprecated alias（迁移 `<Layout>`）；修 unbuilder path round-trip 丢 rotate / scale / marks。',
              en: 'BREAKING: the `<TikZ>` deprecated alias is removed (migrate to `<Layout>`); fixed the unbuilder path round-trip dropping rotate / scale / marks.',
            },
            items: [
              {
                label: { zh: 'BREAKING：删 `<TikZ>` alias', en: 'BREAKING: `<TikZ>` alias removed' },
                content: {
                  zh: 'alpha.6 留的 `<TikZ>` / `TikZProps` 兼容别名移除（rc 起冻结公开 API，beta 是最后窗口）。迁移：`<TikZ ...>` → `<Layout ...>`，props 完全一致',
                  en: 'The `<TikZ>` / `TikZProps` alias kept since alpha.6 is removed (rc freezes the public API, beta is the last window). Migration: `<TikZ ...>` → `<Layout ...>`, props identical',
                },
              },
              {
                label: { zh: 'unbuilder round-trip 修复', en: 'unbuilder round-trip fix' },
                content: {
                  zh: 'unbuilder 的 path 分支手写漏 `rotate` / `scale` / `marks`（IR → JSX → IR 静默丢失）→ 改用 `pickDefined(PATH_FIELDS)`（与 node / scope 一致、互锁防漂移）修复；补 paint / clip / between / marks 等 round-trip 覆盖',
                  en: "The unbuilder path branch hand-listed fields and dropped `rotate` / `scale` / `marks` (silently lost on IR → JSX → IR) → fixed via `pickDefined(PATH_FIELDS)` (consistent with node / scope, interlocked against drift); added round-trip coverage for paint / clip / between / marks",
                },
              },
            ],
          },
          {
            version: 'alpha.9',
            date: '2026-05-24',
            summary: {
              zh: 'adapter 物化 clip：ClipDefs 产 `<clipPath>`、group 挂 `clip-path`；`<Layout viewBox>` prop；`<Node>` / `<Coordinate>` position 接 `{ between, t }`。',
              en: 'The adapter materializes clip: ClipDefs emits `<clipPath>` and the group gains `clip-path`; a `<Layout viewBox>` prop; `<Node>` / `<Coordinate>` position accept `{ between, t }`.',
            },
            items: [
              {
                label: { zh: 'clip 物化', en: 'clip materialization' },
                content: {
                  zh: 'ClipDefs 把 `ClipResource` 物化成 `<clipPath>`（rect / circle / ellipse / polygon），`renderPrim` group 分支按 `clipRef` 加 `clip-path="url(#…)"`，`Layout` 资源按 kind 分流（paint / clip 各自 idFor 前缀）',
                  en: 'ClipDefs materializes a `ClipResource` into `<clipPath>` (rect / circle / ellipse / polygon); the `renderPrim` group branch adds `clip-path="url(#…)"` from `clipRef`; `Layout` splits resources by kind (separate idFor prefixes for paint / clip)',
                },
              },
              {
                label: { zh: 'viewBox / partway DSL', en: 'viewBox / partway DSL' },
                content: {
                  zh: '`<Layout viewBox={{ x, y, width, height }}>` 注入 IR 根（prop 优先于 IR 内置）；`<Node position>` / `<Coordinate position>` 类型并入 `{ between, t }`（Step.to 走 DslTarget 已含）',
                  en: '`<Layout viewBox={{ x, y, width, height }}>` injects the IR root (prop wins over IR-embedded); `<Node position>` / `<Coordinate position>` types include `{ between, t }` (Step.to already covered via DslTarget)',
                },
              },
            ],
          },
          {
            version: 'alpha.8',
            date: '2026-05-24',
            summary: {
              zh: 'adapter 跟进 emit-in-compile:物化已解析的 `ArrowEndSpec.marker`(含 arc / ellipseArc),`<Layout>` 加 `arrows` / `pathGenerators` 注入;`<Path rotate/scale/marks>`、`<Step bend out/in/looseness>`(bendDirection 改 optional)。',
              en: 'The adapter follows emit-in-compile: it materializes the resolved `ArrowEndSpec.marker` (incl. arc / ellipseArc), `<Layout>` gains `arrows` / `pathGenerators` injection; `<Path rotate/scale/marks>`, `<Step bend out/in/looseness>` (bendDirection now optional).',
            },
            items: [
              {
                label: { zh: 'arrow marker 物化', en: 'arrow marker materialization' },
                content: {
                  zh: 'arrow marker 改读 core 已解析的 `ArrowEndSpec.marker`(MarkerPrimitive→SVG,递归 group,`contextStroke`→`context-stroke`),删 switch / 不再算几何;marker path 复用 `buildPathD` 补全 arc / ellipseArc 段',
                  en: 'Arrow markers now read core’s resolved `ArrowEndSpec.marker` (MarkerPrimitive→SVG, recursive group, `contextStroke`→`context-stroke`), dropping the switch and geometry math; marker paths reuse `buildPathD` to cover arc / ellipseArc segments',
                },
              },
              {
                label: { zh: '注入 prop + Path/Step 字段', en: 'Injection props + Path/Step fields' },
                content: {
                  zh: '`<Layout>` 加 `arrows` / `patterns` / `pathGenerators` prop 透传 `compileToScene`(对齐 `shapes`);`<Path>` 加 `rotate` / `scale` / `marks`;`<Step kind="bend">` 加 `outAngle` / `inAngle` / `looseness`,`bendDirection` 改 optional;paintDefs 物化 pattern `tile`(MarkerPrimitive→SVG,删 motif switch)',
                  en: '`<Layout>` gains `arrows` / `patterns` / `pathGenerators` props forwarded to `compileToScene` (matching `shapes`); `<Path>` gains `rotate` / `scale` / `marks`; `<Step kind="bend">` gains `outAngle` / `inAngle` / `looseness`, `bendDirection` becomes optional; paintDefs materializes the pattern `tile` (MarkerPrimitive→SVG, motif switch removed)',
                },
              },
            ],
          },
          {
            version: 'alpha.7',
            date: '2026-05-24',
            summary: {
              zh: '物化 Paint 资源表为 `<defs>`(渐变 / pattern / image)、`renderPrim` 按 `PaintValue` 分派 `fill`,并透传 Node `maxTextWidth`。',
              en: 'Materialize the Paint resource table into `<defs>` (gradients / pattern / image), dispatch `fill` by `PaintValue` in `renderPrim`, and forward Node `maxTextWidth`.',
            },
            items: [
              {
                label: { zh: 'PaintDefs 物化', en: 'PaintDefs materialization' },
                content: {
                  zh: '`scene.resources` → `<defs>` 的 `<linearGradient>` / `<radialGradient>` / `<pattern>`(图案与图片);`renderPrim` 按 `PaintValue` 分派 `fill`:纯色走 attribute / `var()` 走 inline style / `resourceRef` → `fill="url(#id)"`;`<defs>` id 经 `useId` 前缀跨实例唯一',
                  en: '`scene.resources` → `<defs>` `<linearGradient>` / `<radialGradient>` / `<pattern>` (pattern + image); `renderPrim` dispatches `fill` by `PaintValue`: solid via attribute / `var()` via inline style / `resourceRef` → `fill="url(#id)"`; `<defs>` ids stay unique across instances via a `useId` prefix',
                },
              },
              {
                label: { zh: 'maxTextWidth 透传', en: 'maxTextWidth passthrough' },
                content: {
                  zh: '`<Node maxTextWidth>` 透传到 IR(`NODE_FIELDS` + `NodeProps` 字段互锁)',
                  en: '`<Node maxTextWidth>` forwards to IR (`NODE_FIELDS` + `NodeProps` field interlock)',
                },
              },
            ],
          },
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
            version: 'beta.1',
            date: '2026-05-24',
            summary: {
              zh: '配合删 `<TikZ>`：retikz-tsx AST 白名单 / AI system prompt / mdx 描述全清 alias；Layout 页文档更新。',
              en: 'Following the `<TikZ>` removal: the retikz-tsx AST whitelist / AI system prompt / mdx descriptions drop the alias; Layout pages updated.',
            },
            items: [
              {
                label: { zh: '清 `<TikZ>` 文档残留', en: 'drop `<TikZ>` doc residue' },
                content: {
                  zh: 'retikz-tsx AST 白名单（18 → 17 组件）+ AI system prompt 去 `TikZ`；[Layout](/core/components/layout/overview) / custom-arrow 等 mdx 把"`<TikZ>` 保留为别名"改为"已移除"',
                  en: 'The retikz-tsx AST whitelist (18 → 17 components) + AI system prompt drop `TikZ`; [Layout](/core/components/layout/overview) / custom-arrow mdx change "`<TikZ>` kept as an alias" to "removed"',
                },
              },
            ],
          },
          {
            version: 'alpha.9',
            date: '2026-05-24',
            summary: {
              zh: 'Scope 页补 clip 裁切、Layout 概览补自定义 viewBox、Coordinate 页补比例 partway，各带 demo；placement schema 参考补 BetweenPosition / AbsoluteTarget。',
              en: 'The Scope page gains clipping, the Layout overview gains custom viewBox, the Coordinate page gains proportional partway — each with a demo; the placement schema reference gains BetweenPosition / AbsoluteTarget.',
            },
            items: [
              {
                label: { zh: 'clip / viewBox / partway 文档', en: 'clip / viewBox / partway docs' },
                content: {
                  zh: '[Scope](/core/components/layout/scope) clip 圆形取景窗 demo + 四形状 + 限制；[Layout](/core/components/layout/overview) 固定 viewBox demo；[Coordinate](/core/components/node/coordinate) partway（1/4·1/2·3/4）demo + AbsoluteTarget 端点；[placement 参考](/core/reference/schema/placement) 补 BetweenPosition / AbsoluteTarget 两 section',
                  en: 'The [Scope](/core/components/layout/scope) clip demo (circular viewport) + four shapes + limits; the [Layout](/core/components/layout/overview) fixed-viewBox demo; the [Coordinate](/core/components/node/coordinate) partway (1/4·1/2·3/4) demo + AbsoluteTarget endpoints; the [placement reference](/core/reference/schema/placement) gains BetweenPosition / AbsoluteTarget sections',
                },
              },
            ],
          },
          {
            version: 'alpha.8',
            date: '2026-05-24',
            summary: {
              zh: 'reference/extending 新增自定义箭头 / 路径生成器 / 自定义图案三概念页(双语 + demo);Path 页补 out/in·自环 / 整体变换 / 中段 marking;custom-arrow demo 改 TikZ Bracket 样式。',
              en: 'New custom-arrow / path-generator / custom-pattern pages under reference/extending (bilingual + demos); the Path page gains out/in·self-loop / transform / mid-path marking; the custom-arrow demo switches to a TikZ Bracket style.',
            },
            items: [
              {
                label: { zh: '注册面概念页 + Path 扩展', en: 'Registry concept pages + Path extension' },
                content: {
                  zh: '[自定义箭头](/core/reference/extending/custom-arrow)(注册 + ArrowDefinition 契约 + emit/MarkerPrimitive + 颜色继承 + Bracket demo)、[路径生成器](/core/reference/extending/path-generator)(契约 + 双 parse + targetParams + parabola/sin demo)、[自定义图案](/core/reference/extending/custom-pattern)(PatternDefinition + emit-in-compile tile + cross/size demo);[Path 页](/core/components/draw/path)补 out/in·自环 / rotate·scale / marks 三 demo 与 API 行',
                  en: '[Custom Arrows](/core/reference/extending/custom-arrow) (registration + ArrowDefinition contract + emit/MarkerPrimitive + color inheritance + a Bracket demo), [Path Generators](/core/reference/extending/path-generator) (contract + double-parse + targetParams + parabola/sin demos), [Custom Patterns](/core/reference/extending/custom-pattern) (PatternDefinition + emit-in-compile tile + cross/size demos); the [Path page](/core/components/draw/path) gains out/in·self-loop / rotate·scale / marks demos plus API rows',
                },
              },
              {
                label: { zh: 'image 填充补外部 URL + fit 演示', en: 'Image fill: external URL + fit demo' },
                content: {
                  zh: '[Node 概览](/core/components/node/overview) image 填充补外部 URL(`picsum`)demo,对照 `cover`/`contain`/`fill` 三模式,并说明 fit 按形状盒归一计算的口径',
                  en: 'The [Node overview](/core/components/node/overview) image fill gains an external-URL (`picsum`) demo contrasting `cover`/`contain`/`fill`, plus a note on how `fit` is computed against the normalized shape box',
                },
              },
            ],
          },
          {
            version: 'alpha.7',
            date: '2026-05-24',
            summary: {
              zh: 'Node 概览页补 Paint(渐变 / pattern / image)、`maxTextWidth` 自动换行、`pin` 引脚 demo 与 API。',
              en: 'The Node overview page gains Paint (gradients / pattern / image), `maxTextWidth` auto-wrapping, and `pin` leader demos plus API.',
            },
            items: [
              {
                label: { zh: 'Node Paint / 换行 / 引脚 demo', en: 'Node Paint / wrap / pin demos' },
                content: {
                  zh: '[Node 概览](/core/components/node/overview)加渐变填充(含 `stops` opacity 渐隐 + `currentColor`)、pattern·image(斜线 / 网点 / 网格 + 图片)、`maxTextWidth` 自动换行(中英混排)、`pin` 引脚 demo,API 表补 `maxTextWidth` / `pin` / `fill` PaintSpec 行',
                  en: 'The [Node overview](/core/components/node/overview) adds gradient fills (incl. `stops` opacity fade + `currentColor`), pattern·image (lines / dots / grid + image), `maxTextWidth` auto-wrapping (mixed CJK / western), and `pin` leader demos; the API table gains `maxTextWidth` / `pin` / `fill` PaintSpec rows',
                },
              },
            ],
          },
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
                label: { zh: 'anchors 页对象形态 + `{ side, t }`', en: 'anchors page object form + `{ side, t }`' },
                content: {
                  zh: 'anchors 概念页主推对象形态 `{ id, anchor?, offset? }`、字符串 shorthand 降级为 DSL 便捷写法,新增「边上比例点 `{ side, t }`」小节 + demo',
                  en: 'The anchors page leads with `{ id, anchor?, offset? }`, demotes string shorthand to DSL convenience, and adds an "edge-proportional `{ side, t }`" section + demo',
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
