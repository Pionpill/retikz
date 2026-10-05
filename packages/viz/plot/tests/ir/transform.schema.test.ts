import { describe, expect, it } from 'vitest';

import { PlotSchema } from '../../src/schemas';

describe('TransformSchema external operations', () => {
  it('plot_spec_transform_accepts_custom_operation', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      transform: [{ operation: { kind: 'regression', x: 'year', y: 'value' } }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      marks: [{ type: 'point', encoding: { x: { field: 'year' }, y: { field: 'value' } } }],
    };

    expect(PlotSchema.parse(spec).transform).toEqual(spec.transform);
  });
});
