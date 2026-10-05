import type { Lang } from '@/i18n';

/** 示例的双语标题与读图说明 */
export const regressionFacetI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '分别观察三个物种的趋势', subtitle: '每个面板只使用当前物种的数据进行拟合' },
  en: {
    title: 'Inspect the trend within each species',
    subtitle: 'Each panel fits only the rows belonging to its species',
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
    strokeWidth: '线宽',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    header: 'Facet headers',
    panelGap: 'Panel gap',
    size: 'Point radius',
    strokeWidth: 'Stroke width',
  },
} satisfies Record<Lang, Record<string, string>>;
