import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

const base = {
  namespace: 'chart',
  type: 'base',
  plot: {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'rows' },
    scales: [{ type: 'linear', name: 'x' }],
    coordinate: { type: 'cartesian1D', x: 'x' },
    marks: [{ type: 'point', encoding: { x: { field: 'value', scale: 'x' } } }],
  },
} as const;

describe('Base Chart resolution', () => {
  it('resolves an already bound Base Chart without changing its Plot', async () => {
    const { bindChart } = await import('../../../src/_chart/dispatch');
    const { resolveChart } = await import('../../../src/_chart/resolve');
    const resolution = resolveChart(bindChart(base), { theme: DEFAULT_RESOLVED_THEME });

    expect(resolution.chart).toEqual(base);
    expect(resolution.plotSpec).toEqual(base.plot);
  });
});
