import type { Lang } from '@/i18n';

/** 计数器接入示例的结果说明 */
export const counterResultI18n: Record<
  Lang,
  {
    initial: string;
    updated: string;
    count: string;
    result: string;
    controls: string;
    initialCount: string;
    nextCount: string;
    outcome: string;
  }
> = {
  zh: {
    initial: '初始发布',
    updated: '更新后',
    count: '计数',
    result: '两倍值',
    controls: '计数更新',
    initialCount: '初始计数',
    nextCount: '更新计数',
    outcome: '执行结果',
  },
  en: {
    initial: 'Initial publication',
    updated: 'After update',
    count: 'Count',
    result: 'Doubled',
    controls: 'Counter update',
    initialCount: 'Initial count',
    nextCount: 'Next count',
    outcome: 'Outcome',
  },
};
