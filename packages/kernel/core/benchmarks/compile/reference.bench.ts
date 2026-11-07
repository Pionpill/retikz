import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import {
  createPositionEvaluateContext,
  evaluatePosition,
  evaluatePositionTarget,
  evaluatePositionTargetWorld,
  projectPublishedReference,
  projectReferenceGeometry,
} from '../../src/compile/reference';
import { composeScopeTransform } from '../../src/compile/shared';
import type { IRAbsoluteTarget, IRPosition } from '../../src/schemas';
import { createOwnBoundaryTransforms } from '../_boundary-workloads';
import {
  createReferenceBetweenTarget,
  createReferencePositionWorkloads,
  createReferenceWorkload,
} from '../_reference-workloads';
import { createSharedTransformWorkload } from '../_shared-transform-workloads';

/** 独立手算点的浮点断言 */
const verifyPosition = (actual: IRPosition | null, expected: IRPosition): void => {
  expect(actual).not.toBeNull();
  expect(actual?.[0]).toBeCloseTo(expected[0], 8);
  expect(actual?.[1]).toBeCloseTo(expected[1], 8);
};

for (const mode of ['empty', 'prepared', 'compose'] as const) {
  defineBenchmark(
    {
      id: `compile/reference/context-${mode}/${mode === 'empty' ? 0 : 24}`,
      dimensions: ['位置上下文创建', mode, mode === 'empty' ? '无变换' : '24项混合链'],
    },
    () => {
      const workload = createSharedTransformWorkload(24);
      const prepared = composeScopeTransform(workload.chain);
      const input = {
        nodeDistance: 24,
        lookupReference: () => undefined,
        ...(mode === 'empty' ? {} : { transformChain: workload.chain }),
        ...(mode === 'prepared' ? { composedTransform: prepared } : {}),
      };
      return {
        run: () => createPositionEvaluateContext(input),
        verify: result => {
          verifyPosition(result.toWorld(workload.local), mode === 'empty' ? workload.local : workload.world);
          verifyPosition(result.toLocal(mode === 'empty' ? workload.local : workload.world), workload.local);
          expect(result.nodeDistance).toBe(24);
        },
      };
    },
  );
}

for (const { name, scale, position, local, world } of createReferencePositionWorkloads()) {
  defineBenchmark(
    { id: `compile/reference/position-${name}/${scale}`, dimensions: ['完整位置求值', name, `${scale}层表达式`] },
    () => {
      const { geometry, context } = createReferenceWorkload();
      const before = structuredClone({ position, geometry: geometry.geometry });
      return {
        run: () => evaluatePosition(position, context),
        verify: result => {
          expect(result).not.toBeNull();
          if (result !== null) {
            verifyPosition(result.localPoint, local);
            verifyPosition(result.worldPoint, world);
          }
          expect({ position, geometry: geometry.geometry }).toEqual(before);
        },
      };
    },
  );
}

const targets: Array<{ name: string; scale: number; target: IRAbsoluteTarget; expected: IRPosition; direct: boolean }> =
  [
    { name: 'center', scale: 1, target: { id: 'A' }, expected: [10, 20], direct: true },
    {
      name: 'anchor-cached',
      scale: 1,
      target: { id: 'A', anchor: 'right', boundary: 'shape' },
      expected: [54, 22],
      direct: true,
    },
    {
      name: 'fraction-cached',
      scale: 1,
      target: { id: 'A', anchor: { side: 'right', fraction: 0.25 } },
      expected: [50, 5],
      direct: true,
    },
    {
      name: 'explicit-boundary',
      scale: 1,
      target: { id: 'A', anchor: 'right', boundary: { type: 'circle', params: { fit: 'tight', gap: 4 } } },
      expected: [68, 22],
      direct: true,
    },
    ...([1, 4] as const).map(depth => {
      const expected: IRPosition = [20, 30];
      return { name: 'between', scale: depth, target: createReferenceBetweenTarget(depth), expected, direct: false };
    }),
  ];
for (const { name, scale, target, expected, direct } of targets) {
  defineBenchmark(
    { id: `compile/reference/target-${name}/${scale}`, dimensions: ['完整目标求值', name, `${scale}层目标`] },
    () => {
      const { context, references } = createReferenceWorkload();
      const before = structuredClone(target);
      // 锚点状态显式预置；正式调用仍含查询、显式boundary解析、缓存读取与局部投影
      if (name.includes('cached') || name === 'explicit-boundary') evaluatePositionTarget(target, context);
      const expectedLocal: IRPosition = [(-expected[1] - 6) / 2, (16 - expected[0]) / 3];
      return {
        run: () => evaluatePositionTarget(target, context),
        verify: result => {
          verifyPosition(result.referencePoint, expected);
          verifyPosition(result.point, expectedLocal);
          expect(result.target).toBe(target);
          if (direct) expect(result.reference).toBe(references.get('A'));
          else expect(result.reference).toBeUndefined();
          if (name === 'explicit-boundary') {
            expect(result.canonicalBoundary?.name).toBe('circle');
            expect(result.canonicalBoundary?.params).toMatchObject({ fit: 'tight', gap: 4 });
          }
          expect(target).toEqual(before);
        },
      };
    },
  );
}

defineBenchmark(
  {
    id: 'compile/reference/target-world/1',
    dimensions: ['目标世界坐标求值', '预置right锚点 · 世界offset', '单个节点目标'],
  },
  () => {
    const { context, references } = createReferenceWorkload();
    const target = { id: 'A', anchor: 'right', boundary: 'shape', offset: [3, 4] } satisfies IRAbsoluteTarget;
    evaluatePositionTargetWorld(target, context);
    return {
      run: () => evaluatePositionTargetWorld(target, context),
      verify: result => {
        verifyPosition(result.referencePoint, [57, 26]);
        expect(result.reference).toBe(references.get('A'));
        expect(result).not.toHaveProperty('point');
      },
    };
  },
);

defineBenchmark(
  {
    id: 'compile/reference/project-coordinate/24',
    dimensions: ['引用几何投影', '坐标引用 · 已准备24项链矩阵', '单个坐标'],
  },
  () => {
    const workload = createSharedTransformWorkload(24);
    const geometry = { position: workload.local };
    const transform = composeScopeTransform(workload.chain);
    return {
      run: () => projectReferenceGeometry(geometry, transform),
      verify: result => {
        expect('position' in result).toBe(true);
        if ('position' in result) verifyPosition(result.position, workload.world);
        expect(geometry.position).toEqual([4, 5]);
      },
    };
  },
);

for (const count of [3, 24] as const) {
  defineBenchmark(
    {
      id: `compile/reference/project-published/${count}`,
      dimensions: ['已发布引用再投影', '坐标引用 · 非交换本层3项', `${count}项父链`],
    },
    () => {
      const geometry = { position: [10, 20] satisfies IRPosition };
      const parent = createSharedTransformWorkload(count).chain;
      const own = createOwnBoundaryTransforms();
      return {
        run: () => projectPublishedReference(geometry, parent, own),
        verify: result => {
          expect('position' in result).toBe(true);
          if ('position' in result) verifyPosition(result.position, count === 3 ? [-14, -8] : [-4438, -4934]);
          expect(geometry.position).toEqual([10, 20]);
        },
      };
    },
  );
}
