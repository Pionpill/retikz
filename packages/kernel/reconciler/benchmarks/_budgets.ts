import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 协调器完整执行预算，包含创建、非增量挂载与释放 */
export const resolveReconcilerBudget = (scenario: BenchmarkScenario): BenchmarkBudget => {
  const identity = scenario.id.slice(scenario.id.lastIndexOf(' > ') + 3);
  const [owner, operation, variant, scale] = identity.split('/');
  if (owner !== 'reconciler' || !['full', 'node', 'path', 'scope'].includes(operation))
    throw new Error(`Missing Reconciler benchmark budget: ${identity}`);
  const count = Number(scale);
  if (operation !== 'full') {
    if (![100, 1000].includes(count)) throw new Error(`Missing Reconciler element scale budget: ${identity}`);
    return {
      kind: 'workload',
      metric: 'p90',
      blocking: false,
      warningMs: count === 100 ? 4 : 25,
      errorMs: count === 100 ? 8 : 50,
      rationale:
        '一次同步场景完整执行（创建、非增量mount、读取、dispose）。规划假设100主体元素用于常规刷新，分配4/8ms；1000主体元素用于较大场景刷新，分配25/50ms，不承诺60FPS。连接场景另含2N支撑节点，Scope混合含N节点与N路径，空Scope规模为容器数；同规模同预算，不依复杂度放宽。无renderer、provenance或跨样本缓存，首次采样前固定，不代表已验证业务分布',
    };
  }
  if (variant !== 'mixed') throw new Error(`Missing Reconciler full workload budget: ${identity}`);
  if (![100, 500, 1000].includes(count)) throw new Error(`Missing Reconciler compile scale budget: ${identity}`);
  const policy = {
    warningMs: count === 100 ? 8 : count === 500 ? 25 : 50,
    errorMs: count === 100 ? 16.6 : count === 500 ? 50 : 100,
    rationale:
      '一次完整流程图编译，无provenance；每10节点12路径、两层Scope。假设100节点用于频繁小图更新（8/16.6ms），500节点用于编辑后刷新（25/50ms），1000节点用于大图完整更新（50/100ms），中大型不承诺60FPS；不含输入构造和renderer，首次采样前固定',
  };

  return { kind: 'workload', metric: 'p90', blocking: false, ...policy };
};
