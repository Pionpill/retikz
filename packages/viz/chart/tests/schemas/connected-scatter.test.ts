import { describe, expect, it } from 'vitest';

import {
  ConnectedScatterChartEncodingsSchema,
  ConnectedScatterChartMarkSchema,
  ConnectedScatterChartPropertiesSchema,
  ConnectedScatterChartSchema,
} from '../../src/point/connected-scatter';

const minimal = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: { chartType: 'connected-scatter', encodings: { x: 'x', y: 'y', order: 'year' } },
} as const;

describe('连接分散精确 Source schema', () => {
  it('接受最小的 JSON 并需要明确的顺序', () => {
    expect(ConnectedScatterChartSchema.parse(JSON.parse(JSON.stringify(minimal)))).toEqual(minimal);
    expect(() => ConnectedScatterChartEncodingsSchema.parse({ x: 'x', y: 'y' })).toThrow();
  });

  it('接受点/路径外观并拒绝核心层或拓扑更改', () => {
    expect(
      ConnectedScatterChartPropertiesSchema.parse({
        point: { size: 4, color: '#2563eb' },
        path: { strokeWidth: 2, dashPattern: [4, 2], connectNulls: true },
      }),
    ).toBeDefined();
    expect(() => ConnectedScatterChartPropertiesSchema.parse({ point: { zIndex: 2 } })).toThrow();
    expect(() => ConnectedScatterChartPropertiesSchema.parse({ path: { closed: true } })).toThrow();
  });

  it('仅保留位置域填充配方', () => {
    expect(
      ConnectedScatterChartPropertiesSchema.parse({
        domainPadding: { kind: 'range', x: 8, top: 3 },
      }),
    ).toEqual({ colorMode: 'series', domainPadding: { kind: 'range', x: 8, top: 3 } });
    expect(
      ConnectedScatterChartMarkSchema.safeParse({
        kind: 'connected-scatter',
        properties: { domainPadding: { x: 0.02 } },
      }).success,
    ).toBe(false);
  });

  it('仅保留系列配方', () => {
    expect(() =>
      ConnectedScatterChartSchema.parse({
        ...minimal,
        recipe: { ...minimal.recipe, marks: [{ kind: 'connected-scatter', encodings: { series: 'group' } }] },
      }),
    ).toThrow();
  });
});
