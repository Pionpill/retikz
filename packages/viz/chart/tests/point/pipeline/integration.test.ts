import type { ExternalDatasets } from '@retikz/data';

import { compileToScene, resolveCompositeDependencies } from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { createPlotProvider } from '@retikz/plot';
import { SurfaceProvider } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { ChartProvider } from '../../../src';
import { resolvePointChartSpec } from '../../../src/point';

const datasets: ExternalDatasets = {
  rows: [
    { id: 'a', x: 1, y: 4 },
    { id: 'b', x: 2, y: 7 },
  ],
};

const chart = resolvePointChartSpec(
  {
    namespace: 'chart',
    type: 'scatter',
    id: 'sales',
    data: { reference: 'rows' },
    encoding: { x: { field: 'x' }, y: { field: 'y' } },
  },
  undefined,
  {},
  {
    presentation: [
      { preset: 'subtitle', position: 'top', text: 'Two observations' },
      { preset: 'title', position: 'top', text: 'Sales' },
      { preset: 'source', position: 'bottom', text: 'Internal' },
    ],
  },
).chart;

describe('canonical Chart provider and compile integration', () => {
  it('resolves Surface, Flex, Plot, then Chart from the single Chart root', () => {
    const plotProvider = createPlotProvider(datasets, { width: 320, height: 180 });
    const definitions = resolveCompositeDependencies({
      contributions: [
        {
          roots: [ChartProvider.key],
          providers: [SurfaceProvider, FlexLayoutProvider, plotProvider, ChartProvider],
        },
      ],
    });

    expect(definitions.map(definition => [definition.namespace, definition.type])).toEqual([
      ['standard', 'surface'],
      ['layout', 'flexLayout'],
      ['plot', 'plot'],
      ['chart', 'chart'],
    ]);
  });

  it('renders presentation and Plot through ordinary Scene output and publishes the Chart-qualified Surface handle', () => {
    const plotProvider = createPlotProvider(datasets, { width: 320, height: 180, provenance: true });
    const composites = resolveCompositeDependencies({
      contributions: [
        {
          roots: [ChartProvider.key],
          providers: [SurfaceProvider, FlexLayoutProvider, plotProvider, ChartProvider],
        },
      ],
    });
    const result = compileToScene({ type: 'scene', version: 1, children: [chart] }, { composites, padding: 0 });
    const surface = result.spatialHandles.entries.find(entry => entry.role === 'surface');

    expect(result.scene.primitives.length).toBeGreaterThan(0);
    expect(surface?.ownerPath.map(({ namespace, type, instanceId }) => ({ namespace, type, instanceId }))).toEqual([
      { namespace: 'chart', type: 'chart', instanceId: 'sales' },
      { namespace: 'standard', type: 'surface', instanceId: 'sales' },
    ]);
    expect(surface?.key).toBe('surface');
  });
});
