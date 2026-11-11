import { createBoundaryStore } from '../src/compile/boundary';
import { createPositionEvaluateContext } from '../src/compile/reference';
import type { EvaluablePosition, PositionReferenceView } from '../src/compile/reference';
import { composeScopeTransform } from '../src/compile/shared';
import { BUILTIN_BOUNDARIES } from '../src/providers/boundary';
import { BUILTIN_SHAPES } from '../src/providers/shape/shape';
import { resolveNodeBoundary } from '../src/resolve';
import type { IRAbsoluteTarget, IRPosition, PolarPosition } from '../src/schemas';
import { createBoundaryGeometry } from './_boundary-workloads';
import { createSharedTransformWorkload } from './_shared-transform-workloads';

/** 两个真实几何引用与F(x,y)=(16-3y,-6-2x)作用域，复用生产上下文与内置连接面解析 */
export const createReferenceWorkload = () => {
  const geometry = createBoundaryGeometry();
  const references = new Map<string, PositionReferenceView>([
    ['A', { state: 'resolved', geometry, irPath: ['children', 0] }],
    ['B', { state: 'resolved', geometry: { position: [50, 60] }, irPath: ['children', 1] }],
  ]);
  const boundaryStore = createBoundaryStore();
  const chain = createSharedTransformWorkload(3).chain;
  const composedTransform = composeScopeTransform(chain);
  const context = createPositionEvaluateContext({
    nodeDistance: 24,
    lookupReference: id => references.get(id),
    boundaryStore,
    transformChain: chain,
    composedTransform,
    resolveExplicitBoundary: (boundary, input) =>
      resolveNodeBoundary(boundary, { ...input, shapeRegistry: BUILTIN_SHAPES, boundaryRegistry: BUILTIN_BOUNDARIES }),
  });
  return { geometry, references, boundaryStore, chain, composedTransform, context };
};

/** 构造合法的嵌套极坐标原点，每层沿局部x轴平移2 */
export const createNestedPolarPosition = (depth: 3 | 24): PolarPosition => {
  let position: PolarPosition = { origin: [4, 5], angle: 0, radius: 2 };
  for (let index = 1; index < depth; index++) position = { origin: position, angle: 0, radius: 2 };
  return position;
};

/** 构造深度1或4的完整between树；叶子交替引用A/B，每层fraction=1/4，世界点恒为[20,30] */
export const createReferenceBetweenTarget = (depth: 1 | 4): IRAbsoluteTarget => {
  const createTarget = (level: number, leafIndex: number): IRAbsoluteTarget =>
    level === 0
      ? { id: leafIndex % 2 === 0 ? 'A' : 'B' }
      : {
          between: [createTarget(level - 1, leafIndex * 2), createTarget(level - 1, leafIndex * 2 + 1)],
          fraction: 0.25,
        };
  return createTarget(depth, 0);
};

/** 位置求值场景和独立几何预期 */
export type ReferencePositionWorkload = {
  /** 稳定场景名 */
  name: string;
  /** 完整表达式的嵌套深度，常数场景为1 */
  scale: number;
  /** 已类型化的位置输入 */
  position: EvaluablePosition;
  /** 预期局部点 */
  local: IRPosition;
  /** 预期世界点 */
  world: IRPosition;
};

/** 七个代表性输入，预期来自F与F⁻¹手算，不调用生产求值器 */
export const createReferencePositionWorkloads = (): Array<ReferencePositionWorkload> => [
  { name: 'tuple', scale: 1, position: [4, 5], local: [4, 5], world: [1, -14] },
  { name: 'reference', scale: 1, position: 'A', local: [-13, 2], world: [10, 20] },
  { name: 'at', scale: 1, position: { direction: 'right', of: 'A', distance: 12 }, local: [-1, 2], world: [10, -4] },
  {
    name: 'offset',
    scale: 1,
    position: { of: { origin: [4, 5], angle: 90, radius: 3 }, offset: [2, -1] },
    local: [6, 7],
    world: [-5, -18],
  },
  ...([3, 24] as const).map((depth): ReferencePositionWorkload => ({
    name: 'polar',
    scale: depth,
    position: createNestedPolarPosition(depth),
    local: [4 + 2 * depth, 5],
    world: [1, -14 - 4 * depth],
  })),
  {
    name: 'between',
    scale: 1,
    position: { between: [{ id: 'A' }, { id: 'B' }], fraction: 0.25 },
    local: [-18, -4 / 3],
    world: [20, 30],
  },
];
