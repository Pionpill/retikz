import type { IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlot } from '../../../src/schemas';

import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { PlotSchema } from '../../../src/schemas';

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: LowerPlotsOptions,
): IRScope => {
  return lowerPlot(spec, datasets, options) as IRScope;
};

const firstLayer = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: LowerPlotsOptions,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

describe('density area composition (contract)', () => {
  const samples = [
    { group: 'A', value: 0 },
    { group: 'A', value: 4 },
    { group: 'B', value: 10 },
    { group: 'B', value: 14 },
  ];

  it('density rows can be consumed by PathMark baseline area without DensityMark', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      transform: [
        {
          kind: 'density',
          field: 'value',
          groupBy: ['group'],
          bandwidth: { kind: 'value', value: 2 },
          sampleCount: 4,
          xAs: 'densityX',
          densityAs: 'density',
        },
      ],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'color' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'group',
          order: 'densityX',
          closure: { kind: 'baseline', baseline: 0 },
          fill: { kind: 'constant', value: '#60a5fa' },
          fillOpacity: { kind: 'constant', value: 0.28 },
          encoding: { x: { field: 'densityX' }, y: { field: 'density' }, color: { field: 'group', scale: 'color' } },
        },
      ],
    });

    const layer = firstLayer(spec, { samples }, opts);
    expect(layer.children).toHaveLength(2);
    for (const seriesScope of layer.children as Array<IRScope>) {
      expect(seriesScope.type).toBe('scope');
      const path = seriesScope.children[0] as IRPath;
      expect(path.type).toBe('path');
      expect(path.children.at(-1)).toEqual({ type: 'step', kind: 'cycle' });
    }
  });

  it('density mark-local transform only affects the path layer that declares it', () => {
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
        { type: 'point', encoding: { x: { field: 'value' }, y: { value: 0 } } },
        {
          type: 'path',
          transform: [
            {
              kind: 'density',
              field: 'value',
              bandwidth: { kind: 'value', value: 2 },
              sampleCount: 5,
              xAs: 'densityX',
              densityAs: 'density',
            },
          ],
          order: 'densityX',
          encoding: { x: { field: 'densityX' }, y: { field: 'density' } },
        },
      ],
    });

    const outer = expandOf(spec, { samples: samples.slice(0, 2) }, opts);
    const pointLayer = outer.children[0] as IRScope;
    const pathLayer = outer.children[1] as IRScope;
    expect(pointLayer.children).toHaveLength(2);
    expect(pathLayer.children).toHaveLength(1);
    expect((pathLayer.children[0] as IRPath).children).toHaveLength(5);
  });
});
