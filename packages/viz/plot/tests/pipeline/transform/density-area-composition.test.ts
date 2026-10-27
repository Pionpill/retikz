import type { IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: LowerPlotsOptions = { layout: { width: 480, height: 300 } };

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: LowerPlotsOptions,
): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

const firstLayer = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: LowerPlotsOptions,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

describe('密度区域组成（契约）', () => {
  const samples = [
    { group: 'A', value: 0 },
    { group: 'A', value: 4 },
    { group: 'B', value: 10 },
    { group: 'B', value: 14 },
  ];

  it('密度行可以被 PathMark 基线区域消费，无需 DensityMark', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      transform: [
        {
          operation: {
            kind: 'density',
            params: {
              field: 'value',
              groupBy: ['group'],
              bandwidth: { kind: 'value', value: 2 },
              sampleCount: 4,
              xAs: 'densityX',
              densityAs: 'density',
            },
          },
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
          encodings: {
            series: 'group',
            order: 'densityX',
            color: { field: 'group', scale: 'color' },
            position: { x: { field: 'densityX' }, y: { field: 'density' } },
          },
          properties: { closure: { kind: 'baseline', baseline: 0 }, fill: '#60a5fa', opacity: { fill: 0.28 } },
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

  it('密度标记局部变换仅影响声明它的路径层', () => {
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
        { type: 'point', encodings: { position: { y: { value: 0 }, x: { field: 'value' } } }, properties: {} },
        {
          type: 'path',
          transforms: [
            {
              operation: {
                kind: 'density',
                params: {
                  field: 'value',
                  bandwidth: { kind: 'value', value: 2 },
                  sampleCount: 5,
                  xAs: 'densityX',
                  densityAs: 'density',
                },
              },
            },
          ],
          encodings: { order: 'densityX', position: { x: { field: 'densityX' }, y: { field: 'density' } } },
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
