import type { Lang } from '@/i18n';

/** 增量更新机制图文案 */
export const text: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    edge0: ['准备成功', ''],
    edge1: ['全部成功', ''],
    edge2: ['失败', ''],
    edge3: ['回滚失败', ''],
    candidate: ['候选计算结果', '尚未发布'],
    prepare: ['prepare', '准备可回滚操作'],
    commit: ['commit + read', '提交并读取宿主结果'],
    publish: ['发布 revision', '成功后通知观察者'],
    rollback: ['逆序 rollback', '成功：保留旧状态'],
    broken: ['broken', '回滚失败：封锁读写'],
  },
  en: {
    edge0: ['Prepared', ''],
    edge1: ['All succeed', ''],
    edge2: ['Failure', ''],
    edge3: ['Rollback fails', ''],
    candidate: ['Candidate result', 'Not published yet'],
    prepare: ['prepare', 'Prepare reversible work'],
    commit: ['commit + read', 'Commit and read hosts'],
    publish: ['Publish revision', 'Then notify observers'],
    rollback: ['Reverse rollback', 'Success: retain old state'],
    broken: ['broken', 'Rollback fails: block access'],
  },
};
