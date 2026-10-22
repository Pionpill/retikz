import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 根据一次快照操作的消费需求选择预算，参考档与短操作仅报告 */
export const resolveFoundationBudget = (scenario: BenchmarkScenario): BenchmarkBudget | undefined => {
  if (scenario.id.endsWith('/reference')) return undefined;
  const identity = scenario.id.slice(scenario.id.indexOf(' > ') + 3);
  const operation = identity.split('/')[0];
  const count = Number(identity.match(/count=(\d+)/)?.[1]);
  if (!Number.isFinite(count)) return undefined;
  let rationale: string;
  if (operation === 'cloneAndFreezeJson') {
    rationale =
      'Reconciler runtime/source.ts 捕获输入，Core 发布 artifact 与输出时创建深冻结快照。规划假设：1千条小输入、1万条更新、10万条大输入捕获，单次黄/红为4/16.6、16.6/50、50/200ms，给后续编译留时间；条数非图元硬上限，对象每条4字段，百万仅参考';
  } else if (operation === 'createReadonlyMap') {
    rationale =
      'Vanilla normalize/scene/runtime-meta.ts 创建 identityIndex/parentIndex，Chart/Data 创建注册表。规划假设：单个索引或注册表快照在1千/1万/10万项内黄/红为1/4、4/16.6、16.6/50ms；不包含整个 normalize，百万仅参考';
  } else return undefined;
  const [warningMs, errorMs] =
    operation === 'createReadonlyMap'
      ? count <= 1_000
        ? [1, 4]
        : count <= 10_000
          ? [4, 16.6]
          : [16.6, 50]
      : count <= 1_000
        ? [4, 16.6]
        : count <= 10_000
          ? [16.6, 50]
          : [50, 200];
  return { kind: 'workload', metric: 'p90', warningMs, errorMs, rationale, blocking: false };
};
