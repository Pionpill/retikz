import type { Release } from '../types';

/** Extension 首个开发中版本的变更 */
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
          label: { zh: '未发布 · 从 Standard 拆分', en: 'Unreleased · Split from Standard' },
          content: {
            zh: '原 Standard 扩展子入口迁至 @retikz/extension 根入口。集合与名称常量采用 Extension 前缀，扩展错误使用 RetikzExtensionError；绘图输入、注册 key 与渲染行为保持不变。所有包和文档消费者同步迁移，不保留旧入口或别名。',
            en: 'Standard provider subpaths move to the @retikz/extension root. Collections and name constants use the Extension prefix; extension errors use RetikzExtensionError. Drawing inputs, registration keys, and rendering behavior are unchanged. Package and docs consumers migrate together, with no old entry points or aliases.',
          },
        },
        {
          label: { zh: '未发布 · 动画预设', en: 'Unreleased · Animation presets' },
          content: {
            zh: 'grow、growUp、pulse、spin、flash、blink、wiggle 及专属选项从 Standard 迁至 Extension 根入口。Core 保留基础预设与通用轨道工具；效果默认值、已保存轨道 JSON 和播放机制不变，旧 Standard 导入不再保留。Kernel 与 Extension 双语文档和 API 参考同步按归属拆分。',
            en: 'grow, growUp, pulse, spin, flash, blink, wiggle and their options move from Standard to the Extension root. Core retains basic presets and track utilities. Defaults, saved track JSON and playback are unchanged; old Standard imports are removed. Bilingual Kernel and Extension guides and API references follow their owners.',
          },
        },
      ],
      subVersions: [],
    },
  ],
};
