import type { Lang } from '@/i18n';

/** 定义、实例和单次事务的持有关系 */
export const lifecycleOwnershipI18n: Record<
  Lang,
  Record<
    | 'definitions'
    | 'instance'
    | 'transaction'
    | 'source'
    | 'computation'
    | 'participant'
    | 'sourceState'
    | 'result'
    | 'host'
    | 'candidate'
    | 'prepared'
    | 'reuse'
    | 'own'
    | 'temporary',
    string
  >
> = {
  zh: {
    definitions: '长期定义',
    instance: '一个 Runtime',
    transaction: '一次事务',
    source: 'Source Token',
    computation: 'Computation Token',
    participant: 'Participant Token',
    sourceState: '来源持有值',
    result: '计算结果',
    host: '独占宿主资源',
    candidate: '来源 / 结果候选',
    prepared: 'PreparedCommit',
    reuse: '定义可复用',
    own: '实例独立持有',
    temporary: '成功采用或失败清理',
  },
  en: {
    definitions: 'Definitions',
    instance: 'One Runtime',
    transaction: 'One transaction',
    source: 'Source token',
    computation: 'Computation token',
    participant: 'Participant token',
    sourceState: 'Owned Source values',
    result: 'Computation results',
    host: 'Exclusive host resources',
    candidate: 'Source / result candidates',
    prepared: 'PreparedCommit',
    reuse: 'Reusable definitions',
    own: 'Owned per instance',
    temporary: 'Adopt or clean up',
  },
};
