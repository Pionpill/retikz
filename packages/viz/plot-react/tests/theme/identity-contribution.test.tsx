import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec } from '@retikz/plot';
import type * as RetikzReact from '@retikz/react';

import { PlotThemeTokenDefinition } from '@retikz/plot';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const capturedLayouts = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('@retikz/react', async importOriginal => {
  const actual = await importOriginal<typeof RetikzReact>();
  return {
    ...actual,
    Layout: (props: Record<string, unknown>) => {
      capturedLayouts.push(props);
      return null;
    },
  };
});

import { Plot } from '../../src';

const spec: IRPlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
};

const data: ExternalDatasets = { sales: [{ x: 0, y: 1 }] };

describe('Plot React theme token contribution identity', () => {
  it('standalone Plot passes the canonical definition to its real Layout entry', () => {
    capturedLayouts.length = 0;

    renderToStaticMarkup(<Plot spec={spec} data={data} />);

    const definition = capturedLayouts.at(-1)?.themeTokenDefinitions;
    expect(definition).toEqual([PlotThemeTokenDefinition]);
    expect((definition as Array<unknown>)[0]).toBe(PlotThemeTokenDefinition);
  });

  it('embedded Plot adapter passes the same canonical definition singleton', () => {
    const adapter = Plot.embeddableAdapter;
    expect(adapter).toBeDefined();

    const contribution = adapter?.contribute({ spec, data });
    const definition = contribution?.themeTokenDefinitions;
    expect(definition).toEqual([PlotThemeTokenDefinition]);
    expect((definition as Array<unknown>)[0]).toBe(PlotThemeTokenDefinition);
  });
});
