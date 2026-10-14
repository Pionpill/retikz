import type { Lang } from '@/i18n';

/** 连接面比较的说明 */
export const layoutBoundariesI18n: Record<Lang, { titles: Array<string>; note: string }> = {
  zh: {
    titles: ["boundary: 'shape'", "boundary: 'rectangle'", 'rectangle + margin: 12'],
    note: '可见圆形不变，只改变连线终点',
  },
  en: {
    titles: ["boundary: 'shape'", "boundary: 'rectangle'", 'rectangle + margin: 12'],
    note: 'Same visible circle; different connection endpoints',
  },
};
