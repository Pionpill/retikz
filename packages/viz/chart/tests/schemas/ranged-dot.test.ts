import { describe, expect, it } from 'vitest';

import {
  RangedDotChartEncodingsSchema,
  RangedDotChartMarkSchema,
  RangedDotChartPropertiesSchema,
  RangedDotChartSchema,
} from '../../src/point/ranged-dot';

const minimalSource = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: {
    chartType: 'ranged-dot',
    encodings: { category: 'category', start: 'before', end: 'after' },
  },
} as const;

describe('范围点精确 Source schema', () => {
  it('接受最小 JSON Source，而不实现默认值', () => {
    expect(RangedDotChartSchema.parse(JSON.parse(JSON.stringify(minimalSource)))).toEqual(minimalSource);
  });

  it.each([
    ['category', { start: 'before', end: 'after' }],
    ['start', { category: 'category', end: 'after' }],
    ['end', { category: 'category', start: 'before' }],
  ])('需要 %s', (_name, encodings) => {
    expect(() => RangedDotChartEncodingsSchema.parse(encodings)).toThrow();
  });

  it('接受成员样式并拒绝拓扑或图层覆盖', () => {
    expect(
      RangedDotChartPropertiesSchema.parse({
        point: { size: 5, strokeWidth: 1 },
        startPoint: { color: '#2563eb', shape: 'circle' },
        endPoint: { color: '#dc2626', shape: 'diamond' },
        range: { stroke: '#64748b', strokeWidth: 2, dashPattern: [4, 2] },
      }),
    ).toBeDefined();
    expect(() => RangedDotChartPropertiesSchema.parse({ point: { zIndex: 2 } })).toThrow();
    expect(() => RangedDotChartPropertiesSchema.parse({ startPoint: { dx: 3 } })).toThrow();
    expect(() => RangedDotChartPropertiesSchema.parse({ range: { closed: true } })).toThrow();
  });

  it('仅保留位置域填充配方', () => {
    expect(RangedDotChartPropertiesSchema.parse({ domainPadding: { default: 5, right: 8 } })).toEqual({
      domainPadding: { default: 5, right: 8 },
    });
    expect(
      RangedDotChartMarkSchema.safeParse({ kind: 'ranged-dot', properties: { domainPadding: 0.04 } }).success,
    ).toBe(false);
  });

  it('仅保留颜色配方并拒绝未知标记字段', () => {
    expect(() =>
      RangedDotChartSchema.parse({
        ...minimalSource,
        recipe: {
          ...minimalSource.recipe,
          marks: [{ kind: 'ranged-dot', encodings: { color: 'series' } }],
        },
      }),
    ).toThrow();
  });

  it('需要开始和结束来命名相同的编写 x 比例', () => {
    expect(() =>
      RangedDotChartEncodingsSchema.parse({
        category: 'category',
        start: { field: 'before', scale: { operation: { type: 'linear', name: 'startScale' } } },
        end: { field: 'after', scale: { reference: 'endScale' } },
      }),
    ).toThrow(/start and end must use the same x scale/i);

    expect(
      RangedDotChartEncodingsSchema.parse({
        category: 'category',
        start: { field: 'before', scale: { operation: { type: 'linear', name: 'rangeScale' } } },
        end: { field: 'after', scale: { reference: 'rangeScale' } },
      }),
    ).toBeDefined();
  });
});
