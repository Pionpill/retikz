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
    commit: ['commit', '提交 Weave 与宿主'],
    publish: ['发布 revision', '成功后通知观察者'],
    rollback: ['rollback', '先目标，后 Weave'],
    broken: ['broken', '回滚失败：封锁读写'],
  },
  en: {
    edge0: ['Prepared', ''],
    edge1: ['All succeed', ''],
    edge2: ['Failure', ''],
    edge3: ['Rollback fails', ''],
    candidate: ['Candidate result', 'Not published yet'],
    prepare: ['prepare', 'Prepare reversible work'],
    commit: ['commit', 'Commit Weave and host'],
    publish: ['Publish revision', 'Then notify observers'],
    rollback: ['rollback', 'Target first, then Weave'],
    broken: ['broken', 'Rollback fails: block access'],
  },
};
