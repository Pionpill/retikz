import type { IRPlotSpec } from '@retikz/plot';
import type { VanillaEmbedContext } from '@retikz/vanilla';

import { compileToScene } from '@retikz/core';
import { embed, figure, layer, normalizeFigureSpec, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { createPlotAdapter, createPlotProvider, embedPlot, plot, resolvePlotContribution } from '../src';

const contextOf = (id: string): VanillaEmbedContext => ({
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

const datasets = {
  sales: [
    { month: 'Jan', revenue: 10 },
    { month: 'Feb', revenue: 14 },
  ],
};

describe('Plot Vanilla Tier2 adapter', () => {
  it('exposes one Plot-owned contribution builder for complete PlotSpec inputs', () => {
    const spec = salesSpec('sales');
    const result = resolvePlotContribution({ spec, datasets, lowerOptions: { width: 360, height: 200 } });
    const provider = createPlotProvider({ datasets, lowerOptions: { width: 360, height: 200 } });

    expect(result.spec).toEqual(spec);
    expect(result.contribution.roots).toEqual([{ namespace: 'plot', type: 'plot' }]);
    expect(result.contribution.providers).toHaveLength(1);
    expect(result.contribution.providers[0]).toMatchObject({ key: provider.key, dependencies: [] });
    expect(result.contribution.providers[0]?.makeDefinition).toBe(provider.makeDefinition);
  });

  it('经 figure/layer runtime 渲染 Plot embed', () => {
    const spec = salesSpec('sales');
    const input = structuredClone(spec);
    const plotFigure = figure({ layers: [layer('chart', [embedPlot('sales-panel', spec)])] });
    const svg = renderToSvgString(plotFigure, {
      adapters: [createPlotAdapter(datasets, { width: 360, height: 200 })],
      output: { width: 360, height: 200 },
    });

    expect(svg).toContain('<rect');
    expect(spec).toEqual(input);
    expect(
      normalizeFigureSpec(plotFigure, { adapters: [createPlotAdapter(datasets)] }).runtimeMeta.layers[0].childIds,
    ).toEqual(['sales-panel']);
  });

  it('保持 lineage 在 PlotSpec、Core IR 与 Scene meta 之外', () => {
    const plotFigure = figure([embedPlot('sales-panel', salesSpec('sales'))]);
    const normalized = normalizeFigureSpec(plotFigure, { adapters: [createPlotAdapter(datasets)] });
    const scene = compileToScene(normalized.ir, { composites: normalized.composites }).scene;

    expect(JSON.stringify(normalized.ir)).not.toContain('lineage');
    expect(JSON.stringify(scene)).not.toContain('lineage');
  });

  it('从 embed id 派生 root identity 且不修改原 spec', () => {
    const adapter = createPlotAdapter(datasets);
    const named = salesSpec('sales');
    const anonymous = salesSpec();

    expect(adapter.lower({ spec: named }, contextOf('panel')).node).toMatchObject({ id: 'panel/sales' });
    expect(adapter.lower({ spec: anonymous }, contextOf('panel')).node).toMatchObject({ id: 'panel/plot' });
    expect(named.id).toBe('sales');
    expect(anonymous.id).toBeUndefined();
  });

  it('同一 adapter 的多个 lower 贡献 plot.plot root 并复用稳定 provider maker', () => {
    const adapter = createPlotAdapter(datasets);
    const spec = salesSpec();
    const first = adapter.lower({ spec }, contextOf('first'));
    const second = adapter.lower({ spec }, contextOf('second'));

    expect(first).not.toHaveProperty('datasets');
    expect(first).not.toHaveProperty('makeComposites');
    expect(first.compositeDependencies.roots).toEqual([{ namespace: 'plot', type: 'plot' }]);
    expect(first.compositeDependencies.providers).toHaveLength(1);
    expect(first.compositeDependencies.providers[0]?.key).toEqual({ namespace: 'plot', type: 'plot' });
    expect(first.compositeDependencies.providers[0]?.dependencies).toEqual([]);
    expect(first.compositeDependencies.providers[0]?.makeDefinition).toBe(
      second.compositeDependencies.providers[0]?.makeDefinition,
    );
  });

  it('缺失 dataset reference 时 fail-loud', () => {
    const plotFigure = figure([embedPlot('missing', salesSpec())]);

    expect(() => renderToSvgString(plotFigure, { adapters: [createPlotAdapter({})] })).toThrow(/sales/i);
  });

  it('手写 embed 不能绕过 PlotSpec schema', () => {
    const malformed = { namespace: 'plot' } as unknown as IRPlotSpec;
    const plotFigure = figure([embed('plot', 'invalid', { spec: malformed })]);

    expect(() => renderToSvgString(plotFigure, { adapters: [createPlotAdapter(datasets)] })).toThrow(ZodError);
  });

  it.each(['', '   ', '\u2003', '\ufeff'])('helper and adapter reject blank embed id %j with the Plot prefix', id => {
    const adapter = createPlotAdapter(datasets);

    expect(() => embedPlot(id, salesSpec())).toThrowError('plot vanilla: embed id must be non-empty');
    expect(() => adapter.lower({ spec: salesSpec() }, contextOf(id))).toThrowError(
      'plot vanilla: embed id must be non-empty',
    );
  });
});
