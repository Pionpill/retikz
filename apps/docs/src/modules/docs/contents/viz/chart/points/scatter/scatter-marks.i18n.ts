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
