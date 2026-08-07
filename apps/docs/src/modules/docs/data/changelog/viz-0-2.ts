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
        zh: 'Plot v0.2 交付 namespaced Theme token contract：Plot 独立拥有 token、preset、解析、映射和 inspection，并通过 Core registry 消费 inherited Theme 与 shared colors。',
        en: 'Plot v0.2 delivers the namespaced Theme token contract: Plot owns its tokens, presets, resolution, mapping, and inspection through the Core registry while consuming inherited Theme and shared colors.',
      },
      highlights: [
        {
          label: { zh: 'Plot-owned 主题主链', en: 'Plot-owned theme pipeline' },
          content: {
            zh: '40 个 `PlotThemeToken`、四种 style × light/dark preset、确定性 cascade 与原生 `IRPlotTheme` 映射由 Plot 统一维护；inherited `tokens.plot`、局部 `plotThemeTokens` 与 Chart 转发的 Plot 输入走同一解析路径。',
            en: 'Plot now owns 40 `PlotThemeToken` keys, four style presets in light and dark modes, a deterministic cascade, and native `IRPlotTheme` mapping. Inherited `tokens.plot`, local `plotThemeTokens`, and Chart-forwarded Plot inputs use the same resolution path.',
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
            zh: '收回 Plot surface、guide、label 与 palette token 所有权，并让 Chart 只转发 Plot 公开主题输入。',
            en: 'Moves surface, guide, label, and palette token ownership into Plot and leaves Chart to forward Plot theme inputs.',
          },
          items: [
            {
              label: {
                zh: 'BREAKING：PlotThemeToken 与 namespaced inputs',
                en: 'BREAKING: PlotThemeToken and namespaced inputs',
              },
              content: {
                zh: '`PlotSpec.plotThemeTokens` 使用 `PlotThemeTokenOverridesSchema`，覆盖 surface、typography、label、Axis、Legend 与 palette；Plot token Definition 注册为 `plot` namespace，未知 key、错误原子、空 palette 和显式 `undefined` 都会 fail-loud。',
                en: '`PlotSpec.plotThemeTokens` uses `PlotThemeTokenOverridesSchema` across surface, typography, labels, axes, legends, and palettes. The Plot token Definition registers the `plot` namespace, so unknown keys, invalid atoms, empty palettes, and explicit `undefined` fail loudly.',
              },
            },
            {
              label: { zh: 'Theme 继承与 scheme 消费统一', en: 'Unified Theme inheritance and scheme consumption' },
              content: {
                zh: 'Plot Composite 消费 Core effective Theme；先合并 shared categorical 与 inherited `tokens.plot`，再应用 local `plotThemeTokens`、`colors`、`plotTheme`。palette 中的 sequential/diverging scheme 与显式 scale 共用内置和 `options.colorSchemes` lookup，未注册名称在实际消费时抛错。',
                en: 'Plot composites consume the effective Core Theme, merging shared categorical colors and inherited `tokens.plot` before local `plotThemeTokens`, `colors`, and `plotTheme`. Sequential and diverging palette schemes share the built-in and `options.colorSchemes` lookup used by explicit scales, and unknown names fail when consumed.',
              },
            },
            {
              label: { zh: 'Chart 所有权边界调整', en: 'Chart ownership boundary adjusted' },
              content: {
                zh: 'Chart 只拥有 `chartThemeTokens` 的 presentation/recipe namespace，并原样转发 Plot owner 的 `plotThemeTokens`、`colors` 与 `plotTheme`；Chart 与 Plot 通过各自 Definition 接入同一 Core registry。',
                en: 'Chart owns only the `chartThemeTokens` presentation/recipe namespace and forwards Plot-owned `plotThemeTokens`, `colors`, and `plotTheme` unchanged. Chart and Plot enter the same Core registry through their respective Definitions.',
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
            zh: '`<Plot plotThemeTokens={...}>` 与 spec 输入生成同一 `IRPlotSpec.plotThemeTokens`；standalone 与 embedded 的 `<Plot theme>` 都是面板局部 Core Scope，adapter 不维护 preset、merge 或默认值。',
            en: '`<Plot plotThemeTokens={...}>` and spec authoring produce the same `IRPlotSpec.plotThemeTokens`; `<Plot theme>` is a panel-local Core Scope in both standalone and embedded paths, and the adapter owns no presets, merging, or defaults.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-08-07',
          summary: {
            zh: 'React Plot 接入 Plot-owned `plotThemeTokens`，并保持 standalone/embedded 的 Core Theme 与 spec override/runtime 转发一致。',
            en: 'Connects React Plot to Plot-owned `plotThemeTokens` while keeping Core Theme and spec override/runtime forwarding consistent across standalone and embedded paths.',
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
            zh: 'Vanilla/SSR 通过共享 PlotSpec 消费 namespaced token 主链；`renderPlot(spec, data, { theme })` 的 `theme` 位于根 Scene，而非 Plot spec-local 字段。',
            en: 'Vanilla and SSR consume the namespaced token pipeline through the shared PlotSpec; `renderPlot(spec, data, { theme })` applies `theme` to the root Scene rather than to a Plot-spec-local field.',
          },
          items: [],
        },
      ],
    },
  ],
};
