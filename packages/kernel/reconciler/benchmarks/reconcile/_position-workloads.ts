import type { IRPath } from '@retikz/core';
import { expect } from 'vitest';

import { createBenchmarkWorkload, inspectBenchmarkScene } from './_execution';
import { createUpdateScene, createUpdateWorkload, updateChild } from './_update-workload';

/** 同一长度定位分别消费原始和圆角几何 */
export const positionGeometries = ['original', 'rounded'] as const;

/** 每条路径含三个直线段和一个非匀速曲线段；相邻直线触发圆角 */
const createPositionPath = (index: number, geometry: 'original' | 'rounded'): IRPath => {
  const y = index * 120;
  return {
    type: 'path',
    id: `position-${index}`,
    cornerRadius: 8,
    children: [
      { type: 'step', kind: 'move', to: [0, y] },
      { type: 'step', kind: 'line', to: [40, y] },
      { type: 'step', kind: 'line', to: [40, y + 40] },
      { type: 'step', kind: 'line', to: [80, y + 40] },
      { type: 'step', kind: 'cubic', control1: [80, y + 100], control2: [160, y - 40], to: [160, y + 40] },
    ],
    marks: [{ shape: 'plus', pos: 0.2, positionMode: 'length', positionGeometry: geometry, length: 6, width: 6 }],
  };
};

/** 首次编译输出应保留每条主路径和每个 mark */
export const createPositionWorkload = (count: number, geometry: 'original' | 'rounded') =>
  createBenchmarkWorkload(
    Array.from({ length: count }, (_, index) => createPositionPath(index, geometry)),
    result => {
      const { leaves, owners } = inspectBenchmarkScene(result);
      expect(leaves.filter(primitive => primitive.type === 'path')).toHaveLength(count * 2);
      expect(new Set(owners.values()).size).toBe(count);
    },
  );

/** A/B交替位置变化、独立等值输入与曲线变化；只替换一个目标路径 */
export const createPositionUpdate = (
  count: number,
  geometry: 'original' | 'rounded',
  change: 'position' | 'equal' | 'geometry',
) => {
  const paths = Array.from({ length: count }, (_, index) => createPositionPath(index, geometry));
  const index = Math.floor(count / 2);
  const original = paths[index];
  const changed: IRPath =
    change === 'equal'
      ? structuredClone(original)
      : change === 'position'
        ? { ...original, marks: original.marks?.map(mark => ({ ...mark, pos: 0.8 })) }
        : {
            ...original,
            children: [
              ...original.children.slice(0, -1),
              {
                type: 'step',
                kind: 'cubic',
                control1: [100, index * 120 + 80],
                control2: [140, index * 120 - 60],
                to: [160, index * 120 + 40],
              },
            ],
          };
  return createUpdateWorkload(
    [createUpdateScene(paths), createUpdateScene(paths.map((path, current) => (current === index ? changed : path)))],
    rootId => [[updateChild(rootId, index, changed)], [updateChild(rootId, index, original)]],
    change === 'equal' ? 0 : 1,
    change === 'equal' ? 'equal' : 'real',
  );
};
