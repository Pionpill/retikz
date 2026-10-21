import type { BenchmarkBudget, BenchmarkScenario } from '../../../../scripts/benchmarks/types';

/** 消费场景的规划预算；不是由当前机器测量结果反推的稳定回归基线 */
type MathBudgetPolicy = {
  /** 返回整次工作负载的黄色、红色阈值，单位为毫秒 */
  limits: (count: number) => readonly [number, number];
  /** 已核实的调用路径或明确标注的需求假设 */
  rationale: string;
};

/** 高频数值与坐标处理需为同帧其它编译和渲染阶段留出预算 */
const primitivePolicy: MathBudgetPolicy = {
  limits: count => (count <= 1_000 ? [1, 4] : count <= 10_000 ? [4, 8] : [8, 16.6]),
  rationale:
    '数值/坐标基础步骤：Core shape provider、scope/scene bounds 和 Render 路径处理中的逐点工作。规划按每次更新整批 1千/1万/10万次分配 1/4、4/8、8/16.6ms（黄/红），为后续绘制留时；这是单项预算，不能把各项上限相加当作帧预算',
};

/** 路径几何准备按一次更新的查询批量分配预算 */
const geometryPolicy: MathBudgetPolicy = {
  limits: count => (count <= 1_000 ? [4, 8] : count <= 10_000 ? [8, 16.6] : [16.6, 50]),
  rationale:
    '几何准备：Core path contour 求交、shape ellipse 定位、stroke interruption 裁剪，以及 Ribbon/Diagram 曲线采样和投影。规划 1千/1万次用于交互更新，10万次用于大场景重建；整批黄/红为 4/8、8/16.6、16.6/50ms，不因曲线类型、退化输入或缓存状态放宽',
};

/** 没有直接消费者的公开算法保留可审查的需求假设 */
const hypotheticalGeometryPolicy: MathBudgetPolicy = {
  ...geometryPolicy,
  rationale:
    '假设场景：本次未找到该公开算法的直接生产消费者；按几何查询/节点计算整批 1千/1万/10万次规划，黄/红为 4/8、8/16.6、16.6/50ms。超限表示不满足此假设需求，不代表已证实现有交互卡顿',
};

/** 按算法显式登记消费类别；新增算法必须补充归属，不能默认套用宽松标准 */
const policies: Partial<Record<string, MathBudgetPolicy>> = {};
for (const algorithm of [
  'vector2.dot',
  'vector2.cross',
  'vector2.length',
  'vector2.add',
  'vector2.sub',
  'vector2.scale',
  'vector2.normalize',
  'vector2.normalizeOrNull',
  'vector2.normal',
  'vector2.fromAngleDegrees',
  'point.distance',
  'point.along',
  'point.against',
  'point.shiftToward',
  'point.isEqual',
  'lerp',
  'isFiniteNumber',
  'isInfiniteNumber',
  'isFinitePoint',
  'isFiniteBoundsRect',
  'isPositiveBoundsRect',
  'boundsToRect',
  'rectToBounds',
  'mergeBounds',
  'centerOfBounds',
  'halfAxesOfBounds',
  'expandBounds',
  'cornersOfBounds',
  'applyAffine',
  'multiplyAffine',
  'isFiniteNonSingularAffine',
  'getAffineSimilarityScale',
  'localToWorld',
  'worldToLocal',
])
  policies[algorithm] = primitivePolicy;
for (const algorithm of [
  'curve.sampleAt',
  'curve.slice',
  'curve.projectedRange',
  'ellipse.center',
  'ellipse.inscribedInBox',
  'ellipse.circumscribedHalfAxes',
  'ellipse.boundaryPoint',
  'pointAtArcAngle',
  'pointAtEllipseArcAngle',
  'collectArcBoundingCandidates',
  'collectEllipseArcBoundingCandidates',
  'isAngleWithinArcSweep',
  'intersect.lineLine',
  'intersect.lineCircle',
  'intersect.circleCircle',
  'intersectRayWithArc',
])
  policies[algorithm] = geometryPolicy;
for (const algorithm of ['triangle.circumCircle', 'triangle.incircle', 'intersect.segmentSegment', 'ellipse.contains'])
  policies[algorithm] = hypotheticalGeometryPolicy;

// 未发现这些成员的生产调用；不能把同族其它成员的调用证据视为自身业务需求
for (const algorithm of [
  'isInfiniteNumber',
  'point.along',
  'point.against',
  'point.shiftToward',
  'vector2.add',
  'vector2.cross',
  'vector2.dot',
  'vector2.scale',
])
  policies[algorithm] = {
    ...primitivePolicy,
    rationale:
      '假设场景：未找到该成员的生产调用；按逐点数值/坐标基础步骤规划整批1千/1万/10万次，黄/红为1/4、4/8、8/16.6ms，不宣称已有此规模消费需求',
  };

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
policies['curve.parameterAtDistance'] = {
  limits: count => (count <= 10 ? [2, 8] : count <= 100 ? [8, 16.6] : [16.6, 50]),
  rationale:
    'Core stroke interruption 按距离裁剪、Ribbon centerline 按弧长取样；按10/100/1千次实际查询批量规划，黄/红为2/8、8/16.6、16.6/50ms。不是每个Plot数据点都做反解；缓存与非缓存、直线与贝塞尔必须满足相同消费预算',
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

/** 由稳定用例标识选择业务预算，不读取当前耗时，也不按输入形态放宽 */
export const resolveMathBudget = (scenario: BenchmarkScenario): BenchmarkBudget | undefined => {
  const identity = scenario.id.slice(scenario.id.indexOf(' > ') + 3);
  const algorithm = identity.split('/')[0];
  // 批量查询同时带 vertices 时，预算对应整批 operations，而不是单个多边形的顶点数
  const count = Number(
    identity.match(/operations=(\d+)/)?.[1] ?? identity.match(/(?:points|vertices)=(\d+)/)?.[1] ?? 1,
  );
  const policy =
    algorithm === 'polygon.containsPoint'
      ? identity.includes('operations=')
        ? hypotheticalGeometryPolicy
        : {
            limits: (): readonly [number, number] => [1, 4],
            rationale:
              '假设场景：未找到polygon.containsPoint直接生产消费者；按指针移动时对一个复杂边界做命中查询规划，1千至10万顶点单次黄/红为1/4ms，给事件处理与绘制留时。16顶点批量查询另按几何查询批预算；百万仅观察',
          }
      : policies[algorithm];
  if (!policy) return undefined;
  const [warningMs, errorMs] = policy.limits(count);
  return { kind: 'workload', metric: 'p90', warningMs, errorMs, rationale: policy.rationale, blocking: false };
};
