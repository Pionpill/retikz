import type { Lang } from '@/i18n';
/** 示例的双语标题与读图说明 */
export const bubbleFacetI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '按洲比较收入、寿命与人口', subtitle: '五个面板共享尺度；人口仍决定气泡大小' },
  en: {
    title: 'Compare income, longevity and population by continent',
    subtitle: 'Five panels share scales; population still controls bubble size',
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
    fillOpacity: '填充不透明度',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    header: 'Facet headers',
    panelGap: 'Panel gap',
    fillOpacity: 'Fill opacity',
  },
} satisfies Record<Lang, Record<string, string>>;
