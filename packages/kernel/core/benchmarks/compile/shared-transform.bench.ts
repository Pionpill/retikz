import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import {
  applyScopeTransform,
  applyTransformChain,
  composeScopeTransform,
  inverseScopeTransform,
  inverseTransformChain,
} from '../../src/compile/shared';
import type { ComposedScopeTransform } from '../../src/compile/shared';
import type { IRPosition } from '../../src/schemas';
import { createSharedTransformWorkload } from '../_shared-transform-workloads';
import type { SharedTransformWorkload } from '../_shared-transform-workloads';

/** 对照手算坐标，允许浮点旋转的累计舍入 */
const verifyPosition = (actual: IRPosition, expected: IRPosition): void => {
  expect(actual[0]).toBeCloseTo(expected[0], 9);
  expect(actual[1]).toBeCloseTo(expected[1], 9);
};

/** 检查完整合成输出，不用被测投影函数反算预期 */
const verifyComposedTransform = (actual: ComposedScopeTransform, expected: SharedTransformWorkload): void => {
  expect(actual.chain).toEqual(expected.chain);
  expect(actual.canApplyForwardMatrix).toBe(true);
  expect(actual.canApplyInverseMatrix).toBe(true);
  expect(actual.inverse).not.toBeNull();
  for (let index = 0; index < 6; index++) {
    expect(actual.forward[index]).toBeCloseTo(expected.forward[index], 9);
    expect(actual.inverse?.[index]).toBeCloseTo(expected.inverse[index], 9);
  }
  expect(actual.rotation).toBeCloseTo(expected.rotation, 12);
  expect(actual.scaleX).toBe(expected.scaleX);
  expect(actual.scaleY).toBe(expected.scaleY);
};

for (const count of [3, 24] as const) {
  for (const inverse of [false, true]) {
    defineBenchmark(
      {
        id: `compile/shared-transform/chain-${inverse ? 'inverse' : 'forward'}/${count}`,
        dimensions: ['逐项变换', inverse ? '逆向 · 混合链' : '正向 · 混合链', `${count}项变换 · 单点`],
      },
      () => {
        const workload = createSharedTransformWorkload(count);
        const before = structuredClone(workload);
        return {
          run: () =>
            inverse
              ? inverseTransformChain(workload.world, workload.chain)
              : applyTransformChain(workload.local, workload.chain),
          verify: result => {
            verifyPosition(result, inverse ? workload.local : workload.world);
            expect(workload).toEqual(before);
          },
        };
      },
    );
  }
  defineBenchmark(
    {
      id: `compile/shared-transform/compose-full/${count}`,
      dimensions: ['变换合成', '完整混合链 · 正逆矩阵及累计信息', `${count}项变换`],
    },
    () => {
      const workload = createSharedTransformWorkload(count);
      const before = structuredClone(workload);
      return {
        run: () => composeScopeTransform(workload.chain),
        verify: result => {
          verifyComposedTransform(result, workload);
          expect(workload).toEqual(before);
        },
      };
    },
  );
}

defineBenchmark(
  {
    id: 'compile/shared-transform/compose-append/3',
    dimensions: ['变换合成', '复用21项父链结果 · 显式完整链预置', '追加3项变换'],
  },
  () => {
    const workload = createSharedTransformWorkload(24);
    const parent = composeScopeTransform(workload.chain.slice(0, 21));
    const transforms = workload.chain.slice(21);
    const before = structuredClone({ workload, parent, transforms });
    return {
      run: () => composeScopeTransform(transforms, parent, workload.chain),
      verify: result => {
        verifyComposedTransform(result, workload);
        expect({ workload, parent, transforms }).toEqual(before);
      },
    };
  },
);

for (const inverse of [false, true]) {
  defineBenchmark(
    {
      id: `compile/shared-transform/composed-${inverse ? 'inverse' : 'forward'}/1`,
      dimensions: ['合成矩阵消费', inverse ? '逆向 · 已准备24项链矩阵' : '正向 · 已准备24项链矩阵', '单点'],
    },
    () => {
      const workload = createSharedTransformWorkload(24);
      const composed = composeScopeTransform(workload.chain);
      const before = structuredClone({ workload, composed });
      return {
        run: () =>
          inverse ? inverseScopeTransform(workload.world, composed) : applyScopeTransform(workload.local, composed),
        verify: result => {
          verifyPosition(result, inverse ? workload.local : workload.world);
          expect({ workload, composed }).toEqual(before);
        },
      };
    },
  );
}
