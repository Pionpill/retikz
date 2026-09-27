import type { Lang } from '@/i18n';

/** 散点外观示例的双语控件文案 */
export const scatterAppearanceI18n: Record<
  Lang,
  {
    title: string;
    data: string;
    samples: string;
    points: string;

    size: string;
    opacity: string;
    stroke: string;
    strokeWidth: string;
  }
> = {
  zh: {
    title: '散点外观',
    data: '数据',
    samples: '2022 年经济体样本',
    points: '散点',

    size: '大小',
    opacity: '不透明度',
    stroke: '描边色',
    strokeWidth: '描边宽度',
  },
  en: {
    title: 'Point appearance',
    data: 'Data',
    samples: '2022 economy samples',
    points: 'Points',

    size: 'Size',
    opacity: 'Opacity',
    stroke: 'Stroke color',
    strokeWidth: 'Stroke width',
  },
};
