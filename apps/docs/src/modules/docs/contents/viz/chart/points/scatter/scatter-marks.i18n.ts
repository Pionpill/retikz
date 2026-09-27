import type { Lang } from '@/i18n';

/** 散点图元示例文案 */
export const scatterMarksI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: {
    title: '叠加散点图元',
    subtitle: '100 部电影；较小的实心点与半透明大点共享评分坐标',
  },
  en: {
    title: 'Overlay scatter marks',
    subtitle: '100 films; small opaque points and large translucent points share rating coordinates',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    override: '替换默认图元',
    baseSize: '基础点半径',
    baseOpacity: '基础点不透明度',
    size: '点半径',
    opacity: '不透明度',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    override: 'Replace default mark',
    baseSize: 'Base point radius',
    baseOpacity: 'Base opacity',
    size: 'Point radius',
    opacity: 'Opacity',
  },
} satisfies Record<Lang, Record<string, string>>;
