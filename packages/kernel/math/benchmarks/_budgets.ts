import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 消费场景的规划预算；不是由当前机器测量结果反推的稳定回归基线 */
type MathBudgetPolicy = {
  /** 单次算法调用的黄/红阈值，单位为毫秒 */
  limits: (count: number) => readonly [number, number];
  /** 已核实的消费路径或显式标注的需求假设 */
  rationale: string;
};

// 固定规模算法没有独立单次预算时仅报告，不沿用调用方批量预算
const policies: Partial<Record<string, MathBudgetPolicy>> = {};

policies['curve.catmullRomToCubic'] = {
  limits: count => (count <= 1_000 ? [4, 16.6] : count <= 10_000 ? [16.6, 50] : [50, 200]),
  rationale:
    'Core compile/path/stroke/shapes.ts 过点路径；本次用户指定 Plot 约10万点业务需求。1千点交互、1万点更新、10万点大图重建，整次黄/红为 4/16.6、16.6/50、50/200ms；10万点必须满足预算，不能因插值计算重而降为参考档；百万仅观察',
};
policies['curve.approximateLength'] = {
  limits: () => [0.05, 0.2],
  rationale:
    'Core stroke interruption、Ribbon centerline 和 Diagram bezier 逐段求弧长；规划一次更新约100段，弧长阶段约5ms预警、20ms不可接受，据此单段黄/红为0.05/0.2ms。采样精度提高不能放宽交互预算；100段是规划假设而非代码硬上限',
};
policies.boundsOf = {
  limits: count => (count <= 1_000 ? [1, 4] : count <= 10_000 ? [2, 8] : [4, 16.6]),
  rationale:
    'Core scope/scene/layout、orchestration bounds 和 Render path-bounds 汇总点集；1千/1万/10万点单次扫描黄/红为1/4、2/8、4/16.6ms。边界仅是更新中的基础步骤，不能独占帧预算；百万仅观察',
};
policies['circle.minimalEnclosing'] = {
  limits: () => [2, 8],
  rationale:
    'Core compile/node/synthetic.ts 对 scope cornerPoints 生成外接节点；一次包围计算黄/红为2/8ms，给布局与绘制留时。16/100/1千/1万点均采用同一单节点交互预算；有序圆周更慢也不能放宽。当前有序用例仅到1千点，不证明更大规模达标',
};
policies.convexHull = {
  limits: count => (count <= 1_000 ? [4, 16.6] : count <= 10_000 ? [16.6, 50] : [50, 200]),
  rationale:
    '假设场景：未找到convexHull直接生产消费者；按散点选择区域/点集包络规划1千/1万点交互更新、10万点大图重建，黄/红为4/16.6、16.6/50、50/200ms。排序复杂度不能放宽需求；百万仅观察',
};

policies['polygon.containsPoint'] = {
  limits: () => [1, 4],
  rationale:
    '假设场景：未找到直接生产消费者；按指针移动时对一个复杂边界做一次命中查询规划，1千至10万顶点单次黄/红为1/4ms，给事件处理与绘制留时；百万仅观察',
};

/** 由稳定用例标识选择业务预算，不读取当前耗时，也不按输入形态放宽 */
export const resolveMathBudget = (scenario: BenchmarkScenario): BenchmarkBudget | undefined => {
  const identity = scenario.id.slice(scenario.id.indexOf(' > ') + 3);
  const algorithm = identity.split('/')[0];
  const count = Number(identity.match(/(?:points|vertices)=(\d+)/)?.[1] ?? 1);
  const policy = policies[algorithm];
  if (!policy) return undefined;
  const [warningMs, errorMs] = policy.limits(count);
  return { kind: 'workload', metric: 'p90', warningMs, errorMs, rationale: policy.rationale, blocking: false };
};
