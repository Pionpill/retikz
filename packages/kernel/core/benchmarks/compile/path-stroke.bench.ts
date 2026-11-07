import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { bindPathTargets } from '../../src/compile/path';
import { emitStrokePath } from '../../src/compile/path/stroke/emit';
import { layoutStrokePath } from '../../src/compile/path/stroke/layout';
import {
  createPathBenchmarkFixture,
  createPathBenchmarkStroke,
  verifyPathBenchmarkFixture,
  verifyPathBenchmarkResult,
} from '../_path-workloads';

for (const scale of [16, 1024] as const) {
  defineBenchmark(
    {
      id: `compile/path/bind-targets/${scale}`,
      dimensions: ['目标绑定', '真实引用 · 两端节点 · 平移坐标系', `${scale}目标`],
    },
    () => {
      const fixture = createPathBenchmarkFixture('reference-clip', scale);
      verifyPathBenchmarkFixture(fixture);
      return {
        run: () => bindPathTargets(fixture.resolution, fixture.freshContext()),
        verify: result => {
          expect(result.targets).toEqual(fixture.expected.targets);
          expect(result.targets.size).toBe(scale);
          expect([...result.targets.values()][0].point).toEqual([0, 0]);
          expect([...result.targets.values()].at(-1)?.point).toEqual([(scale - 1) * 10, 0]);
          expect(result.canon.children).toEqual(fixture.resolution.canon.children);
          verifyPathBenchmarkResult(fixture, fixture.expected);
        },
      };
    },
  );
}

defineBenchmark(
  {
    id: 'compile/path/stroke-layout/1024',
    dimensions: ['独立stroke布局', '绑定已准备 · 16标签/16标记/双端箭头', '1024步骤'],
  },
  () => {
    const { fixture, resolution, context } = createPathBenchmarkStroke();
    verifyPathBenchmarkFixture(fixture);
    const before = JSON.stringify({ canon: resolution.canon, targets: [...resolution.targets] });
    return {
      run: () => layoutStrokePath(resolution, context),
      verify: result => {
        expect(result.overall).toEqual(fixture.expected.stroke?.layout?.overall);
        expect(result.overall?.body.kind).toBe('interrupted');
        expect(result.overall?.labels.host).toHaveLength(16);
        expect(result.overall?.marks).toHaveLength(16);
        expect(JSON.stringify({ canon: resolution.canon, targets: [...resolution.targets] })).toBe(before);
        verifyPathBenchmarkResult(fixture, fixture.expected);
      },
    };
  },
);

defineBenchmark(
  {
    id: 'compile/path/stroke-emit/1024',
    dimensions: ['独立stroke绘制', '布局与资源已准备 · 16标签/16标记/双端箭头', '1024步骤'],
  },
  () => {
    const { fixture, resolution, context } = createPathBenchmarkStroke();
    verifyPathBenchmarkFixture(fixture);
    const layout = fixture.expected.stroke!.layout!.overall!;
    const before = JSON.stringify(layout);
    return {
      run: () => emitStrokePath(resolution, layout, context),
      verify: result => {
        expect(result.overall).toEqual(fixture.expected.emit);
        expect(JSON.stringify(layout)).toBe(before);
        verifyPathBenchmarkResult(fixture, fixture.expected);
      },
    };
  },
);
