import type { Lang } from '@/i18n';

import { operatorDemoI18n } from '../operator-demo.i18n';

/** 分位数演示及控制面板文案 */
export const reducerQuantileI18n = {
  zh: {
    ...operatorDemoI18n.zh,
    tail: 'A 组第 4 笔收入',
    sourceOrders: '订单明细',
    summaryRows: '汇总结果',
    allOrders: '全部订单',
    title: '分位数',
  },
  en: {
    ...operatorDemoI18n.en,
    tail: 'Revenue of order 4 in team A',
    sourceOrders: 'Order details',
    summaryRows: 'Summary rows',
    allOrders: 'All orders',
    title: 'Quantile',
  },
} satisfies Record<Lang, Record<string, string>>;
