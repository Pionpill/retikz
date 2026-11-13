import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 首次编译与持久会话更新的消费预算，不包含释放 */
export const resolveReconcilerBudget = (scenario: BenchmarkScenario): BenchmarkBudget => {
  const identity = scenario.id.slice(scenario.id.lastIndexOf(' > ') + 3);
  const [owner, phase, domain, variant, scale, strategy] = identity.split('/');
  if (
    owner !== 'reconciler' ||
    !['full', 'mount', 'update'].includes(phase) ||
    !['node', 'path', 'scope', 'scene'].includes(domain)
  )
    throw new Error(`Missing Reconciler benchmark budget: ${identity}`);
  const count = Number(scale);
  if (phase === 'update') {
    if (![100, 1000].includes(count) || !['auto', 'full'].includes(strategy))
      throw new Error(`Missing Reconciler update budget: ${identity}`);
    const broad = domain === 'scope' || (domain === 'scene' && ['batch', 'scope'].includes(variant));
    return {
      kind: 'workload',
      metric: 'p90',
      blocking: false,
      warningMs: broad && count === 1000 ? 25 : 4,
      errorMs: broad && count === 1000 ? 50 : 8,
      rationale:
        '一次持久会话 update 至结果提交。规划假设局部/等值/空更新分配4/8ms；1000主体的范围传播分配25/50ms。auto与强制full使用同预算，不含首次mount、输入构造、断言、trace或renderer；未按实测倒推阈值，非已验证业务分布',
    };
  }
  if (domain !== 'scene') {
    if (![100, 1000].includes(count)) throw new Error(`Missing Reconciler element scale budget: ${identity}`);
    return {
      kind: 'workload',
      metric: 'p90',
      blocking: false,
      warningMs: count === 100 ? 4 : 25,
      errorMs: count === 100 ? 8 : 50,
      rationale:
        '新会话首次编译（创建、mount、读取；dispose在计时外）。规划假设100主体分配4/8ms，1000主体分配25/50ms；开启/关闭增量使用相同预算。连接场景另含2N支撑节点，Scope混合含N节点与N路径，空Scope规模为容器数。不依复杂度放宽；无renderer、provenance或跨样本缓存，不代表已验证业务分布',
    };
  }
  if (variant !== 'mixed') throw new Error(`Missing Reconciler full workload budget: ${identity}`);
  if (![100, 500, 1000].includes(count)) throw new Error(`Missing Reconciler compile scale budget: ${identity}`);
  const policy = {
    warningMs: count === 100 ? 8 : count === 500 ? 25 : 50,
    errorMs: count === 100 ? 16.6 : count === 500 ? 50 : 100,
    rationale:
      '新会话首次流程图编译，无provenance；每10节点12路径、两层Scope。100节点8/16.6ms，500节点25/50ms，1000节点50/100ms；开启/关闭增量同预算，不含输入构造、dispose或renderer，不承诺冷启动或60FPS。计时边界与旧生命周期基准不同',
  };

  return { kind: 'workload', metric: 'p90', blocking: false, ...policy };
};
