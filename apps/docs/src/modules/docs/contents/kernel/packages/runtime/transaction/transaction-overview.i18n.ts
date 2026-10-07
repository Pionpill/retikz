import type { Lang } from '@/i18n';

/** 事务流程图的双语文案 */
export const transactionOverviewI18n: Record<Lang, Record<'input' | 'prepare' | 'publish' | 'read', string>> = {
  zh: {
    input: '完整新输入',
    prepare: '准备候选状态',
    publish: '统一发布',
    read: '读取新版本',
  },
  en: {
    input: 'Complete new input',
    prepare: 'Prepare candidates',
    publish: 'Publish together',
    read: 'Read new revision',
  },
};
