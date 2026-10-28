import { describe, expect, it } from 'vitest';

import { PlotSchema } from '../../src/schemas';

describe('TransformSchema 外部操作', () => {
  it('绘图规范转换接受自定义操作', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      transform: [{ operation: { kind: 'custom-regression', params: { x: 'year', y: 'value' } } }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      marks: [{ type: 'point', encodings: { position: { x: { field: 'year' }, y: { field: 'value' } } } }],
    };

    expect(PlotSchema.parse(spec).transform).toEqual(spec.transform);
  });
});
