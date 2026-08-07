import type * as RetikzCore from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec } from '@retikz/plot';
import type * as RetikzVanilla from '@retikz/vanilla';
import type { VanillaEmbedContext } from '@retikz/vanilla';

import { PlotThemeTokenDefinition } from '@retikz/plot';
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

import { createPlotAdapter, plot, renderPlot } from '../../src';

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

const contextOf = (id: string): VanillaEmbedContext => ({
  id,
  kind: 'plot',
  namespace: 'plot',
  layerId: 'chart',
  identityPath: ['chart', id],
});

describe('Plot Vanilla theme token contribution identity', () => {
  it('SSR renderPlot passes the canonical definition to compileToScene', () => {
    compileCalls.length = 0;

    expect(renderPlot(spec, data)).toBe('<svg />');

    const options = compileCalls.at(-1)?.[1] as { themeTokenDefinitions?: Array<unknown> } | undefined;
    const definition = options?.themeTokenDefinitions;
    expect(definition).toEqual([PlotThemeTokenDefinition]);
    expect((definition as Array<unknown>)[0]).toBe(PlotThemeTokenDefinition);
  });

  it('embedded createPlotAdapter passes the same canonical definition singleton', () => {
    const contribution = createPlotAdapter(data).lower({ spec }, contextOf('panel'));
    const definition = contribution.themeTokenDefinitions;
    expect(definition).toEqual([PlotThemeTokenDefinition]);
    expect((definition as Array<unknown>)[0]).toBe(PlotThemeTokenDefinition);
  });
});
