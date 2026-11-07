import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import {
  createPathBenchmarkFixture,
  createPathBenchmarkUpdate,
  flattenPathBenchmarkPrimitives,
  pathBenchmarkReuseLabels,
  preparePathBenchmarkReuse,
  verifyPathBenchmarkFixture,
  verifyPathBenchmarkResult,
  verifyPathBenchmarkReuse,
} from '../_path-workloads';
import type { PathBenchmarkKind, PathBenchmarkReuse } from '../_path-workloads';

const reuseModes: Array<PathBenchmarkReuse> = ['none', 'targets', 'geometry', 'layout', 'stroke', 'all'];
const labelReuseModes: Array<PathBenchmarkReuse> = [
  'none',
  'targets',
  'geometry',
  'labels-half',
  'labels-all',
  'label-content',
  'layout',
  'drawing',
  'stroke',
  'all',
];
const completeInputs: Array<{ kind: PathBenchmarkKind; scale: number; modes: Array<PathBenchmarkReuse> }> = [
  { kind: 'absolute', scale: 1024, modes: reuseModes },
  { kind: 'interrupt-labels', scale: 1024, modes: labelReuseModes },
  {
    kind: 'combined',
    scale: 1024,
    modes: [...labelReuseModes.slice(0, 6), 'marks-placement', 'marks-content', ...labelReuseModes.slice(6)],
  },
  ...(
    [
      'absolute',
      'relative-axis',
      'reference-clip',
      'curves-shapes',
      'smooth',
      'rounded-subpaths',
      'step-labels',
      'interrupt-labels',
      'marks',
      'combined',
    ] as const
  ).flatMap(kind =>
    ([16, 1024] as const)
      .filter(scale => scale !== 1024 || !['absolute', 'interrupt-labels', 'combined'].includes(kind))
      .map(scale => ({ kind, scale, modes: ['none'] satisfies Array<PathBenchmarkReuse> })),
  ),
];

for (const { kind, scale, modes } of completeInputs) {
  for (const reuse of modes) {
    defineBenchmark(
      {
        id: `compile/path/complete-${kind}/${scale}/${reuse}`,
        dimensions: [
          '完整Path编译',
          `${kind} · ${scale}${kind === 'smooth' ? '过点' : '步骤'}${['step-labels', 'interrupt-labels', 'marks', 'combined'].includes(kind) ? ` · ${scale === 16 ? 1 : 16}个标签或标记` : ''}`,
          pathBenchmarkReuseLabels[reuse],
        ],
      },
      () => {
        const fixture = createPathBenchmarkFixture(kind, scale);
        verifyPathBenchmarkFixture(fixture);
        expect(fixture.preparation.compileCalls).toBe(1);
        const prepared = preparePathBenchmarkReuse(fixture.expected, reuse);
        const before = JSON.stringify(prepared);
        return {
          run: () => fixture.compile(prepared),
          verify: result => {
            verifyPathBenchmarkResult(fixture, result);
            // 部分复用不要求重新携带完整的局部layout，独立几何检查已由fixture完整编译负责
            if (reuse === 'none' || reuse === 'all') verifyPathBenchmarkFixture(fixture, result);
            verifyPathBenchmarkReuse(fixture, reuse, prepared, result);
            expect(JSON.stringify(prepared)).toBe(before);
          },
        };
      },
    );
  }
}

for (const kind of ['color', 'label', 'endpoint'] as const) {
  for (const reuse of ['none', 'partial'] as const) {
    defineBenchmark(
      {
        id: `compile/path/update-${kind}-${reuse}/${kind === 'color' ? 16 : 1024}`,
        dimensions: ['真实更新', kind, reuse === 'none' ? '完整重算' : '有效部分复用'],
      },
      () => {
        const update = createPathBenchmarkUpdate(kind);
        verifyPathBenchmarkFixture(update.fixture);
        expect(update.fixture.preparation.compileCalls).toBe(2);
        expect(update.expected.emit).not.toEqual(update.fixture.expected.emit);
        const leaves = flattenPathBenchmarkPrimitives(update.expected.emit!.primitives);
        if (kind === 'color')
          expect(
            leaves.filter(primitive => primitive.type === 'path').every(primitive => primitive.stroke === '#abcdef'),
          ).toBe(true);
        if (kind === 'label')
          expect(leaves.filter(primitive => primitive.type === 'text')[0]?.lines[0].text).toBe('changed-label');
        if (kind === 'endpoint') {
          expect(update.expected.stroke?.layout?.geometry?.commands.at(-1)).toMatchObject({ to: [10330, 60] });
          expect(update.expected.stroke?.layout?.labels?.host?.at(-1)?.placement).not.toEqual(
            update.fixture.expected.stroke?.layout?.labels?.host?.at(-1)?.placement,
          );
        }
        return {
          run: () => update.fixture.compile(reuse === 'none' ? undefined : update.prepared, update.resolution),
          verify: result => {
            verifyPathBenchmarkResult(update.fixture, result, update.expected);
            expect(
              JSON.stringify({ source: update.source, canon: update.resolution.canon, prepared: update.prepared }),
            ).toBe(update.before);
          },
        };
      },
    );
  }
}

for (const { kind, scale } of [
  { kind: 'iterable', scale: 8 },
  { kind: 'iterable', scale: 128 },
  { kind: 'double-stroke', scale: 1024 },
  { kind: 'materialized', scale: 16 },
] as const) {
  defineBenchmark(
    {
      id: `compile/path/custom-${kind}/${scale}`,
      dimensions: ['自定义Path Definition', kind, `${scale}${kind === 'iterable' ? '叶图元' : '步骤'}`],
    },
    () => {
      const fixture = createPathBenchmarkFixture(kind, scale);
      verifyPathBenchmarkFixture(fixture);
      return {
        run: () => fixture.compile(),
        verify: result => {
          verifyPathBenchmarkFixture(fixture, result);
          verifyPathBenchmarkResult(fixture, result);
        },
      };
    },
  );
}
