import type { Release } from '../types';

import { esmOnlyChangeItem } from './esm-only';

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
          version: 'beta.2',
          date: '2026-07-11',
          summary: {
            zh: '收紧 data IR 与统计 selector 边界，统一 schema 派生公开类型命名，并修正日期解析和 top / bottom 并列处理。',
            en: 'Tightens data IR and statistic selector boundaries, unifies schema-derived public type names, and fixes date parsing plus top / bottom tie handling.',
          },
          items: [
            esmOnlyChangeItem,
            {
              label: { zh: 'BREAKING：lineage mode 类型规范化', en: 'BREAKING: Normalized lineage mode type' },
              content: {
                zh: '`DataSourceIdentityMode` 现在是包含 `Summary` / `Full` 的 const object enum；类型导入改为 `DataSourceIdentityModeValue`。运行时字面量仍是 `summary` / `full`，并会在 recorder 创建阶段拒绝非法 mode 与字段白名单成员。',
                en: '`DataSourceIdentityMode` is now a const object enum with `Summary` / `Full`; type imports move to `DataSourceIdentityModeValue`. Runtime literals remain `summary` / `full`, and recorder creation now rejects invalid modes and field-whitelist members.',
              },
            },
            {
              label: { zh: 'BREAKING：只读集合 helper 内收', en: 'BREAKING: Readonly collection helpers are internal' },
              content: {
                zh: '`createReadonlyMap` 与 `createReadonlySet` 不再从 `@retikz/data` 包根导出；它们属于 registry 状态隔离的内部基础设施。外部代码应直接使用原生 `Map` / `Set`，或自行维护所需的只读视图。',
                en: '`createReadonlyMap` and `createReadonlySet` are no longer exported from the `@retikz/data` package root; they are internal infrastructure for registry state isolation. External code should use native `Map` / `Set` instances or maintain its own readonly views.',
              },
            },
            {
              label: { zh: 'BREAKING：transform schema 入口收口', en: 'BREAKING: Consolidated transform schema entry' },
              content: {
                zh: '移除与 `TransformSchema` 完全相同的 `TransformOperationSchema` 公共别名；原有导入直接改为 `TransformSchema`，schema 行为不变。',
                en: 'Removes the public `TransformOperationSchema` alias, which was identical to `TransformSchema`; replace existing imports with `TransformSchema`. Schema behavior is unchanged.',
              },
            },
            {
              label: {
                zh: 'BREAKING：annotate selector 收紧为单行',
                en: 'BREAKING: Annotate selectors are single-row',
              },
              content: {
                zh: '`annotate.selectors` 只接受至多选中一行的内置 selector：min / max、first / last / nth，以及 `n: 1` 的 top / bottom；`tie="all"`、多行 top / bottom、outside-quantile-band 与自定义 selector 改用 `select`，自定义单值广播改写成 reducer。',
                en: '`annotate.selectors` now accepts only built-in selectors that choose at most one row: min / max, first / last / nth, and top / bottom with `n: 1`. Move `tie="all"`, multi-row top / bottom, outside-quantile-band, and custom selectors to `select`; express custom scalar broadcasts as reducers.',
              },
            },
            {
              label: { zh: 'IRDataXxx 公开类型命名', en: 'Owner-qualified IRDataXxx types' },
              content: {
                zh: '`FieldDef`、`DataModel`、`DataRef`、`Transform` 等 schema 派生类型统一改为 `IRDataXxx`，旧名不保留兼容别名；JSON schema 与运行时行为不变。',
                en: 'Schema-derived types such as `FieldDef`, `DataModel`, `DataRef`, and `Transform` now use owner-qualified `IRDataXxx` names without compatibility aliases; JSON schemas and runtime behavior are unchanged.',
              },
            },
            {
              label: { zh: 'DataRef / FieldDef / Sort 严格校验', en: 'Strict DataRef / FieldDef / Sort validation' },
              content: {
                zh: '`DataRef`、字段声明和 sort transform 不再吞掉未知字段，写错 key 会在 schema 解析阶段 fail-loud。',
                en: '`DataRef`, field declarations, and sort transforms no longer swallow unknown keys; misspelled keys now fail loudly during schema parsing.',
              },
            },
            {
              label: { zh: '日期与并列行处理更可诊断', en: 'More diagnosable date and tie handling' },
              content: {
                zh: 'slash 日期解析会拒绝溢出的年月日；top / bottom selector 的 `tie="all"` 与 `tie="last"` 对边界并列行使用同一套阈值逻辑。',
                en: 'Slash-date parsing now rejects overflowing calendar dates; top / bottom selectors use the same threshold logic for boundary ties under `tie="all"` and `tie="last"`.',
              },
            },
            {
              label: { zh: '脏数据与输出冲突不再静默改值', en: 'Dirty data and output collisions fail safely' },
              content: {
                zh: '自定义 parser 输出会按字段类型收口；无有效数值的非恒等统计返回 invalid sentinel；summarize / annotate 的静态输出名冲突在 schema 阶段 fail-loud。',
                en: 'Custom parser outputs are narrowed by field type; undefined non-identity statistics return invalid sentinels; summarize / annotate output-name collisions now fail loudly at the schema boundary.',
              },
            },
            {
              label: { zh: '排序统一 missing-last', en: 'Unified missing-last ordering' },
              content: {
                zh: 'sort transform 与 selector 共用同一比较契约；`null`、`undefined`、`NaN` 和无穷值在升降序下都稳定排到有效值之后。',
                en: 'Sort transforms and selectors now share one comparison contract; `null`, `undefined`, `NaN`, and infinities stay after valid values in both directions.',
              },
            },
            {
              label: { zh: '统计与大分组边界加固', en: 'Hardened statistics and large groups' },
              content: {
                zh: 'mean / median 在有限大数上不再因中间运算溢出；极值、quantile-band 与 provenance / lineage 不再把大数组展开成函数参数；分类域会跳过非有限数字，重复 model 字段在 schema 入口直接报错。',
                en: 'Mean / median no longer overflow on finite large values; extrema, quantile-band, and provenance / lineage no longer expand large arrays into call arguments; category domains skip non-finite numbers, and duplicate model fields fail at the schema boundary.',
              },
            },
          ],
        },
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
              label: {
                zh: 'plot-only transform 不再是 data 默认能力',
                en: 'Plot-only transforms are no longer data defaults',
              },
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
          version: 'beta.2',
          date: '2026-07-07',
          summary: {
            zh: '收窄 plot 顶层导出与未实现的 layout 契约，并把 provenance / layout 相关 helper 归到稳定 owner，降低误用风险。',
            en: 'Narrows plot root exports and unimplemented layout contracts, while moving provenance / layout helpers under stable owners to reduce misuse.',
          },
          items: [
            esmOnlyChangeItem,
            {
              label: { zh: 'BREAKING：移除内置 ternary2D 坐标系', en: 'BREAKING: Built-in ternary2D removed' },
              content: {
                zh: '`ternary2D` IR、三角轴、重心投影与专用 interval / reference 下沉已移除；三变量投影如仍有需求，应通过自定义 `CoordinateDefinition` 明确提供角色、投影和 guide 行为。',
                en: 'The `ternary2D` IR, triangular axes, barycentric projection, and dedicated interval / reference lowering have been removed. Three-variable projections should use a custom `CoordinateDefinition` with explicit roles, projection, and guide behavior.',
              },
            },
            {
              label: { zh: '顶层入口只保留公开渲染契约', en: 'Root entry keeps only public rendering contracts' },
              content: {
                zh: '`@retikz/plot` 顶层继续导出 `lowerPlots`、`LowerPlotsOptions`、locator、schema 与 contract；内部 pipeline / layout helper 不再经顶层 barrel 暴露。',
                en: 'The `@retikz/plot` root continues to expose `lowerPlots`, `LowerPlotsOptions`, locator, schemas, and contracts; internal pipeline / layout helpers are no longer exposed through the root barrel.',
              },
            },
            {
              label: { zh: 'provenance helper 归入 contract', en: 'Provenance helpers move into contracts' },
              content: {
                zh: 'mark / guide 来源 meta、稳定 id 与 datum id 登记逻辑由 contract owner 提供，内置 mark 与外部扩展复用同一来源契约。',
                en: 'Mark / guide source meta, stable ids, and datum-id registration now come from the contract owner, so builtin marks and external extensions share the same provenance contract.',
              },
            },
            {
              label: { zh: 'BREAKING：IRPlotXxx 公开类型命名', en: 'BREAKING: Owner-qualified IRPlotXxx types' },
              content: {
                zh: '`PlotSpec`、`MarkOperation`、`ScaleOperation`、`CoordinateOperation`、`Guide`、`Transform` 等 schema 派生公开类型统一改为 `IRPlotXxx`，旧名不保留兼容别名；schema 与运行时 JSON 值不变。',
                en: 'Schema-derived public types such as `PlotSpec`, `MarkOperation`, `ScaleOperation`, `CoordinateOperation`, `Guide`, and `Transform` now use owner-qualified `IRPlotXxx` names without compatibility aliases; schemas and runtime JSON values are unchanged.',
              },
            },
            {
              label: {
                zh: 'BREAKING：mark definition 必须声明 schema',
                en: 'BREAKING: Mark definitions require schemas',
              },
              content: {
                zh: '`defineMark` 现在接收带 `schema` 的 definition；schema 的 `type` literal 作为注册键，lowering 会在字段收集和下沉前校验 JSON operation，非法自定义配置不再进入行为回调。',
                en: '`defineMark` definitions now require a `schema`; its literal `type` is the registry key, and lowering validates the JSON operation before field collection and lowering so invalid custom config never reaches behavior callbacks.',
              },
            },
            {
              label: {
                zh: 'BREAKING：收回未实现的 decoration layout 字段',
                en: 'BREAKING: Unimplemented decoration layout fields withdrawn',
              },
              content: {
                zh: 'Plot layout 暂不接受 `maxIterations`、`collision`、label `priority` / `overflow` 或 `placement.target:"view"`；当前稳定契约保留 frame / plotArea 定位、基础占位与 autoPadding，完整 solver 延后到 v0.2。',
                en: 'Plot layout no longer accepts `maxIterations`, `collision`, label `priority` / `overflow`, or `placement.target:"view"`. The stable contract keeps frame / plotArea placement, basic reservation, and autoPadding; the complete solver moves to v0.2.',
              },
            },
          ],
        },
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
                zh: '连续 / 时间位置 scale 支持 domain padding、single-value fallback、显式 tick source、interval 与 density；axis line 支持 extent、lineCap、dashOffset 与方向箭头；tick mark 支持内置 shape 与自定义 Node shape，tick label 支持自适应旋转 / 省略，title 支持 padding、path-like placement、orientation、anchor 与 shift。 [坐标轴](/viz/plot/guide/axis)',
                en: 'Continuous / temporal position scales gain domain padding, single-value fallbacks, explicit tick sources, intervals, and density. Axis lines support extent, lineCap, dashOffset, and directional arrows; tick marks support built-in shapes and custom Node shapes; tick labels gain adaptive rotation / omission; titles support padding, path-like placement, orientation, anchor, and shift. [Axis](/viz/plot/guide/axis)',
              },
            },
            {
              label: { zh: 'grid / legend / theme', en: 'Grid / legend / theme' },
              content: {
                zh: '`PlotSpec.theme` 统一 axis、grid、legend、palette、typography 与 background token；axis grid 支持独立 tick source、density、minor grid、bandPosition、dashOffset 与 lineCap；size legend 默认把大符号压入 symbol 盒子并按最终尺寸预留空间。 [图例](/viz/plot/guide/legend)',
                en: '`PlotSpec.theme` now unifies axis, grid, legend, palette, typography, and background tokens. Axis grids support independent tick sources, density, minor grids, bandPosition, dashOffset, and lineCap; size legends fit large symbols into symbol boxes and reserve space from the final size. [Legend](/viz/plot/guide/legend)',
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
          items: [],
        },
        {
          version: 'alpha.13',
          date: '2026-06-28',
          summary: {
            zh: 'Statistics 进阶与 stat-geom 闭环：RelationMark 支持 ribbon，统计层新增 quantile-band、density 与 smooth，抽象 mark 可组合出 boxplot、density area、趋势线；同时收口 mark label 宿主语义与 polar sector pull。',
            en: 'Advanced statistics and the stat-geom loop: RelationMark supports ribbons, the statistics layer adds quantile-band, density, and smooth, abstract marks compose boxplots, density areas, and trend lines; mark labels and polar sector pull are also consolidated.',
          },
          items: [],
        },
        {
          version: 'alpha.12',
          date: '2026-06-17',
          summary: {
            zh: 'Statistics 基础（IR / lowering 视角）：transform 层补统计变换——`bin` / `aggregate` 改变行数（N 观测 → M 箱 / 组），`normalize` / `derive-interval` / `jitter` 保持行数（逐行派生 / 调整）；并给 interval 加 `x0Field` / `x1Field` 解锁 histogram 连续 x 区间柱。',
            en: 'Statistics foundation (IR / lowering view): the transform layer gains statistical ops — `bin` / `aggregate` change the row count (N observations → M bins / groups), while `normalize` / `derive-interval` / `jitter` preserve it (per-row derive / adjust); interval also gains `x0Field` / `x1Field` to unlock continuous-x histogram bars.',
          },
          items: [],
        },
        {
          version: 'alpha.11',
          date: '2026-06-16',
          summary: {
            zh: 'Geometry 基础（IR / lowering 视角）：区间几何下沉重构为坐标系无关的 `frame.projectCell(cell)` 契约（闭式 rect / sector 快路 ⊕ contour 兜底，曲线坐标系在其 `projectCell` 就绪时出可连接柱），并新增 rect / rule / text / ribbon 四个 mark——heatmap 双 band 格、参考 / 阈值线与 band 区域、datum label 文本、sankey / alluvial 流带。',
            en: 'Geometry foundation (IR / lowering view): refactors interval geometry into a coordinate-agnostic `frame.projectCell(cell)` contract (closed-form rect / sector fast paths ⊕ contour fallback, with connectable bars on curved systems once their `projectCell` is provided), and adds four marks — rect / rule / text / ribbon — heatmap double-band cells, reference / threshold lines and band regions, datum-label text, and sankey / alluvial ribbons.',
          },
          items: [],
        },
        {
          version: 'alpha.10',
          date: '2026-06-13',
          summary: {
            zh: 'Plot 容器封板配套：`PlotSpec` 增自描述 `width` / `height` 与默认调色板 `colors`，lowering 可在有 `id` 时暴露外部可见的面板 bbox 与 `plotArea` anchor，支撑同一 core `<Layout>` 中组合多张 plot。',
            en: 'Plot-container wrap-up support: `PlotSpec` adds intrinsic `width` / `height` and a default `colors` palette, and lowering can expose an externally visible panel bbox plus `plotArea` anchor when `id` is present, enabling multiple plots inside one core `<Layout>`.',
          },
          items: [],
        },
        {
          version: 'alpha.9',
          date: '2026-06-12',
          summary: {
            zh: '阶段二·Coordinates 坐标系族：把坐标 frame 从「2 通道」泛化成「N 通道角色」+ 位置 encoding 角色化（x/y 转可选、新增 a/b/c），落地一维坐标系族 `cartesian1D` / `polar1D` 与三元坐标系 `ternary2D`，并按坐标系校验 guide 维度（非法维度 fail-loud）；附自定义坐标系扩展点 `projectRoles` / `frameAlong`（实验性）。',
            en: 'Stage 2 · Coordinates family: generalizes the coordinate frame from "2 channels" to "N channel roles" + role-based position encoding (x/y become optional, new a/b/c), lands the 1D coordinate family `cartesian1D` / `polar1D` and the ternary `ternary2D`, and validates guide dimensions per coordinate system (illegal dimensions fail loud); plus an experimental custom-coordinate extension point `projectRoles` / `frameAlong`.',
          },
          items: [],
        },
        {
          version: 'alpha.8',
          date: '2026-06-08',
          summary: {
            zh: '阶段二·高级 Scales + Legend：补连续色阶 sequential / diverging（continuous / temporal `color.field` 映射到色带）+ 离散化 scale quantize / threshold / quantile（连续 domain → 离散 color 档）;`GuideSchema` 升 discriminated union，由非位置 scale 派生 legend（纯函数估算布局 + 占位）。',
            en: 'Stage 2 · advanced Scales + Legend: adds sequential / diverging continuous color scales (continuous / temporal `color.field` → color ramp) + quantize / threshold / quantile discretization scales (continuous domain → discrete color bins); `GuideSchema` becomes a discriminated union, deriving legends from non-position scales (pure-function estimated layout + reservation).',
          },
          items: [],
        },
        {
          version: 'alpha.7',
          date: '2026-06-08',
          summary: {
            zh: '阶段二·Aesthetics 全部内置通道 + 连续 scale 家族：补 log / pow / sqrt 连续 scale（L1：仅 point/line，bar/area fail-loud）;把「通道→scale」抽象成通用 resolver，落地 `size` / `opacity` / `shape` 三个仅 PointMark 的非位置通道;`color` 收口为真 scale 通道 + `series` 一等化。',
            en: 'Stage 2 · all built-in channels + the continuous scale family: adds log / pow / sqrt continuous scales (L1: point/line only, bar/area fails loud); abstracts channel→scale into a reusable resolver and lands `size` / `opacity` / `shape` as PointMark-only non-position channels; closes `color` into a real scale channel + first-classes `series`.',
          },
          items: [],
        },
        {
          version: 'alpha.6',
          date: '2026-06-08',
          summary: {
            zh: '阶段二开篇·数据模型：把 `data.model` 升级成承重的字段语义类型层（`continuous / categorical / temporal`），驱动 type-driven scale 默认选型；补可移植数据契约（fieldMaps + 按类型 coercion）、`resolveField` 运行时逃生舱、声明式 `format` / `order`、`invalid` 策略与扩宽的 temporal 推断。',
            en: 'Stage 2 opener · data model: `data.model` becomes a load-bearing field-semantic-type layer (`continuous / categorical / temporal`) that drives type-driven default scale selection; adds a portable data contract (fieldMaps + by-type coercion), a `resolveField` runtime escape hatch, declarative `format` / `order`, an `invalid` policy, and a widened temporal inference.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-07',
          summary: {
            zh: 'v0.1 收尾：scope-aware id 绑定 + meta 来源透传（接通 alpha.1 预留、消费 core meta），datum locator 命中预演。默认零开销（provenance 总开关默认关 → 逐字节等价 alpha.4）。',
            en: 'v0.1 wrap-up: scope-aware id binding + meta provenance passthrough (activates the alpha.1 reservations, consumes core meta) and a datum-locator hit-test preview. Zero overhead by default (the provenance switch is off → byte-identical to alpha.4).',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-06',
          summary: {
            zh: 'polar 坐标系端到端：coordinate 抽象通用化 + polar2D 投影、interval→sector（径向柱/玫瑰）与 sector mark（饼图/环图）、连续 mark（area 新建 + closed 雷达）、径向/角向 guide。落定 §8.3 (i) 投影整形。',
            en: 'Polar coordinate system end-to-end: a generalized coordinate abstraction + polar2D projection, interval→sector (radial bars / rose) and a sector mark (pie / donut), continuous marks (new area + closed radar), and radial / angular guides. Lands the §8.3 (i) projection-reshaping decision.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-06',
          summary: {
            zh: '横向补宽到柱状图与多系列：mark 补 interval(bar)，scale 补 band/point + time + ordinal·color，新增 transform 管线段（sort/stack）与 color 非位置通道，relation 补 group(dodge)/stack。仍限 cartesian2D。',
            en: 'Widens to bar charts and multi-series: marks add interval(bar); scales add band/point + time + ordinal·color; a transform stage (sort/stack) and the color non-position channel land; relations add group(dodge)/stack. Still cartesian2D only.',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-05',
          summary: {
            zh: 'guide：由 scale + 坐标系派生坐标轴 / 刻度 / 网格并 lower 进 core；scale 改用 d3-scale（scaleLinear + ticks/tickFormat）；引入绘图区 margin 布局，mark 改投影到 plot area。仍限 cartesian2D。',
            en: 'guide: derive axes / ticks / grid from scale + coordinate and lower into core; scales move to d3-scale (scaleLinear + ticks/tickFormat); a plot-area margin layout lands and marks now project into the plot area. Still cartesian2D only.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-05',
          summary: {
            zh: '首发：最薄纵向闭环——linear 比例尺 + cartesian2D 坐标系 + point / line 两种 mark，经 lowerPlots 下沉成 core 图元；IR 预留 anchor / scope-aware 字段。',
            en: 'First release: the thinnest end-to-end slice — linear scale + cartesian2D coordinate + point / line marks, lowered into core primitives by lowerPlots; the IR reserves anchor / scope-aware fields.',
          },
          items: [],
        },
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
          version: 'beta.2',
          date: '2026-07-07',
          summary: {
            zh: 'React `<Plot>` 的 spec 入口补齐 layout 透传，并让空 mark 的组合 DSL 也走完整 PlotSpec 校验。',
            en: 'The React `<Plot>` spec entry now forwards layout, and empty-mark composition DSL output also goes through full PlotSpec validation.',
          },
          items: [
            esmOnlyChangeItem,
            {
              label: { zh: 'BREAKING：移除 ternary2D authoring', en: 'BREAKING: ternary2D authoring removed' },
              content: {
                zh: '`<Plot coordinate="ternary2D">`、`<Axis dimension="z">` 与 `ReferenceMark` 的 `z` / `zTo` 表面已移除；`PointMark.z` 仅保留为自定义坐标角色入口。',
                en: '`<Plot coordinate="ternary2D">`, `<Axis dimension="z">`, and the `ReferenceMark` `z` / `zTo` surface have been removed. `PointMark.z` remains only as a custom-coordinate role entry.',
              },
            },
            {
              label: { zh: 'spec 入口支持 layout 覆盖', en: 'Spec entry supports layout overrides' },
              content: {
                zh: '使用 `<Plot spec={...} layout={...}>` 时，layout 与 colors / theme 一样合并进传入的 PlotSpec，再交给 lowering。',
                en: 'When using `<Plot spec={...} layout={...}>`, layout is merged into the supplied PlotSpec alongside colors and theme before lowering.',
              },
            },
            {
              label: { zh: '空图层也执行 schema 校验', en: 'Empty mark lists are schema-validated' },
              content: {
                zh: '组合 DSL 即使没有 mark，也会解析完整 `PlotSpecSchema`；布局、guide、label 等字段错误不会再因为空 mark 被跳过。',
                en: 'Composition DSL output now parses the full `PlotSpecSchema` even when no marks are present, so layout, guide, label, and related field errors are no longer skipped.',
              },
            },
          ],
        },
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
                zh: '`<Axis>` 透传 line extent / arrow、crossing、ticks interval / density / mark、tickLabels layout、title placement / orientation / anchor / shift、grid source / minor / bandPosition 等字段；`<Legend>` 透传 size symbol fit 与 theme 样式入口，组件只装配同一份 PlotSpec。 [坐标轴](/viz/plot/guide/axis)',
                en: '`<Axis>` passes through line extent / arrows, crossing, tick interval / density / marks, tick-label layout, title placement / orientation / anchor / shift, and grid source / minor / bandPosition fields. `<Legend>` passes through size-symbol fit and theme styling entries while still assembling the same PlotSpec. [Axis](/viz/plot/guide/axis)',
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
          items: [],
        },
        {
          version: 'alpha.13',
          date: '2026-06-28',
          summary: {
            zh: 'React DSL 透传 alpha.13 的 ribbon、统计 transform、host label 与 sector pull；仍保持薄适配，只装配同一份 PlotSpec。',
            en: 'The React DSL exposes alpha.13 ribbons, statistic transforms, host labels, and sector pull while staying a thin adapter that assembles the same PlotSpec.',
          },
          items: [],
        },
        {
          version: 'alpha.12',
          date: '2026-06-17',
          summary: {
            zh: 'Statistics 基础（React 组件视角）：新增通用 `<Transform kind="...">` 声明组件，统一承载全部七种 transform（sort / stack / bin / aggregate / normalize / derive-interval / jitter）；`<BarMark>` 加 `x0` / `x1` 画 histogram 连续 x 区间柱。',
            en: 'Statistics foundation (React component view): adds a generic `<Transform kind="...">` declaration component carrying all seven transforms (sort / stack / bin / aggregate / normalize / derive-interval / jitter); `<BarMark>` gains `x0` / `x1` for continuous-x histogram bars.',
          },
          items: [],
        },
        {
          version: 'alpha.11',
          date: '2026-06-16',
          summary: {
            zh: 'Geometry 基础（React 组件视角）：随 plot lockstep 露出四个新 mark 组件 `<RectMark>` / `<RuleMark>` / `<TextMark>` / `<RibbonMark>`（扁平 string props，与 `<BarMark>` 同风格），并给位置 mark（point / interval …）加可选 `label` prop 直接标注 datum。',
            en: 'Geometry foundation (React component view): lockstep with plot, exposing four new mark components `<RectMark>` / `<RuleMark>` / `<TextMark>` / `<RibbonMark>` (flat string props, same style as `<BarMark>`), and adding an optional `label` prop on positional marks (point / interval …) to annotate a datum directly.',
          },
          items: [],
        },
        {
          version: 'alpha.10',
          date: '2026-06-13',
          summary: {
            zh: '退化 `<Plot>` 为薄容器并让它可嵌入 core `<Layout>`：移除 cartesian2D 默认轴注入，保留 scale / coordinate / color 推断；装饰逻辑抽成 `decorateDefaultGuides`（留给 v0.2 `<Chart>`）；新增 `<Scale>`、`colors`、面板 `id` / `dataRef` / `x` / `y`。⚠️ alpha 间 breaking——不写 `<Axis>` 不再自动出 x/y 轴，`bare` / `scaleX` / `scaleY` 删除。',
            en: 'Degrade `<Plot>` to a thin container and make it embeddable inside core `<Layout>`: removes the cartesian2D default-axis injection while keeping scale / coordinate / color inference; extracts `decorateDefaultGuides` (reserved for a v0.2 `<Chart>`); adds `<Scale>`, `colors`, and panel `id` / `dataRef` / `x` / `y`. ⚠️ breaking between alphas — no `<Axis>` means no auto x/y axes, and `bare` / `scaleX` / `scaleY` are removed.',
          },
          items: [],
        },
        {
          version: 'alpha.9',
          date: '2026-06-12',
          summary: {
            zh: '随 plot lockstep 露出坐标系族表面：`<Plot coordinate>` 扩 `cartesian1D` / `polar1D` / `ternary2D`（字面量或对象配几何）、`<PointMark a b c>` 接三元分量、`<Plot coordinates={{...}}>` 注入自定义坐标系工厂（实验性）。',
            en: 'Lockstep with plot, exposing the coordinate-family surface: `<Plot coordinate>` extends to `cartesian1D` / `polar1D` / `ternary2D` (literal or object-with-geometry), `<PointMark a b c>` binds ternary components, and `<Plot coordinates={{...}}>` injects custom-coordinate factories (experimental).',
          },
          items: [],
        },
        {
          version: 'alpha.8',
          date: '2026-06-08',
          summary: {
            zh: '随 plot lockstep 露出 Scales + Legend 表面：新增 `<Legend>` 组件（按 channel 派生图例）+ continuous / temporal color 经 type-driven 自动派生连续色阶接入;修「有任何 guide 即不补默认轴」使 `<Legend>` 与默认坐标轴共存。',
            en: 'Lockstep with plot, exposing the Scales + Legend surface: a new `<Legend>` component (legends derived by channel) + continuous / temporal color wired in via type-driven derivation of continuous scales; fixes "any guide suppresses default axes" so `<Legend>` coexists with default axes.',
          },
          items: [],
        },
        {
          version: 'alpha.7',
          date: '2026-06-08',
          summary: {
            zh: '随 plot lockstep 露出 Aesthetics 表面：`DslScaleX` / `DslScaleY` 补 `log` / `sqrt`，`<PointMark>` 加 `size` / `opacity` / `shape` 字段 props，color × series 按 B/C 规则收口。',
            en: 'Lockstep with plot, exposing the aesthetics surface: `DslScaleX` / `DslScaleY` add `log` / `sqrt`, `<PointMark>` gains `size` / `opacity` / `shape` field props, and color × series is closed per the B/C rules.',
          },
          items: [],
        },
        {
          version: 'alpha.6',
          date: '2026-06-08',
          summary: {
            zh: '随 plot lockstep 接入数据模型：`<Plot>` 转发 `fieldMaps` / `resolveField` / `validateData` / `invalid` 到 `lowerPlots`;DSL 入口加 `model`（声明字段语义类型，改走 type-driven 派生）与扁平 `fieldMap`（映射到 DSL 数据集名）。',
            en: 'Lockstep with plot, wiring in the data model: `<Plot>` forwards `fieldMaps` / `resolveField` / `validateData` / `invalid` to `lowerPlots`; the DSL entry gains `model` (declare field-semantic types, switching to type-driven derivation) and a flat `fieldMap` (mapped onto the DSL dataset name).',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-07',
          summary: {
            zh: '随 plot lockstep：`<Plot>` 转发 `provenance` / `datumProvenance` / `datumIdField` 选项到 `lowerPlots`（原先静默丢弃），让 React 侧也能开启 scope-aware id / meta 与 datum 命中预演。',
            en: 'Lockstep with plot: `<Plot>` now forwards the `provenance` / `datumProvenance` / `datumIdField` options to `lowerPlots` (previously dropped), enabling scope-aware id / meta and datum hit-test preview from the React side too.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-06',
          summary: {
            zh: 'polar authoring 面：`<Plot coordinate="polar2D">`（或对象配 innerRadius/startAngle/endAngle）、`<BarMark angle>`（饼/环，自动累积）/ `<AreaMark>`、`<LineMark closed>`（雷达）、`<Axis dimension="angle"/"radius">`;全用扁平 prop。',
            en: 'Polar authoring surface: `<Plot coordinate="polar2D">` (or an object with innerRadius/startAngle/endAngle), `<BarMark angle>` (pie/donut, auto-accumulate) / `<AreaMark>`, `<LineMark closed>` (radar), and `<Axis dimension="angle"/"radius">` — all via flat props.',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-06',
          summary: {
            zh: '新增 `<BarMark>` 柱图层;mark 补 `color` / `series` / `stack` 多系列 props;`<Plot scaleX>` 可选连续 x scale 类型（`linear` / `time` / `point`，含 `<BarMark>` 时自动 band）。',
            en: 'New `<BarMark>` bar layer; marks gain multi-series props `color` / `series` / `stack`; `<Plot scaleX>` selects the continuous x scale type (`linear` / `time` / `point`, auto band when a `<BarMark>` is present).',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-05',
          summary: {
            zh: '新增 `<Axis>` 子组件（`dimension` / `tickCount` / `tickLabels` / `grid`），默认自动出 x/y 轴、`bare` 关；组合 DSL 目录 `dsl/` 更名 `components/`。',
            en: 'New `<Axis>` child component (`dimension` / `tickCount` / `tickLabels` / `grid`), with x/y axes auto-emitted by default and a `bare` switch; the composition DSL folder `dsl/` is renamed `components/`.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-05',
          summary: {
            zh: '首发：`<Plot>` 组件（spec 入口 + 组合 DSL）、`LineMark` / `PointMark`、`buildPlotSpec`;与 @retikz/plot lockstep。',
            en: 'First release: the `<Plot>` component (spec entry + composition DSL), `LineMark` / `PointMark`, and `buildPlotSpec`; lockstep with @retikz/plot.',
          },
          items: [],
        },
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
          version: 'beta.2',
          date: '2026-07-07',
          summary: {
            zh: 'Vanilla builder 明确 facet / scaffold / axis 绑定的 authoring 契约，并补齐公开类型说明。',
            en: 'The Vanilla builder documents the facet / scaffold / axis binding authoring contract and fills in public type descriptions.',
          },
          items: [
            esmOnlyChangeItem,
            {
              label: { zh: 'BREAKING：停止渲染 ternary2D', en: 'BREAKING: ternary2D rendering removed' },
              content: {
                zh: '`renderPlot` 不再接受内置 `ternary2D` Plot IR；一维、笛卡尔、极坐标与自定义坐标系继续复用同一 Plot lowering。',
                en: '`renderPlot` no longer accepts built-in `ternary2D` Plot IR. One-dimensional, Cartesian, polar, and custom coordinates continue to share the same Plot lowering path.',
              },
            },
            {
              label: { zh: 'builder-only 字段边界更清楚', en: 'Clearer builder-only field boundary' },
              content: {
                zh: '`xAxisId`、`yAxisId`、`facetId`、`trackId`、`scaffoldId` 等字段只在 `build()` 阶段展开，不进入输出的 Plot IR。',
                en: '`xAxisId`, `yAxisId`, `facetId`, `trackId`, `scaffoldId`, and related fields are expanded during `build()` only and do not enter the emitted Plot IR.',
              },
            },
            {
              label: { zh: 'SSR authoring 类型补齐 JSDoc', en: 'SSR authoring types gain JSDoc' },
              content: {
                zh: '`PlotBuilderConfig`、facet / scaffold 输入和链式 builder 方法补齐说明，生成的 spec 仍可直接交给 `renderPlot` 或 `lowerPlots`。',
                en: '`PlotBuilderConfig`, facet / scaffold inputs, and fluent builder methods now include documentation; the built spec remains directly consumable by `renderPlot` or `lowerPlots`.',
              },
            },
          ],
        },
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
          items: [],
        },
        {
          version: 'alpha.13',
          date: '2026-06-28',
          summary: {
            zh: 'Vanilla SSR 继续纯 spec 驱动，自动渲染 alpha.13 的 ribbon、boxplot、density area、smooth path、host label 与 pulled sector。',
            en: 'Vanilla SSR remains purely spec-driven and renders alpha.13 ribbons, boxplots, density areas, smooth paths, host labels, and pulled sectors automatically.',
          },
          items: [],
        },
        {
          version: 'alpha.12',
          date: '2026-06-17',
          summary: {
            zh: 'Statistics 基础（SSR 视角）：`renderPlot` 透过 Plot IR 自动渲染统计变换——零额外代码，纯 spec 驱动，SSR 出直方图（bin + 连续 x 区间柱）、分组聚合柱、百分比堆叠与 jitter 散点。',
            en: 'Statistics foundation (SSR view): `renderPlot` automatically renders statistical transforms through the Plot IR — zero extra code, purely spec-driven, SSR-emitting histograms (bin + continuous-x bars), grouped aggregate bars, percentage stacks, and jittered scatter.',
          },
          items: [],
        },
        {
          version: 'alpha.11',
          date: '2026-06-16',
          summary: {
            zh: 'Geometry 基础（SSR 视角）：`renderPlot` 透过 Plot IR 自动渲染四个新 mark（rect / rule / text / ribbon）与曲线坐标系 contour 柱——vanilla 侧零额外代码，纯 spec 驱动，SSR 出含 heatmap / 参考线 / band / datum label / sankey 流带的 SVG 字符串。',
            en: 'Geometry foundation (SSR view): `renderPlot` automatically renders the four new marks (rect / rule / text / ribbon) and contour bars on curved coordinate systems through the Plot IR — zero extra code on the vanilla side, purely spec-driven, SSR-emitting an SVG string with heatmaps / reference lines / bands / datum labels / sankey ribbons.',
          },
          items: [],
        },
        {
          version: 'alpha.9',
          date: '2026-06-12',
          summary: {
            zh: '随 plot lockstep：`renderPlot` 透过 Plot IR 渲染新坐标系族（cartesian1D / polar1D / ternary2D）与 1D / 三角轴 guide;自定义坐标系工厂经 `renderPlot(spec, data, { coordinates })` 选项注入（实验性）。',
            en: 'Lockstep with plot: `renderPlot` renders the new coordinate family (cartesian1D / polar1D / ternary2D) and 1D / triangular axis guides through the Plot IR; custom-coordinate factories inject via the `renderPlot(spec, data, { coordinates })` option (experimental).',
          },
          items: [],
        },
        {
          version: 'alpha.8',
          date: '2026-06-08',
          summary: {
            zh: '随 plot lockstep：`renderPlot` 透过 Plot IR 渲染连续色阶 / 离散化 scale 与 legend guide，估算布局后零 DOM SSR 出带图例的图。',
            en: 'Lockstep with plot: `renderPlot` renders continuous / discretization color scales and legend guides through the Plot IR, emitting legend-bearing charts via estimated-layout zero-DOM SSR.',
          },
          items: [],
        },
        {
          version: 'alpha.7',
          date: '2026-06-08',
          summary: {
            zh: '随 plot Aesthetics lockstep：`renderPlot` 经共享 lowering 自动覆盖 `size` / `opacity` / `shape` 通道与 log / pow / sqrt scale 的 SSR 产物，无新 API。',
            en: 'Lockstep with plot’s aesthetics: `renderPlot` automatically covers the `size` / `opacity` / `shape` channels and log / pow / sqrt scales in its SSR output via the shared lowering, no new API.',
          },
          items: [],
        },
        {
          version: 'alpha.6',
          date: '2026-06-08',
          summary: {
            zh: '随 plot 数据模型 lockstep：`renderPlot` 入口本就整体展开 `LowerPlotsOptions`，故 alpha.6 新增的数据模型选项（`fieldMaps` / `resolveField` / `validateData` / `invalid`）无需改代码自动生效——SSR 产物可消费可移植契约与缺省类型推断，无新 API。',
            en: 'Lockstep with plot’s data model: the `renderPlot` entry already spreads `LowerPlotsOptions`, so alpha.6’s new data-model options (`fieldMaps` / `resolveField` / `validateData` / `invalid`) take effect with no code change — SSR output benefits from the portable contract and default type inference, no new API.',
          },
          items: [],
        },
        {
          version: 'alpha.5',
          date: '2026-06-07',
          summary: {
            zh: '随 plot lockstep：`renderPlot` 自动透传 `provenance` / `datumProvenance` / `datumIdField`（入口已整体转发 options，无新 API）——SSR 产物可带 scope-aware id / meta。',
            en: 'Lockstep with plot: `renderPlot` forwards `provenance` / `datumProvenance` / `datumIdField` automatically (the entry already spreads full options, no new API) — SSR output can carry scope-aware id / meta.',
          },
          items: [],
        },
        {
          version: 'alpha.4',
          date: '2026-06-06',
          summary: {
            zh: '随 plot polar lockstep：`renderPlot` SSR 自动支持极坐标——径向柱 / 饼图 / 环图 / 雷达 / 极坐标折线与径向/角向轴网格（共用同一份 lowerPlots，无新 API）。',
            en: 'Lockstep with plot polar: `renderPlot` SSR now supports polar automatically — radial bars / pie / donut / radar / polar lines and radial/angular axes + grid (shared lowerPlots, no new API).',
          },
          items: [],
        },
        {
          version: 'alpha.3',
          date: '2026-06-06',
          summary: {
            zh: '随 plot mark / scale lockstep：`renderPlot` SSR 自动支持柱状 / 分组柱 / 堆叠柱 / 多系列折线与 band / time / 颜色比例尺（共用同一份 lowerPlots，无新 API）。',
            en: 'Lockstep with plot marks / scales: `renderPlot` SSR now supports bar / grouped / stacked / multi-series charts and band / time / color scales automatically (shared lowerPlots, no new API).',
          },
          items: [],
        },
        {
          version: 'alpha.2',
          date: '2026-06-05',
          summary: {
            zh: '随 plot guide lockstep：`renderPlot` 的 SSR 产物自动带上坐标轴 / 刻度 / 网格与绘图区布局（共用同一份下沉逻辑，无新 API）。',
            en: 'Lockstep with plot guide: `renderPlot` SSR output now carries axes / ticks / grid and the plot-area layout automatically (shares the same lowering, no new API).',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-06-05',
          summary: {
            zh: '首发：`renderPlot` SSR 字符串入口;与 @retikz/plot lockstep。',
            en: 'First release: the `renderPlot` SSR string entry; lockstep with @retikz/plot.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/table',
      version: 'v0.1',
      description: {
        zh: 'renderer-agnostic 的静态表格核心：用 JSON-safe TableSpec 表达结构、Cell、约束轨道与 border，并在同次 Core compile 中产出 Scene 与 typed manifest。',
        en: 'The renderer-agnostic static-table core: JSON-safe TableSpecs describe structure, Cells, constrained tracks, and borders, producing Scene and a typed manifest in one Core compile.',
      },
      highlights: [
        {
          label: { zh: '统一 TableSpec 与语义模型', en: 'Unified TableSpec and semantic model' },
          content: {
            zh: 'manual、detail 与自定义 structure 经过同一 Definition / registry / pipeline，统一生成可追溯的 `SemanticTableModel`。',
            en: 'Manual, detail, and custom structures share one Definition / registry / pipeline and produce the same traceable `SemanticTableModel`.',
          },
        },
        {
          label: { zh: '同次 compile 与 manifest', en: 'Same-compile manifests' },
          content: {
            zh: '`lowerTables()` 提供 layout-aware composite definition；`compileTable()` 从同一次 compile 返回 Scene、完整 artifacts 与精确根 `TableLayoutManifest`。',
            en: '`lowerTables()` provides a layout-aware composite definition, while `compileTable()` returns Scene, all artifacts, and the exact-root `TableLayoutManifest` from one compile.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-07-27',
          summary: {
            zh: '完成内容驱动的二维约束布局：轨道、span、Cell box、wrap/fit/overflow、Border Graph 与 typed manifest 在同一次 Core compile 中闭环。',
            en: 'Completes content-driven two-dimensional layout: tracks, spans, Cell boxes, wrap/fit/overflow, the Border Graph, and typed manifests now close in one Core compile.',
          },
          items: [
            {
              label: { zh: 'BREAKING：约束轨道与 span', en: 'BREAKING: Constrained tracks and spans' },
              content: {
                zh: '`TableSpec.layout` 现在接受 fixed / auto / fraction / minmax 默认轨道与 canonical index 稀疏覆盖；矩形 Cell span 参与 contribution、占位与 row-kind 校验。旧 `columnWidth` / `rowHeight` / `headerHeight` 分别迁移到 `columnSize` / `rowSize` / `headerRowSize`。',
                en: '`TableSpec.layout` now accepts fixed / auto / fraction / minmax defaults and sparse canonical-index overrides. Rectangular Cell spans participate in contributions, occupancy, and row-kind validation. Migrate the old `columnWidth` / `rowHeight` / `headerHeight` fields to `columnSize` / `rowSize` / `headerRowSize`, respectively.',
              },
            },
            {
              label: { zh: 'Cell 内容策略与 Border Graph', en: 'Cell content policies and Border Graph' },
              content: {
                zh: 'Cell 可配置 padding、bounds-aware 对齐、wrap、contain/cover/stretch、visible/clip 与四边 border；共享边通过 priority、specificity 和 canonical source order 确定性解析并保留 contributor provenance。',
                en: 'Cells configure padding, bounds-aware alignment, wrapping, contain/cover/stretch, visible/clip, and four-sided borders. Shared edges resolve deterministically by priority, specificity, and canonical source order while retaining contributor provenance.',
              },
            },
            {
              label: { zh: 'BREAKING：单次 compile artifact', en: 'BREAKING: Single-compile artifacts' },
              content: {
                zh: '`lowerTableWithArtifacts()` 已删除，改用 `compileTable()`；manifest 根字段 `bounds` 改为 `allocationBounds`，并新增 `visualOverflowBounds`、Cell 双坐标空间 bounds 与 border entries。',
                en: '`lowerTableWithArtifacts()` is removed in favor of `compileTable()`. Manifest root `bounds` becomes `allocationBounds`, with new `visualOverflowBounds`, dual-space Cell bounds, and border entries.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-21',
          summary: {
            zh: '首发 Table 最薄纵向闭环：manual/detail、value/content Cell、固定轨道、Core lowering、manifest 与可扩展 definitions。',
            en: 'First Table vertical slice: manual/detail structures, value/content Cells, fixed tracks, Core lowering, manifests, and extensible definitions.',
          },
          items: [
            {
              label: { zh: 'JSON-safe 根契约', en: 'JSON-safe root contract' },
              content: {
                zh: 'detail / manual / custom 各自拥有精确 schema 与类型，`TableSpecSchema` / `IRTableSpec` 聚合三种变体；真实 records 与带函数 definitions 继续在 runtime 注入。',
                en: 'Detail, manual, and custom Tables each have a precise schema and type, while `TableSpecSchema` / `IRTableSpec` aggregate the three variants; records and function-bearing definitions stay in runtime inputs.',
              },
            },
            {
              label: { zh: '精确类型迁移', en: 'Precise variant migration' },
              content: {
                zh: '`IRTableSpec` 现在是三个精确根对象的 union；只处理单类表格或对 spec 做对象展开的 TypeScript 代码应改用对应 `IRDetailTableSpec`、`IRManualTableSpec` 或 `IRCustomTableSpec`。持久化 JSON 无需迁移。',
                en: '`IRTableSpec` is now a union of three precise root objects. TypeScript code that handles one category or spreads a spec should use the matching `IRDetailTableSpec`, `IRManualTableSpec`, or `IRCustomTableSpec`. Persisted JSON requires no migration.',
              },
            },
            {
              label: { zh: '结构与 Cell 扩展同路', en: 'Unified structure and Cell extensions' },
              content: {
                zh: '内置 manual/detail 与自定义 structure 共用 registry；内置 text 与自定义 presentation 同样经过精确 schema 和 JSON/Core output guard。',
                en: 'Built-in manual/detail and custom structures share a registry; built-in text and custom presentations use the same precise schemas and JSON/Core output guards.',
              },
            },
            {
              label: { zh: '固定轨道与稳定 identity', en: 'Fixed tracks and stable identity' },
              content: {
                zh: 'alpha.1 提供统一列宽、正文/列头行高与 gap，保留 Table/row/column/Cell identity；内容测量、span、border 与 fit/overflow 延后。',
                en: 'alpha.1 provides uniform column width, body/header heights, and gaps while preserving Table/row/column/Cell identity; measurement, spans, borders, and fit/overflow remain deferred.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/table-react',
      version: 'v0.1',
      description: {
        zh: 'Table 的 React authoring 与宿主接线：提供通用、明细和手工三种组件，并复用同一 Table runtime 与 Core renderer。',
        en: 'React authoring and host wiring for Table: general, detail, and manual components reuse the same Table runtime and Core renderers.',
      },
      highlights: [
        {
          label: { zh: '三种明确组件入口', en: 'Three explicit component entries' },
          content: {
            zh: '`<Table>` 消费完整 spec，`<DetailTable>` 面向 records，`<ManualTable>` 面向显式网格，避免在一个 props union 中混合三种 authoring。',
            en: '`<Table>` consumes complete specs, `<DetailTable>` targets records, and `<ManualTable>` targets explicit grids without mixing three authoring modes in one props union.',
          },
        },
        {
          label: { zh: 'standalone 与嵌入共用 runtime', en: 'Shared standalone and embedded runtime' },
          content: {
            zh: '三个组件复用同一 normalization、contribution 和 lowering；standalone 可观察 manifest，嵌入父级 `Layout` 时使用稳定 Table id。',
            en: 'All three components reuse the same normalization, contribution, and lowering; standalone rendering can observe manifests, while parent `Layout` embedding uses stable Table ids.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-07-27',
          summary: {
            zh: 'React Table 接入完整 alpha.2 authoring、span-aware marker、选定 Layout host props 与同次 compile manifest observer。',
            en: 'Connects React Table to complete alpha.2 authoring, span-aware markers, selected Layout host props, and same-compile manifest observation.',
          },
          items: [
            {
              label: { zh: '完整 props 与 span-aware markers', en: 'Complete props and span-aware markers' },
              content: {
                zh: '`DetailColumn` 透传 header/body Cell layout；`Row` / `Cell` 按首个未占用槽位放置并让 span 预占未来行。完整 `columns` / `cells` props 仍是 JSON authoring 真源。',
                en: '`DetailColumn` forwards header/body Cell layout, while `Row` / `Cell` place markers in the first unoccupied slot and reserve future rows for spans. Complete `columns` / `cells` props remain the JSON authoring source of truth.',
              },
            },
            {
              label: {
                zh: 'BREAKING：同次 artifact 与 embedded 诊断',
                en: 'BREAKING: Same-compile artifacts and embedded diagnostics',
              },
              content: {
                zh: 'standalone `onManifest` 从 `<Layout onArtifacts>` 的 exact root occurrence 读取并按内容去重；embedded Table 对 `onManifest` 或 standalone host props fail-loud，并提示移到外层 Layout。',
                en: 'Standalone `onManifest` reads the exact root occurrence from `<Layout onArtifacts>` and deduplicates by content. Embedded Tables fail loudly on local `onManifest` or standalone host props and direct callers to the outer Layout.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-21',
          summary: {
            zh: '首发 `<Table>`、`<DetailTable>` 与 `<ManualTable>`，并提供可选的 `DetailColumn`、`Row`、`Cell` 组合式 authoring。',
            en: 'Introduces `<Table>`, `<DetailTable>`, and `<ManualTable>` with optional `DetailColumn`, `Row`, and `Cell` composition authoring.',
          },
          items: [
            {
              label: { zh: '共享 plain normalization', en: 'Shared plain normalization' },
              content: {
                zh: 'detail/manual React props 委托 `@retikz/table` 构造 JSON-safe spec，string header、默认值与错误语义不在 adapter 重复实现。',
                en: 'Detail/manual React props delegate JSON-safe spec construction to `@retikz/table`, so string headers, defaults, and errors are not reimplemented in the adapter.',
              },
            },
            {
              label: { zh: '组合式 authoring', en: 'Composition authoring' },
              content: {
                zh: '`<DetailColumn>` 可替代 columns，`<Row>` / `<Cell>` 可替代 cells 与 rowKinds；根组件仍保留完整 props，两种结构来源互斥并归一为同一 JSON-safe TableSpec。',
                en: '`<DetailColumn>` can replace columns, while `<Row>` / `<Cell>` can replace cells and rowKinds. Root components retain their complete props; the two structure sources are exclusive and normalize to the same JSON-safe TableSpec.',
              },
            },
            {
              label: { zh: '确定性嵌入贡献', en: 'Deterministic embedded contributions' },
              content: {
                zh: '嵌入态聚合 datasets、Table definitions 与 nested composites；重复稳定 id 或同 key 不同 definition 会 fail-loud。',
                en: 'Embedded mode aggregates datasets, Table definitions, and nested composites; duplicate stable ids or conflicting definitions fail loudly.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/table-vanilla',
      version: 'v0.1',
      description: {
        zh: 'Table 的无框架 authoring、Tier 2 adapter 与 SSR 入口：plain spec 可进入 Kernel figure/layer、mount/update 或直接输出 SVG。',
        en: 'Framework-free Table authoring, a Tier 2 adapter, and SSR entry: plain specs enter Kernel figures/layers, mount/update, or direct SVG output.',
      },
      highlights: [
        {
          label: { zh: 'plain helper，不建 builder', en: 'Plain helpers without a builder' },
          content: {
            zh: '`detailTable()` / `manualTable()` 分别返回无方法的 `IRDetailTableSpec` / `IRManualTableSpec`，与 React 共用 `@retikz/table` normalization。',
            en: '`detailTable()` / `manualTable()` return method-free `IRDetailTableSpec` / `IRManualTableSpec` values and share `@retikz/table` normalization with React.',
          },
        },
        {
          label: { zh: '复用 Kernel runtime', en: 'Kernel runtime reuse' },
          content: {
            zh: '`embedTable()` + `createTableAdapter()` 接入标准 figure/layer 与 `mount().update()`；`renderTable()` 提供无 DOM SSR 和可选 manifest。',
            en: '`embedTable()` + `createTableAdapter()` enter standard figures/layers and `mount().update()`; `renderTable()` provides DOM-free SSR with an optional manifest.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-07-27',
          summary: {
            zh: '`renderTable()` 改为一次 `compileTable()` 取得 SVG 与 manifest，并对齐 Kernel Vanilla 的 compile / animation 选项。',
            en: '`renderTable()` now uses one `compileTable()` call for SVG and manifest, aligned with Kernel Vanilla compile and animation options.',
          },
          items: [
            {
              label: { zh: 'BREAKING：composites 进入 compile', en: 'BREAKING: Composites move under compile' },
              content: {
                zh: 'standalone `renderTable` 删除顶层 `composites`；额外 Tier 2 definitions 使用 `compile.composites`，其余 Core options 与 `animation` 原样透传。embedded `TableEmbedProps.composites` 保持不变。',
                en: 'Standalone `renderTable` removes top-level `composites`; extra Tier 2 definitions use `compile.composites`, while other Core options and `animation` pass through unchanged. Embedded `TableEmbedProps.composites` remains.',
              },
            },
            {
              label: { zh: 'SSR 与 manifest 同源', en: 'Same-source SSR and manifest' },
              content: {
                zh: '`artifacts: true` 只决定是否返回 manifest sidecar，不增加 layout 或 compile 次数；`false` 与 `true` 使用同一 Scene。',
                en: '`artifacts: true` only controls whether the manifest sidecar is returned and adds no layout or compile pass; false and true use the same Scene.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-21',
          summary: {
            zh: '首发 plain detail/manual helper、Table embed adapter、浏览器 update 与 SSR artifact overload。',
            en: 'Introduces plain detail/manual helpers, the Table embed adapter, browser updates, and the SSR artifact overload.',
          },
          items: [
            {
              label: { zh: '标准 embed 与更新路径', en: 'Standard embedding and updates' },
              content: {
                zh: 'Table 运行时输入保留在 embed props，同一无状态 adapter 可在 `update(nextFigure)` 时读取新的 datasets、definitions 与 composites。',
                en: 'Table runtime inputs stay in embed props, allowing one stateless adapter to read updated datasets, definitions, and composites during `update(nextFigure)`.',
              },
            },
            {
              label: { zh: 'SSR 与 artifact', en: 'SSR and artifacts' },
              content: {
                zh: '`renderTable()` 默认返回 SVG string；`artifacts: true` 返回 `{ svg, manifest }`，output 尺寸只控制 SVG 宿主，不改变 Table 几何。',
                en: '`renderTable()` returns an SVG string by default; `artifacts: true` returns `{ svg, manifest }`, and output dimensions affect only the SVG host, not Table geometry.',
              },
            },
          ],
        },
      ],
    },
  ],
};
