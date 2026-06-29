import { AxisGridApplyTo, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { plotBuilder } from '../src';

describe('plotBuilder', () => {
  it('assembles composition marks and guides as plain PlotSpec data', () => {
    const built = plotBuilder({
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      composition: {
        defaultScope: 'main',
        scopes: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      },
    })
      .point({ type: 'point', coordinateScope: 'main', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
      .axis({ type: 'axis', dimension: 'y', coordinateScope: 'main', title: 'Revenue' })
      .build();

    expect(built.coordinate).toBeUndefined();
    expect(built.marks[0]).toMatchObject({ type: 'point', coordinateScope: 'main' });
    expect(built.guides?.[0]).toMatchObject({ type: 'axis', coordinateScope: 'main', title: 'Revenue' });
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });

  it('passes axis grid target selectors as plain PlotSpec data', () => {
    const built = plotBuilder({
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      composition: {
        defaultScope: 'main',
        scopes: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      },
    })
      .point({ type: 'point', coordinateScope: 'main', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })
      .axis({
        type: 'axis',
        dimension: 'y',
        coordinateScope: 'main',
        grid: { applyTo: AxisGridApplyTo.Selected, select: { scopes: ['main'] } },
      })
      .build();

    expect(built.guides?.[0]).toMatchObject({
      type: 'axis',
      dimension: 'y',
      grid: { applyTo: 'selected', select: { scopes: ['main'] } },
    });
    expect(() => PlotSpecSchema.parse(built)).not.toThrow();
  });
});
