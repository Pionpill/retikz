import type { IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: LowerPlotsOptions,
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec).children[0] as IRScope;
};

const layerOf = (spec: IRPlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, index: number): IRScope =>
  expandOf(spec, datasets, opts).children[index] as IRScope;

describe('stat-geom composition surface (contract)', () => {
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
  } as const;

  const boxOutside = {
    kind: 'select',
    groupBy: ['group'],
    selector: {
      kind: 'outside-quantile-band',
      field: 'value',
      lowerP: 0.25,
      upperP: 0.75,
      boundary: { kind: 'spread', factor: 1.5 },
    },
  } as const;

  it('boxplot composition uses interval, reference, and point layers without a boxplot mark type', () => {
    const spec = PlotSpecSchema.parse({
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
          transform: [boxSummary],
          bounds: {
            x: { kind: 'extent', from: 'boxX0', to: 'boxX1' },
            y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' },
          },
          fillOpacity: { kind: 'constant', value: 0.28 },
          encoding: { x: { field: 'boxX' }, y: { field: 'boxHigh' } },
        },
        {
          type: 'reference',
          transform: [boxSummary],
          extentField: 'boxX0',
          extentToField: 'boxX1',
          encoding: { y: { field: 'median' } },
        },
        {
          type: 'reference',
          transform: [boxSummary],
          extentField: 'whiskerMin',
          extentToField: 'whiskerMax',
          encoding: { x: { field: 'boxX' } },
        },
        {
          type: 'point',
          transform: [boxOutside],
          encoding: { x: { field: 'boxX' }, y: { field: 'value' } },
        },
      ],
    });

    const boxLayer = layerOf(spec, { boxRows }, 0);
    const medianLayer = layerOf(spec, { boxRows }, 1);
    const whiskerLayer = layerOf(spec, { boxRows }, 2);
    const outsideLayer = layerOf(spec, { boxRows }, 3);

    expect(boxLayer.children).toHaveLength(2);
    expect(medianLayer.children).toHaveLength(2);
    expect(whiskerLayer.children).toHaveLength(2);
    expect(outsideLayer.children).toHaveLength(2);
    expect(JSON.stringify(spec)).not.toMatch(/boxplot|densityMark|regression/i);
  });

  it('raw and derived stat layers can coexist without named data views', () => {
    const samples = [
      { group: 'A', time: 0, value: 1 },
      { group: 'A', time: 1, value: 3 },
      { group: 'A', time: 2, value: 5 },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encoding: { x: { field: 'time' }, y: { field: 'value' } } },
        {
          type: 'path',
          transform: [{ kind: 'smooth', x: 'time', y: 'value', sampleCount: 5, xAs: 'trendX', yAs: 'trendY' }],
          order: 'trendX',
          encoding: { x: { field: 'trendX' }, y: { field: 'trendY' } },
        },
        {
          type: 'path',
          transform: [
            {
              kind: 'density',
              field: 'value',
              bandwidth: { kind: 'value', value: 2 },
              sampleCount: 4,
              xAs: 'densityX',
              densityAs: 'density',
            },
          ],
          closure: { kind: 'baseline', baseline: 0 },
          order: 'densityX',
          encoding: { x: { field: 'densityX' }, y: { field: 'density' } },
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
