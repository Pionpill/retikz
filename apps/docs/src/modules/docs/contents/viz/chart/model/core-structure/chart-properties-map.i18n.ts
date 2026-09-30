import type { Lang } from '@/i18n';

/** 不同 chartType 属性效果的示意图文案 */
export const chartPropertiesMapI18n: Record<
  Lang,
  Readonly<{ strip: string; regression: string; spread: string; fitting: string }>
> = {
  zh: {
    strip: 'Strip · properties',
    regression: 'Regression · properties',
    spread: '离散轴上的点散布',
    fitting: '线性拟合趋势',
  },
  en: {
    strip: 'Strip · properties',
    regression: 'Regression · properties',
    spread: 'Point spread on a discrete axis',
    fitting: 'Linear fitted trend',
  },
};
