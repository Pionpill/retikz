import { describe, expect, it } from 'vitest';

import type { ChartRecipeSeed } from '../../../src/point/recipe';

import { ScatterChartSpecSchema } from '../../../src/point';
import { ChartResolveError } from '../../../src/point/errors';
import { mergeChartSeed } from '../../../src/point/merge';

const spec = ScatterChartSpecSchema.parse({
  namespace: 'chart',
  type: 'scatter',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
});

const seedWith = (patches: ChartRecipeSeed['patches']): ChartRecipeSeed => ({
  plot: {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'rows' },
    scales: [{ type: 'linear', name: 'x' }],
    coordinate: { type: 'cartesian2D', x: 'x' },
    marks: [{ type: 'point', id: '__chart.scatter.mark', encoding: { x: { field: 'amount' } } }],
  },
  members: [
    {
      target: 'scale.x',
      kind: 'scale',
      core: true,
      value: { type: 'linear', name: 'x' },
      plotPath: ['scales', 0],
      patchablePaths: [],
    },
    {
      target: 'coordinate.main',
      kind: 'coordinate',
      core: true,
      value: { type: 'cartesian2D', x: 'x' },
      plotPath: ['coordinate'],
      patchablePaths: [],
    },
    {
      target: 'mark.main',
      kind: 'mark',
      core: true,
      value: { type: 'point', id: '__chart.scatter.mark', encoding: { x: { field: 'amount' } } },
      plotPath: ['marks', 0],
      patchablePaths: [['opacity']],
    },
  ],
  patches,
});

const mergeErrorOf = (seed: ChartRecipeSeed): ChartResolveError => {
  try {
    mergeChartSeed(spec, seed);
  } catch (error) {
    expect(error).toBeInstanceOf(ChartResolveError);
    if (error instanceof ChartResolveError) return error;
    throw error;
  }
  throw new Error('expected mergeChartSeed to fail');
};

describe('mergeChartSeed malformed patch seam', () => {
  it.each([
    [[], ['components', 0]],
    [[{ path: [], value: 0 }], ['components', 0]],
    [
      [
        { path: ['opacity'], value: 0.5 },
        { path: ['opacity'], value: 0.8 },
      ],
      ['components', 0],
    ],
  ] as const)('把 malformed changes 映射为 invalid-patch', (changes, path) => {
    const error = mergeErrorOf(
      seedWith([
        {
          target: 'mark.main',
          inputPath: ['components', 0],
          changes,
        },
      ]),
    );

    expect({ code: error.code, path: error.path }).toEqual({ code: 'invalid-patch', path });
  });

  it('先报告 unknown target，再检查 malformed change', () => {
    const error = mergeErrorOf(
      seedWith([
        {
          target: 'missing',
          inputPath: ['components', 0],
          changes: [],
        },
      ]),
    );

    expect({ code: error.code, path: error.path }).toEqual({
      code: 'unknown-target',
      path: ['components', 0, 'target'],
    });
  });

  it('跨 patch 先完成全部 target existence 检查', () => {
    const error = mergeErrorOf(
      seedWith([
        {
          target: 'mark.main',
          inputPath: ['mark'],
          changes: [{ path: ['encoding'], value: {} }],
        },
        {
          target: 'missing',
          inputPath: ['components', 0],
          changes: [],
        },
      ]),
    );

    expect({ code: error.code, path: error.path }).toEqual({
      code: 'unknown-target',
      path: ['components', 0, 'target'],
    });
  });

  it('跨 patch 先完成全部 target uniqueness 检查', () => {
    const error = mergeErrorOf(
      seedWith([
        {
          target: 'mark.main',
          inputPath: ['mark'],
          changes: [],
        },
        {
          target: 'mark.main',
          inputPath: ['components', 0],
          changes: [{ path: ['opacity'], value: 0.5 }],
        },
      ]),
    );

    expect({ code: error.code, path: error.path }).toEqual({
      code: 'duplicate-target',
      path: ['components', 0, 'target'],
    });
  });

  it.each([
    ['missing path', ['marks', 1], { type: 'point', id: '__chart.scatter.mark', encoding: { x: { field: 'amount' } } }],
    [
      'mismatched value',
      ['marks', 0],
      {
        type: 'point',
        id: '__chart.scatter.mark',
        opacity: { kind: 'constant', value: 0.5 },
        encoding: { x: { field: 'amount' } },
      },
    ],
  ] as const)('拒绝 seed member 的 %s', (_name, plotPath, value) => {
    const seed = seedWith([]);
    const mark = seed.members.find(member => member.target === 'mark.main');
    expect(mark).toBeDefined();

    expect(() =>
      mergeChartSeed(spec, {
        ...seed,
        members: seed.members.map(member => (member === mark ? { ...member, plotPath, value } : member)),
      }),
    ).toThrow('Chart recipe seed member "mark.main"');
  });

  it('拒绝重复的 seed semantic target', () => {
    const seed = seedWith([]);

    expect(() =>
      mergeChartSeed(spec, {
        ...seed,
        members: seed.members.map(member =>
          member.target === 'coordinate.main' ? { ...member, target: 'scale.x' } : member,
        ),
      }),
    ).toThrow('Chart recipe seed member target "scale.x" is duplicated');
  });

  it('拒绝未被 member index 覆盖的 seed Plot member', () => {
    const seed = seedWith([]);

    expect(() =>
      mergeChartSeed(spec, {
        ...seed,
        members: seed.members.filter(member => member.target !== 'coordinate.main'),
      }),
    ).toThrow('Chart recipe seed members do not cover Plot member at ["coordinate"]');
  });
});
