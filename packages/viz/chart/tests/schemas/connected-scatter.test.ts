import { describe, expect, it } from 'vitest';

import {
  ConnectedScatterChartEncodingsSchema,
  ConnectedScatterChartPropertiesSchema,
  ConnectedScatterChartSchema,
} from '../../src/point/connected-scatter';

const minimal = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: { chartType: 'connected-scatter', encodings: { x: 'x', y: 'y', order: 'year' } },
} as const;

describe('Connected Scatter exact Source schema', () => {
  it('accepts minimal JSON and requires explicit order', () => {
    expect(ConnectedScatterChartSchema.parse(JSON.parse(JSON.stringify(minimal)))).toEqual(minimal);
    expect(() => ConnectedScatterChartEncodingsSchema.parse({ x: 'x', y: 'y' })).toThrow();
  });

  it('accepts point/path appearance and rejects core layer or topology changes', () => {
    expect(
      ConnectedScatterChartPropertiesSchema.parse({
        point: { size: 4, color: '#2563eb' },
        path: { strokeWidth: 2, dashPattern: [4, 2], connectNulls: true },
      }),
    ).toBeDefined();
    expect(() => ConnectedScatterChartPropertiesSchema.parse({ point: { zIndex: 2 } })).toThrow();
    expect(() => ConnectedScatterChartPropertiesSchema.parse({ path: { closed: true } })).toThrow();
  });

  it('keeps series recipe-only', () => {
    expect(() =>
      ConnectedScatterChartSchema.parse({
        ...minimal,
        recipe: { ...minimal.recipe, marks: [{ kind: 'connected-scatter', encodings: { series: 'group' } }] },
      }),
    ).toThrow();
  });
});
