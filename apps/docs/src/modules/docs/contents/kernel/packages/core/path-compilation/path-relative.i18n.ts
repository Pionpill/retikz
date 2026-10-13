import type { Lang } from '@/i18n';

/** 相对坐标基准的对照 */
export const pathRelativeI18n: Record<Lang, { titles: Array<string>; ends: Array<string> }> = {
  zh: {
    titles: ['relative：基准不变', 'relativeAccumulate：更新基准'],
    ends: ['两次终点：[60, 30]', '第二次终点：[120, 60]'],
  },
  en: {
    titles: ['relative: keep baseline', 'relativeAccumulate: advance'],
    ends: ['Both endpoints: [60, 30]', 'Second endpoint: [120, 60]'],
  },
};
