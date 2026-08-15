import { describe, expect, it } from 'vitest';

import { ChartSharedSchema } from '../../../src/base/schemas/common';

describe('Chart shared schemas', () => {
  it('复用 Data 与 Plot 字段契约', () => {
    expect(
      ChartSharedSchema.parse({
        id: 'sales',
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
      }),
    ).toEqual({
      id: 'sales',
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
    });

    expect(() => ChartSharedSchema.parse({ data: { source: 'rows' } })).toThrow();
    expect(() =>
      ChartSharedSchema.parse({ data: { reference: 'rows' }, scales: [{ type: 'linear', name: '' }] }),
    ).toThrow();
  });

  it('拒绝已移除的 Plot-level presentation layout', () => {
    expect(
      ChartSharedSchema.safeParse({
        data: { reference: 'rows' },
        layout: { autoPadding: true },
      }).success,
    ).toBe(false);
  });

  it('拒绝把 canonical presentation 混入 typed Chart shared fragment', () => {
    expect(
      ChartSharedSchema.safeParse({
        data: { reference: 'rows' },
        presentation: {
          children: [
            { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'Revenue' },
            { kind: 'plot', key: 'chart.plot' },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it('接受 owner composition 字段作为唯一空间根', () => {
    expect(
      ChartSharedSchema.parse({
        data: { reference: 'rows' },
        composition: {
          defaultView: 'main',
          views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
        },
      }),
    ).toEqual({
      data: { reference: 'rows' },
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
      },
    });
  });

  it('对 shared 与最终 variant 使用同一空间根互斥诊断', () => {
    const result = ChartSharedSchema.safeParse({
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
      message: 'Chart spec cannot use coordinate and composition together',
    });
  });
});
