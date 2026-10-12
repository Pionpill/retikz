import type { Lang } from '@/i18n';

/** 通道数据流的双语标签 */
export const channelOverviewI18n: Record<Lang, Array<Array<string>>> = {
  zh: [
    ['绑定与数据', 'size ← amount'],
    ['解析映射', '字段范围 → 逐行取值'],
    ['交付属性', '半径 → 节点布局'],
    ['描述映射', '图例 domain / range'],
  ],
  en: [
    ['Binding and data', 'size ← amount'],
    ['Resolve mapping', 'Field extent → row values'],
    ['Deliver properties', 'Radius → node layout'],
    ['Describe mapping', 'Legend domain / range'],
  ],
};
