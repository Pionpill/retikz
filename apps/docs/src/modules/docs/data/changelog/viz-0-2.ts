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
            zh: '42 个 `PlotThemeToken`、随 mode 变化的默认 light/dark preset、开放 style definition、Axis scoped rules、确定性 cascade 与原生 `IRPlotTheme` 映射由 Plot 统一维护；局部 token 与 rule 走同一解析路径。',
            en: 'Plot now owns 42 `PlotThemeToken` keys, its mode-aware default light/dark preset, open style definitions, Axis-scoped rules, a deterministic cascade, and native `IRPlotTheme` mapping.',
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
                zh: 'BREAKING：发布包主题改为 owner 默认 baseline',
                en: 'BREAKING: published themes use owner default baselines',
              },
              content: {
                zh: 'Core、Plot、Chart 与 Table 不再内置命名 style；省略 `style` 时各 owner 使用自己的默认基线。文档站通过各 owner 的公开 definition / registry 注入 `academic`、`vibrant`、`clean`，不增加跨 owner registry。应用自定义 style 继续为每个实际消费 owner 提供同名 definition。',
                en: "Core, Plot, Chart, and Table no longer include named styles; omitting `style` selects each owner's default baseline. The docs site injects `academic`, `vibrant`, and `clean` through each owner's public definition and registry contracts without adding a cross-owner registry. Application-defined styles still provide same-named definitions for every consuming owner.",
              },
            },
            {
              label: {
                zh: 'BREAKING：PlotThemeToken 与 namespaced inputs',
                en: 'BREAKING: PlotThemeToken and namespaced inputs',
              },
              content: {
                zh: '`IRPlot.plotThemeTokens` 使用 `PlotThemeTokenOverridesSchema`，覆盖 surface、typography、Axis、Legend 与 palette；Plot token Definition 注册为 `plot` namespace，未知 key、错误原子、空 palette 和显式 `undefined` 都会 fail-loud。',
                en: '`IRPlot.plotThemeTokens` uses `PlotThemeTokenOverridesSchema` across surface, typography, axes, legends, and palettes. The Plot token Definition registers the `plot` namespace, so unknown keys, invalid atoms, empty palettes, and explicit `undefined` fail loudly.',
              },
            },
            {
              label: { zh: 'Guide 主色与上下文派生 token', en: 'Guide masters and contextual derived tokens' },
              content: {
                zh: '`plot.typography.foreground` 保持 string-only 主色；Plot area、Axis line/grid、tick/title 与 Legend 派生颜色可用 `[0, 1]` 权重，并在 lower 到 Core 后按最终主色与 Theme mode 确定化。数据 mark、palette、scheme 与 scale range 不继承 typography 主色。',
                en: '`plot.typography.foreground` remains a string-only master. Plot-area, Axis line/grid, tick/title, and Legend derived colors may use `[0, 1]` weights resolved after lowering into Core from the final master and Theme mode. Data marks, palettes, schemes, and scale ranges do not inherit the typography master.',
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
                zh: 'Grid 使用 `axis.grid.enabled`、`stroke`、`strokeWidth`、`drawOpacity` 与 `includeDomain` 五个扁平 token；Axis dimension 差异统一由 `plotThemeTokenRules` 表达，line、tick、tick label 与 title 也复用同一 selector。默认 baseline 与 Vibrant 默认开启 x/y grid，Clean 只开启 y grid，Academic 全部关闭；默认 baseline 的 x/y grid 还会覆盖 effective domain 端点。Axis guide 局部配置最终优先。一维坐标没有二维 Plot area，因此始终不输出 grid layer。',
                en: 'Grid uses five flat tokens: `axis.grid.enabled`, `stroke`, `strokeWidth`, `drawOpacity`, and `includeDomain`. `plotThemeTokenRules` expresses Axis-dimension differences for grid, line, ticks, tick labels, and titles through one selector. The default baseline and Vibrant enable x/y grids, Clean enables y-grid only, and Academic disables grids; default-baseline x/y grids also include effective-domain endpoints. Local Axis guide configuration wins last. One-dimensional coordinates have no two-dimensional Plot area and therefore never emit a grid layer.',
              },
            },
            {
              label: {
                zh: 'Axis 主网格可包含 effective domain 端点',
                en: 'Axis major grids can include effective-domain endpoints',
              },
              content: {
                zh: '`grid.includeDomain` 可在常规来源与密度解析后追加缺失的最终 scale domain 首尾位置，并按投影坐标去重；guide 局部默认关闭，不改变轴 tick，也不为次网格追加端点。`axis.grid.includeDomain` 将同一默认接入 Theme cascade，默认 baseline 的 x/y grid 默认开启，端点 token 本身不会创建 grid。',
                en: '`grid.includeDomain` appends missing final scale-domain endpoints after normal source and density resolution and deduplicates by projected coordinate. Its guide-local default is disabled, and it changes neither axis ticks nor minor grids. `axis.grid.includeDomain` brings the same default into the Theme cascade: the default baseline enables it for x/y grids, while the endpoint token never creates a grid by itself.',
              },
            },
            {
              label: {
                zh: 'Axis 标题可见性与间距进入主题 token',
                en: 'Axis title visibility and spacing join theme tokens',
              },
              content: {
                zh: '新增 `axis.title.enabled` 与 `axis.title.padding`。默认 baseline 与本站 Academic / Vibrant reference 默认显示已有 Axis title，Clean reference 默认隐藏；全局 token、dimension rule 或结构化 `plotTheme.axis.title` 可重新开启。四种预览风格的 title padding 均为 `12`。',
                en: "Adds `axis.title.enabled` and `axis.title.padding`. The default baseline and the site's Academic / Vibrant references show authored Axis titles by default, while the Clean reference hides them; global tokens, dimension rules, or structured `plotTheme.axis.title` can enable them again. Title padding remains `12` in all four preview styles.",
              },
            },
            {
              label: {
                zh: 'Vibrant 绘图区表面',
                en: 'Vibrant Plot-area surface',
              },
              content: {
                zh: '本站 Vibrant reference preset 在 Light 下使用 `#E5ECF6`，在 Dark 下使用 `#111111`；默认 baseline 与本站其它 reference 继续保持透明绘图区。',
                en: "The site's Vibrant reference preset uses `#E5ECF6` in Light mode and `#111111` in Dark mode; the default baseline and the site's other references keep transparent Plot areas.",
              },
            },
            {
              label: {
                zh: 'BREAKING：Plot presentation 上移 Chart',
                en: 'BREAKING: Plot presentation moves to Chart',
              },
              content: {
                zh: '`IRPlot` 删除顶层 `layout` 与 `labels`，Plot theme 删除 `labelText` 和 `plot.label.*`；标题、说明、来源等完整图表内容改由 Chart presentation 通过 Standard 与唯一 Plot body 组合。Axis、Legend、Facet、datum、mark、reference 与 annotation 文本保持 Plot-owned。',
                en: '`IRPlot` removes top-level `layout` and `labels`, while Plot theme removes `labelText` and `plot.label.*`. Complete-chart titles, notes, and sources now belong to Chart presentation, composed with the single Plot body through Standard. Axis, Legend, Facet, datum, mark, reference, and annotation text remain Plot-owned.',
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
                zh: 'Chart Theme 改为按 owner 分片：Source 的 `theme.tokens.chart` 只由 Chart shell 消费，`theme.tokens.plot` 交给 Plot，`theme.tokens.recipe` 由当前 chartType schema 校验并消费；运行时 Definition 仍通过各自 owner 接入同一 Core registry。',
                en: 'Chart Theme is split by owner: Source `theme.tokens.chart` is consumed by the Chart shell, `theme.tokens.plot` by Plot, and `theme.tokens.recipe` is validated and consumed by the current chartType schema. Runtime Definitions still enter the shared Core registry through their respective owners.',
              },
            },
            {
              label: {
                zh: 'Relation 支持投影端点图元',
                en: 'Relation supports projected endpoint glyphs',
              },
              content: {
                zh: 'Path Relation 可在投影后的 source / target 上输出 Point 视觉端点；connector 始终先绘制，两个端点随后绘制。任一必要坐标无效时，同一 datum 的 connector 与两个端点原子跳过，同时保留原 datum provenance 且不重复注册 datum id。',
                en: 'Path relations can emit Point-style glyphs at projected source and target coordinates, drawing the connector before both endpoints. If any required coordinate is invalid, the connector and both endpoints for that datum are skipped atomically while preserving datum provenance without duplicate datum-id registration.',
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
        zh: 'Plot 的 React authoring 与 runtime 继续复用 canonical IRPlot，并新增等价的主题 token 转发面。',
        en: 'React authoring and runtime continue to use the canonical IRPlot and add an equivalent theme-token forwarding surface.',
      },
      highlights: [
        {
          label: { zh: 'React PlotTheme parity', en: 'React PlotTheme parity' },
          content: {
            zh: '`<Plot plotThemeTokens={...} plotThemeTokenRules={...}>` 与 spec 输入生成同一 canonical IRPlot；standalone 与 embedded 都复用 Plot resolver，adapter 不维护 selector、preset 或 merge。',
            en: '`<Plot plotThemeTokens={...} plotThemeTokenRules={...}>` and spec authoring produce the same canonical IRPlot; standalone and embedded paths reuse the Plot resolver without adapter-owned selectors, presets, or merging.',
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
            zh: 'Vanilla/SSR 通过共享 IRPlot 消费 namespaced token 主链，并同步拒绝已删除的 Plot-level `layout` 与 `labels`；`renderPlot(spec, data, { theme })` 的 `theme` 位于根 Scene。',
            en: 'Vanilla and SSR consume the namespaced token pipeline through the shared IRPlot and reject the removed Plot-level `layout` and `labels`; `renderPlot(spec, data, { theme })` applies `theme` to the root Scene.',
          },
          items: [],
        },
      ],
    },
  ],
};
