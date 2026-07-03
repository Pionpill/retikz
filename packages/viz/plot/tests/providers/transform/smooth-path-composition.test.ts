import type { IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { PlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (
  spec: PlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: LowerPlotsOptions,
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

describe('smooth path composition (alpha.13 ADR-04)', () => {
  const samples = [
    { group: 'A', time: 0, value: 1 },
    { group: 'A', time: 1, value: 3 },
    { group: 'A', time: 2, value: 5 },
    { group: 'B', time: 0, value: 10 },
    { group: 'B', time: 1, value: 8 },
    { group: 'B', time: 2, value: 6 },
  ];

  it('smooth rows can be consumed by PathMark without SmoothMark', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      transform: [
        {
          kind: 'smooth',
          x: 'time',
          y: 'value',
          groupBy: ['group'],
          sampleCount: 4,
          xAs: 'trendX',
          yAs: 'trendY',
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
          order: 'trendX',
          encoding: { x: { field: 'trendX' }, y: { field: 'trendY' }, color: { field: 'group', scale: 'color' } },
        },
      ],
    });

    const layer = expandOf(spec, { samples }, opts).children[0] as IRScope;
    expect(layer.children).toHaveLength(2);
    for (const path of layer.children as Array<IRPath>) {
      expect(path.type).toBe('path');
      expect(path.children).toHaveLength(4);
      expect(path.children.at(-1)).not.toEqual({ type: 'step', kind: 'cycle' });
    }
  });

  it('smooth mark-local transform only affects the path layer that declares it', () => {
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
      ],
    });

    const outer = expandOf(spec, { samples: samples.slice(0, 3) }, opts);
    const pointLayer = outer.children[0] as IRScope;
    const pathLayer = outer.children[1] as IRScope;
    expect(pointLayer.children).toHaveLength(3);
    expect(pathLayer.children).toHaveLength(1);
    expect((pathLayer.children[0] as IRPath).children).toHaveLength(5);
  });
});
