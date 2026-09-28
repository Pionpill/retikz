import type { Lang } from '@/i18n';

/** 散点图元示例文案 */
export const scatterMarksI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: {
    title: '替换散点图元',
    subtitle: '100 部电影；调整散点半径与不透明度',
  },
  en: {
    title: 'Replace scatter marks',
    subtitle: '100 films; adjust point radius and opacity',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    size: '点半径',
    opacity: '不透明度',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    size: 'Point radius',
    opacity: 'Opacity',
  },
} satisfies Record<Lang, Record<string, string>>;
