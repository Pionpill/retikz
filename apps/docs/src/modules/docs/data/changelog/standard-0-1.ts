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
            zh: '每项能力提供 module；`createStandardBundle()` 支持部分组合，`StandardAllPreset` 提供当前版本全量 definitions。所有入口都复用 Core registry，不建立全局注册或第二套冲突规则。',
            en: 'Each capability provides a module; `createStandardBundle()` composes selected definitions, while `StandardAllPreset` exposes the current full set. Every path reuses the Core registry without global registration or a second conflict model.',
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
          version: 'alpha.2',
          date: '2026-07-30',
          summary: {
            zh: '新增三种通用布局容器、公共 LayoutItem、领域无关 Legend、typed artifacts、能力 preset 与开发期布局检查器。',
            en: 'Adds three general layout containers, shared LayoutItem vocabulary, a domain-neutral Legend, typed artifacts, capability presets, and a development-time Layout Inspector.',
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
              label: { zh: 'Typed artifact 与装载', en: 'Typed artifacts and loading' },
              content: {
                zh: '每种容器返回 strict JSON artifact，记录 container、items 与 line / track / paint order 结果；Flex 与 Grid 额外以必填 `spacing` 区分固定 gap 和正自由空间分布。`StandardLayoutPreset` 可只装载布局 definitions，`StandardAllPreset` 同步纳入三项能力。',
                en: 'Each container returns a strict JSON artifact with container, item, and line, track, or paint-order results. Flex and Grid additionally require `spacing` to distinguish fixed gaps from positive free-space distribution. `StandardLayoutPreset` loads only layout definitions, while `StandardAllPreset` now includes all three.',
              },
            },
            {
              label: { zh: '通用 Legend 呈现', en: 'Generic Legend presentation' },
              content: {
                zh: '`standard.legend` 接收已解析的离散样本或连续 ramp，使用 Core minimum / natural / exact probe 与 replay 求解标题、标签、换行和溢出，并发布按 key 与 authored order 稳定的 strict typed artifact。`LegendModule` 已进入 `StandardAllPreset`；同一 module object 可幂等汇合，同名异对象仍 fail-loud。',
                en: '`standard.legend` accepts resolved discrete samples or a continuous ramp, solves titles, labels, wrapping, and overflow through Core minimum, natural, and exact probes plus replay, and publishes a strict typed artifact stable by key and authored order. `LegendModule` joins `StandardAllPreset`; repeating the same module object is idempotent while same-name different objects still fail loudly.',
              },
            },
            {
              label: { zh: '布局检查器', en: 'Layout Inspector' },
              content: {
                zh: 'Flex、Grid 与 Overlay 可逐个开启辅助层；Layout 提供整图策略，Scope 提供 authored 子树策略。颜色区分最终 occurrence；margin 与固定 gap 使用间距为 12 user units 的 `/` 斜线，padding 使用反向 `\\` 斜线，三者不铺底色并以单份 dashed boundary 定界；distributed space 仅显示虚线周界，内部保持透明。box、内部结构与 spacing 共线时不重复描边。bounds、盒模型间距、固定 gap 与自由空间可独立控制；文档推荐态保留 content 边界、适用的内部结构线和固定 gap。SVG / Canvas、static / retained 与 SSR 共用独立 inspection plane，不改变主图边界、资源或命中测试。',
                en: 'Flex, Grid, and Overlay can enable overlays per occurrence. Layout supplies a whole-figure policy, while Scope supplies an authored-subtree policy. Color identifies final occurrences. Margin and fixed gaps use `/` hatches spaced 12 user units apart, while padding uses the opposite `\\` hatch; all three omit a base fill and use one dashed boundary. Distributed space shows only a dashed perimeter and keeps its interior transparent. Coincident box, family-structure, and spacing boundaries are painted once. Bounds, box spacing, fixed gaps, and distributed space are independently selectable; the docs Recommended profile keeps the content outline, applicable internal structure lines, and fixed gaps. SVG and Canvas, static and retained hosts, and SSR share an isolated inspection plane that does not change primary bounds, resources, or hit testing.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '初始化 Standard 包家族，交付 Grid、Axes、Frame 与显式 capability module / bundle / preset。',
            en: 'Initializes the Standard package family with Grid, Axes, Frame, and explicit capability modules, bundles, and presets.',
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
              label: { zh: '局部检查开关', en: 'Local inspection switches' },
              content: {
                zh: '`flexLayout()`、`gridLayout()` 与 `overlayLayout()` 的第三个参数可为当前容器开启、关闭或细化检查辅助层；省略时继承宿主策略。',
                en: 'The third argument of `flexLayout()`, `gridLayout()`, and `overlayLayout()` enables, disables, or refines the inspection overlay for that container; omission inherits the host policy.',
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
              label: { zh: '容器检查 prop', en: 'Container inspection props' },
              content: {
                zh: '`FlexLayout`、`GridLayout` 与 `OverlayLayout` 新增 `inspect` prop，可为当前 occurrence 开启、关闭或细化辅助层；省略时继承 Layout / Scope。',
                en: '`FlexLayout`, `GridLayout`, and `OverlayLayout` add an `inspect` prop that enables, disables, or refines the overlay for the current occurrence; omission inherits Layout or Scope.',
              },
            },
            {
              label: { zh: 'Legend plain-data props', en: 'Legend plain-data props' },
              content: {
                zh: '`<Legend>` 接收与 `LegendInput` 相同的 JSON-safe plain data，不提供 React children 模板；静态 Tier 2 adapter 在当前 Layout 局部贡献 `LegendDefinition`。',
                en: '`<Legend>` accepts the same JSON-safe plain data as `LegendInput` without a React children template. Its static Tier 2 adapter contributes `LegendDefinition` locally to the current Layout.',
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
