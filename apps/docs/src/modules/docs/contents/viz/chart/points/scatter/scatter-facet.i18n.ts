import type { Lang } from '@/i18n';

/** 分面散点示例的可见文案 */
export const scatterFacetI18n: Record<Lang, { title: string; subtitle: string; data: string }> = {
  zh: {
    title: '按收入组比较分布',
    subtitle: '2022 年；HIC 高收入、UMC 中高收入、LMC 中低收入、LIC 低收入',
    data: '经济体数据',
  },
  en: {
    title: 'Compare distributions by income group',
    subtitle: '2022; HIC high, UMC upper-middle, LMC lower-middle, LIC low income',
    data: 'Economy data',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    header: '分面标题',
    panelGap: '面板间距',
    size: '点半径',
    opacity: '不透明度',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    header: 'Facet headers',
    panelGap: 'Panel gap',
    size: 'Point radius',
    opacity: 'Opacity',
  },
} satisfies Record<Lang, Record<string, string>>;
