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
            zh: '`Grid`、`Axes` 与 `Frame` 分别保存规则网格、静态数学坐标轴和带 Node-like header 的可视分组语义；lowering 后只产生既有 Core Path、Node 与 Scope。',
            en: '`Grid`, `Axes`, and `Frame` preserve rule-based grids, static mathematical axes, and bordered groups with Node-like headers; lowering emits only existing Core Path, Node, and Scope IR.',
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
            zh: '新增三种通用布局容器、公共 LayoutItem、typed artifacts、布局 capability preset 与开发期布局检查器。',
            en: 'Adds three general layout containers, shared LayoutItem vocabulary, typed artifacts, a layout capability preset, and a development-time Layout Inspector.',
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
                zh: '每种容器返回 strict JSON artifact，记录 container、items 与 line / track / paint order 结果；`StandardLayoutPreset` 可只装载布局 definitions，`StandardAllPreset` 同步纳入三项能力。',
                en: 'Each container returns a strict JSON artifact with container, item, and line, track, or paint-order results. `StandardLayoutPreset` loads only layout definitions, while `StandardAllPreset` now includes all three.',
              },
            },
            {
              label: { zh: '布局检查器', en: 'Layout Inspector' },
              content: {
                zh: 'Flex、Grid 与 Overlay 可逐个开启辅助层；Layout 提供整图策略，Scope 提供 authored 子树策略。SVG / Canvas、static / retained 与 SSR 共用独立 inspection plane，不改变主图边界、资源或命中测试。',
                en: 'Flex, Grid, and Overlay can enable overlays per occurrence. Layout supplies a whole-figure policy, while Scope supplies an authored-subtree policy. SVG and Canvas, static and retained hosts, and SSR share an isolated inspection plane that does not change primary bounds, resources, or hit testing.',
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
            zh: '新增三种布局 builder、对应 adapters 与无 DOM 的嵌套编译 / SSR 接线。',
            en: 'Adds three layout builders, their adapters, and DOM-free nested compilation and SSR wiring.',
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
            zh: '新增 FlexLayout、GridLayout、OverlayLayout 与只能作为直属语义 child 的 LayoutItem。',
            en: 'Adds FlexLayout, GridLayout, OverlayLayout, and LayoutItem as their direct semantic child.',
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
