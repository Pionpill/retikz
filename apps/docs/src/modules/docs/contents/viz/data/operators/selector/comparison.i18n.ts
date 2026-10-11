import type { Lang } from '@/i18n';

/** 选择算子输入与输出表格的公共文案 */
export const selectorComparisonI18n = {
  zh: {
    sourceOrders: '订单明细',
    selectedRows: '选中记录',
    allOrders: '全部订单',
    empty: '没有选中的行',
  },
  en: {
    sourceOrders: 'Order details',
    selectedRows: 'Selected rows',
    allOrders: 'All orders',
    empty: 'No rows selected',
  },
} satisfies Record<Lang, Record<string, string>>;
