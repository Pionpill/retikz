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
        zh: 'Plot v0.2 从领域主题所有权开始：Plot 独立拥有 token、preset、解析、映射和 inspection，并统一消费 Core Theme 环境。',
        en: 'Plot v0.2 starts with domain theme ownership: Plot owns its tokens, presets, resolution, mapping, and inspection while consuming the shared Core Theme environment.',
      },
      highlights: [
        {
          label: { zh: 'Plot-owned 主题主链', en: 'Plot-owned theme pipeline' },
          content: {
            zh: '40 个 canonical token、四种 style × light/dark preset、确定性 cascade 与原生 `IRPlotTheme` 映射由 Plot 统一维护；直接 Plot 与 Chart 内 Plot 走同一解析路径。',
            en: 'Plot now owns 40 canonical tokens, four style presets in light and dark modes, a deterministic cascade, and native `IRPlotTheme` mapping. Direct and Chart-hosted plots use the same resolution path.',
          },
        },
        {
          label: { zh: '严格、可解释的主题输入', en: 'Strict, inspectable theme inputs' },
          content: {
            zh: '`styleTokens` 是严格稀疏覆盖；`colors` 与原生 `theme` 保持兼容，并按 Core Theme → preset → token → colors → theme → 局部配置的顺序解析。',
            en: '`styleTokens` is a strict sparse override. Existing `colors` and native `theme` inputs remain supported and resolve after Core Theme, preset, and token layers, before local configuration.',
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
              label: { zh: '新增 canonical styleTokens', en: 'Canonical styleTokens added' },
              content: {
                zh: '`PlotSpec.styleTokens` 使用闭合 token schema，覆盖 surface、typography、label、Axis、Legend 与 palette；未知 key、错误原子、空 palette 和显式 `undefined` 都会 fail-loud。',
                en: '`PlotSpec.styleTokens` uses a closed token schema spanning surface, typography, labels, axes, legends, and palettes. Unknown keys, invalid atoms, empty palettes, and explicit `undefined` fail loudly.',
              },
            },
            {
              label: { zh: 'Theme 继承与 scheme 消费统一', en: 'Unified Theme inheritance and scheme consumption' },
              content: {
                zh: 'Plot Composite 消费 Core effective Theme；palette 中的 sequential/diverging scheme 与显式 scale 共用内置和 `options.colorSchemes` lookup，未注册名称在实际消费时抛错。',
                en: 'Plot composites consume the effective Core Theme. Sequential and diverging palette schemes share the built-in and `options.colorSchemes` lookup used by explicit scales, and unknown names fail when consumed.',
              },
            },
            {
              label: { zh: 'Chart 所有权边界调整', en: 'Chart ownership boundary adjusted' },
              content: {
                zh: 'Chart 删除 spec-local `style` / `themeMode` 与 Plot token 副本，只保留 Chart presentation/recipe token，并原样转发 `plotStyleTokens`、`colors` 与原生 `theme`。',
                en: 'Chart removes spec-local `style` / `themeMode` and duplicated Plot tokens, retaining only Chart presentation and recipe tokens while forwarding `plotStyleTokens`, `colors`, and native `theme` unchanged.',
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
          label: { zh: 'React styleTokens parity', en: 'React styleTokens parity' },
          content: {
            zh: '`<Plot styleTokens={...}>` 与 spec 输入生成同一 `IRPlotSpec.styleTokens`；adapter 不维护 preset、merge 或默认值。',
            en: '`<Plot styleTokens={...}>` and spec authoring produce the same `IRPlotSpec.styleTokens`; the adapter owns no presets, merging, or defaults.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-08-07',
          summary: {
            zh: 'React Plot 接入 Plot-owned `styleTokens`，并保持 spec override 与 runtime 转发一致。',
            en: 'Connects React Plot to Plot-owned `styleTokens` with consistent spec overrides and runtime forwarding.',
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
        zh: 'Plot 的 plain authoring、嵌入与 SSR 直接保留 canonical `styleTokens`，不引入无框架专属主题语义。',
        en: 'Plain authoring, embedding, and SSR preserve canonical `styleTokens` directly without framework-specific theme semantics.',
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
            zh: 'Vanilla/SSR 通过共享 PlotSpec 自动消费新的主题 token 主链。',
            en: 'Vanilla and SSR consume the new theme-token pipeline through the shared PlotSpec.',
          },
          items: [],
        },
      ],
    },
  ],
};
