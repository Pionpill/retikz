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
      ],
      subVersions: [
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
        zh: 'Standard 的无框架 authoring：提供 Grid、Axes、Frame builders、显式 adapters 与全量便利数组。',
        en: 'Framework-free Standard authoring with Grid, Axes, and Frame builders, explicit adapters, and an all-capabilities convenience array.',
      },
      highlights: [
        {
          label: { zh: '显式 Vanilla 接线', en: 'Explicit Vanilla wiring' },
          content: {
            zh: '`grid()`、`axes()`、`frame()` 构造与 Standard schema 一致的输入；`StandardVanillaAdapters` 是浅冻结的当前版本全量数组，部分加载仍可逐项传入。',
            en: '`grid()`, `axes()`, and `frame()` construct inputs governed by the Standard schemas. `StandardVanillaAdapters` is a shallow-frozen full array for this release, while partial loading remains explicit.',
          },
        },
      ],
      subVersions: [
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
        zh: 'Standard 的 React authoring：以静态 Tier 2 adapter 提供 Grid、Axes、Frame 及 Node-like header JSX。',
        en: 'React authoring for Standard with Grid, Axes, Frame, and Node-like header JSX backed by static Tier 2 adapters.',
      },
      highlights: [
        {
          label: { zh: '按使用项贡献', en: 'Per-use contribution' },
          content: {
            zh: '组件只在当前 `Layout` 中按实际使用项贡献 definition；导入包不会注册全局状态。`FrameTitle` / `FrameDescription` 复用公开 Node authoring，并对非法组合 fail-loud。',
            en: 'Components contribute definitions only for capabilities used by the current `Layout`; importing the package creates no global state. `FrameTitle` and `FrameDescription` reuse public Node authoring and fail loudly on invalid composition.',
          },
        },
      ],
      subVersions: [
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
