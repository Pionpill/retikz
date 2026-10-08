import type { Lang } from '@/i18n';

/** 生命周期图的双语文案 */
export const lifecycleFailureI18n: Record<Lang, Record<'n0' | 'n1' | 'n2' | 'n3' | 'n4' | 'n5', string>> = {
  zh: {
    n0: '准备 / commit / read 失败',
    n1: '回滚成功\n保留 revision 0',
    n2: '参与者 rollback 失败',
    n3: 'broken\n拒绝更新与状态读取',
    n4: '发布后通知 / 清理失败',
    n5: '保留 revision 1\n追加诊断',
  },
  en: {
    n0: 'prepare / commit / read fails',
    n1: 'Rollback succeeds\nKeep revision 0',
    n2: 'Participant rollback fails',
    n3: 'broken\nReject updates and state reads',
    n4: 'Post-publish observer / cleanup fails',
    n5: 'Keep revision 1\nAppend diagnostics',
  },
};
