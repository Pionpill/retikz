import type { IRPlotSpec } from '@retikz/plot';
import type { VanillaEmbedContext } from '@retikz/vanilla';

import { compileToScene } from '@retikz/core';
import { embed, figure, layer, normalizeFigureSpec, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { createPlotAdapter, embedPlot, plot } from '../src';

const contextOf = (id: string): VanillaEmbedContext => ({
  id,
  kind: 'plot',
  namespace: 'plot',
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

  it('同一 adapter 的多个 lower 复用 datasets 与稳定 composite maker', () => {
    const adapter = createPlotAdapter(datasets);
    const spec = salesSpec();
    const first = adapter.lower({ spec }, contextOf('first'));
    const second = adapter.lower({ spec }, contextOf('second'));

    expect(first.datasets).toBe(datasets);
    expect(second.datasets).toBe(datasets);
    expect(first.makeComposites).toBe(second.makeComposites);
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

  it('helper 与 adapter 都拒绝空白 embed id', () => {
    const adapter = createPlotAdapter(datasets);

    expect(() => embedPlot('', salesSpec())).toThrow('plot vanilla: embed id must be non-empty');
    expect(() => embedPlot('   ', salesSpec())).toThrow('plot vanilla: embed id must be non-empty');
    expect(() => adapter.lower({ spec: salesSpec() }, contextOf(''))).toThrow(
      'plot vanilla: embed id must be non-empty',
    );
  });
});
