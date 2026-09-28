import type { Lang } from '@/i18n';
/** 示例的双语标题与读图说明 */
export const connectedScatterOrderFigureI18n: Record<
  Lang,
  { title: string; inputTitle: string; subtitle: string; data: string; order: string }
> = {
  zh: {
    title: '按 step 排序：1、2、3、4',
    inputTitle: '按输入顺序：3、1、2、4',
    subtitle: '排序只改变连接顺序，不改变观测坐标',
    data: '观测数据',
    order: '按顺序连接',
  },
  en: {
    title: 'Sorted by step: 1, 2, 3, 4',
    inputTitle: 'Input order: 3, 1, 2, 4',
    subtitle: 'Sorting changes connections, not observation coordinates',
    data: 'Observations',
    order: 'Sort by step',
  },
};
