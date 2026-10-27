import type * as RetikzCore from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlot } from '@retikz/plot';
import { definePlotTheme } from '@retikz/plot';
import type * as RetikzVanilla from '@retikz/vanilla';
import type { InputEmbedContext } from '@retikz/vanilla';
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

import { plot, plotInputEmbedAdapter, renderPlot } from '../../src';

const spec: IRPlot = plot({
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
});

const data: ExternalDatasets = { sales: [{ x: 0, y: 1 }] };

const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'plot',
  layerId: 'chart',
  identityPath: ['chart', id],
});

const plotTheme = definePlotTheme({
  name: 'brand',
  resolve: () => ({}),
});

describe('Plot Vanilla 运行时样式选项', () => {
  it('SSR renderPlot 传递 Core 样式定义并保持 Plot 样式定义下沉', () => {
    compileCalls.length = 0;

    expect(renderPlot(spec, data, { definitions: { plotThemeDefinitions: [plotTheme] }, themeDefinitions: [] })).toBe(
      '<svg />',
    );

    const options = compileCalls.at(-1)?.[1] as { themeDefinitions?: Array<unknown> } | undefined;

    expect(options?.themeDefinitions).toEqual([]);
  });

  it('嵌入式 plotInputEmbedAdapter 将运行时样式定义保留在贡献有效负载之外', () => {
    const contribution = plotInputEmbedAdapter.lower({ spec, datasets: data }, contextOf('panel'));

    expect(contribution).not.toHaveProperty('themeTokenDefinitions');
    expect(contribution).not.toHaveProperty('datasets');
    expect(contribution).not.toHaveProperty('makeComposites');
    expect(contribution.providerDependencies.roots).toEqual([
      { capability: 'composite', namespace: 'plot', type: 'plot' },
      { capability: 'path', name: 'ribbon' },
    ]);
    expect(contribution.providerDependencies.providers[3]?.key).toEqual({
      capability: 'composite',
      namespace: 'plot',
      type: 'plot',
    });
  });
});
