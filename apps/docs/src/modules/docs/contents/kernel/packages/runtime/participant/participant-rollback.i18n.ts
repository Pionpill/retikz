import type { Lang } from '@/i18n';

/** 提交流程图的双语文案 */
export const participantRollbackI18n: Record<Lang, Record<'prepared' | 'a' | 'b' | 'rollback', string>> = {
  zh: {
    prepared: 'A、B 已准备',
    a: 'A 提交成功',
    b: 'B 提交失败',
    rollback: '先回滚 B，再回滚 A',
  },
  en: {
    prepared: 'A and B prepared',
    a: 'A commit succeeds',
    b: 'B commit fails',
    rollback: 'Roll back B, then A',
  },
};
