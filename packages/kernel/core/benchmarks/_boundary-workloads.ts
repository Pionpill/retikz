import type { BoundsInsets, CenteredBox } from '@retikz/math';

import type { CompiledBoundaryGeometry } from '../src/compile/boundary';
import type { Transform } from '../src/contract';
import { BUILTIN_BOUNDARIES } from '../src/providers/boundary';
import { BUILTIN_SHAPES } from '../src/providers/shape/shape';
import type { CanonicalNodeBoundary } from '../src/resolve';
import type { IRPosition } from '../src/schemas';

/** 带独立内容中心的边界几何，用于校验几何和内容一起投影 */
export type BoundaryBenchmarkGeometry = CompiledBoundaryGeometry & {
  geometry: { contentCenter: IRPosition };
};

/** 固定80×60矩形及非对称margin；不执行Node或Scope编译 */
export const createBoundaryGeometry = (withMargin = true): BoundaryBenchmarkGeometry => {
  const definition = BUILTIN_SHAPES.get('rectangle')!;
  const params = definition.paramsSchema.parse({});
  return {
    shape: { name: 'rectangle', definition, params },
    boundary: { name: 'rectangle', definition, params, isShape: true },
    geometry: {
      rect: { x: 10, y: 20, width: 80, height: 60, rotate: 0 },
      contentCenter: [14, 26],
      margin: withMargin ? { top: 2, right: 4, bottom: 6, left: 8 } : { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
};

/** 固定合法的规则连接面绑定；参数解析和registry读取在计时外 */
export const createExplicitBoundary = (name: 'circle' | 'ellipse'): CanonicalNodeBoundary => {
  const definition = BUILTIN_BOUNDARIES.get(name)!;
  return {
    name,
    definition,
    params: definition.paramsSchema.parse({ fit: name === 'circle' ? 'tight' : 'bounds', gap: 4 }),
    isShape: false,
  };
};

/** G(x,y)=(5-2y,-3-x)，与父链F不交换，防止错误省略父空间投影仍通过 */
export const createOwnBoundaryTransforms = (): Array<Transform> => [
  { kind: 'translate', x: 5, y: -3 },
  { kind: 'scale', x: 2, y: -1 },
  { kind: 'rotate', degrees: 90 },
];

/** 由F G F⁻¹或F⁸ G F⁻⁸独立展开的已发布布局预期 */
export const publishedBoundaryExpectation = (
  parentCount: 3 | 24,
): { rect: CenteredBox; contentCenter: IRPosition; margin: BoundsInsets } => ({
  rect: {
    x: parentCount === 3 ? -14 : -4438,
    y: parentCount === 3 ? -8 : -4934,
    width: 160,
    height: 60,
    rotate: Math.PI / 2,
  },
  contentCenter: parentCount === 3 ? [-23, -40 / 3] : [-4450, -4938],
  margin: { top: 2, right: 8, bottom: 6, left: 16 },
});

/** 固定一半顶点在矩形内部，沿偏离中心10单位的水平线穿出 */
export const createBoundaryPolyline = (count: 16 | 1024): Array<IRPosition> => {
  const prefixCount = count / 2;
  return Array.from({ length: count }, (_, index): IRPosition =>
    index < prefixCount ? [10 + (39 * index) / (prefixCount - 1), 30] : [60 + index - prefixCount, 30],
  );
};
