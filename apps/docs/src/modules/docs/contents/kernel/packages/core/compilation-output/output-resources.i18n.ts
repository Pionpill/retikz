import type { Lang } from '@/i18n';

/** 编译产物示意图文案 */
export const outputResourcesI18n: Record<Lang, { first: string; second: string; resource: string; stops: string }> = {
  zh: {
    first: '第一张卡片 · fill',
    second: '第二张卡片 · fill',
    resource: 'resources[0] · 字段摘录',
    stops: '同一组渐变色标',
  },
  en: {
    first: 'First card · fill',
    second: 'Second card · fill',
    resource: 'resources[0] · excerpt',
    stops: 'Shared gradient stops',
  },
};
