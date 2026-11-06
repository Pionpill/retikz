import type { CenteredBox } from '@retikz/math';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import {
  calculateExpandedBoundaryRect,
  clipBoundaryPolyline,
  createBoundaryStore,
  evaluateAnchorReference,
  evaluateBoundaryPoint,
  projectLayoutWithTransform,
  projectPublishedCompileLayout,
} from '../../src/compile/boundary';
import { composeScopeTransform } from '../../src/compile/shared';
import type { IRAnchorRef, IRPosition } from '../../src/schemas';
import {
  createBoundaryGeometry,
  createBoundaryPolyline,
  createExplicitBoundary,
  createOwnBoundaryTransforms,
  publishedBoundaryExpectation,
} from '../_boundary-workloads';
import { createSharedTransformWorkload } from '../_shared-transform-workloads';

/** 手算点的浮点断言，允许多次空间投影的舍入 */
const verifyPosition = (actual: IRPosition, expected: IRPosition): void => {
  expect(actual[0]).toBeCloseTo(expected[0], 8);
  expect(actual[1]).toBeCloseTo(expected[1], 8);
};

/** 验证几何各独立字段，不由被测方法反算预期 */
const verifyRect = (actual: CenteredBox, expected: CenteredBox): void => {
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(actual[key]).toBeCloseTo(expected[key], 8);
  expect(actual.rotate ?? 0).toBeCloseTo(expected.rotate ?? 0, 12);
};

for (const expanded of [false, true]) {
  defineBenchmark(
    {
      id: `compile/boundary/expand-${expanded ? 'rotated' : 'zero'}/1`,
      dimensions: ['外扩矩形', expanded ? '非对称margin · 旋转90°' : '零margin', '一个矩形'],
    },
    () => {
      const geometry = createBoundaryGeometry(expanded);
      const rect = { ...geometry.geometry.rect, rotate: Math.PI / 2 };
      const before = structuredClone({ rect, margin: geometry.geometry.margin });
      return {
        run: () => calculateExpandedBoundaryRect(rect, geometry.geometry.margin),
        verify: result => {
          verifyRect(result, expanded ? { x: 8, y: 18, width: 92, height: 68, rotate: Math.PI / 2 } : rect);
          if (!expanded) expect(result).toBe(rect);
          expect({ rect, margin: geometry.geometry.margin }).toEqual(before);
        },
      };
    },
  );
}

defineBenchmark(
  { id: 'compile/boundary/project-prepared/24', dimensions: ['布局投影', '已准备24项链矩阵 · 含内容中心', '一个布局'] },
  () => {
    const geometry = createBoundaryGeometry();
    const before = structuredClone(geometry.geometry);
    const transform = composeScopeTransform(createSharedTransformWorkload(24).chain);
    return {
      run: () => projectLayoutWithTransform(geometry, transform),
      verify: result => {
        verifyRect(result.geometry.rect, { x: 21766, y: 16078, width: 20480, height: 393660, rotate: Math.PI * 4 });
        verifyPosition(result.geometry.contentCenter, [26950, 23854]);
        expect(result.geometry.margin).toEqual({ top: 13122, right: 1024, bottom: 39366, left: 2048 });
        expect(result.shape).toBe(geometry.shape);
        expect(geometry.geometry).toEqual(before);
      },
    };
  },
);

for (const count of [3, 24] as const) {
  defineBenchmark(
    {
      id: `compile/boundary/project-published/${count}`,
      dimensions: ['已发布布局再投影', '非交换本层3项 · 含内容中心', `${count}项父链`],
    },
    () => {
      const geometry = createBoundaryGeometry();
      const parent = createSharedTransformWorkload(count).chain;
      const own = createOwnBoundaryTransforms();
      const before = structuredClone({ geometry: geometry.geometry, parent, own });
      const expected = publishedBoundaryExpectation(count);
      return {
        run: () => projectPublishedCompileLayout(geometry, parent, own),
        verify: result => {
          verifyRect(result.geometry.rect, expected.rect);
          verifyPosition(result.geometry.contentCenter, expected.contentCenter);
          expect(result.geometry.margin).toEqual(expected.margin);
          expect({ geometry: geometry.geometry, parent, own }).toEqual(before);
        },
      };
    },
  );
}

for (const kind of ['shape', 'circle', 'ellipse'] as const) {
  defineBenchmark(
    {
      id: `compile/boundary/point-${kind}/1`,
      dimensions: [
        '边界附着点',
        kind === 'shape' ? '视觉矩形 · 非对称margin' : `${kind}显式连接面 · 非对称margin`,
        '水平射线',
      ],
    },
    () => {
      const geometry = createBoundaryGeometry();
      const before = structuredClone(geometry.geometry);
      const canonical = kind === 'shape' ? undefined : createExplicitBoundary(kind);
      const state = createBoundaryStore().getOrCreateState(geometry.shape);
      const expected: IRPosition = [kind === 'shape' ? 54 : kind === 'circle' ? 68 : 18 + 40 * Math.SQRT2, 22];
      // 显式缓存预置属于输入准备，正式测量仍包含每次绑定、margin及provider点求值
      if (kind === 'circle') evaluateBoundaryPoint(geometry, [200, 22], kind, canonical, undefined, state);
      return {
        run: () => evaluateBoundaryPoint(geometry, [200, 22], kind, canonical, undefined, state),
        verify: result => {
          verifyPosition(result, expected);
          expect(geometry.geometry).toEqual(before);
        },
      };
    },
  );
}

for (const count of [16, 1024] as const) {
  defineBenchmark(
    {
      id: `compile/boundary/clip-polyline/${count}`,
      dimensions: ['连接面折线裁剪', '一半内部前缀 · 非中心线段出界', `${count}个顶点`],
    },
    () => {
      const geometry = createBoundaryGeometry(false);
      const points = createBoundaryPolyline(count);
      const before = structuredClone(points);
      return {
        run: () => clipBoundaryPolyline(geometry, points, 'shape'),
        verify: result => {
          expect(result).toHaveLength(count / 2 + 1);
          verifyPosition(result[0], [50, 30]);
          expect(result.slice(1)).toEqual(points.slice(count / 2));
          expect(points).toEqual(before);
        },
      };
    },
  );
}

const anchors: Array<{ name: string; anchor: IRAnchorRef; expected: IRPosition }> = [
  { name: 'named', anchor: 'right', expected: [54, 22] },
  { name: 'angle', anchor: 90, expected: [8, 56] },
  { name: 'fraction', anchor: { side: 'right', fraction: 0.25 }, expected: [50, 5] },
];
for (const { name, anchor, expected } of anchors) {
  defineBenchmark(
    { id: `compile/boundary/anchor-${name}/1`, dimensions: ['完整锚点求值', name, '单次未缓存求值'] },
    () => {
      const geometry = createBoundaryGeometry();
      const before = structuredClone(geometry.geometry);
      return {
        run: () => evaluateAnchorReference(geometry, anchor, 'shape'),
        verify: result => {
          verifyPosition(result, expected);
          expect(geometry.geometry).toEqual(before);
        },
      };
    },
  );
}

for (const warm of [false, true]) {
  defineBenchmark(
    {
      id: `compile/boundary/store-${warm ? 'hit' : 'first'}/1`,
      dimensions: ['BoundaryStore锚点', warm ? '预置缓存后查询' : '创建store并首次求值', '命名right锚点'],
    },
    () => {
      const geometry = createBoundaryGeometry();
      const store = createBoundaryStore();
      const cached = warm ? store.getOrCreateAnchor(geometry, 'right', 'shape') : undefined;
      return {
        run: () => (warm ? store : createBoundaryStore()).getOrCreateAnchor(geometry, 'right', 'shape'),
        verify: result => {
          verifyPosition(result, [54, 22]);
          if (warm) expect(result).toBe(cached);
        },
      };
    },
  );
}
