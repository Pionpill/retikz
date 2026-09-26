import type { Release } from '../types';

/** Extension 首个 alpha 版本的变更 */
export const extensionV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/extension',
      version: 'v0.1',
      description: {
        zh: '官方节点形状、箭头、裁剪、流带定义与动画预设，统一从包根按需导入。',
        en: 'Optional node shapes, arrows, clips, ribbons, and animation presets, all imported from the package root.',
      },
      highlights: [
        {
          label: { zh: '独立官方扩展包', en: 'Independent official extension package' },
          content: {
            zh: '原 Standard 扩展子入口迁至 @retikz/extension 根入口。集合与名称常量采用 Extension 前缀，扩展错误使用 RetikzExtensionError；绘图输入、注册 key 与渲染行为保持不变。所有包和文档消费者同步迁移，不保留旧入口或别名。',
            en: 'Standard provider subpaths move to the @retikz/extension root. Collections and name constants use the Extension prefix; extension errors use RetikzExtensionError. Drawing inputs, registration keys, and rendering behavior are unchanged. Package and docs consumers migrate together, with no old entry points or aliases.',
          },
        },
        {
          label: { zh: '动画效果预设', en: 'Animation effect presets' },
          content: {
            zh: 'grow、growUp、pulse、spin、flash、blink、wiggle 及专属选项统一从 Extension 根入口导入，替代原 Core 效果预设入口。Core 保留基础预设与通用轨道工具；效果默认值、已保存轨道 JSON 和播放机制不变。',
            en: 'Import grow, growUp, pulse, spin, flash, blink, wiggle and their options from the Extension root instead of their former Core entry. Core retains basic presets and track utilities; defaults, saved track JSON, and playback are unchanged.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-09-22',
          summary: {
            zh: '首次提供独立的官方节点形状、箭头、裁剪、Ribbon 与动画效果预设；依赖 Kernel 0.5.0-alpha.5，统一根入口，不自动注册，无独立 React / Vanilla 适配包。',
            en: 'Introduces independent official node shapes, arrows, clips, Ribbon, and animation effect presets. Depends on Kernel 0.5.0-alpha.5, with one root entry, no automatic registration, and no separate React or Vanilla adapters.',
          },
          items: [],
        },
      ],
    },
  ],
};
