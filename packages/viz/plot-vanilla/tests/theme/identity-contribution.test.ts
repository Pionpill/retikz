import type * as RetikzCore from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec } from '@retikz/plot';
import type * as RetikzVanilla from '@retikz/vanilla';
import type { InputEmbedContext } from '@retikz/vanilla';

import { ThemeMode } from '@retikz/core';
import { definePlotThemeStyle, getDefaultPlotThemePreset } from '@retikz/plot';
import { describe, expect, it, vi } from 'vitest';

const compileCalls = vi.hoisted(() => [] as Array<ReadonlyArray<unknown>>);

vi.mock('@retikz/core', async importOriginal => {
  const actual = await importOriginal<typeof RetikzCore>();
  return {
    ...actual,
    compileToScene: vi.fn((...args: Array<unknown>) => {
      compileCalls.push(args);
      return { scene: { version: 1, type: 'scene', children: [] } };
    }),
  };
});

vi.mock('@retikz/vanilla', async importOriginal => {
  const actual = await importOriginal<typeof RetikzVanilla>();
  return {
    ...actual,
    renderToSvgString: vi.fn(() => '<svg />'),
  };
});

import { plot, PlotInputEmbedAdapter, renderPlot } from '../../src';

const spec: IRPlotSpec = plot({
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
});

const data: ExternalDatasets = { sales: [{ x: 0, y: 1 }] };

const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'plot',
  layerId: 'chart',
  identityPath: ['chart', id],
});

const plotThemeStyle = definePlotThemeStyle({
  name: 'brand',
  resolve: () => ({ tokens: getDefaultPlotThemePreset(ThemeMode.Light) }),
});

describe('Plot Vanilla runtime style options', () => {
  it('SSR renderPlot passes Core style definitions and keeps Plot style definitions in lowering', () => {
    compileCalls.length = 0;

    expect(renderPlot(spec, data, { themeStyles: [], plotThemeStyles: [plotThemeStyle] })).toBe('<svg />');

    const options = compileCalls.at(-1)?.[1] as { themeStyles?: Array<unknown> } | undefined;
    expect(options?.themeStyles).toEqual([]);
  });

  it('embedded PlotInputEmbedAdapter keeps runtime style definitions out of the contribution payload', () => {
    const contribution = PlotInputEmbedAdapter.lower({ spec, datasets: data }, contextOf('panel'));
    expect(contribution).not.toHaveProperty('themeTokenDefinitions');
    expect(contribution).not.toHaveProperty('datasets');
    expect(contribution).not.toHaveProperty('makeComposites');
    expect(contribution.providerDependencies.roots).toEqual([
      { capability: 'composite', namespace: 'plot', type: 'plot' },
      { capability: 'pathKind', name: 'ribbon' },
    ]);
    expect(contribution.providerDependencies.providers[3]?.key).toEqual({
      capability: 'composite',
      namespace: 'plot',
      type: 'plot',
    });
  });
});
