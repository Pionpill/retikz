import type { IRChild, IRNode, IRScope } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import { describe, expect, it } from 'vitest';

import type { IRPlotSpec } from '../../src';

import {
  createPlotLineageLocator,
  defineNodeChannel,
  lowerPlots,
  lowerPlotWithLineage,
  PlotSpecSchema,
} from '../../src';

const SALES = [
  { region: 'East', month: 'Jan', revenue: 3 },
  { region: 'East', month: 'Feb', revenue: 5 },
  { region: 'West', month: 'Jan', revenue: 2 },
  { region: 'West', month: 'Feb', revenue: 4 },
];

const datasets: ExternalDatasets = { sales: SALES };

const extensionChannelsOf = (mark: {
  encoding?: { channels?: Partial<Record<string, { field?: string; value?: unknown }>> };
}): Partial<Record<string, { field?: string; value?: unknown }>> => mark.encoding?.channels ?? {};

const intensityChannel = defineNodeChannel<number>({
  channel: 'intensity',
  output: { outputKind: 'number', range: [0.2, 1] },
  resolve: () => mark => {
    const binding = extensionChannelsOf(mark).intensity;
    if (binding?.field === undefined) return undefined;
    const field = binding.field;
    return {
      resolver: row => {
        const value = Number(row[field]);
        return Number.isFinite(value) ? value : undefined;
      },
      descriptor: {
        channel: 'intensity',
        scaleType: 'linear',
        domain: [0, 1],
        range: [0.2, 1],
        field,
      },
    };
  },
  deliver: (node, value) => {
    node.opacity = value;
  },
});

const pointSpec = (): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    id: 'salesPlot',
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'xRegion' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xRegion', y: 'yRevenue' },
    marks: [
      {
        id: 'points',
        type: 'point',
        encoding: { x: { field: 'region' }, y: { field: 'revenue' }, color: { field: 'month' } },
      },
    ],
  });

const summarySpec = (): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    id: 'summaryPlot',
    data: { reference: 'sales' },
    transform: [
      {
        kind: 'summarize',
        groupBy: ['region'],
        metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    ],
    scales: [
      { type: 'band', name: 'xRegion' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xRegion', y: 'yRevenue' },
    marks: [
      {
        id: 'bars',
        type: 'interval',
        transform: [{ kind: 'sort', field: 'totalRevenue', order: 'descending' }],
        encoding: { x: { field: 'region' }, y: { field: 'totalRevenue' } },
      },
    ],
  });

const seriesSpec = (): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    id: 'salesPlot',
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'xRegion' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xRegion', y: 'yRevenue' },
    marks: [
      {
        id: 'bars',
        type: 'interval',
        series: 'month',
        encoding: { x: { field: 'region' }, y: { field: 'revenue' }, color: { field: 'month' } },
      },
    ],
  });

const extensionChannelSpec = (): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    id: 'extensionPlot',
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'xRegion' },
      { type: 'linear', name: 'yRevenue' },
      { type: 'linear', name: 'intensityScale' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xRegion', y: 'yRevenue' },
    marks: [
      {
        id: 'points',
        type: 'point',
        encoding: {
          x: { field: 'region' },
          y: { field: 'revenue' },
          channels: { intensity: { field: 'revenue', scale: 'intensityScale' } },
        },
      },
    ],
  });

const nodeChildrenOf = (child: IRChild): Array<IRNode> => {
  if (child.type === 'node') return [child as IRNode];
  if (child.type !== 'scope') return [];
  return (child as IRScope).children.flatMap(nodeChildrenOf);
};

const scopeChildrenOf = (child: IRChild): Array<IRScope> => {
  if (child.type !== 'scope') return [];
  return [child as IRScope, ...(child as IRScope).children.flatMap(scopeChildrenOf)];
};

describe('plot lineage runtime', () => {
  it('keeps lowerPlots shape unchanged when lineage API is not used', () => {
    const [definition] = lowerPlots(datasets, { width: 480, height: 300 });
    const child = definition.expand(pointSpec());

    expect(Array.isArray(child)).toBe(false);
    expect(scopeChildrenOf(child).some(scope => scope.meta?.source === 'plot')).toBe(false);
  });

  it('records minimal mark lineage without writing full lineage into scene meta', () => {
    const { children, lineage } = lowerPlotWithLineage(pointSpec(), datasets, { lineage: {} });

    expect(children).toHaveLength(1);
    expect(lineage.dataReference).toBe('sales');
    expect(lineage.data.root.events.map(event => event.kind)).toContain('source');
    expect(lineage.marks).toEqual([
      expect.objectContaining({
        markIndex: 0,
        markId: 'points',
        markType: 'point',
        encoding: [
          { channel: 'x', field: 'region' },
          { channel: 'y', field: 'revenue' },
          { channel: 'color', field: 'month' },
        ],
        transformScope: { root: [], mark: [] },
      }),
    ]);
    expect(nodeChildrenOf(children[0]).some(node => 'lineage' in (node.meta ?? {}))).toBe(false);
  });

  it('keeps the required identity skeleton when markIdentity is disabled', () => {
    const { lineage } = lowerPlotWithLineage(pointSpec(), datasets, { lineage: { markIdentity: false } });

    expect(lineage).toMatchObject({
      plotId: 'salesPlot',
      dataReference: 'sales',
      marks: [{ markIndex: 0, markType: 'point' }],
    });
    expect(lineage.marks[0]).not.toHaveProperty('markId');
  });

  it('keeps root and mark-local transform scopes separate', () => {
    const { lineage } = lowerPlotWithLineage(summarySpec(), datasets, { lineage: {} });

    expect(lineage.data.root.events.filter(event => event.kind === 'transformStep')).toHaveLength(1);
    expect(lineage.marks[0]).toEqual(
      expect.objectContaining({
        transformScope: { root: ['summarize'], mark: ['sort'] },
      }),
    );
    expect(lineage.data.marks[0]?.events.filter(event => event.kind === 'transformStep')).toHaveLength(1);
  });

  it('keeps original source identities after root reorder and mark-local transforms', () => {
    const spec = pointSpec();
    spec.transform = [{ kind: 'sort', field: 'revenue', order: 'descending' }];
    spec.marks[0].transform = [{ kind: 'sort', field: 'revenue', order: 'ascending' }];

    const { lineage } = lowerPlotWithLineage(spec, datasets, { lineage: {} });
    const markSource = lineage.data.marks[0]?.events.find(event => event.kind === 'source');

    expect(markSource).toEqual(
      expect.objectContaining({
        sourceIdentity: { mode: 'summary', count: 4, indices: [1, 3, 0, 2], truncated: false },
      }),
    );
  });

  it('records host metadata, scale mappings, layout context, and row values only when enabled', () => {
    const { lineage } = lowerPlotWithLineage(pointSpec(), datasets, {
      lineage: {
        scaleMappings: true,
        layoutContext: true,
        rowValues: { maxRows: 1, fields: ['region', 'revenue'] },
        hostMetadata: { query: true, ai: { promptReference: true, planReference: true } },
      },
      hostLineageMetadata: {
        queryId: 'query.sales.v1',
        datasetVersion: 'sales@2026-07-08',
        aiPlanId: 'plan-1',
        promptHash: 'prompt-hash',
      },
    });

    expect(lineage.hostMetadata).toEqual({
      queryId: 'query.sales.v1',
      datasetVersion: 'sales@2026-07-08',
      aiPlanId: 'plan-1',
      promptHash: 'prompt-hash',
    });
    expect(lineage.scales).toEqual([
      expect.objectContaining({
        name: 'xRegion',
        type: 'band',
        channels: [{ markIndex: 0, channel: 'x', field: 'region' }],
      }),
      expect.objectContaining({
        name: 'yRevenue',
        type: 'linear',
        channels: [{ markIndex: 0, channel: 'y', field: 'revenue' }],
      }),
    ]);
    expect(lineage.scales?.flatMap(scale => scale.channels ?? []).some(channel => channel.channel === 'color')).toBe(
      false,
    );
    expect(lineage.layout).toEqual(expect.objectContaining({ coordinateType: 'cartesian2D' }));
    expect(lineage.marks[0]?.rowValues).toEqual([{ region: 'East', revenue: 3 }]);
  });

  it('omits host metadata when enabled fields are absent', () => {
    const { lineage } = lowerPlotWithLineage(pointSpec(), datasets, {
      lineage: { hostMetadata: { query: true } },
      hostLineageMetadata: {},
    });

    expect('hostMetadata' in lineage).toBe(false);
  });

  it('records extension channel field and declared scale binding', () => {
    const { lineage } = lowerPlotWithLineage(extensionChannelSpec(), datasets, {
      channelDefinitions: [intensityChannel],
      lineage: { scaleMappings: true },
    });

    expect(lineage.marks[0]?.encoding).toContainEqual({
      channel: 'intensity',
      field: 'revenue',
      scale: 'intensityScale',
    });
    expect(lineage.scales).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'intensityScale',
          channels: [{ markIndex: 0, channel: 'intensity', field: 'revenue' }],
        }),
      ]),
    );
  });

  it('rejects unbounded row value options', () => {
    expect(() =>
      lowerPlotWithLineage(pointSpec(), datasets, { lineage: { rowValues: { maxRows: 0, fields: ['region'] } } }),
    ).toThrow(/rowValues.maxRows/);
    expect(() =>
      lowerPlotWithLineage(pointSpec(), datasets, { lineage: { rowValues: { maxRows: 1, fields: [] } } }),
    ).toThrow(/rowValues.fields/);
  });

  it.each([0.5, 1.5, NaN, Infinity])('rejects rowValues.maxRows=%s', maxRows => {
    expect(() =>
      lowerPlotWithLineage(pointSpec(), datasets, {
        lineage: { rowValues: { maxRows, fields: ['region'] } },
      }),
    ).toThrow(/rowValues\.maxRows must be a positive integer/);
  });

  it('keeps unknown transform errors aligned with lowerPlots', () => {
    const spec = {
      ...pointSpec(),
      transform: [{ kind: 'missing-transform' as const }],
    };

    expect(() => lowerPlots(datasets)[0].expand(spec)).toThrow(/not registered/);
    expect(() => lowerPlotWithLineage(spec, datasets, { lineage: {} })).toThrow(/not registered/);
  });

  it('returns locator lineage aligned with anchor meta', () => {
    const locator = createPlotLineageLocator(pointSpec(), datasets, {
      width: 480,
      height: 300,
      lineage: { locatorAnchors: true },
    });
    const hit = locator.datum(2);

    expect(hit?.anchor.meta).toEqual(expect.objectContaining({ markIndex: 0, transformedIndex: 2, sourceIndex: 2 }));
    expect(hit?.lineage).toEqual(
      expect.objectContaining({
        queryKind: 'datum',
        markIndex: 0,
        transformedIndex: 2,
        sourceIdentity: { mode: 'summary', count: 1, indices: [2], truncated: false },
      }),
    );
    expect(hit?.lineage.locatorAnchor).toEqual(
      expect.objectContaining({
        address: 'salesPlot.datum.2',
        anchor: hit?.anchor,
      }),
    );
  });

  it('does not fabricate datum lineage for series anchors', () => {
    const locator = createPlotLineageLocator(seriesSpec(), datasets, {
      width: 480,
      height: 300,
      lineage: { locatorAnchors: true },
    });
    const hit = locator.series('Jan');

    expect(hit?.lineage).toEqual(
      expect.objectContaining({
        queryKind: 'series',
        markIndex: 0,
        seriesValue: 'Jan',
      }),
    );
    expect('transformedIndex' in (hit?.lineage ?? {})).toBe(false);
    expect(hit?.lineage.locatorAnchor).toEqual(
      expect.objectContaining({
        address: 'salesPlot.series.Jan',
        anchor: hit?.anchor,
      }),
    );
  });
});
