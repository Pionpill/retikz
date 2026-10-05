import type { Lang } from '@/i18n';

/** 示例的双语标题与读图说明 */
export const rangedDotMarksI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '替换端点外观，保留比较方向', subtitle: '橙色圆为 2000 年，蓝色菱形为 2022 年' },
  en: {
    title: 'Replace endpoint appearance without reversing roles',
    subtitle: 'Orange circles: 2000; blue diamonds: 2022',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    shape: '形状',
    shape_circle: '圆形',
    shape_diamond: '菱形',
    shape_rectangle: '矩形',
    endSize: '终点半径',
    strokeWidth: '线宽',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    shape: 'Shape',
    shape_circle: 'Circle',
    shape_diamond: 'Diamond',
    shape_rectangle: 'Rectangle',
    endSize: 'End radius',
    strokeWidth: 'Stroke width',
  },
} satisfies Record<Lang, Record<string, string>>;
