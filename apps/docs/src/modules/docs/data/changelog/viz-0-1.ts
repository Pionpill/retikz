import type { Release } from '../types';

export const vizV01: Release = {
    minor: 'v0.1',
    stableDate: null,
    packages: [
      {
        pkg: '@retikz/data',
        version: 'v0.1',
        description: {
          zh: 'viz 组的纯数据处理层：承载数据模型、字段解析、format、statistics 子算子、transform contract / registry / pipeline 与 provenance，不绑定宿主语义。',
          en: 'The pure data-processing layer for viz: data models, field resolution, formatting, statistic reducers, transform contracts / registries / pipelines, and provenance without host semantics.',
        },
        highlights: [
          {
            label: { zh: '数据层真源', en: 'Data-layer source of truth' },
            content: {
              zh: '`@retikz/data` 成为数据模型、外部数据集、字段解析、format、statistics 与共享 transform 的顶层入口；消费方直接从 `@retikz/data` 导入 data-only API。',
              en: '`@retikz/data` is now the top-level entry for data models, external datasets, field resolution, formatting, statistics, and shared transforms; consumers import data-only APIs directly from `@retikz/data`.',
            },
          },
          {
            label: { zh: '共享 transform 边界', en: 'Shared transform boundary' },
            content: {
              zh: 'data 默认内置项只保留 plot / table / geo 都可复用的数据能力；plot-only transform 由 plot 自己注册，避免把图形语义强加给其它宿主。',
              en: 'The default data builtins now keep only capabilities reusable by plot / table / geo; plot-only transforms are registered by plot itself, avoiding chart semantics in other hosts.',
            },
          },
        ],
        subVersions: [
          {
            version: 'beta.1',
            date: '2026-07-06',
            summary: {
              zh: '新增 `@retikz/data` 并从 plot 迁出通用数据处理层，同时收窄默认内置 transform 到跨宿主共享能力。',
              en: 'Introduces `@retikz/data` by extracting the shared data-processing layer from plot, then narrows the default builtin transforms to cross-host capabilities.',
            },
            items: [
              {
                label: { zh: '从 plot 抽出数据模型与 pipeline', en: 'Extracted data models and pipelines from plot' },
                content: {
                  zh: '数据 schema、字段解析、format、statistics、transform registry、`applyTransforms` 与 provenance 迁入 `@retikz/data`，并通过顶层入口导出。',
                  en: 'Data schemas, field resolution, formatting, statistics, transform registries, `applyTransforms`, and provenance moved into `@retikz/data` and are exported from its package root.',
                },
              },
              {
                label: { zh: 'plot-only transform 不再是 data 默认能力', en: 'Plot-only transforms are no longer data defaults' },
                content: {
                  zh: '`bin`、`density`、`smooth`、`jitter`、`stack`、`normalize`、`relate` 等直接服务 plot mark / scale / stat-geom 的 transform 移出 data 默认内置集合，由宿主显式注册。',
                  en: 'Transforms such as `bin`, `density`, `smooth`, `jitter`, `stack`, `normalize`, and `relate` directly serve plot marks / scales / stat-geoms, so they moved out of the data default builtins and are registered by the host.',
                },
              },
              {
                label: { zh: '不新增 data-react', en: 'No data-react package' },
                content: {
                  zh: 'data 保持纯数据处理定位，不提供 React `<Transform>` 组件；React / Vanilla authoring 仍由各宿主 adapter 负责。',
                  en: 'data stays a pure data-processing package and does not provide a React `<Transform>` component; React / Vanilla authoring remains owned by host adapters.',
                },
              },
            ],
          },
        ],
      },
      {
        pkg: '@retikz/plot',
        version: 'v0.1',
        description: {
          zh: 'Tier 2 图表层的 IR 与下沉核心：把一张图声明成 JSON 可序列化的 Plot IR（grammar of graphics），经 lowerPlots 在 compile 期下沉成 core 图元；数据与 IR 解耦，core 不认识任何 chart 语义。',
          en: 'The IR and lowering core of the Tier 2 charting layer: a chart is a JSON-serializable Plot IR that lowerPlots lowers into core primitives at compile time; data stays out of the IR.',
        },
        highlights: [
          {
            label: { zh: 'Plot IR + lowerPlots', en: 'Plot IR + lowerPlots' },
            content: {
              zh: '一份 `PlotSpec`（坐标系 / 比例尺 / mark / 字段绑定）描述「画什么」，`lowerPlots`（core `lowerComposites` 钩子的实现）把它展开成 core 的 node / path，交给现有 svg / canvas / vanilla renderer。',
              en: 'A single `PlotSpec` (coordinate system / scales / marks / field bindings) describes what to draw, and `lowerPlots` (the implementation of core’s `lowerComposites` hook) expands it into core `node` / `path` for the existing svg / canvas / vanilla renderers.',
            },
          },
          {
            label: { zh: '数据与 IR 解耦', en: 'Data decoupled from IR' },
            content: {
              zh: 'IR 里只写 `data: { ref }`（一个名字），真实数据集渲染时单独注入、不进 IR——同一份 spec 换字段相符的数据即可复用，IR 不随数据量膨胀。',
              en: 'The IR only carries `data: { ref }` (a name); the actual dataset is injected at render time and never enters the IR — the same spec is reusable with any matching dataset, and the IR never bloats with data volume.',
            },
          },
        ],
        subVersions: [
          {
            version: 'beta.1',
            date: '2026-07-06',
            summary: {
              zh: 'plot 改为消费 `@retikz/data`，移除 data-only 顶层转发，并由 plot 自行注册 plot-only transform provider。',
              en: 'plot now consumes `@retikz/data`, removes data-only root re-exports, and registers plot-only transform providers itself.',
            },
            items: [
              {
                label: { zh: '数据 API 不再从 plot 转发', en: 'Data APIs are no longer re-exported from plot' },
                content: {
                  zh: '`DataModel`、`ExternalDatasets`、`defineTransform`、`applyTransforms` 等 data-only 类型和 helper 需要从 `@retikz/data` 顶层入口导入；plot 顶层只保留 plot 自己拥有的 schema、provider 与 lowering API。',
                  en: '`DataModel`, `ExternalDatasets`, `defineTransform`, `applyTransforms`, and other data-only types / helpers must be imported from `@retikz/data`; the plot root only exposes plot-owned schemas, providers, and lowering APIs.',
                },
              },
              {
                label: { zh: 'plot-only transform 回到 plot', en: 'Plot-only transforms moved back to plot' },
                content: {
                  zh: 'plot 的默认 registry 组合 `@retikz/data` 共享 transform 与 plot 自己的统计 / 几何 transform，现有 PlotSpec 的 mark-local transform 与 lowering 行为保持不变。',
                  en: 'The plot default registry combines shared transforms from `@retikz/data` with plot-owned statistical / geometric transforms, preserving existing PlotSpec mark-local transform and lowering behavior.',
                },
              },
              {
                label: { zh: '⚠️ 破坏性入口调整', en: '⚠️ Breaking entry adjustment' },
                content: {
                  zh: '依赖 `@retikz/plot` 获取 data API 或依赖 plot 私有深路径数据实现的代码，需要迁移到 `@retikz/data` 顶层入口或 plot 对应 owner 入口。',
                  en: 'Code that used `@retikz/plot` for data APIs or relied on plot private deep data paths must migrate to the `@retikz/data` package root or the corresponding plot-owned entry.',
                },
              },
            ],
          },
          {
            version: 'alpha.15',
            date: '2026-07-05',
            summary: {
              zh: 'Guide + Theme 收口：axis domain / tick / line / title / grid、legend / palette / size symbol、plot labels 与 layer zIndex 进入稳定的 PlotSpec / theme 契约。',
              en: 'Guide + Theme wrap-up: axis domain / ticks / lines / titles / grids, legends / palettes / size symbols, plot labels, and layer zIndex now share stable PlotSpec / theme contracts.',
            },
            items: [
              {
                label: { zh: 'axis guide 能力补齐', en: 'Axis guide completion' },
                content: {
                  zh: '连续 / 时间位置 scale 支持 domain padding、single-value fallback、显式 tick source、interval 与 density；axis line 支持 extent、lineCap、dashOffset 与方向箭头；tick mark 支持内置 shape 与自定义 Node shape，tick label 支持自适应旋转 / 省略，title 支持 padding、path-like placement、orientation、anchor 与 shift。 [坐标轴](/viz/grammar/guide/axis)',
                  en: 'Continuous / temporal position scales gain domain padding, single-value fallbacks, explicit tick sources, intervals, and density. Axis lines support extent, lineCap, dashOffset, and directional arrows; tick marks support built-in shapes and custom Node shapes; tick labels gain adaptive rotation / omission; titles support padding, path-like placement, orientation, anchor, and shift. [Axis](/viz/grammar/guide/axis)',
                },
              },
              {
                label: { zh: 'grid / legend / theme', en: 'Grid / legend / theme' },
                content: {
                  zh: '`PlotSpec.theme` 统一 axis、grid、legend、palette、typography 与 background token；axis grid 支持独立 tick source、density、minor grid、bandPosition、dashOffset 与 lineCap；size legend 默认把大符号压入 symbol 盒子并按最终尺寸预留空间。 [图例](/viz/grammar/guide/legend)',
                  en: '`PlotSpec.theme` now unifies axis, grid, legend, palette, typography, and background tokens. Axis grids support independent tick sources, density, minor grids, bandPosition, dashOffset, and lineCap; size legends fit large symbols into symbol boxes and reserve space from the final size. [Legend](/viz/grammar/guide/legend)',
                },
              },
              {
                label: { zh: 'plot labels 与层级', en: 'Plot labels and layers' },
                content: {
                  zh: '整图文案归 `labels`，提供 title / caption / source note 的静态布局入口；layer zIndex 复用 core scope，把 background、grid、mark、axis、plot label、legend 与后续 interaction overlay 的默认绘制顺序显式化。',
                  en: 'Plot-level copy moves under `labels`, providing static layout entries for titles, captions, and source notes. Layer zIndex reuses core scopes and makes the default order of background, grid, marks, axes, plot labels, legends, and future interaction overlays explicit.',
                },
              },
            ],
          },
          {
            version: 'alpha.14',
            date: '2026-07-03',
            summary: {
              zh: 'Coordinate composition 坐标复合：PlotSpec 支持多个 coordinate view、arrangement、facet panel、same-panel 多轴 overlay 与 shared scaffold tracks；mark / guide / locator / provenance 都按同一 view identity 路由。',
              en: 'Coordinate composition: PlotSpec now supports multiple coordinate views, arrangements, facet panels, same-panel multi-axis overlays, and shared-scaffold tracks; marks, guides, locators, and provenance all route through the same view identity.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.13',
            date: '2026-06-28',
            summary: {
              zh: 'Statistics 进阶与 stat-geom 闭环：RelationMark 支持 ribbon，统计层新增 quantile-band、density 与 smooth，抽象 mark 可组合出 boxplot、density area、趋势线；同时收口 mark label 宿主语义与 polar sector pull。',
              en: 'Advanced statistics and the stat-geom loop: RelationMark supports ribbons, the statistics layer adds quantile-band, density, and smooth, abstract marks compose boxplots, density areas, and trend lines; mark labels and polar sector pull are also consolidated.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.12',
            date: '2026-06-17',
            summary: {
              zh: 'Statistics 基础（IR / lowering 视角）：transform 层补统计变换——`bin` / `aggregate` 改变行数（N 观测 → M 箱 / 组），`normalize` / `derive-interval` / `jitter` 保持行数（逐行派生 / 调整）；并给 interval 加 `x0Field` / `x1Field` 解锁 histogram 连续 x 区间柱。',
              en: 'Statistics foundation (IR / lowering view): the transform layer gains statistical ops — `bin` / `aggregate` change the row count (N observations → M bins / groups), while `normalize` / `derive-interval` / `jitter` preserve it (per-row derive / adjust); interval also gains `x0Field` / `x1Field` to unlock continuous-x histogram bars.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.11',
            date: '2026-06-16',
            summary: {
              zh: 'Geometry 基础（IR / lowering 视角）：区间几何下沉重构为坐标系无关的 `frame.projectCell(cell)` 契约（闭式 rect / sector 快路 ⊕ contour 兜底，曲线坐标系在其 `projectCell` 就绪时出可连接柱），并新增 rect / rule / text / ribbon 四个 mark——heatmap 双 band 格、参考 / 阈值线与 band 区域、datum label 文本、sankey / alluvial 流带。',
              en: 'Geometry foundation (IR / lowering view): refactors interval geometry into a coordinate-agnostic `frame.projectCell(cell)` contract (closed-form rect / sector fast paths ⊕ contour fallback, with connectable bars on curved systems once their `projectCell` is provided), and adds four marks — rect / rule / text / ribbon — heatmap double-band cells, reference / threshold lines and band regions, datum-label text, and sankey / alluvial ribbons.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.10',
            date: '2026-06-13',
            summary: {
              zh: 'Plot 容器封板配套：`PlotSpec` 增自描述 `width` / `height` 与默认调色板 `colors`，lowering 可在有 `id` 时暴露外部可见的面板 bbox 与 `plotArea` anchor，支撑同一 core `<Layout>` 中组合多张 plot。',
              en: 'Plot-container wrap-up support: `PlotSpec` adds intrinsic `width` / `height` and a default `colors` palette, and lowering can expose an externally visible panel bbox plus `plotArea` anchor when `id` is present, enabling multiple plots inside one core `<Layout>`.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.9',
            date: '2026-06-12',
            summary: {
              zh: '阶段二·Coordinates 坐标系族：把坐标 frame 从「2 通道」泛化成「N 通道角色」+ 位置 encoding 角色化（x/y 转可选、新增 a/b/c），落地一维坐标系族 `cartesian1D` / `polar1D` 与三元坐标系 `ternary2D`，并按坐标系校验 guide 维度（非法维度 fail-loud）；附自定义坐标系扩展点 `projectRoles` / `frameAlong`（实验性）。',
              en: 'Stage 2 · Coordinates family: generalizes the coordinate frame from "2 channels" to "N channel roles" + role-based position encoding (x/y become optional, new a/b/c), lands the 1D coordinate family `cartesian1D` / `polar1D` and the ternary `ternary2D`, and validates guide dimensions per coordinate system (illegal dimensions fail loud); plus an experimental custom-coordinate extension point `projectRoles` / `frameAlong`.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.8',
            date: '2026-06-08',
            summary: {
              zh: '阶段二·高级 Scales + Legend：补连续色阶 sequential / diverging（continuous / temporal `color.field` 映射到色带）+ 离散化 scale quantize / threshold / quantile（连续 domain → 离散 color 档）;`GuideSchema` 升 discriminated union，由非位置 scale 派生 legend（纯函数估算布局 + 占位）。',
              en: 'Stage 2 · advanced Scales + Legend: adds sequential / diverging continuous color scales (continuous / temporal `color.field` → color ramp) + quantize / threshold / quantile discretization scales (continuous domain → discrete color bins); `GuideSchema` becomes a discriminated union, deriving legends from non-position scales (pure-function estimated layout + reservation).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.7',
            date: '2026-06-08',
            summary: {
              zh: '阶段二·Aesthetics 全部内置通道 + 连续 scale 家族：补 log / pow / sqrt 连续 scale（L1：仅 point/line，bar/area fail-loud）;把「通道→scale」抽象成通用 resolver，落地 `size` / `opacity` / `shape` 三个仅 PointMark 的非位置通道;`color` 收口为真 scale 通道 + `series` 一等化。',
              en: 'Stage 2 · all built-in channels + the continuous scale family: adds log / pow / sqrt continuous scales (L1: point/line only, bar/area fails loud); abstracts channel→scale into a reusable resolver and lands `size` / `opacity` / `shape` as PointMark-only non-position channels; closes `color` into a real scale channel + first-classes `series`.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.6',
            date: '2026-06-08',
            summary: {
              zh: '阶段二开篇·数据模型：把 `data.model` 升级成承重的字段语义类型层（`continuous / categorical / temporal`），驱动 type-driven scale 默认选型；补可移植数据契约（fieldMaps + 按类型 coercion）、`resolveField` 运行时逃生舱、声明式 `format` / `order`、`invalid` 策略与扩宽的 temporal 推断。',
              en: 'Stage 2 opener · data model: `data.model` becomes a load-bearing field-semantic-type layer (`continuous / categorical / temporal`) that drives type-driven default scale selection; adds a portable data contract (fieldMaps + by-type coercion), a `resolveField` runtime escape hatch, declarative `format` / `order`, an `invalid` policy, and a widened temporal inference.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.5',
            date: '2026-06-07',
            summary: {
              zh: 'v0.1 收尾：scope-aware id 绑定 + meta 来源透传（接通 alpha.1 预留、消费 core meta），datum locator 命中预演。默认零开销（provenance 总开关默认关 → 逐字节等价 alpha.4）。',
              en: 'v0.1 wrap-up: scope-aware id binding + meta provenance passthrough (activates the alpha.1 reservations, consumes core meta) and a datum-locator hit-test preview. Zero overhead by default (the provenance switch is off → byte-identical to alpha.4).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.4',
            date: '2026-06-06',
            summary: {
              zh: 'polar 坐标系端到端：coordinate 抽象通用化 + polar2D 投影、interval→sector（径向柱/玫瑰）与 sector mark（饼图/环图）、连续 mark（area 新建 + closed 雷达）、径向/角向 guide。落定 §8.3 (i) 投影整形。',
              en: 'Polar coordinate system end-to-end: a generalized coordinate abstraction + polar2D projection, interval→sector (radial bars / rose) and a sector mark (pie / donut), continuous marks (new area + closed radar), and radial / angular guides. Lands the §8.3 (i) projection-reshaping decision.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.3',
            date: '2026-06-06',
            summary: {
              zh: '横向补宽到柱状图与多系列：mark 补 interval(bar)，scale 补 band/point + time + ordinal·color，新增 transform 管线段（sort/stack）与 color 非位置通道，relation 补 group(dodge)/stack。仍限 cartesian2D。',
              en: 'Widens to bar charts and multi-series: marks add interval(bar); scales add band/point + time + ordinal·color; a transform stage (sort/stack) and the color non-position channel land; relations add group(dodge)/stack. Still cartesian2D only.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.2',
            date: '2026-06-05',
            summary: {
              zh: 'guide：由 scale + 坐标系派生坐标轴 / 刻度 / 网格并 lower 进 core；scale 改用 d3-scale（scaleLinear + ticks/tickFormat）；引入绘图区 margin 布局，mark 改投影到 plot area。仍限 cartesian2D。',
              en: 'guide: derive axes / ticks / grid from scale + coordinate and lower into core; scales move to d3-scale (scaleLinear + ticks/tickFormat); a plot-area margin layout lands and marks now project into the plot area. Still cartesian2D only.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.1',
            date: '2026-06-05',
            summary: {
              zh: '首发：最薄纵向闭环——linear 比例尺 + cartesian2D 坐标系 + point / line 两种 mark，经 lowerPlots 下沉成 core 图元；IR 预留 anchor / scope-aware 字段。',
              en: 'First release: the thinnest end-to-end slice — linear scale + cartesian2D coordinate + point / line marks, lowered into core primitives by lowerPlots; the IR reserves anchor / scope-aware fields.',
            },
            items: [

            ],
          }
        ],
      },
      {
        pkg: '@retikz/plot-react',
        version: 'v0.1',
        description: {
          zh: 'plot 的 React authoring 面：把 Plot IR + 数据包成一个 `<Plot>` 组件，支持 spec 入口与组合 DSL 两种写法。',
          en: 'plot’s React authoring surface: wraps the Plot IR + data into a single `<Plot>` component, supporting both a spec entry and a composition DSL.',
        },
        highlights: [
          {
            label: { zh: '<Plot> 两条入口', en: 'Two `<Plot>` entries' },
            content: {
              zh: '`<Plot spec data>` 直喂完整 IR + 具名数据集;`<Plot data>` + `<LineMark>` / `<PointMark>` 子图层用组合 DSL 声明，`buildPlotSpec` 同步装配成规范化 Plot IR。',
              en: '`<Plot spec data>` feeds a full IR + named datasets; `<Plot data>` + `<LineMark>` / `<PointMark>` children declare via the composition DSL, with `buildPlotSpec` assembling a normalized Plot IR.',
            },
          },
        ],
        subVersions: [
          {
            version: 'beta.1',
            date: '2026-07-06',
            summary: {
              zh: 'React adapter 直接依赖 `@retikz/data`，组合 DSL 继续只装配 PlotSpec，不接管 data 的纯处理层。',
              en: 'The React adapter now depends directly on `@retikz/data`; the composition DSL still only assembles PlotSpecs and does not own the pure data-processing layer.',
            },
            items: [
              {
                label: { zh: 'data 类型来源改为 data 包', en: 'Data types come from the data package' },
                content: {
                  zh: '`<Plot>` 与组合 DSL 暴露外部数据集、数据模型和 transform 相关类型时，直接消费 `@retikz/data`，不再经由 `@retikz/plot` 转发。',
                  en: '`<Plot>` and the composition DSL consume external-dataset, data-model, and transform-related types directly from `@retikz/data` instead of through `@retikz/plot` re-exports.',
                },
              },
              {
                label: { zh: '<Transform> 仍属于宿主 DSL', en: '`<Transform>` remains host DSL' },
                content: {
                  zh: '没有新增 `@retikz/data-react`；React 侧的 `<Transform>` 仍只负责生成 PlotSpec 片段，运行时 transform pipeline 由 plot + data registry 组合处理。',
                  en: 'No `@retikz/data-react` package is added; React `<Transform>` still only generates PlotSpec fragments, while runtime transform pipelines are handled by the combined plot + data registries.',
                },
              },
            ],
          },
          {
            version: 'alpha.15',
            date: '2026-07-05',
            summary: {
              zh: 'React DSL 透传 Guide + Theme：`<Axis>` / `<Legend>` 获得新的 guide 样式与布局字段，`<TitleLabel>` / `<CaptionLabel>` 负责整图文案。',
              en: 'The React DSL exposes Guide + Theme: `<Axis>` / `<Legend>` gain the new guide style and layout fields, while `<TitleLabel>` / `<CaptionLabel>` handle plot-level copy.',
            },
            items: [
              {
                label: { zh: 'Axis / Legend props', en: 'Axis / Legend props' },
                content: {
                  zh: '`<Axis>` 透传 line extent / arrow、crossing、ticks interval / density / mark、tickLabels layout、title placement / orientation / anchor / shift、grid source / minor / bandPosition 等字段；`<Legend>` 透传 size symbol fit 与 theme 样式入口，组件只装配同一份 PlotSpec。 [坐标轴](/viz/grammar/guide/axis)',
                  en: '`<Axis>` passes through line extent / arrows, crossing, tick interval / density / marks, tick-label layout, title placement / orientation / anchor / shift, and grid source / minor / bandPosition fields. `<Legend>` passes through size-symbol fit and theme styling entries while still assembling the same PlotSpec. [Axis](/viz/grammar/guide/axis)',
                },
              },
              {
                label: { zh: 'TitleLabel / CaptionLabel', en: 'TitleLabel / CaptionLabel' },
                content: {
                  zh: '`<TitleLabel>` 与 `<CaptionLabel>` 作为 plot-level label 组件参与布局，可直接放文字，也可接收 core `<Text>` 子元素表达多行与局部样式。',
                  en: '`<TitleLabel>` and `<CaptionLabel>` participate in plot-level label layout. They can receive plain text or core `<Text>` children for multi-line and locally styled text.',
                },
              },
            ],
          },
          {
            version: 'alpha.14',
            date: '2026-07-03',
            summary: {
              zh: 'React DSL 暴露坐标复合 authoring 面：`<Facet>`、`<Scaffold>` / `<Track>`、axis id 绑定与 mark 级坐标选择都展开到同一 PlotSpec composition。',
              en: 'The React DSL exposes coordinate-composition authoring: `<Facet>`, `<Scaffold>` / `<Track>`, axis-id binding, and mark-level coordinate selection all expand to the same PlotSpec composition.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.13',
            date: '2026-06-28',
            summary: {
              zh: 'React DSL 透传 alpha.13 的 ribbon、统计 transform、host label 与 sector pull；仍保持薄适配，只装配同一份 PlotSpec。',
              en: 'The React DSL exposes alpha.13 ribbons, statistic transforms, host labels, and sector pull while staying a thin adapter that assembles the same PlotSpec.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.12',
            date: '2026-06-17',
            summary: {
              zh: 'Statistics 基础（React 组件视角）：新增通用 `<Transform kind="...">` 声明组件，统一承载全部七种 transform（sort / stack / bin / aggregate / normalize / derive-interval / jitter）；`<BarMark>` 加 `x0` / `x1` 画 histogram 连续 x 区间柱。',
              en: 'Statistics foundation (React component view): adds a generic `<Transform kind="...">` declaration component carrying all seven transforms (sort / stack / bin / aggregate / normalize / derive-interval / jitter); `<BarMark>` gains `x0` / `x1` for continuous-x histogram bars.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.11',
            date: '2026-06-16',
            summary: {
              zh: 'Geometry 基础（React 组件视角）：随 plot lockstep 露出四个新 mark 组件 `<RectMark>` / `<RuleMark>` / `<TextMark>` / `<RibbonMark>`（扁平 string props，与 `<BarMark>` 同风格），并给位置 mark（point / interval …）加可选 `label` prop 直接标注 datum。',
              en: 'Geometry foundation (React component view): lockstep with plot, exposing four new mark components `<RectMark>` / `<RuleMark>` / `<TextMark>` / `<RibbonMark>` (flat string props, same style as `<BarMark>`), and adding an optional `label` prop on positional marks (point / interval …) to annotate a datum directly.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.10',
            date: '2026-06-13',
            summary: {
              zh: '退化 `<Plot>` 为薄容器并让它可嵌入 core `<Layout>`：移除 cartesian2D 默认轴注入，保留 scale / coordinate / color 推断；装饰逻辑抽成 `decorateDefaultGuides`（留给 v0.2 `<Chart>`）；新增 `<Scale>`、`colors`、面板 `id` / `dataRef` / `x` / `y`。⚠️ alpha 间 breaking——不写 `<Axis>` 不再自动出 x/y 轴，`bare` / `scaleX` / `scaleY` 删除。',
              en: 'Degrade `<Plot>` to a thin container and make it embeddable inside core `<Layout>`: removes the cartesian2D default-axis injection while keeping scale / coordinate / color inference; extracts `decorateDefaultGuides` (reserved for a v0.2 `<Chart>`); adds `<Scale>`, `colors`, and panel `id` / `dataRef` / `x` / `y`. ⚠️ breaking between alphas — no `<Axis>` means no auto x/y axes, and `bare` / `scaleX` / `scaleY` are removed.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.9',
            date: '2026-06-12',
            summary: {
              zh: '随 plot lockstep 露出坐标系族表面：`<Plot coordinate>` 扩 `cartesian1D` / `polar1D` / `ternary2D`（字面量或对象配几何）、`<PointMark a b c>` 接三元分量、`<Plot coordinates={{...}}>` 注入自定义坐标系工厂（实验性）。',
              en: 'Lockstep with plot, exposing the coordinate-family surface: `<Plot coordinate>` extends to `cartesian1D` / `polar1D` / `ternary2D` (literal or object-with-geometry), `<PointMark a b c>` binds ternary components, and `<Plot coordinates={{...}}>` injects custom-coordinate factories (experimental).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.8',
            date: '2026-06-08',
            summary: {
              zh: '随 plot lockstep 露出 Scales + Legend 表面：新增 `<Legend>` 组件（按 channel 派生图例）+ continuous / temporal color 经 type-driven 自动派生连续色阶接入;修「有任何 guide 即不补默认轴」使 `<Legend>` 与默认坐标轴共存。',
              en: 'Lockstep with plot, exposing the Scales + Legend surface: a new `<Legend>` component (legends derived by channel) + continuous / temporal color wired in via type-driven derivation of continuous scales; fixes "any guide suppresses default axes" so `<Legend>` coexists with default axes.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.7',
            date: '2026-06-08',
            summary: {
              zh: '随 plot lockstep 露出 Aesthetics 表面：`DslScaleX` / `DslScaleY` 补 `log` / `sqrt`，`<PointMark>` 加 `size` / `opacity` / `shape` 字段 props，color × series 按 B/C 规则收口。',
              en: 'Lockstep with plot, exposing the aesthetics surface: `DslScaleX` / `DslScaleY` add `log` / `sqrt`, `<PointMark>` gains `size` / `opacity` / `shape` field props, and color × series is closed per the B/C rules.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.6',
            date: '2026-06-08',
            summary: {
              zh: '随 plot lockstep 接入数据模型：`<Plot>` 转发 `fieldMaps` / `resolveField` / `validateData` / `invalid` 到 `lowerPlots`;DSL 入口加 `model`（声明字段语义类型，改走 type-driven 派生）与扁平 `fieldMap`（映射到 DSL 数据集名）。',
              en: 'Lockstep with plot, wiring in the data model: `<Plot>` forwards `fieldMaps` / `resolveField` / `validateData` / `invalid` to `lowerPlots`; the DSL entry gains `model` (declare field-semantic types, switching to type-driven derivation) and a flat `fieldMap` (mapped onto the DSL dataset name).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.5',
            date: '2026-06-07',
            summary: {
              zh: '随 plot lockstep：`<Plot>` 转发 `provenance` / `datumProvenance` / `datumIdField` 选项到 `lowerPlots`（原先静默丢弃），让 React 侧也能开启 scope-aware id / meta 与 datum 命中预演。',
              en: 'Lockstep with plot: `<Plot>` now forwards the `provenance` / `datumProvenance` / `datumIdField` options to `lowerPlots` (previously dropped), enabling scope-aware id / meta and datum hit-test preview from the React side too.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.4',
            date: '2026-06-06',
            summary: {
              zh: 'polar authoring 面：`<Plot coordinate="polar2D">`（或对象配 innerRadius/startAngle/endAngle）、`<BarMark angle>`（饼/环，自动累积）/ `<AreaMark>`、`<LineMark closed>`（雷达）、`<Axis dimension="angle"/"radius">`;全用扁平 prop。',
              en: 'Polar authoring surface: `<Plot coordinate="polar2D">` (or an object with innerRadius/startAngle/endAngle), `<BarMark angle>` (pie/donut, auto-accumulate) / `<AreaMark>`, `<LineMark closed>` (radar), and `<Axis dimension="angle"/"radius">` — all via flat props.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.3',
            date: '2026-06-06',
            summary: {
              zh: '新增 `<BarMark>` 柱图层;mark 补 `color` / `series` / `stack` 多系列 props;`<Plot scaleX>` 可选连续 x scale 类型（`linear` / `time` / `point`，含 `<BarMark>` 时自动 band）。',
              en: 'New `<BarMark>` bar layer; marks gain multi-series props `color` / `series` / `stack`; `<Plot scaleX>` selects the continuous x scale type (`linear` / `time` / `point`, auto band when a `<BarMark>` is present).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.2',
            date: '2026-06-05',
            summary: {
              zh: '新增 `<Axis>` 子组件（`dimension` / `tickCount` / `tickLabels` / `grid`），默认自动出 x/y 轴、`bare` 关；组合 DSL 目录 `dsl/` 更名 `components/`。',
              en: 'New `<Axis>` child component (`dimension` / `tickCount` / `tickLabels` / `grid`), with x/y axes auto-emitted by default and a `bare` switch; the composition DSL folder `dsl/` is renamed `components/`.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.1',
            date: '2026-06-05',
            summary: {
              zh: '首发：`<Plot>` 组件（spec 入口 + 组合 DSL）、`LineMark` / `PointMark`、`buildPlotSpec`;与 @retikz/plot lockstep。',
              en: 'First release: the `<Plot>` component (spec entry + composition DSL), `LineMark` / `PointMark`, and `buildPlotSpec`; lockstep with @retikz/plot.',
            },
            items: [

            ],
          }
        ],
      },
      {
        pkg: '@retikz/plot-vanilla',
        version: 'v0.1',
        description: {
          zh: 'plot 的无框架 / SSR 面：`renderPlot` 把 Plot IR + 数据直接出 SVG 字符串，零 DOM，可在 Node / 构建期跑。',
          en: 'plot’s framework-free / SSR surface: `renderPlot` turns a Plot IR + data straight into an SVG string, zero DOM, runnable in Node / at build time.',
        },
        highlights: [
          {
            label: { zh: 'renderPlot SSR', en: 'renderPlot SSR' },
            content: {
              zh: '`renderPlot(spec, datasets, options)` 经 lowerPlots + core 编译 + `@retikz/render/svg` 出 SVG 字符串;与 react 面共用同一 Plot IR 与下沉逻辑。',
              en: '`renderPlot(spec, datasets, options)` goes through lowerPlots + core compile + `@retikz/render/svg` to an SVG string; shares the same Plot IR and lowering as the React surface.',
            },
          },
        ],
        subVersions: [
          {
            version: 'beta.1',
            date: '2026-07-06',
            summary: {
              zh: 'Vanilla / SSR adapter 直接依赖 `@retikz/data`，`renderPlot` 继续复用同一 plot lowering 与 data pipeline。',
              en: 'The Vanilla / SSR adapter now depends directly on `@retikz/data`; `renderPlot` continues to reuse the same plot lowering and data pipeline.',
            },
            items: [
              {
                label: { zh: 'SSR 数据类型不经 plot 转发', en: 'SSR data types bypass plot re-exports' },
                content: {
                  zh: '`renderPlot` 相关的外部数据集和 lower options 类型直接来自 `@retikz/data` 与 `@retikz/plot` 各自顶层入口，避免 adapter 依赖 plot 的旧 data 转发。',
                  en: '`renderPlot`-related external dataset and lower-options types now come directly from the `@retikz/data` and `@retikz/plot` package roots, avoiding the old data re-export path through plot.',
                },
              },
              {
                label: { zh: '无额外渲染语义', en: 'No additional rendering semantics' },
                content: {
                  zh: 'Vanilla 侧仍然只把 PlotSpec + datasets 送入共享 lowering；plot-only transform 的可用性来自 plot 默认 registry，而不是 vanilla 自己维护 provider。',
                  en: 'The vanilla side still sends PlotSpecs + datasets into shared lowering; plot-only transform availability comes from the plot default registry, not vanilla-owned providers.',
                },
              },
            ],
          },
          {
            version: 'alpha.15',
            date: '2026-07-05',
            summary: {
              zh: 'Vanilla builder / SSR 跟进 Guide + Theme：builder 可装配新的 axis、legend、theme、labels 与 layer 字段，`renderPlot` 继续纯 spec 驱动渲染。',
              en: 'The vanilla builder / SSR surface follows Guide + Theme: the builder can assemble the new axis, legend, theme, labels, and layer fields, while `renderPlot` keeps rendering from pure specs.',
            },
            items: [
              {
                label: { zh: 'SSR 复用同一下沉路径', en: 'SSR reuses the same lowering path' },
                content: {
                  zh: '`renderPlot(spec, datasets)` 消费含 guide / theme / labels / layer 的 PlotSpec，经共享 lowering 自动输出轴线箭头、tick marker、adaptive tick label、minor grid、size legend 与 plot-level labels；vanilla 侧不引入独立渲染语义。',
                  en: '`renderPlot(spec, datasets)` consumes PlotSpecs with guide / theme / labels / layer fields and emits axis arrows, tick markers, adaptive tick labels, minor grids, size legends, and plot-level labels through shared lowering; vanilla introduces no separate rendering semantics.',
                },
              },
            ],
          },
          {
            version: 'alpha.14',
            date: '2026-07-03',
            summary: {
              zh: 'Vanilla builder / SSR 跟进坐标复合：builder 可装配 facet、overlay 与 shared track 结构，`renderPlot` 继续纯 spec 驱动渲染同一 composition。',
              en: 'The vanilla builder / SSR surface follows coordinate composition: the builder can assemble facet, overlay, and shared-track structures, while `renderPlot` keeps rendering the same composition from pure specs.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.13',
            date: '2026-06-28',
            summary: {
              zh: 'Vanilla SSR 继续纯 spec 驱动，自动渲染 alpha.13 的 ribbon、boxplot、density area、smooth path、host label 与 pulled sector。',
              en: 'Vanilla SSR remains purely spec-driven and renders alpha.13 ribbons, boxplots, density areas, smooth paths, host labels, and pulled sectors automatically.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.12',
            date: '2026-06-17',
            summary: {
              zh: 'Statistics 基础（SSR 视角）：`renderPlot` 透过 Plot IR 自动渲染统计变换——零额外代码，纯 spec 驱动，SSR 出直方图（bin + 连续 x 区间柱）、分组聚合柱、百分比堆叠与 jitter 散点。',
              en: 'Statistics foundation (SSR view): `renderPlot` automatically renders statistical transforms through the Plot IR — zero extra code, purely spec-driven, SSR-emitting histograms (bin + continuous-x bars), grouped aggregate bars, percentage stacks, and jittered scatter.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.11',
            date: '2026-06-16',
            summary: {
              zh: 'Geometry 基础（SSR 视角）：`renderPlot` 透过 Plot IR 自动渲染四个新 mark（rect / rule / text / ribbon）与曲线坐标系 contour 柱——vanilla 侧零额外代码，纯 spec 驱动，SSR 出含 heatmap / 参考线 / band / datum label / sankey 流带的 SVG 字符串。',
              en: 'Geometry foundation (SSR view): `renderPlot` automatically renders the four new marks (rect / rule / text / ribbon) and contour bars on curved coordinate systems through the Plot IR — zero extra code on the vanilla side, purely spec-driven, SSR-emitting an SVG string with heatmaps / reference lines / bands / datum labels / sankey ribbons.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.9',
            date: '2026-06-12',
            summary: {
              zh: '随 plot lockstep：`renderPlot` 透过 Plot IR 渲染新坐标系族（cartesian1D / polar1D / ternary2D）与 1D / 三角轴 guide;自定义坐标系工厂经 `renderPlot(spec, data, { coordinates })` 选项注入（实验性）。',
              en: 'Lockstep with plot: `renderPlot` renders the new coordinate family (cartesian1D / polar1D / ternary2D) and 1D / triangular axis guides through the Plot IR; custom-coordinate factories inject via the `renderPlot(spec, data, { coordinates })` option (experimental).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.8',
            date: '2026-06-08',
            summary: {
              zh: '随 plot lockstep：`renderPlot` 透过 Plot IR 渲染连续色阶 / 离散化 scale 与 legend guide，估算布局后零 DOM SSR 出带图例的图。',
              en: 'Lockstep with plot: `renderPlot` renders continuous / discretization color scales and legend guides through the Plot IR, emitting legend-bearing charts via estimated-layout zero-DOM SSR.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.7',
            date: '2026-06-08',
            summary: {
              zh: '随 plot Aesthetics lockstep：`renderPlot` 经共享 lowering 自动覆盖 `size` / `opacity` / `shape` 通道与 log / pow / sqrt scale 的 SSR 产物，无新 API。',
              en: 'Lockstep with plot’s aesthetics: `renderPlot` automatically covers the `size` / `opacity` / `shape` channels and log / pow / sqrt scales in its SSR output via the shared lowering, no new API.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.6',
            date: '2026-06-08',
            summary: {
              zh: '随 plot 数据模型 lockstep：`renderPlot` 入口本就整体展开 `LowerPlotsOptions`，故 alpha.6 新增的数据模型选项（`fieldMaps` / `resolveField` / `validateData` / `invalid`）无需改代码自动生效——SSR 产物可消费可移植契约与缺省类型推断，无新 API。',
              en: 'Lockstep with plot’s data model: the `renderPlot` entry already spreads `LowerPlotsOptions`, so alpha.6’s new data-model options (`fieldMaps` / `resolveField` / `validateData` / `invalid`) take effect with no code change — SSR output benefits from the portable contract and default type inference, no new API.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.5',
            date: '2026-06-07',
            summary: {
              zh: '随 plot lockstep：`renderPlot` 自动透传 `provenance` / `datumProvenance` / `datumIdField`（入口已整体转发 options，无新 API）——SSR 产物可带 scope-aware id / meta。',
              en: 'Lockstep with plot: `renderPlot` forwards `provenance` / `datumProvenance` / `datumIdField` automatically (the entry already spreads full options, no new API) — SSR output can carry scope-aware id / meta.',
            },
            items: [

            ],
          },
          {
            version: 'alpha.4',
            date: '2026-06-06',
            summary: {
              zh: '随 plot polar lockstep：`renderPlot` SSR 自动支持极坐标——径向柱 / 饼图 / 环图 / 雷达 / 极坐标折线与径向/角向轴网格（共用同一份 lowerPlots，无新 API）。',
              en: 'Lockstep with plot polar: `renderPlot` SSR now supports polar automatically — radial bars / pie / donut / radar / polar lines and radial/angular axes + grid (shared lowerPlots, no new API).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.3',
            date: '2026-06-06',
            summary: {
              zh: '随 plot mark / scale lockstep：`renderPlot` SSR 自动支持柱状 / 分组柱 / 堆叠柱 / 多系列折线与 band / time / 颜色比例尺（共用同一份 lowerPlots，无新 API）。',
              en: 'Lockstep with plot marks / scales: `renderPlot` SSR now supports bar / grouped / stacked / multi-series charts and band / time / color scales automatically (shared lowerPlots, no new API).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.2',
            date: '2026-06-05',
            summary: {
              zh: '随 plot guide lockstep：`renderPlot` 的 SSR 产物自动带上坐标轴 / 刻度 / 网格与绘图区布局（共用同一份下沉逻辑，无新 API）。',
              en: 'Lockstep with plot guide: `renderPlot` SSR output now carries axes / ticks / grid and the plot-area layout automatically (shares the same lowering, no new API).',
            },
            items: [

            ],
          },
          {
            version: 'alpha.1',
            date: '2026-06-05',
            summary: {
              zh: '首发：`renderPlot` SSR 字符串入口;与 @retikz/plot lockstep。',
              en: 'First release: the `renderPlot` SSR string entry; lockstep with @retikz/plot.',
            },
            items: [

            ],
          }
        ],
      }
    ],
  };
