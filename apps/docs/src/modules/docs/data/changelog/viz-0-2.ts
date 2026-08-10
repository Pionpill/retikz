import type { Release } from '../types';

/** Viz v0.2 开发中里程碑 */
export const vizV02: Release = {
  minor: 'v0.2',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/plot',
      stableDate: null,
      version: 'v0.2',
      description: {
        zh: 'Plot v0.2 交付 owner-local Theme token contract：Plot 独立拥有 token、preset、解析、映射和 inspection，并消费 Core 解析后的 Theme。',
        en: 'Plot v0.2 delivers an owner-local Theme token contract: Plot owns its tokens, presets, resolution, mapping, and inspection while consuming the resolved Core Theme.',
      },
      highlights: [
        {
          label: { zh: 'Plot-owned 主题主链', en: 'Plot-owned theme pipeline' },
          content: {
            zh: '41 个 `PlotThemeToken`、四种 style × light/dark preset、Axis scoped rules、确定性 cascade 与原生 `IRPlotTheme` 映射由 Plot 统一维护；局部 token 与 rule 走同一解析路径。',
            en: 'Plot now owns 41 `PlotThemeToken` keys, four style presets in light and dark modes, Axis-scoped rules, a deterministic cascade, and native `IRPlotTheme` mapping.',
          },
        },
        {
          label: { zh: '严格、可解释的主题输入', en: 'Strict, inspectable theme inputs' },
          content: {
            zh: '`plotThemeTokens` 是严格稀疏覆盖；Core shared categorical、inherited Plot namespace、`colors` 与原生 `plotTheme` 按固定 cascade 解析，显式 scale / guide / mark 配置最终优先。',
            en: '`plotThemeTokens` is a strict sparse override. Core shared categorical colors, the inherited Plot namespace, `colors`, and native `plotTheme` resolve in a fixed cascade, with explicit scale, guide, and mark configuration winning last.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-08-07',
          summary: {
            zh: '收回 Plot surface、guide 与 palette token 所有权，并把完整图表 presentation 统一交由 Chart。',
            en: 'Moves surface, guide, and palette token ownership into Plot while assigning complete-chart presentation to Chart.',
          },
          items: [
            {
              label: {
                zh: 'BREAKING：PlotThemeToken 与 namespaced inputs',
                en: 'BREAKING: PlotThemeToken and namespaced inputs',
              },
              content: {
                zh: '`PlotSpec.plotThemeTokens` 使用 `PlotThemeTokenOverridesSchema`，覆盖 surface、typography、Axis、Legend 与 palette；Plot token Definition 注册为 `plot` namespace，未知 key、错误原子、空 palette 和显式 `undefined` 都会 fail-loud。',
                en: '`PlotSpec.plotThemeTokens` uses `PlotThemeTokenOverridesSchema` across surface, typography, axes, legends, and palettes. The Plot token Definition registers the `plot` namespace, so unknown keys, invalid atoms, empty palettes, and explicit `undefined` fail loudly.',
              },
            },
            {
              label: {
                zh: 'BREAKING：绘图区主题收敛为 plotArea.fill',
                en: 'BREAKING: plot-area theme moves to plotArea.fill',
              },
              content: {
                zh: '`PlotThemeToken.PlotSurfaceFill` / `plot.surface.fill` 改名为 `PlotAreaFill` / `plot.area.fill`；结构化字段从 `IRPlotTheme.background` 改为 `IRPlotTheme.plotArea.fill`。它只填充二维坐标中扣除 axis、legend 与布局预留后的有效绘图区，坐标轴标签区、facet 间隙和外围 Chart canvas 保持透明；一维坐标不生成绘图区。',
                en: '`PlotThemeToken.PlotSurfaceFill` / `plot.surface.fill` is renamed to `PlotAreaFill` / `plot.area.fill`, and the structured field moves from `IRPlotTheme.background` to `IRPlotTheme.plotArea.fill`. It fills only the effective two-dimensional plotting area after axis, legend, and layout reserves are removed, leaving axis-label regions, facet gaps, and the outer Chart canvas transparent; one-dimensional coordinates do not emit a Plot area.',
              },
            },
            {
              label: {
                zh: 'BREAKING：Axis grid 收敛为统一主题契约',
                en: 'BREAKING: Axis grid moves to one theme contract',
              },
              content: {
                zh: 'Grid 使用 `axis.grid.enabled`、`stroke`、`strokeWidth` 与 `drawOpacity` 四个扁平 token；Axis dimension 差异统一由 `plotThemeTokenRules` 表达，line、tick、tick label 与 title 也复用同一 selector。Neutral 与 Clean 默认只开启 y grid，Vibrant 开启 x/y grid，Academic 全部关闭；Axis guide 局部配置最终优先。一维坐标没有二维 Plot area，因此始终不输出 grid layer。',
                en: 'Grid uses four flat tokens: `axis.grid.enabled`, `stroke`, `strokeWidth`, and `drawOpacity`. `plotThemeTokenRules` expresses Axis-dimension differences for grid, line, ticks, tick labels, and titles through one selector. Neutral and Clean enable y-grid only, Vibrant enables x/y-grid, and Academic disables grids; local Axis guide configuration wins last. One-dimensional coordinates have no two-dimensional Plot area and therefore never emit a grid layer.',
              },
            },
            {
              label: {
                zh: 'Axis 主网格可包含 effective domain 端点',
                en: 'Axis major grids can include effective-domain endpoints',
              },
              content: {
                zh: '`grid.includeDomainEndpoints` 可在常规来源与密度解析后追加缺失的最终 scale domain 首尾位置，并按投影坐标去重；默认关闭，不改变轴 tick，不为次网格追加端点，也不进入 Theme。',
                en: '`grid.includeDomainEndpoints` appends missing final scale-domain endpoints after normal source and density resolution and deduplicates by projected coordinate. It is disabled by default, does not change axis ticks or add endpoints to minor grids, and does not enter Theme.',
              },
            },
            {
              label: {
                zh: 'Axis 标题可见性与间距进入主题 token',
                en: 'Axis title visibility and spacing join theme tokens',
              },
              content: {
                zh: '新增 `axis.title.enabled` 与 `axis.title.padding`。Neutral、Academic、Vibrant 默认显示已有 Axis title，Clean 默认隐藏；全局 token、dimension rule 或结构化 `plotTheme.axis.title` 可重新开启。四种风格的 title padding 均为 `12`。',
                en: 'Adds `axis.title.enabled` and `axis.title.padding`. Neutral, Academic, and Vibrant show authored Axis titles by default, while Clean hides them; global tokens, dimension rules, or structured `plotTheme.axis.title` can enable them again. Title padding remains `12` in every style.',
              },
            },
            {
              label: {
                zh: 'Vibrant 绘图区表面',
                en: 'Vibrant Plot-area surface',
              },
              content: {
                zh: '内建 Vibrant preset 在 Light 下使用 `#E5ECF6`，在 Dark 下使用 `#111111`；其他内建风格继续保持透明绘图区。',
                en: 'The built-in Vibrant preset uses `#E5ECF6` in Light mode and `#111111` in Dark mode; the other built-in styles keep transparent Plot areas.',
              },
            },
            {
              label: {
                zh: 'BREAKING：Plot presentation 上移 Chart',
                en: 'BREAKING: Plot presentation moves to Chart',
              },
              content: {
                zh: '`PlotSpec` 删除顶层 `layout` 与 `labels`，Plot theme 删除 `labelText` 和 `plot.label.*`；标题、说明、来源等完整图表内容改由 Chart presentation 通过 Standard 与唯一 Plot body 组合。Axis、Legend、Facet、datum、mark、reference 与 annotation 文本保持 Plot-owned。',
                en: '`PlotSpec` removes top-level `layout` and `labels`, while Plot theme removes `labelText` and `plot.label.*`. Complete-chart titles, notes, and sources now belong to Chart presentation, composed with the single Plot body through Standard. Axis, Legend, Facet, datum, mark, reference, and annotation text remain Plot-owned.',
              },
            },
            {
              label: { zh: 'Theme 继承与 scheme 消费统一', en: 'Unified Theme inheritance and scheme consumption' },
              content: {
                zh: 'Plot Composite 消费 Core effective Theme 选择领域 preset，再应用 local `plotThemeTokens`、`colors`、`plotTheme`。palette 中的 sequential/diverging scheme 与显式 scale 共用内置和 `options.colorSchemes` lookup，未注册名称在实际消费时抛错。',
                en: 'Plot composites consume the effective Core Theme to select their domain preset before applying local `plotThemeTokens`, `colors`, and `plotTheme`. Sequential and diverging palette schemes share the built-in and `options.colorSchemes` lookup used by explicit scales, and unknown names fail when consumed.',
              },
            },
            {
              label: { zh: 'Chart 所有权边界调整', en: 'Chart ownership boundary adjusted' },
              content: {
                zh: 'Chart 只拥有 `chartThemeTokens` 的 presentation/recipe namespace，并原样转发 Plot owner 的 `plotThemeTokens`、`plotThemeTokenRules` 与 `plotTheme`；Chart 与 Plot 通过各自 Definition 接入同一 Core registry。',
                en: 'Chart owns only the `chartThemeTokens` presentation/recipe namespace and forwards Plot-owned `plotThemeTokens`, `plotThemeTokenRules`, and `plotTheme` unchanged. Chart and Plot enter the same Core registry through their respective Definitions.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/plot-react',
      stableDate: null,
      version: 'v0.2',
      description: {
        zh: 'Plot 的 React authoring 与 runtime 继续复用 canonical PlotSpec，并新增等价的主题 token 转发面。',
        en: 'React authoring and runtime continue to use the canonical PlotSpec and add an equivalent theme-token forwarding surface.',
      },
      highlights: [
        {
          label: { zh: 'React PlotTheme parity', en: 'React PlotTheme parity' },
          content: {
            zh: '`<Plot plotThemeTokens={...} plotThemeTokenRules={...}>` 与 spec 输入生成同一 canonical PlotSpec；standalone 与 embedded 都复用 Plot resolver，adapter 不维护 selector、preset 或 merge。',
            en: '`<Plot plotThemeTokens={...} plotThemeTokenRules={...}>` and spec authoring produce the same canonical PlotSpec; standalone and embedded paths reuse the Plot resolver without adapter-owned selectors, presets, or merging.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-08-07',
          summary: {
            zh: 'React Plot 接入 Plot-owned `plotThemeTokens`，保持 standalone/embedded 主题一致，并删除 Plot-level `layout`、`TitleLabel` 与 `CaptionLabel` authoring。',
            en: 'Connects React Plot to Plot-owned `plotThemeTokens`, keeps standalone and embedded themes aligned, and removes Plot-level `layout`, `TitleLabel`, and `CaptionLabel` authoring.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/plot-vanilla',
      stableDate: null,
      version: 'v0.2',
      description: {
        zh: 'Plot 的 plain authoring、嵌入与 SSR 直接保留 canonical `plotThemeTokens`，并区分 host Core Theme 与 Plot owner 主题语义。',
        en: 'Plain authoring, embedding, and SSR preserve canonical `plotThemeTokens` while keeping host Core Theme semantics distinct from Plot-owned theme inputs.',
      },
      highlights: [
        {
          label: { zh: 'Plain JSON parity', en: 'Plain JSON parity' },
          content: {
            zh: '`plot()` 保留 strict token map，并与 React、手写 JSON 和 shared lowering 得到等价结果。',
            en: '`plot()` preserves the strict token map and stays equivalent to React, authored JSON, and the shared lowering path.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-08-07',
          summary: {
            zh: 'Vanilla/SSR 通过共享 PlotSpec 消费 namespaced token 主链，并同步拒绝已删除的 Plot-level `layout` 与 `labels`；`renderPlot(spec, data, { theme })` 的 `theme` 位于根 Scene。',
            en: 'Vanilla and SSR consume the namespaced token pipeline through the shared PlotSpec and reject the removed Plot-level `layout` and `labels`; `renderPlot(spec, data, { theme })` applies `theme` to the root Scene.',
          },
          items: [],
        },
      ],
    },
  ],
};
