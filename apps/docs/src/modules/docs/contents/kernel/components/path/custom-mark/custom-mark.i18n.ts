import type { Lang } from '@/i18n';

/** 自定义标记试验场文案 */
export const customMarkI18n: Record<
  Lang,
  { title: string; radius: string; position: string; scale: string; color: string }
> = {
  zh: { title: '自定义圆环', radius: '局部半径', position: '沿线位置', scale: '整体缩放', color: '标记颜色' },
  en: {
    title: 'Custom ring',
    radius: 'Local radius',
    position: 'Position',
    scale: 'Overall scale',
    color: 'Mark color',
  },
};
