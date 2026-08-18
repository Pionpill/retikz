import type { ExternalDatasets } from '@retikz/data';

import {
  compileToScene,
  resolveCoreProviderDependencies,
  resolveDefaultCoreThemeColors,
  ThemeMode,
} from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { createPlotProviderContribution } from '@retikz/plot';
import { SurfaceProvider } from '@retikz/standard';
import { PathClipProvider } from '@retikz/standard/clip';
import { describe, expect, it } from 'vitest';

import { ChartProvider } from '../../../src';
import { resolveChart } from '../../../src/_chart/resolve';
import { ScatterChartRecipe, ScatterChartSchema } from '../../../src/point';

const datasets: ExternalDatasets = {
  rows: [
    { id: 'a', x: 1, y: 4 },
    { id: 'b', x: 2, y: 7 },
  ],
};

const chart = resolveChart(
  ScatterChartRecipe.bind(
    ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'scatter',
      id: 'sales',
      presentation: {
        children: [
          {
            kind: 'preset',
            key: 'chart.presentation.subtitle',
            preset: 'subtitle',
            text: 'Two observations',
          },
          {
            kind: 'preset',
            key: 'chart.presentation.title',
            preset: 'title',
            text: 'Sales',
          },
          { kind: 'plot', key: 'chart.plot' },
          {
            kind: 'preset',
            key: 'chart.presentation.source',
            preset: 'source',
            text: 'Internal',
          },
        ],
      },
      plot: { data: { reference: 'rows' } },
      config: { encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    }),
  ),
  {
    theme: {
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    },
  },
).chart;

describe('canonical Chart provider and compile integration', () => {
  it('resolves Surface, Flex, Plot, then Chart from the single Chart root', () => {
    const plotContribution = createPlotProviderContribution(datasets, { width: 320, height: 180 });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [ChartProvider.key],
          providers: [
            SurfaceProvider,
            PathClipProvider,
            FlexLayoutProvider,
            ...plotContribution.providers,
            ChartProvider,
          ],
        },
      ],
    });

    expect(definitions.composites?.map(definition => [definition.namespace, definition.type])).toEqual([
      ['standard', 'surface'],
      ['layout', 'flexLayout'],
      ['plot', 'plot'],
      ['chart', 'base'],
    ]);
  });

  it('renders presentation and Plot through ordinary Scene output and publishes the Chart-qualified Surface handle', () => {
    const plotContribution = createPlotProviderContribution(datasets, { width: 320, height: 180, provenance: true });
    const providerDefinitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [ChartProvider.key],
          providers: [
            SurfaceProvider,
            PathClipProvider,
            FlexLayoutProvider,
            ...plotContribution.providers,
            ChartProvider,
          ],
        },
      ],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [chart] },
      { ...providerDefinitions, padding: 0 },
    );
    const surface = result.spatialHandles.entries.find(entry => entry.role === 'surface');

    expect(result.scene.primitives.length).toBeGreaterThan(0);
    expect(surface?.ownerPath.map(({ namespace, type, instanceId }) => ({ namespace, type, instanceId }))).toEqual([
      { namespace: 'chart', type: 'base', instanceId: 'sales' },
      { namespace: 'standard', type: 'surface', instanceId: 'sales' },
    ]);
    expect(surface?.key).toBe('surface');
  });
});
