import { assert, expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { calculateBoundsOfPrimitives } from '../../src/compile/scene';
import { createSceneBoundsWorkload } from '../_scene-workloads';
import type { SceneBoundsMode } from '../_scene-workloads';

/** 固定场景集合，采样后不按收益筛选或修改权重 */
const modes: Array<{ mode: SceneBoundsMode; title: string }> = [
  { mode: 'polyline', title: '折线 · 无箭头' },
  { mode: 'bezier', title: '三次贝塞尔 · 无箭头' },
  { mode: 'ellipse', title: '旋转椭圆弧 · 无箭头' },
  { mode: 'arrows', title: '旋转椭圆弧 · 双端可见箭头' },
  { mode: 'hidden-arrows', title: '旋转椭圆弧 · 双端透明箭头' },
  { mode: 'clipped-group', title: '折线 · 局部裁剪后平移' },
];

for (const { mode, title } of modes) {
  for (const count of [16, 1024]) {
    defineBenchmark(
      { id: `compile/scene/${mode}/${count}`, dimensions: ['可见边界', title, `${count}条路径命令`] },
      () => {
        const workload = createSceneBoundsWorkload(count, mode);
        const before = structuredClone(workload);
        return {
          run: () => calculateBoundsOfPrimitives(workload.primitives, workload.resources),
          verify: bounds => {
            assert(bounds !== undefined);
            for (const field of ['x', 'y', 'width', 'height'] as const) {
              expect(bounds[field]).toBeCloseTo(workload.expectedBounds[field], 10);
            }
            expect(Object.isFrozen(bounds)).toBe(true);
            expect(workload).toEqual(before);
          },
        };
      },
    );
  }
}
