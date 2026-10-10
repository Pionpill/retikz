import type { Lang } from '@/i18n';

import { operatorDemoI18n } from '../operator-demo.i18n';

/** 计数演示及控制面板文案 */
export const reducerCountI18n = {
  zh: {
    ...operatorDemoI18n.zh,
    title: '计数',
    sourceOrders: '订单明细',
    orderCounts: '订单数量',
    allOrders: '全部订单',
  },
  en: {
    ...operatorDemoI18n.en,
    title: 'Count',
    sourceOrders: 'Order details',
    orderCounts: 'Order counts',
    allOrders: 'All orders',
  },
} satisfies Record<Lang, Record<string, string>>;
