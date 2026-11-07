import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 完整编译原有预算，迁包不改变采样边界或阈值 */
export const resolveReconcilerBudget = (scenario: BenchmarkScenario): BenchmarkBudget => {
  const identity = scenario.id.slice(scenario.id.lastIndexOf(' > ') + 3);
  const [layer, family, variant, scale] = identity.split('/');
  if (layer !== 'compile' || family !== 'full' || variant !== 'mixed')
    throw new Error(`Missing Reconciler benchmark budget: ${identity}`);
  const count = Number(scale);
  if (![100, 500, 1000].includes(count)) throw new Error(`Missing Reconciler compile scale budget: ${identity}`);
  const policy = {
    warningMs: count === 100 ? 8 : count === 500 ? 25 : 50,
    errorMs: count === 100 ? 16.6 : count === 500 ? 50 : 100,
    rationale:
      '一次完整流程图编译，无provenance；每10节点12路径、两层Scope。假设100节点用于频繁小图更新（8/16.6ms），500节点用于编辑后刷新（25/50ms），1000节点用于大图完整更新（50/100ms），中大型不承诺60FPS；不含输入构造和renderer，首次采样前固定',
  };

  return { kind: 'workload', metric: 'p90', blocking: false, ...policy };
};
