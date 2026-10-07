import type { Lang } from '@/i18n';

/** Runtime 架构图的节点文案 */
export const runtimeArchitectureI18n: Record<
  Lang,
  {
    input: string;
    sources: string;
    computations: string;
    runtime: string;
    observation: string;
    output: string;
  }
> = {
  zh: {
    input: '领域输入\n完整状态',
    sources: 'Source 注册表\n状态所有权',
    computations: 'Computation 注册表\n计算依赖',
    runtime: 'Runtime\n事务与版本发布',
    observation: 'Trace 与诊断\n隔离的观测旁路',
    output: 'Snapshot 与 result\n已发布的版本',
  },
  en: {
    input: 'Domain input\nComplete state',
    sources: 'Source registry\nState ownership',
    computations: 'Computation registry\nDependencies',
    runtime: 'Runtime\nTransaction and revision',
    observation: 'Trace and diagnostics\nIsolated observation',
    output: 'Snapshots and results\nPublished revision',
  },
};
