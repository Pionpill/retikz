import type { Lang } from '@/i18n';

/** 示例的双语标题与读图说明 */
export const bubbleMarksI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '轮廓气泡保留人口尺寸', subtitle: 'Gapminder 2007；用替换图元改变轮廓，不改变人口映射' },
  en: {
    title: 'Outlined bubbles retain population size',
    subtitle: 'Gapminder 2007; replace appearance without changing the size field',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    fillOpacity: '图元填充不透明度',
    strokeWidth: '线宽',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    fillOpacity: 'Mark fill opacity',
    strokeWidth: 'Stroke width',
  },
} satisfies Record<Lang, Record<string, string>>;
