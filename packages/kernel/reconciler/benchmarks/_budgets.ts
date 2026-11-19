import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 首次编译与持久会话更新的消费预算，不包含释放 */
export const resolveReconcilerBudget = (scenario: BenchmarkScenario): BenchmarkBudget | undefined => {
  const identity = scenario.id.slice(scenario.id.lastIndexOf(' > ') + 3);
  const [owner, phase, domain, variant, scale, strategy] = identity.split('/');
  if (
    owner !== 'reconciler' ||
    !['full', 'mount', 'replace', 'update'].includes(phase) ||
    !['coordinate', 'node', 'path', 'scope', 'scene', 'composite'].includes(domain)
  )
    throw new Error(`Missing Reconciler benchmark budget: ${identity}`);
  const count = Number(scale);
  if (phase === 'update' && !['auto', 'full'].includes(strategy))
    throw new Error(`Invalid update strategy: ${identity}`);
  if (phase === 'replace' && ![100, 1000].includes(count)) throw new Error(`Invalid replace scale: ${identity}`);
  if (phase === 'update' && strategy === 'full') return undefined;
  if (phase === 'replace')
    return {
      kind: 'workload',
      metric: 'p50',
      blocking: false,
      warningMs: count === 100 ? 8 : 50,
      errorMs: count === 100 ? 16.6 : 100,
      rationale:
        '已挂载会话完整替换；100/1000作者元素采用8/16.6ms与50/100ms的消费假设。含内部提交，不含初始mount或renderer，不是局部更新预算',
    };
  if (count === 10000) return undefined;
  if (phase === 'update') {
    if (![100, 1000].includes(count) || !['auto', 'full'].includes(strategy))
      throw new Error(`Missing Reconciler update budget: ${identity}`);
    const broad =
      domain === 'scope' ||
      domain === 'composite' ||
      (domain === 'scene' &&
        [
          'batch',
          'scope',
          'fanout-position',
          'fanout-size',
          'chain',
          'diamond',
          'insert-head',
          'insert-middle',
          'insert-nested',
          'rename',
          'alias',
          'namespace',
          'shadow',
          'coalesce',
          'diagnostics',
        ].includes(variant));
    return {
      kind: 'workload',
      metric: 'p50',
      blocking: false,
      warningMs: broad && count === 1000 ? 25 : 4,
      errorMs: broad && count === 1000 ? 50 : 8,
      rationale:
        '一次持久会话 update 至结果提交。规划假设局部/等值/空更新分配4/8ms；1000主体的范围传播分配25/50ms。auto按消费预算验收，强制full只作执行并校验的报告对照，不含首次mount、输入构造、断言、trace或renderer；未按实测倒推阈值，非已验证业务分布',
    };
  }
  if (domain !== 'scene') {
    if (![100, 1000].includes(count)) throw new Error(`Missing Reconciler element scale budget: ${identity}`);
    return {
      kind: 'workload',
      metric: 'p50',
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

  return { kind: 'workload', metric: 'p50', blocking: false, ...policy };
};
