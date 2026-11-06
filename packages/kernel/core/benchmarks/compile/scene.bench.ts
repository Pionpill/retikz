import { assert, expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import {
  buildMarkerGroup,
  calculateBoundsOfPrimitives,
  calculateLayoutFromBounds,
  createRound,
  mergeLayoutBounds,
  viewBoxToLayout,
} from '../../src/compile/scene';
import { createSceneBoundsWorkload, createSceneMarkerWorkload, createSceneMergeWorkload } from '../_scene-workloads';
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

for (const count of [16, 1024]) {
  for (const shadowed of [false, true]) {
    defineBenchmark(
      {
        id: `compile/scene/merge-${shadowed ? 'shadow' : 'plain'}/${count}`,
        dimensions: ['布局边界合并', shadowed ? '方向性阴影与已有边界' : '点集与已有边界', `${count}点`],
      },
      () => {
        const workload = createSceneMergeWorkload(count, shadowed);
        const before = structuredClone(workload);
        return {
          run: () => mergeLayoutBounds(workload.current, workload.points, workload.shadow),
          verify: result => {
            expect(result).toEqual(workload.expectedBounds);
            expect(workload).toEqual(before);
          },
        };
      },
    );
  }
}

defineBenchmark(
  { id: 'compile/scene/layout-auto/1', dimensions: ['Scene布局', '自动边界 · padding与取整', '单次固定输入'] },
  () => {
    const bounds = { minX: -12.25, minY: -5.5, maxX: 87.75, maxY: 44.5 };
    const before = structuredClone(bounds);
    const round = createRound(2);
    return {
      run: () => calculateLayoutFromBounds(bounds, 2.125, round),
      verify: result => {
        expect(result).toEqual({ x: -14.37, y: -7.62, width: 104.25, height: 54.25 });
        expect(bounds).toEqual(before);
      },
    };
  },
);

defineBenchmark(
  { id: 'compile/scene/layout-explicit/1', dimensions: ['Scene布局', '显式viewBox · 取整', '单次固定输入'] },
  () => {
    const viewBox = { x: -12.375, y: 0.125, width: 100.125, height: 50.125 };
    const before = structuredClone(viewBox);
    const round = createRound(2);
    return {
      run: () => viewBoxToLayout(viewBox, round),
      verify: result => {
        expect(result).toEqual({ x: -12.37, y: 0.13, width: 100.13, height: 50.13 });
        expect(viewBox).toEqual(before);
      },
    };
  },
);

for (const count of [8, 128]) {
  for (const fixedRotation of [false, true]) {
    defineBenchmark(
      {
        id: `compile/scene/marker-${fixedRotation ? 'fixed' : 'auto'}/${count}`,
        dimensions: [
          'Marker放置与物化',
          `${fixedRotation ? '固定30度' : '切线自动90度'} · 嵌套组/文字/描边色/透明度`,
          `${count}叶图元 · 3层组`,
        ],
      },
      () => {
        const workload = createSceneMarkerWorkload(count, fixedRotation);
        const beforeSpec = structuredClone(workload.spec);
        const beforeSample = structuredClone(workload.sample);
        const beforeContext = { ...workload.context };
        return {
          run: () => buildMarkerGroup(workload.spec, workload.sample, workload.context),
          verify: result => {
            expect(result).toEqual(workload.expectedGroup);
            expect(workload.spec).toEqual(beforeSpec);
            expect(workload.sample).toEqual(beforeSample);
            expect(workload.context).toEqual(beforeContext);
          },
        };
      },
    );
  }
}
