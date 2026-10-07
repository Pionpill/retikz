import type { Lang } from '@/i18n';

/** 事务流程图的双语文案 */
export const transactionPublicationI18n: Record<
  Lang,
  Record<
    'prepare' | 'equal' | 'changed' | 'retain' | 'compute' | 'success' | 'failure' | 'successLabel' | 'failureLabel',
    string
  >
> = {
  zh: {
    prepare: '捕获与比较',
    equal: '提交来源均无变化',
    changed: '提交的来源有变化',
    retain: '版本不变',
    compute: '准备计算结果',
    success: '发布新版本',
    failure: '清理候选\n保留旧状态',
    successLabel: '成功',
    failureLabel: '失败',
  },
  en: {
    prepare: 'Capture and compare',
    equal: 'Submitted Sources unchanged',
    changed: 'Submitted Sources changed',
    retain: 'Revision unchanged',
    compute: 'Prepare results',
    success: 'Publish revision',
    failure: 'Clean candidates\nKeep published state',
    successLabel: 'Success',
    failureLabel: 'Failure',
  },
};
