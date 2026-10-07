import type { Lang } from '@/i18n';

/** 生命周期图的双语文案 */
export const lifecycleOverviewI18n: Record<Lang, Record<'n0' | 'n1' | 'n2' | 'n3', string>> = {
  zh: {
    n0: '定义与注册',
    n1: '初始化\nrevision 0',
    n2: '多次更新\nrevision 1、2…',
    n3: '释放实例',
  },
  en: {
    n0: 'Define and register',
    n1: 'Initialize\nrevision 0',
    n2: 'Update repeatedly\nrevision 1, 2…',
    n3: 'Dispose instance',
  },
};
