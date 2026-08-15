import type { InputEmbedContext } from '@retikz/vanilla';

import { layer, normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { createPlotProvider, embedPlot, plot, PlotInputEmbedAdapter, resolvePlotContribution } from '../src';

const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'plot',
  layerId: 'chart',
  identityPath: ['chart', id],
});

const salesSpec = (id?: string) =>
  plot({
    ...(id !== undefined ? { id } : {}),
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'interval',
        id: 'bars',
        encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
      },
    ],
  });

const salesInput = (id?: string) => ({
  ...(id === undefined ? {} : { id }),
  data: { reference: 'sales' },
  scales: [
    { type: 'band' as const, name: 'x' },
    { type: 'linear' as const, name: 'y' },
  ],
  coordinate: { type: 'cartesian2D' as const, x: 'x', y: 'y' },
  marks: [
    {
      type: 'interval' as const,
      id: 'bars',
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    },
  ],
});

const datasets = {
  sales: [
    { month: 'Jan', revenue: 10 },
    { month: 'Feb', revenue: 14 },
  ],
};

describe('Plot Vanilla Tier2 adapter', () => {
  it('在 adapter 内将 Plot authoring Input 归一为 Core contribution', () => {
    const input = { spec: salesInput('sales'), datasets };

    expect(input.spec).not.toHaveProperty('namespace');
    expect(input.spec).not.toHaveProperty('type');
    expect(PlotInputEmbedAdapter.lower(input, contextOf('panel')).node).toMatchObject({
      namespace: 'plot',
      type: 'plot',
      id: 'panel/sales',
    });
  });

  it('为完整 PlotSpec 贡献 Plot provider 及其 Standard Shape 依赖闭包', () => {
    const spec = salesSpec('sales');
    const result = resolvePlotContribution({ spec, datasets, lowerOptions: { width: 360, height: 200 } });
    const provider = createPlotProvider({ datasets, lowerOptions: { width: 360, height: 200 } });

    expect(result.spec).toEqual(spec);
    expect(result.contribution.roots).toEqual([
      { capability: 'composite', namespace: 'plot', type: 'plot' },
      { capability: 'pathKind', name: 'ribbon' },
    ]);
    expect(result.contribution.providers.map(item => item.key)).toEqual([
      { capability: 'shape', name: 'sector' },
      { capability: 'shape', name: 'contour' },
      { capability: 'pathKind', name: 'ribbon' },
      { capability: 'composite', namespace: 'plot', type: 'plot' },
    ]);
    expect(result.contribution.providers[3]).toMatchObject({
      key: provider.key,
      dependencies: [
        { capability: 'shape', name: 'sector' },
        { capability: 'shape', name: 'contour' },
      ],
    });
    expect(result.contribution.providers[3]?.makeDefinition).toBe(provider.makeDefinition);
  });

  it('经 scene/layer runtime 渲染 Plot embed', () => {
    const spec = salesSpec('sales');
    const input = structuredClone(spec);
    const inputScene = scene({
      layers: [layer('chart', [embedPlot('sales-panel', spec, datasets, { width: 360, height: 200 })])],
    });
    const svg = renderToSvgString(inputScene, {
      adapters: [PlotInputEmbedAdapter],
      output: { width: 360, height: 200 },
    });

    expect(svg).toContain('<rect');
    expect(spec).toEqual(input);
    expect(normalizeScene(inputScene, { adapters: [PlotInputEmbedAdapter] }).runtimeMeta.layers[0].childIds).toEqual([
      'sales-panel',
    ]);
  });

  it('保持 lineage 在 PlotSpec、Core IR 与 Scene meta 之外', () => {
    const inputScene = scene([embedPlot('sales-panel', salesSpec('sales'), datasets)]);
    const normalized = normalizeScene(inputScene, { adapters: [PlotInputEmbedAdapter] });

    expect(JSON.stringify(normalized.ir)).not.toContain('lineage');
    expect(renderToSvgString(inputScene, { adapters: [PlotInputEmbedAdapter] })).not.toContain('lineage');
  });

  it('从 embed id 派生 root identity 且不修改原 spec', () => {
    const named = salesSpec('sales');
    const anonymous = salesSpec();

    expect(PlotInputEmbedAdapter.lower({ spec: named, datasets }, contextOf('panel')).node).toMatchObject({
      id: 'panel/sales',
    });
    expect(PlotInputEmbedAdapter.lower({ spec: anonymous, datasets }, contextOf('panel')).node).toMatchObject({
      id: 'panel/plot',
    });
    expect(named.id).toBe('sales');
    expect(anonymous.id).toBeUndefined();

    const contribution = PlotInputEmbedAdapter.lower(
      {
        spec: salesSpec('sales'),
        datasets,
        preserveRootIdentity: true,
        panel: {
          x: 24,
          y: 12,
          transforms: [{ kind: 'scale', x: 0.5, y: 0.5 }],
          zIndex: 3,
        },
      },
      contextOf('panel'),
    );

    expect(contribution.node).toMatchObject({
      type: 'scope',
      transforms: [
        { kind: 'translate', x: 24, y: 12 },
        { kind: 'scale', x: 0.5, y: 0.5 },
      ],
      zIndex: 3,
      children: [{ id: 'sales' }],
    });
  });

  it('同一 adapter 的多个 lower 贡献完整依赖闭包并复用稳定 provider maker', () => {
    const spec = salesSpec();
    const first = PlotInputEmbedAdapter.lower({ spec, datasets }, contextOf('first'));
    const second = PlotInputEmbedAdapter.lower({ spec, datasets }, contextOf('second'));

    expect(first).not.toHaveProperty('datasets');
    expect(first).not.toHaveProperty('makeComposites');
    expect(first.providerDependencies.roots).toEqual([
      { capability: 'composite', namespace: 'plot', type: 'plot' },
      { capability: 'pathKind', name: 'ribbon' },
    ]);
    expect(first.providerDependencies.providers.map(provider => provider.key)).toEqual([
      { capability: 'shape', name: 'sector' },
      { capability: 'shape', name: 'contour' },
      { capability: 'pathKind', name: 'ribbon' },
      { capability: 'composite', namespace: 'plot', type: 'plot' },
    ]);
    expect(first.providerDependencies.providers[3]?.dependencies).toEqual([
      { capability: 'shape', name: 'sector' },
      { capability: 'shape', name: 'contour' },
    ]);
    expect(first.providerDependencies.providers[3]?.makeDefinition).toBe(
      second.providerDependencies.providers[3]?.makeDefinition,
    );
  });

  it('缺失 dataset reference 时 fail-loud', () => {
    const inputScene = scene([embedPlot('missing', salesSpec(), {})]);

    expect(() => renderToSvgString(inputScene, { adapters: [PlotInputEmbedAdapter] })).toThrow(/sales/i);
  });

  it.each(['', '   ', '\u2003', '\ufeff'])('helper and adapter reject blank embed id %j with the Plot prefix', id => {
    expect(() => embedPlot(id, salesSpec(), datasets)).toThrowError('plot vanilla: embed id must be non-empty');
    expect(() => PlotInputEmbedAdapter.lower({ spec: salesSpec(), datasets }, contextOf(id))).toThrowError(
      'plot vanilla: embed id must be non-empty',
    );
  });
});
