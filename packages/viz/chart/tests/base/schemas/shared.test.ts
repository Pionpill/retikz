import { describe, expect, it } from 'vitest';

import { ChartPlotSchema } from '../../../src/_shared';

describe('Chart Plot projection schema', () => {
  it('reuses Plot-owned fields without requiring recipe-owned members', () => {
    const plot = {
      data: { reference: 'rows' },
      transform: [{ kind: 'sort', field: 'amount', order: 'descending' }],
      scales: [{ type: 'linear', name: 'x' }],
      coordinate: { type: 'cartesian2D', x: 'x' },
      guides: [{ type: 'axis', dimension: 'x' }],
      marks: [{ type: 'point', encoding: { x: { field: 'amount', scale: 'x' } } }],
      plotTheme: { plotArea: { fill: '#ffffff' } },
      width: 480,
      height: 300,
      meta: { source: 'test' },
    } as const;

    expect(ChartPlotSchema.parse(plot)).toEqual(plot);
    expect(ChartPlotSchema.parse({ data: { reference: 'rows' } })).toEqual({ data: { reference: 'rows' } });
    expect(() => ChartPlotSchema.parse({ data: { source: 'rows' } })).toThrow();
  });

  it('rejects Chart-owned fields and conflicting spatial roots', () => {
    expect(
      ChartPlotSchema.safeParse({
        data: { reference: 'rows' },
        presentation: { children: [{ kind: 'plot', key: 'chart.plot' }] },
      }).success,
    ).toBe(false);

    const result = ChartPlotSchema.safeParse({
      data: { reference: 'rows' },
      coordinate: { type: 'cartesian2D' },
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]).toMatchObject({
      path: ['composition'],
      message: 'Chart Plot extensions cannot use coordinate and composition together',
    });
  });
});
