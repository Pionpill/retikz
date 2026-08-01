import { MarkOperationSchema, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ChartRecipeSeed } from '../../src/providers';

import { ChartResolveError, resolveChartSpec } from '../../src/pipeline';
import { InfrastructureChartRecipe } from '../../src/providers';

const base = {
  namespace: 'chart',
  type: '__infrastructure-fixture',
  data: { reference: 'rows' },
  encoding: { x: 'amount', y: 'margin' },
} as const;

const resolveErrorOf = (input: unknown): ChartResolveError => {
  try {
    resolveChartSpec(input);
  } catch (error) {
    expect(error).toBeInstanceOf(ChartResolveError);
    if (error instanceof ChartResolveError) return error;
    throw error;
  }
  throw new Error('expected resolveChartSpec to fail');
};

describe('Chart resolution errors', () => {
  it.each([
    [{ namespace: 'chart', type: 'missing' }, 'unknown-type', ['type']],
    [{ ...base, mark: { unknownKey: true } }, 'invalid-chart-spec', ['mark', 'unknownKey']],
    [{ ...base, components: [{ target: 'missing', grid: true }] }, 'unknown-target', ['components', 0, 'target']],
    [
      {
        ...base,
        components: [
          { target: 'guide.x', grid: true },
          { target: 'guide.x', grid: false },
        ],
      },
      'duplicate-target',
      ['components', 1, 'target'],
    ],
    [{ ...base, components: [{ target: 'mark.main', grid: true }] }, 'protected-field', ['components', 0, 'grid']],
    [
      {
        ...base,
        scales: [
          { type: 'linear', name: 'z' },
          { type: 'linear', name: 'z' },
        ],
      },
      'duplicate-scale',
      ['scales', 1, 'name'],
    ],
    [
      {
        ...base,
        composition: {
          defaultView: 'main',
          views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
        },
      },
      'coordinate-conflict',
      ['composition'],
    ],
    [{ ...base, coordinate: { type: 'cartesian2D', x: 'wrong', y: 'y' } }, 'core-recipe-violation', ['coordinate']],
    [
      {
        ...base,
        guides: [],
        components: [{ target: 'guide.x', grid: true }],
      },
      'unknown-target',
      ['components', 0, 'target'],
    ],
  ] as const)('把失败映射为 %s', (input, code, path) => {
    const error = resolveErrorOf(input);
    expect({ code: error.code, path: error.path }).toEqual({ code, path });
  });

  it.each([
    ['__chart.__infrastructure-fixture.mark.main', 'duplicate-id'],
    ['__chart.user.mark', 'reserved-id'],
  ] as const)('按 recipe/reserved 优先级诊断 id %s', (id, code) => {
    const error = resolveErrorOf({
      ...base,
      marks: [{ type: 'point', id, encoding: { x: { field: 'amount' } } }],
    });

    expect({ code: error.code, path: error.path, conflictingId: error.conflictingId }).toEqual({
      code,
      path: ['marks', 0, 'id'],
      conflictingId: id,
    });
  });

  it('诊断 user-user duplicate id', () => {
    const error = resolveErrorOf({
      ...base,
      marks: [
        { type: 'point', id: 'user.mark', encoding: { x: { field: 'amount' } } },
        { type: 'point', id: 'user.mark', encoding: { y: { field: 'margin' } } },
      ],
    });

    expect({ code: error.code, path: error.path, conflictingId: error.conflictingId }).toEqual({
      code: 'duplicate-id',
      path: ['marks', 1, 'id'],
      conflictingId: 'user.mark',
    });
  });

  it('保留 invalid Chart spec 的 Zod cause', () => {
    expect(resolveErrorOf({ ...base, encoding: { x: '', y: 'margin' } }).cause).toBeDefined();
  });

  it('不吞掉无关 provider error', () => {
    const providerError = new Error('provider failure');
    const validateCore = vi.spyOn(InfrastructureChartRecipe, 'validateCore').mockImplementationOnce(() => {
      throw providerError;
    });
    try {
      expect(() => resolveChartSpec(base)).toThrow(providerError);
    } finally {
      validateCore.mockRestore();
    }
  });

  it('不吞掉 createSeed 抛出的非 Zod provider error', () => {
    const providerError = new Error('create seed failure');
    const createSeed = vi.spyOn(InfrastructureChartRecipe, 'createSeed').mockImplementationOnce(() => {
      throw providerError;
    });
    try {
      expect(() => resolveChartSpec(base)).toThrow(providerError);
    } finally {
      createSeed.mockRestore();
    }
  });

  it('不把 createSeed 抛出的 ZodError 误译为 resolved Plot failure', () => {
    const providerError = new z.ZodError([{ code: 'custom', path: ['seed'], message: 'provider seed failure' }]);
    const createSeed = vi.spyOn(InfrastructureChartRecipe, 'createSeed').mockImplementationOnce(() => {
      throw providerError;
    });
    let thrown: unknown;
    try {
      resolveChartSpec(base);
    } catch (error) {
      thrown = error;
    } finally {
      createSeed.mockRestore();
    }
    expect(thrown).toBe(providerError);
  });

  it('不把 merge 内非 member schema 的 ZodError 误译为 resolved Plot failure', () => {
    const originalCreateSeed = InfrastructureChartRecipe.createSeed;
    const createSeed = vi.spyOn(InfrastructureChartRecipe, 'createSeed').mockImplementationOnce((spec, style) => {
      const seed = originalCreateSeed(spec, style);
      return {
        ...seed,
        plot: { ...seed.plot, marks: [42, ...seed.plot.marks.slice(1)] },
        members: seed.members.map(member => (member.target === 'mark.main' ? { ...member, value: 42 } : member)),
      } as unknown as ChartRecipeSeed;
    });
    let thrown: unknown;
    try {
      resolveChartSpec(base);
    } catch (error) {
      thrown = error;
    } finally {
      createSeed.mockRestore();
    }
    expect(thrown).toBeInstanceOf(z.ZodError);
    expect(thrown).not.toBeInstanceOf(ChartResolveError);
  });

  it('把 merge member parse failure 映射为带 collection 路径的 invalid-resolved-plot', () => {
    const memberError = new z.ZodError([
      { code: 'custom', path: ['type'], message: 'invalid mark', params: { origin: 'member-parse' } },
    ]);
    const parse = vi.spyOn(MarkOperationSchema, 'parse').mockImplementationOnce(() => {
      throw memberError;
    });
    try {
      const error = resolveErrorOf(base);
      expect({ code: error.code, path: error.path }).toEqual({
        code: 'invalid-resolved-plot',
        path: ['marks', 0, 'type'],
      });
      expect(error.cause).toBe(memberError);
      expect(memberError.issues[0]).toMatchObject({
        code: 'custom',
        message: 'invalid mark',
        params: { origin: 'member-parse' },
      });
    } finally {
      parse.mockRestore();
    }
  });

  it('把最终 PlotSpec parse failure 映射为 invalid-resolved-plot', () => {
    const invalid = PlotSpecSchema.safeParse({});
    expect(invalid.success).toBe(false);
    if (invalid.success) return;
    const parse = vi.spyOn(PlotSpecSchema, 'parse').mockImplementationOnce(() => {
      throw invalid.error;
    });
    try {
      const error = resolveErrorOf(base);
      expect({ code: error.code, path: error.path, cause: error.cause }).toEqual({
        code: 'invalid-resolved-plot',
        path: ['namespace'],
        cause: invalid.error,
      });
    } finally {
      parse.mockRestore();
    }
  });
});
