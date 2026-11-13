import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const slopeMappingI18n: Record<
  Lang,
  { currentData: string; sourceData: string; data: string; settings: string; reverse: string; shuffle: string }
> = {
  zh: {
    data: '数据',
    currentData: '当前数据',
    sourceData: '原始数据',
    settings: '设置',
    reverse: '交换阶段',
    shuffle: '打乱行顺序',
  },
  en: {
    data: 'Data',
    currentData: 'Current data',
    sourceData: 'Source data',
    settings: 'Settings',
    reverse: 'Swap stages',
    shuffle: 'Shuffle rows',
  },
};
