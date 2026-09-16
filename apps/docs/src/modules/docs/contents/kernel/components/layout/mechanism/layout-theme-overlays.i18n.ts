import type { Lang } from '@/i18n';

export const layoutThemeOverlaysI18n = {
  zh: {
    layers: '主题来源',
    layersNote: 'Provider / 输入 / prop',
    merge: '按顺序逐字段覆盖',
    mergeNote: '省略字段继续继承',
    theme: 'Scene 主题',
    themeNote: '供 Composite 消费',
  },
  en: {
    layers: 'Theme sources',
    layersNote: 'Provider / input / prop',
    merge: 'Overlay each field',
    mergeNote: 'Omitted fields inherit',
    theme: 'Scene theme',
    themeNote: 'Consumed by Composites',
  },
} satisfies Record<Lang, Record<string, string>>;
