import { isRetikzError, RetikzError } from '@retikz/foundation';
import { MarkOperationSchema, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ChartRecipeSeed } from '../../../src/point/recipe';

import { resolvePointChartSpec } from '../../../src/point';
import { ChartResolveError } from '../../../src/point/errors';
import { ChartMemberParseError } from '../../../src/point/merge';
import { ChartRecipeInvariantError } from '../../../src/point/recipe';
import { ScatterChartRecipe } from '../../../src/point/scatter';

const base = {
  namespace: 'chart',
  type: 'scatter',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
} as const;

const bubble = {
  namespace: 'chart',
  type: 'bubble',
  data: { reference: 'rows' },
  encoding: {
    x: { field: 'amount' },
    y: { field: 'margin' },
    size: { field: 'volume' },
  },
} as const;

const scatter = {
  ...bubble,
  type: 'scatter',
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
} as const;

const resolveErrorOf = (input: unknown): ChartResolveError => {
  try {
    resolvePointChartSpec(input);
  } catch (error) {
    expect(error).toBeInstanceOf(ChartResolveError);
    if (error instanceof ChartResolveError) return error;
    throw error;
  }
  throw new Error('expected resolvePointChartSpec to fail');
};

describe('Chart resolution errors', () => {
  it('preserves the resolver error contract and maps details with cause identity', () => {
    const path = ['marks', 1, 'id'] as const;
    const cause = new Error('duplicate member');
    const error = new ChartResolveError('duplicate-id', {
      path,
      target: 'mark.main',
      conflictingId: 'user.mark',
      cause,
    });

    expect(error).toBeInstanceOf(ChartResolveError);
    expect(error).toBeInstanceOf(RetikzError);
    expect(isRetikzError(error)).toBe(true);
    expect(error.name).toBe('ChartResolveError');
    expect(error.message).toBe('Chart resolution failed: duplicate-id');
    expect(error.code).toBe('duplicate-id');
    expect(error.path).toBe(path);
    expect(error.target).toBe('mark.main');
    expect(error.conflictingId).toBe('user.mark');
    expect(error.cause).toBe(cause);
    expect(error.details).toEqual({ path, target: 'mark.main', conflictingId: 'user.mark' });
    expect(error.details.path).toBe(path);
    expect(error.details.target).toBe('mark.main');
    expect(error.details.conflictingId).toBe('user.mark');
    expect(Object.isFrozen(error.details)).toBe(false);

    const noContext = new ChartResolveError('unknown-type', { path: ['type'] });
    expect(noContext.details).toEqual({ path: ['type'] });
    expect(Object.hasOwn(noContext, 'cause')).toBe(true);
    expect(Object.getOwnPropertyNames(noContext)).toContain('cause');
    expect(noContext.cause).toBeUndefined();
  });

  it('does not classify Chart recipe invariant and member parse errors as Foundation errors', () => {
    const invariant = new ChartRecipeInvariantError('required-scale', ['scales']);
    const memberParse = new ChartMemberParseError(
      new z.ZodError([{ code: 'custom', path: ['type'], message: 'invalid mark' }]),
      ['marks', 0],
    );

    expect(invariant).not.toBeInstanceOf(RetikzError);
    expect(memberParse).not.toBeInstanceOf(RetikzError);
    expect(isRetikzError(invariant)).toBe(false);
    expect(isRetikzError(memberParse)).toBe(false);
  });

  it.each([
    [{ namespace: 'chart', type: 'missing' }, 'unknown-type', ['type']],
    [{ ...base, mark: { unknownKey: true } }, 'invalid-chart-spec', ['mark', 'unknownKey']],
    [
      { ...base, presentation: { children: [{ content: { kind: 'preset', preset: 'title', text: 'A' } }] } },
      'invalid-chart-spec',
      ['presentation'],
    ],
    [
      {
        ...base,
        presentation: {
          children: [{ content: { kind: 'preset', preset: 'title', text: '' } }, { content: { kind: 'plot' } }],
        },
      },
      'invalid-chart-spec',
      ['presentation'],
    ],
    [
      {
        ...base,
        presentation: {
          layout: { gap: { column: 0, row: -1 } },
          children: [{ content: { kind: 'plot' } }],
        },
      },
      'invalid-chart-spec',
      ['presentation'],
    ],
    [
      { ...base, presentation: { children: [{ key: 'main', content: { kind: 'plot' } }] } },
      'invalid-chart-spec',
      ['presentation'],
    ],
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
      { ...base, coordinate: { type: 'cartesian1D', x: '__chart.scatter.scale.x' } },
      'core-recipe-violation',
      ['coordinate'],
    ],
  ] as const)('把失败映射为 %s', (input, code, path) => {
    const error = resolveErrorOf(input);
    expect({ code: error.code, path: error.path }).toEqual({ code, path });
  });

  it.each([
    [{ ...bubble, encoding: { x: { field: 'amount' }, y: { field: 'margin' } } }, ['encoding', 'size']],
    [{ ...bubble, encoding: { ...bubble.encoding, size: { value: 8 } } }, ['encoding', 'size', 'field']],
    [
      { ...bubble, encoding: { ...bubble.encoding, size: { field: 'volume', value: 8 } } },
      ['encoding', 'size', 'value'],
    ],
    [
      { ...bubble, encoding: { ...bubble.encoding, color: { value: '#2563eb', scale: 'color' } } },
      ['encoding', 'color'],
    ],
    [{ ...bubble, mark: { size: { kind: 'constant', value: 8 } } }, ['mark', 'size']],
    [{ ...bubble, mark: { encoding: { size: { field: 'otherVolume' } } } }, ['mark', 'encoding', 'size']],
    [
      { ...bubble, mark: { encoding: { channels: { size: { field: 'otherVolume' } } } } },
      ['mark', 'encoding', 'channels', 'size'],
    ],
    [{ ...bubble, mark: { encoding: { text: { field: 'name' } } } }, ['mark', 'encoding', 'text']],
    [{ ...bubble, mark: { encoding: { x: { field: 'otherX' } } } }, ['mark', 'encoding', 'x']],
    [{ ...bubble, mark: { encoding: { y: { field: 'otherY' } } } }, ['mark', 'encoding', 'y']],
  ] as const)('为 Bubble 保留精确的无效输入路径 %s', (input, path) => {
    const error = resolveErrorOf(input);
    expect({ code: error.code, path: error.path }).toEqual({ code: 'invalid-chart-spec', path });
  });

  it('把显式 undefined encoding patch 规范化为缺省值', () => {
    expect(() =>
      resolvePointChartSpec({
        ...bubble,
        mark: { encoding: { text: undefined, size: undefined } },
      }),
    ).not.toThrow();
    expect(() =>
      resolvePointChartSpec({
        ...scatter,
        mark: { encoding: { text: undefined } },
      }),
    ).not.toThrow();
  });

  it.each([
    ['__chart.scatter.mark.main', 'duplicate-id'],
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
    expect(resolveErrorOf({ ...base, encoding: { x: { field: '' }, y: { field: 'margin' } } }).cause).toBeDefined();
  });

  it('不吞掉无关 provider error', () => {
    const providerError = new Error('provider failure');
    const validateCore = vi.spyOn(ScatterChartRecipe, 'validateCore').mockImplementationOnce(() => {
      throw providerError;
    });
    try {
      expect(() => resolvePointChartSpec(base)).toThrow(providerError);
    } finally {
      validateCore.mockRestore();
    }
  });

  it('不吞掉 createSeed 抛出的非 Zod provider error', () => {
    const providerError = new Error('create seed failure');
    const createSeed = vi.spyOn(ScatterChartRecipe, 'createSeed').mockImplementationOnce(() => {
      throw providerError;
    });
    try {
      expect(() => resolvePointChartSpec(base)).toThrow(providerError);
    } finally {
      createSeed.mockRestore();
    }
  });

  it('不把 createSeed 抛出的 ZodError 误译为 resolved Plot failure', () => {
    const providerError = new z.ZodError([{ code: 'custom', path: ['seed'], message: 'provider seed failure' }]);
    const createSeed = vi.spyOn(ScatterChartRecipe, 'createSeed').mockImplementationOnce(() => {
      throw providerError;
    });
    let thrown: unknown;
    try {
      resolvePointChartSpec(base);
    } catch (error) {
      thrown = error;
    } finally {
      createSeed.mockRestore();
    }
    expect(thrown).toBe(providerError);
  });

  it('不把 merge 内非 member schema 的 ZodError 误译为 resolved Plot failure', () => {
    const originalCreateSeed = ScatterChartRecipe.createSeed;
    const createSeed = vi.spyOn(ScatterChartRecipe, 'createSeed').mockImplementationOnce((spec, style) => {
      const seed = originalCreateSeed(spec, style);
      return {
        ...seed,
        plot: { ...seed.plot, marks: [42, ...seed.plot.marks.slice(1)] },
        members: seed.members.map(member => (member.target === 'mark.main' ? { ...member, value: 42 } : member)),
      } as unknown as ChartRecipeSeed;
    });
    let thrown: unknown;
    try {
      resolvePointChartSpec(base);
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
