import type { Lang } from '@/i18n';

/** 执行阶段标签 */
export const statisticsOverviewI18n: Record<Lang, Array<string>> = {
  zh: ['宿主确定分组', '调度 reducer 或 selector', '返回字段片段或行选择', '宿主组织输出行'],
  en: [
    'Host defines groups',
    'Dispatch reducer or selector',
    'Return fields or row selections',
    'Host assembles output rows',
  ],
};
