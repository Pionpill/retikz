import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec } from '@retikz/plot';
import type * as RetikzReact from '@retikz/react';

import { ThemeMode, ThemeStyle } from '@retikz/core';
import { definePlotThemeStyle, getPlotThemePreset } from '@retikz/plot';
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

const plotThemeStyle = definePlotThemeStyle({
  name: 'brand',
  resolve: () => getPlotThemePreset(ThemeStyle.Neutral, ThemeMode.Light),
});

describe('Plot React runtime style options', () => {
  it('standalone Plot forwards Core and Plot style definitions to Layout and lowering', () => {
    capturedLayouts.length = 0;

    renderToStaticMarkup(<Plot spec={spec} data={data} themeStyles={[]} plotThemeStyles={[plotThemeStyle]} />);

    const layout = capturedLayouts.at(-1);
    expect(layout?.themeStyles).toEqual([]);
    const composites = layout?.composites as Array<{ expand: (node: IRPlotSpec, context: unknown) => unknown }>;
    expect(() =>
      composites[0].expand(spec, {
        theme: {
          style: 'brand',
          mode: 'light',
          colors: {
            semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
            categorical: ['#2563eb'],
          },
        },
      }),
    ).not.toThrow();
  });

  it('embedded Plot adapter keeps runtime style definitions out of the contribution payload', () => {
    const adapter = Plot.embeddableAdapter;
    expect(adapter).toBeDefined();

    const contribution = adapter?.contribute({ spec, data });
    expect(contribution).not.toHaveProperty('themeTokenDefinitions');
  });
});
