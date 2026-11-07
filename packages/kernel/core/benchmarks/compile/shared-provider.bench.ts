import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import {
  materializeScenePrimitives,
  snapshotProviderPosition,
  snapshotScenePrimitives,
} from '../../src/compile/shared';
import type { ScenePrimitive } from '../../src/contract';
import type { IRPosition } from '../../src/schemas';
import { createSharedProviderPathWorkload, createSharedProviderTreeWorkload } from '../_shared-provider-workloads';
import type { SharedProviderWorkload } from '../_shared-provider-workloads';

/** 检查每层复制与字段存在性，避免toEqual忽略undefined字段掩盖快照错误 */
const verifyDetachedSnapshot = (source: unknown, snapshot: unknown, expected: unknown): void => {
  if (expected === null || typeof expected !== 'object') {
    expect(snapshot).toBe(expected);
    return;
  }
  expect(snapshot).not.toBe(source);
  if (Array.isArray(expected)) {
    expect(Array.isArray(snapshot)).toBe(true);
    if (!Array.isArray(source) || !Array.isArray(snapshot)) throw new Error('Expected snapshot arrays');
    expect(snapshot).toHaveLength(expected.length);
    expected.forEach((entry, index) => verifyDetachedSnapshot(source[index], snapshot[index], entry));
    return;
  }
  if (source === null || typeof source !== 'object' || snapshot === null || typeof snapshot !== 'object') {
    throw new Error('Expected snapshot objects');
  }
  expect(Object.keys(snapshot).sort()).toEqual(Object.keys(expected).sort());
  const sourceFields = new Map(Object.entries(source));
  const snapshotFields = new Map(Object.entries(snapshot));
  for (const [key, entry] of Object.entries(expected)) {
    verifyDetachedSnapshot(sourceFields.get(key), snapshotFields.get(key), entry);
  }
};

/** 完整树、原输入不变性及允许资源集合不变性都在计时外验证 */
const createSnapshotBenchmark = (workload: SharedProviderWorkload, run: () => Array<ScenePrimitive>) => {
  const before = structuredClone(workload.primitives);
  const resourceIdsBefore = [...workload.allowedResourceIds];
  return {
    run,
    verify: (result: Array<ScenePrimitive>) => {
      expect(result).toEqual(workload.expected);
      verifyDetachedSnapshot(workload.primitives, result, workload.expected);
      expect(workload.primitives).toStrictEqual(before);
      expect([...workload.allowedResourceIds]).toEqual(resourceIdsBefore);
    },
  };
};

for (const count of [8, 128] as const) {
  for (const materialize of [false, true]) {
    defineBenchmark(
      {
        id: `compile/shared-provider/${materialize ? 'materialize-tree' : 'snapshot-tree'}/${count}`,
        dimensions: [
          materialize ? '图元物化快照' : '图元快照与领域校验',
          '混合图元 · 合法资源与meta · 可选undefined',
          `${count}叶图元 · 3层组`,
        ],
      },
      () => {
        const workload = createSharedProviderTreeWorkload(count);
        return createSnapshotBenchmark(workload, () =>
          materialize
            ? materializeScenePrimitives('benchmark mark', workload.primitives, workload.allowedResourceIds)
            : snapshotScenePrimitives('benchmark shape', workload.emitted, workload.allowedResourceIds),
        );
      },
    );
  }
}

for (const count of [16, 1024] as const) {
  defineBenchmark(
    {
      id: `compile/shared-provider/snapshot-path/${count}`,
      dimensions: ['图元快照与领域校验', '单条长路径 · 合法描边资源', `${count}条命令`],
    },
    () => {
      const workload = createSharedProviderPathWorkload(count);
      return createSnapshotBenchmark(workload, () =>
        snapshotScenePrimitives('benchmark path', workload.emitted, workload.allowedResourceIds),
      );
    },
  );
}

defineBenchmark(
  { id: 'compile/shared-provider/position/1', dimensions: ['Provider坐标快照', '有限二维坐标 · guard边界', '单点'] },
  () => {
    const position: IRPosition = [12.25, -8.5];
    const before = structuredClone(position);
    return {
      run: () => snapshotProviderPosition('benchmark boundary', position),
      verify: result => {
        expect(result).toEqual([12.25, -8.5]);
        expect(result).not.toBe(position);
        expect(position).toEqual(before);
      },
    };
  },
);
