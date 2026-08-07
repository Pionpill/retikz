import type { Release } from '../types';

export const standardV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/standard',
      version: 'v0.1',
      description: {
        zh: '官方宿主无关绘图库：以 JSON-safe Tier 2 composite 保存常用绘图语义，并通过 Core composite registry 下沉为普通 Core IR。',
        en: 'The official framework-agnostic drawing library: JSON-safe Tier 2 composites preserve common drawing semantics and lower through the Core composite registry.',
      },
      highlights: [
        {
          label: { zh: '首批语义 composite', en: 'First semantic composites' },
          content: {
            zh: '`Grid`、`Axes`、`Frame` 与 `Legend` 分别保存规则网格、静态数学坐标轴、带 Node-like header 的可视分组，以及已解析样本与含义的对应关系；lowering 后只产生既有 Core Scene primitives。',
            en: '`Grid`, `Axes`, `Frame`, and `Legend` preserve rule-based grids, static mathematical axes, bordered groups with Node-like headers, and resolved sample-to-meaning mappings; lowering emits only existing Core Scene primitives.',
          },
        },
        {
          label: { zh: '显式能力装载', en: 'Explicit capability loading' },
          content: {
            zh: '每项能力直接提供 Definition；宿主通过 Core `CompileOptions.composites` 选择当前图需要的 definitions。所有入口都复用 Core registry，不建立全局注册或第二套冲突规则。',
            en: 'Each capability directly provides a Definition; hosts select the definitions needed by the current figure through Core `CompileOptions.composites`. Every path reuses the Core registry without global registration or a second conflict model.',
          },
        },
        {
          label: { zh: '通用布局容器', en: 'General layout containers' },
          content: {
            zh: '`FlexLayout`、`GridLayout` 与 `OverlayLayout` 用统一的双轴尺寸、间距、对齐和 overflow 契约替代手写坐标，并公开区分父级 slot、真实占用与视觉包络的 typed artifact。',
            en: '`FlexLayout`, `GridLayout`, and `OverlayLayout` replace hand-authored coordinates with shared two-axis sizing, spacing, alignment, and overflow contracts while exposing typed artifacts that distinguish parent slots, real allocation, and visual bounds.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.3',
          date: '2026-08-08',
          summary: {
            zh: '新增可持久化的逻辑块、语义单元、连接器与标注，并保持直接 IR、React、Vanilla 及 SVG / Canvas 的等价路径。',
            en: 'Adds persistable logic blocks, semantic units, connectors, and callouts with equivalent direct IR, React, Vanilla, SVG, and Canvas paths.',
          },
          items: [
            {
              label: { zh: '逻辑块与语义单元', en: 'Logic blocks and semantic units' },
              content: {
                zh: '`LogicBlockBase` 用任意 JSON-safe child 组合 header 与有序 section，并复用 canonical `FlexLayout` 编译；`Terminal`、`Stage`、`Decision` 与 `Junction` 以独立 discriminator 保存局部逻辑角色。',
                en: '`LogicBlockBase` composes a header and ordered sections from arbitrary JSON-safe children through the canonical `FlexLayout` compiler. `Terminal`, `Stage`, `Decision`, and `Junction` preserve local logic roles with distinct discriminators.',
              },
            },
            {
              label: { zh: '显式关系与标注', en: 'Explicit relations and callouts' },
              content: {
                zh: '`Connector` 将直线、折线、正交和曲线路由下沉为同 id Core Path；`Callout` 复用 authored target 与 Scope placement。whole target 已闭环，section target 保留稳定输入并在 Core structured subtarget 就绪前明确失败。',
                en: '`Connector` lowers straight, polyline, orthogonal, and curved routes to a same-id Core Path, while `Callout` reuses authored targets and Scope placement. Whole targets are supported; section targets retain stable input and fail explicitly until Core structured subtargets are available.',
              },
            },
            {
              label: { zh: '三路径文档闭环', en: 'Three-path documentation' },
              content: {
                zh: '新的逻辑组件文档同时覆盖 React、直接 JSON IR 与 Vanilla，并用仅属于 docs 的 Process、Class、Data recipe 展示公开组件组合，不新增 recipe package export。',
                en: 'The Logic Components docs cover React, direct JSON IR, and Vanilla while documentation-only Process, Class, and Data recipes demonstrate composition without adding recipe package exports.',
              },
            },
          ],
        },
        {
          version: 'alpha.2',
          date: '2026-07-30',
          summary: {
            zh: '新增三种通用布局容器、公共 LayoutItem、领域无关 Legend、typed artifacts、能力 preset 与可选布局检查入口。',
            en: 'Adds three general layout containers, shared LayoutItem vocabulary, a domain-neutral Legend, typed artifacts, capability presets, and optional Layout Inspector entries.',
          },
          items: [
            {
              label: { zh: 'Flex、Grid 与 Overlay', en: 'Flex, Grid, and Overlay' },
              content: {
                zh: '`FlexLayout` 处理 grow、shrink、wrap 与 baseline；`GridLayout` 处理 tracks、span 和非 dense 自动放置；`OverlayLayout` 处理 aligned / positioned 叠放与稳定 paint order。三者都通过 Core proposal / probe / replay 契约求解。',
                en: '`FlexLayout` handles grow, shrink, wrapping, and baselines; `GridLayout` handles tracks, spans, and non-dense auto placement; `OverlayLayout` handles aligned or positioned stacking with stable paint order. All three solve through the Core proposal, probe, and replay contract.',
              },
            },
            {
              label: { zh: 'BREAKING：FlexLayout 间距输入', en: 'BREAKING: FlexLayout spacing input' },
              content: {
                zh: '`FlexLayout` 删除 `columnGap` / `rowGap`，统一使用 `gap`。`gap` 接受数字或 `{ column, row }`；数字在 schema 边界归一化为两个轴相同的 canonical 对象。旧字段需要迁移且不保留兼容别名。',
                en: '`FlexLayout` removes `columnGap` and `rowGap` in favor of one `gap` input. `gap` accepts a number or `{ column, row }`; numbers normalize at the schema boundary to a canonical object with the same value on both axes. Migrate old fields; no compatibility aliases are retained.',
              },
            },
            {
              label: { zh: 'Typed artifact 与装载', en: 'Typed artifacts and loading' },
              content: {
                zh: '每种容器返回 strict JSON artifact，记录 container、items 与 line / track / paint order 结果；Flex 与 Grid 额外以必填 `spacing` 区分固定 gap 和正自由空间分布。布局 Definition 通过 Core `composites` 按需注入。',
                en: 'Each container returns a strict JSON artifact with container, item, and line, track, or paint-order results. Flex and Grid additionally require `spacing` to distinguish fixed gaps from positive free-space distribution. Layout Definitions are injected on demand through Core `composites`.',
              },
            },
            {
              label: { zh: '通用 Legend 呈现', en: 'Generic Legend presentation' },
              content: {
                zh: '`standard.legend` 接收已解析的离散样本或连续 ramp，使用 Core minimum / natural / exact probe 与 replay 求解标题、标签、换行和溢出，并发布按 key 与 authored order 稳定的 strict typed artifact。调用方直接向 Core 注入 `LegendDefinition`；嵌套样本依赖仍需显式提供。',
                en: '`standard.legend` accepts resolved discrete samples or a continuous sample and solves titles, labels, wrapping, and overflow through Core minimum, natural, and exact probes plus replay. Hosts inject `LegendDefinition` directly into Core, and nested sample dependencies remain explicit.',
              },
            },
            {
              label: { zh: '可选布局检查入口', en: 'Optional Layout Inspector entry' },
              content: {
                zh: '`@retikz/standard/inspect` 显式导出 Flex、Grid、Overlay Inspector、共享选项与选择 helper，并以可选 peer 复用 `@retikz/inspect`。Standard 根入口只保留布局 schema、Definition、solver 与 artifact；辅助内容仍以普通 Core IR 和隔离 Scene 执行，不改变主图。',
                en: '`@retikz/standard/inspect` explicitly exports Flex, Grid, and Overlay Inspectors, shared options, and selection helpers through the optional `@retikz/inspect` peer. The Standard root keeps only layout schemas, Definitions, solvers, and artifacts; auxiliary content still executes as ordinary Core IR and isolated Scenes without changing the primary figure.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '初始化 Standard 包家族，交付 Grid、Axes、Frame 与按需注入 Core 的 Definition。',
            en: 'Initializes the Standard package family with Grid, Axes, Frame, and Definitions injected into Core on demand.',
          },
          items: [
            {
              label: { zh: 'Grid 与 Axes', en: 'Grid and Axes' },
              content: {
                zh: '`standard.grid` 保存 bounds、spacing、主线与边框规则；`standard.axes` 保存数学 y-up extent、轴线、显式刻度文字与轻量网格。两者都确定性 lower 为 Core IR。',
                en: '`standard.grid` stores bounds, spacing, major-line, and border rules; `standard.axes` stores mathematical y-up extents, axis lines, explicit tick labels, and a lightweight grid. Both lower deterministically to Core IR.',
              },
            },
            {
              label: { zh: 'Frame 语义 header', en: 'Semantic Frame headers' },
              content: {
                zh: '`Frame` 以 `padding` 围合 body，并用 Node-like Title / Description、横向或纵向 anchor 链、统一圆角与稳定派生 id 表达分组；不重排 body Node。',
                en: '`Frame` encloses its body with `padding` and composes Node-like Title / Description parts through horizontal or vertical anchor chains, a uniform corner radius, and stable derived ids without rearranging body Nodes.',
              },
            },
            {
              label: { zh: 'Root-only 公开入口', en: 'Root-only public entries' },
              content: {
                zh: '三个包只提供根 package entry，通过 named exports 与 `sideEffects: false` 支持按需消费；不维护逐组件 subpath。',
                en: 'All three packages expose only their root package entry, using named exports plus `sideEffects: false` for selective consumption instead of per-component subpaths.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/standard-vanilla',
      version: 'v0.1',
      description: {
        zh: 'Standard 的无框架 authoring：提供呈现与布局 builders、显式 adapters、SSR 接线与全量便利数组。',
        en: 'Framework-free Standard authoring with presentation and layout builders, explicit adapters, SSR wiring, and all-capabilities convenience arrays.',
      },
      highlights: [
        {
          label: { zh: '显式 Vanilla 接线', en: 'Explicit Vanilla wiring' },
          content: {
            zh: '所有 builders 都构造由 Standard schema 约束的输入；布局家族提供独立的 `StandardLayoutVanillaAdapters`，`StandardVanillaAdapters` 仍是浅冻结的当前版本全量数组。',
            en: 'Every builder constructs input governed by Standard schemas. The layout family has its own `StandardLayoutVanillaAdapters`, while `StandardVanillaAdapters` remains the shallow-frozen full array for this release.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.3',
          date: '2026-08-08',
          summary: {
            zh: '新增七种逻辑组件 builder、对应 adapters 与无 DOM 编译接线。',
            en: 'Adds seven logic-component builders, their adapters, and DOM-free compilation wiring.',
          },
          items: [
            {
              label: { zh: '逻辑组件 builders', en: 'Logic component builders' },
              content: {
                zh: '`logicBlockBase()`、`terminal()`、`stage()`、`decision()`、`junction()`、`connector()` 与 `callout()` 复用 Standard schema、factory 与 Definition，并加入当前完整 adapter 目录。',
                en: '`logicBlockBase()`, `terminal()`, `stage()`, `decision()`, `junction()`, `connector()`, and `callout()` reuse Standard schemas, factories, and Definitions and join the complete adapter catalog.',
              },
            },
            {
              label: { zh: 'Canonical target identity', en: 'Canonical target identity' },
              content: {
                zh: 'Vanilla adapter 将 embed id 稳定派生为 `<embed-id>/<kind>` canonical id；跨组件 target 必须显式使用该 identity，例如 `start/terminal`。',
                en: 'Vanilla adapters derive stable `<embed-id>/<kind>` canonical IDs. Cross-component targets use that identity explicitly, for example `start/terminal`.',
              },
            },
          ],
        },
        {
          version: 'alpha.2',
          date: '2026-07-30',
          summary: {
            zh: '新增三种布局 builder、`legend()`、对应 adapters 与无 DOM 的嵌套编译 / SSR 接线。',
            en: 'Adds three layout builders, `legend()`, their adapters, and DOM-free nested compilation and SSR wiring.',
          },
          items: [
            {
              label: { zh: '布局 family adapters', en: 'Layout family adapters' },
              content: {
                zh: '`flexLayout()`、`gridLayout()` 与 `overlayLayout()` 生成 canonical Standard IR；三个 adapter 共用稳定 family maker，并按 Flex、Grid、Overlay 顺序贡献 definitions。',
                en: '`flexLayout()`, `gridLayout()`, and `overlayLayout()` produce canonical Standard IR. Their adapters share one stable family maker and contribute definitions in Flex, Grid, Overlay order.',
              },
            },
            {
              label: { zh: 'BREAKING：FlexLayout builder 间距', en: 'BREAKING: FlexLayout builder spacing' },
              content: {
                zh: '`flexLayout()` 的输入改用 `gap`，可传数字或 `{ column, row }`；`columnGap` / `rowGap` 不再接受。',
                en: '`flexLayout()` now accepts `gap` as a number or `{ column, row }`; `columnGap` and `rowGap` are no longer accepted.',
              },
            },
            {
              label: { zh: 'BREAKING：可选检查 helper', en: 'BREAKING: Optional inspection helpers' },
              content: {
                zh: '基础 `flexLayout()`、`gridLayout()` 与 `overlayLayout()` 不再接受第三个检查参数。安装 `@retikz/inspect` 后，从 `@retikz/standard-vanilla/inspect` 使用 `inspectFlexLayout()`、`inspectGridLayout()`、`inspectOverlayLayout()` 与 `createStandardInspectionVanillaDriver()`。',
                en: 'Base `flexLayout()`, `gridLayout()`, and `overlayLayout()` no longer accept a third inspection argument. After installing `@retikz/inspect`, use `inspectFlexLayout()`, `inspectGridLayout()`, `inspectOverlayLayout()`, and `createStandardInspectionVanillaDriver()` from `@retikz/standard-vanilla/inspect`.',
              },
            },
            {
              label: { zh: 'Legend embed', en: 'Legend embed' },
              content: {
                zh: '`legend(id, input)` 与 `LegendVanillaAdapter` 复用 Standard Legend schema、factory、Definition 与 artifact 语义，并加入当前版本完整 adapter 目录。',
                en: '`legend(id, input)` and `LegendVanillaAdapter` reuse the Standard Legend schema, factory, Definition, and artifact semantics and join the current complete adapter catalog.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '新增三个 composite builder、Frame header builders 与部分 / 全量 adapter 接线。',
            en: 'Adds three composite builders, Frame header builders, and partial or full adapter wiring.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/standard-react',
      version: 'v0.1',
      description: {
        zh: 'Standard 的 React authoring：以静态 Tier 2 adapter 提供呈现 composite、布局容器与 LayoutItem JSX。',
        en: 'React authoring for Standard presentation composites, layout containers, and LayoutItem JSX backed by static Tier 2 adapters.',
      },
      highlights: [
        {
          label: { zh: '按使用项贡献', en: 'Per-use contribution' },
          content: {
            zh: '组件只在当前 `Layout` 中按实际使用项贡献 definition；导入包不会注册全局状态。嵌套布局共用稳定 family contribution，非法 child 组合会立即 fail-loud。',
            en: 'Components contribute definitions only for capabilities used by the current `Layout`; importing the package creates no global state. Nested layouts share one stable family contribution, and invalid child composition fails loudly.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.3',
          date: '2026-08-08',
          summary: {
            zh: '新增 LogicBlockBase、四种语义单元、Connector 与 Callout 的 React authoring。',
            en: 'Adds React authoring for LogicBlockBase, four semantic units, Connector, and Callout.',
          },
          items: [
            {
              label: { zh: '逻辑组件 JSX', en: 'Logic component JSX' },
              content: {
                zh: '`Terminal`、`Stage`、`Decision`、`Junction`、`Connector` 与 `Callout` 把 React children 或 plain props 归一为 canonical Standard IR，并只在当前 Layout 局部贡献所需 Definition。',
                en: '`Terminal`, `Stage`, `Decision`, `Junction`, `Connector`, and `Callout` normalize React children or plain props into canonical Standard IR and contribute only the Definitions used by the current Layout.',
              },
            },
            {
              label: { zh: 'Headless block markers', en: 'Headless block markers' },
              content: {
                zh: '`LogicBlockHeader` 与 `LogicBlockSection` 只负责 JSX authoring 的 header / section 边界和顺序；marker 不进入持久化 IR、Scene 或独立 composite registry。',
                en: '`LogicBlockHeader` and `LogicBlockSection` only express header and section boundaries and order during JSX authoring; markers do not enter persisted IR, Scene, or a separate composite registry.',
              },
            },
          ],
        },
        {
          version: 'alpha.2',
          date: '2026-07-30',
          summary: {
            zh: '新增 Legend 与 FlexLayout、GridLayout、OverlayLayout 三种通用布局容器。LayoutItem 只能作为这些布局容器的直属语义 child。',
            en: 'Adds Legend and three general layout containers: FlexLayout, GridLayout, and OverlayLayout. LayoutItem is the containers’ direct semantic child.',
          },
          items: [
            {
              label: { zh: '嵌套布局 authoring', en: 'Nested layout authoring' },
              content: {
                zh: '`LayoutItem` 用 `itemKey` 保存容器内 identity，可接一个 React drawable child 或显式 `ir`；三种布局任意嵌套时仍只贡献一组有序 definitions。',
                en: '`LayoutItem` stores container-local identity through `itemKey` and accepts either one React drawable child or explicit `ir`. Arbitrary nesting among the three layouts still contributes one ordered definition set.',
              },
            },
            {
              label: { zh: 'BREAKING：FlexLayout gap 属性', en: 'BREAKING: FlexLayout gap prop' },
              content: {
                zh: '`<FlexLayout>` 删除 `columnGap` / `rowGap` props，改用 `gap`；数字设置两个物理轴，对象可分别设置 `column` 与 `row`。',
                en: '`<FlexLayout>` removes the `columnGap` and `rowGap` props in favor of `gap`; a number sets both physical axes, while an object sets `column` and `row` independently.',
              },
            },
            {
              label: { zh: 'BREAKING：可选检查组件', en: 'BREAKING: Optional inspection components' },
              content: {
                zh: '基础 `FlexLayout`、`GridLayout` 与 `OverlayLayout` 不再提供 `inspect` prop。安装 `@retikz/inspect` 后，从 `@retikz/standard-react/inspect` 使用 `StandardInspectLayout`、`StandardInspectScope` 与 `InspectFlexLayout`、`InspectGridLayout`、`InspectOverlayLayout`。',
                en: 'Base `FlexLayout`, `GridLayout`, and `OverlayLayout` no longer expose an `inspect` prop. After installing `@retikz/inspect`, use `StandardInspectLayout`, `StandardInspectScope`, `InspectFlexLayout`, `InspectGridLayout`, and `InspectOverlayLayout` from `@retikz/standard-react/inspect`.',
              },
            },
            {
              label: { zh: 'Legend 无头组合 API', en: 'Headless Legend composition API' },
              content: {
                zh: 'BREAKING：`<Legend kind>` 改用 `LegendTitle`、`LegendItem`、`LegendRamp` 与 `LegendTick` 组合可绘制 JSX slot；旧 React `content` / `title` props 已移除。Vanilla 与持久化 `LegendInput` 保持 JSON-safe plain data，静态 Tier 2 adapter 仍在当前 Layout 局部贡献 `LegendDefinition`。',
                en: 'BREAKING: `<Legend kind>` now composes drawable JSX slots through `LegendTitle`, `LegendItem`, `LegendRamp`, and `LegendTick`; the old React `content` and `title` props are removed. Vanilla and persisted `LegendInput` remain JSON-safe plain data, while the static Tier 2 adapter still contributes `LegendDefinition` locally to the current Layout.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '新增 Grid、Axes、Frame JSX；原 `@retikz/react` Grid 迁移到本包并改用结构化 Standard 输入。',
            en: 'Adds Grid, Axes, and Frame JSX; the former `@retikz/react` Grid moves here with structured Standard input.',
          },
          items: [
            {
              label: { zh: 'BREAKING：Grid 所有权迁移', en: 'BREAKING: Grid ownership moved' },
              content: {
                zh: '`Grid` 改从 `@retikz/standard-react` 导入；`corner1/corner2` 改为 `bounds.min/max`，`step/xStep/yStep` 改为 `spacing`，前缀样式改为 `lines.style`、`major.style` 与 `border.style`。',
                en: 'Import `Grid` from `@retikz/standard-react`; replace `corner1/corner2` with `bounds.min/max`, `step/xStep/yStep` with `spacing`, and prefixed style props with `lines.style`, `major.style`, and `border.style`.',
              },
            },
          ],
        },
      ],
    },
  ],
};
