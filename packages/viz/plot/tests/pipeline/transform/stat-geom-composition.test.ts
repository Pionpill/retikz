import type { IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: LowerPlotsOptions = { layout: { width: 480, height: 300 } };

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: LowerPlotsOptions,
): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
};

const layerOf = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>, index: number): IRScope =>
  expandOf(spec, datasets, opts).children[index] as IRScope;

describe('统计几何组合表面（契约）', () => {
  const boxRows = [
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 1 },
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 2 },
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 3 },
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 4 },
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 20 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 4 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 5 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 6 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 7 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 30 },
  ];

  const boxSummary = {
    kind: 'summarize',
    params: {
      groupBy: ['group', 'boxX', 'boxX0', 'boxX1'],
      metrics: [
        {
          kind: 'quantile-band',
          field: 'value',
          lowerP: 0.25,
          upperP: 0.75,
          outputs: {
            lower: 'boxLow',
            upper: 'boxHigh',
            points: [{ p: 0.5, as: 'median' }],
            whiskerMin: 'whiskerMin',
            whiskerMax: 'whiskerMax',
          },
          whisker: { kind: 'spread', factor: 1.5 },
        },
      ],
    },
  } as const;

  const boxOutside = {
    kind: 'select',
    params: {
      groupBy: ['group'],
      selector: {
        kind: 'outside-quantile-band',
        field: 'value',
        lowerP: 0.25,
        upperP: 0.75,
        boundary: { kind: 'spread', factor: 1.5 },
      },
    },
  } as const;

  it('箱线图合成使用区间、关系和点图层，没有箱线图标记类型', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'boxRows' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          transforms: [{ operation: boxSummary }],
          encodings: {
            bounds: {
              x: { from: { field: 'boxX0' }, to: { field: 'boxX1' } },
              y: { from: { field: 'boxLow' }, to: { field: 'boxHigh' } },
            },
            position: { x: { field: 'boxX' }, y: { field: 'boxHigh' } },
          },
          properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } }, opacity: { fill: 0.28 } },
        },
        {
          type: 'relation',
          transforms: [{ operation: boxSummary }],
          encodings: {
            source: { position: { x: { field: 'boxX0' }, y: { field: 'median' } } },
            target: { position: { x: { field: 'boxX1' }, y: { field: 'median' } } },
          },
          properties: { geometry: { kind: 'path' } },
        },
        {
          type: 'relation',
          transforms: [{ operation: boxSummary }],
          encodings: {
            source: { position: { x: { field: 'boxX' }, y: { field: 'whiskerMin' } } },
            target: { position: { x: { field: 'boxX' }, y: { field: 'whiskerMax' } } },
          },
          properties: { geometry: { kind: 'path' } },
        },
        {
          type: 'point',
          transforms: [{ operation: boxOutside }],
          encodings: { position: { x: { field: 'boxX' }, y: { field: 'value' } } },
        },
      ],
    });

    const boxLayer = layerOf(spec, { boxRows }, 0);
    const medianLayer = layerOf(spec, { boxRows }, 1);
    const whiskerLayer = layerOf(spec, { boxRows }, 2);
    const outsideLayer = layerOf(spec, { boxRows }, 3);

    expect(boxLayer.children).toHaveLength(2);
    expect(medianLayer.children.filter(child => child.type === 'path')).toHaveLength(2);
    expect(whiskerLayer.children.filter(child => child.type === 'path')).toHaveLength(2);
    expect(outsideLayer.children).toHaveLength(2);
    expect(JSON.stringify(spec)).not.toMatch(/boxplot|densityMark|regression/i);
  });

  it('原始统计层和派生统计层可以共存，无需命名数据视图', () => {
    const samples = [
      { group: 'A', time: 0, value: 1 },
      { group: 'A', time: 1, value: 3 },
      { group: 'A', time: 2, value: 5 },
    ];
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encodings: { position: { x: { field: 'time' }, y: { field: 'value' } } } },
        {
          type: 'path',
          transforms: [
            {
              operation: {
                kind: 'smooth',
                params: { x: 'time', y: 'value', sampleCount: 5, xAs: 'trendX', yAs: 'trendY' },
              },
            },
          ],
          encodings: { order: 'trendX', position: { x: { field: 'trendX' }, y: { field: 'trendY' } } },
        },
        {
          type: 'path',
          transforms: [
            {
              operation: {
                kind: 'density',
                params: {
                  field: 'value',
                  bandwidth: { kind: 'value', value: 2 },
                  sampleCount: 4,
                  xAs: 'densityX',
                  densityAs: 'density',
                },
              },
            },
          ],
          encodings: { order: 'densityX', position: { x: { field: 'densityX' }, y: { field: 'density' } } },
          properties: { closure: { kind: 'baseline', baseline: 0 } },
        },
      ],
    });

    const outer = expandOf(spec, { samples }, opts);

    expect((outer.children[0] as IRScope).children).toHaveLength(3);
    expect(((outer.children[1] as IRScope).children[0] as IRPath).children).toHaveLength(5);
    expect(((outer.children[2] as IRScope).children[0] as IRPath).children.at(-1)).toEqual({
      type: 'step',
      kind: 'cycle',
    });
  });
});
