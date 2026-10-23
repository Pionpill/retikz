import type { ExternalDatasets } from '@retikz/data';
import type { IRPlot } from '@retikz/plot';
import { definePlotTheme } from '@retikz/plot';
import type * as RetikzReact from '@retikz/react';
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

import { Plot, PlotThemeProvider } from '../../src';

const spec: IRPlot = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
};

const data: ExternalDatasets = { sales: [{ x: 0, y: 1 }] };

const plotTheme = definePlotTheme({
  name: 'brand',
  resolve: () => ({}),
});

describe('Plot React InputEmbed routing', () => {
  it('standalone Plot passes an InputEmbed to Layout without resolving Core composites', () => {
    capturedLayouts.length = 0;

    renderToStaticMarkup(
      <Plot spec={spec} data={data} themeDefinitions={[]} definitions={{ plotThemeDefinitions: [plotTheme] }} />,
    );

    const layout = capturedLayouts.at(-1);

    expect(layout?.extensions).toEqual({ themeDefinitions: [] });
    expect(layout).not.toHaveProperty('ir');
    expect(layout).not.toHaveProperty('composites');
    expect(Reflect.has(Plot, 'inputEmbedAdapter')).toBe(true);
    expect((layout!.children as { type?: { inputEmbedAdapter?: unknown } }).type?.inputEmbedAdapter).toBe(
      Plot.inputEmbedAdapter,
    );
  });

  it('keeps ambient Plot style definitions on the InputEmbed props', () => {
    capturedLayouts.length = 0;

    renderToStaticMarkup(
      <PlotThemeProvider plotThemeDefinitions={[plotTheme]}>
        <Plot spec={spec} data={data} />
      </PlotThemeProvider>,
    );

    const layout = capturedLayouts.at(-1);

    expect(
      (layout!.children as { props?: { lowerOptions?: { definitions?: { plotThemeDefinitions?: unknown } } } }).props
        ?.lowerOptions?.definitions?.plotThemeDefinitions,
    ).toEqual([plotTheme]);
  });

  it('preserves the React panel identity and authoring props on the InputEmbed', () => {
    capturedLayouts.length = 0;

    const namedSpec: IRPlot = { ...spec, id: 'sales' };
    renderToStaticMarkup(<Plot spec={namedSpec} data={data} position={[24, 12]} />);

    const child = capturedLayouts.at(-1)?.children as { props?: Record<string, unknown> };

    expect(child.props).toMatchObject({ spec: namedSpec, datasets: data, panel: { position: [24, 12] } });
    expect(child.props).not.toHaveProperty('composites');
  });
});
