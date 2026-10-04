import type { Lang } from '@/i18n';

/** Runtime 架构图的节点文案 */
export const runtimeArchitectureI18n: Record<
  Lang,
  {
    input: string;
    owners: string;
    programs: string;
    session: string;
    observation: string;
    output: string;
  }
> = {
  zh: {
    input: '领域输入\n完整状态',
    owners: 'Owner 注册表\n状态所有权',
    programs: 'Program 注册表\n计算依赖',
    session: 'Session\n事务与版本发布',
    observation: 'Trace 与诊断\n隔离的观测旁路',
    output: 'Snapshot 与 artifact\n已发布的版本',
  },
  en: {
    input: 'Domain input\nComplete state',
    owners: 'Owner registry\nState ownership',
    programs: 'Program registry\nDependencies',
    session: 'Session\nTransaction and revision',
    observation: 'Trace and diagnostics\nIsolated observation',
    output: 'Snapshots and artifacts\nPublished revision',
  },
};
