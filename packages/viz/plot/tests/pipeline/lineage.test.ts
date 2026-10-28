import type { IRChild, IRNode, IRScope } from '@retikz/core';
import { defineTransformImplementation } from '@retikz/data';
import type { ExternalDatasets } from '@retikz/data';
import { defineTransform } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { literal, object, union } from 'zod';

import type { IRPlot } from '../../src';
import { createPlotLineageLocator, defineNodeChannel, lowerPlotWithLineage, PlotSchema } from '../../src';
import { markChannelEncoding, channelField } from '../../src/contract';
import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import { measureLabel } from '../helpers/text-measurement';

const SALES = [
  { region: 'East', month: 'Jan', revenue: 3 },
  { region: 'East', month: 'Feb', revenue: 5 },
  { region: 'West', month: 'Jan', revenue: 2 },
  { region: 'West', month: 'Feb', revenue: 4 },
];

const datasets: ExternalDatasets = { sales: SALES };

const intensityChannel = defineNodeChannel<number>({
  channel: 'intensity',
  output: { outputKind: 'number', range: [0.2, 1] },
  resolve: (_ctx, mark) => {
    const binding = markChannelEncoding(mark, 'intensity');
    if (binding === undefined) return undefined;

    const field = channelField(binding);

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
    node.style = { ...node.style, opacity: value };
  },
});

const pointSpec = (): IRPlot =>
  PlotSchema.parse({
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
        encodings: { color: 'month', position: { x: { field: 'region' }, y: { field: 'revenue' } } },
      },
    ],
  });

const summarySpec = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    id: 'summaryPlot',
    data: { reference: 'sales' },
    transform: [
      {
        operation: {
          kind: 'summarize',
          params: {
            groupBy: ['region'],
            metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
          },
        },
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
        transforms: [{ operation: { kind: 'sort', params: { field: 'totalRevenue', order: 'descending' } } }],
        encodings: { position: { x: { field: 'region' }, y: { field: 'totalRevenue' } } },
      },
    ],
  });

const seriesSpec = (): IRPlot =>
  PlotSchema.parse({
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
        encodings: { series: 'month', color: 'month', position: { x: { field: 'region' }, y: { field: 'revenue' } } },
      },
    ],
  });

const extensionChannelSpec = (): IRPlot =>
  PlotSchema.parse({
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
        encodings: {
          intensity: { field: 'revenue', scale: 'intensityScale' },
          position: { x: { field: 'region' }, y: { field: 'revenue' } },
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

describe('绘制血缘运行时间', () => {
  it('当不使用血缘 API 时，保持 lowerPlots 形状不变', () => {
    const result = {
      children: [
        lowerPlotWithDataArtifact(pointSpec(), datasets, {
          layout: { width: 480, height: 300 },
          textMeasurer: measureLabel,
        }).child,
      ],
    };

    expect(result.children).toHaveLength(1);
    expect(scopeChildrenOf(result.children[0]).some(scope => scope.meta?.source === 'plot')).toBe(false);
  });

  it('记录最小标记血缘，而不将完整血缘写入场景元', () => {
    const { children, lineage } = lowerPlotWithLineage(pointSpec(), datasets, { environment: {}, lineage: {} });

    expect(children).toHaveLength(1);
    expect(lineage.dataReference).toBe('sales');
    expect(lineage.data.root.events.map(event => event.kind)).toContain('source');
    expect(lineage.marks).toEqual([
      expect.objectContaining({
        markIndex: 0,
        markId: 'points',
        markType: 'point',
        transformScope: { root: [], mark: [] },
      }),
    ]);
    expect(nodeChildrenOf(children[0]).some(node => 'lineage' in (node.meta ?? {}))).toBe(false);
  });

  it('当 markIdentity 禁用时保留所需的身份骨架', () => {
    const { lineage } = lowerPlotWithLineage(pointSpec(), datasets, {
      environment: {},
      lineage: { markIdentity: false },
    });

    expect(lineage).toMatchObject({
      plotId: 'salesPlot',
      dataReference: 'sales',
      marks: [{ markIndex: 0, markType: 'point' }],
    });
    expect(lineage.marks[0]).not.toHaveProperty('markId');
  });

  it('将根和标记局部转换范围分开', () => {
    const { lineage } = lowerPlotWithLineage(summarySpec(), datasets, { environment: {}, lineage: {} });

    expect(lineage.data.root.events.filter(event => event.kind === 'transformStep')).toHaveLength(1);
    expect(lineage.marks[0]).toEqual(
      expect.objectContaining({
        transformScope: { root: ['summarize'], mark: ['sort'] },
      }),
    );
    expect(lineage.data.marks[0]?.events.filter(event => event.kind === 'transformStep')).toHaveLength(1);
  });

  it('在根重新排序和标记本地转换后保留原始源标识', () => {
    const spec = pointSpec();
    spec.transform = [{ operation: { kind: 'sort', params: { field: 'revenue', order: 'descending' } } }];
    spec.marks[0].transforms = [{ operation: { kind: 'sort', params: { field: 'revenue', order: 'ascending' } } }];

    const { lineage } = lowerPlotWithLineage(spec, datasets, { environment: {}, lineage: {} });
    const markSource = lineage.data.marks[0]?.events.find(event => event.kind === 'source');

    expect(markSource).toEqual(
      expect.objectContaining({
        sourceIdentity: { mode: 'summary', count: 4, indices: [1, 3, 0, 2], truncated: false },
      }),
    );
  });

  it('仅在启用时记录宿主元数据、比例映射、布局上下文和行值', () => {
    const { lineage } = lowerPlotWithLineage(pointSpec(), datasets, {
      environment: {},
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
        channels: [{ markIndex: 0, channel: 'position.x', field: 'region' }],
      }),
      expect.objectContaining({
        name: 'yRevenue',
        type: 'linear',
        channels: [{ markIndex: 0, channel: 'position.y', field: 'revenue' }],
      }),
    ]);
    expect(lineage.scales?.flatMap(scale => scale.channels ?? []).some(channel => channel.channel === 'color')).toBe(
      false,
    );
    expect(lineage.layout).toEqual(expect.objectContaining({ coordinateType: 'cartesian2D' }));
    expect(lineage.marks[0]?.rowValues).toEqual([{ region: 'East', revenue: 3 }]);
  });

  it('为共享 Scene 和血缘产物执行一次根和标记本地转换', () => {
    const applyCounts = { root: 0, mark: 0 };
    const countingTransform = defineTransform({
      kind: 'count-lineage-apply',
      paramsSchema: object({ scope: union([literal('root'), literal('mark')]) }),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });
    const countingTransformImplementation = defineTransformImplementation({
      definition: countingTransform,
      apply: (rows, operation) => {
        applyCounts[operation.params.scope] += 1;
        return rows;
      },
    });
    const spec = pointSpec();
    spec.transform = [{ operation: { kind: 'count-lineage-apply', params: { scope: 'root' } } }];
    spec.marks[0].transforms = [{ operation: { kind: 'count-lineage-apply', params: { scope: 'mark' } } }];

    lowerPlotWithLineage(spec, datasets, {
      definitions: { transforms: [countingTransform] },
      implementations: { transforms: [countingTransformImplementation] },
      environment: {},
      lineage: {},
    });

    expect(applyCounts).toEqual({ root: 1, mark: 1 });
  });

  it('针对血缘定位器请求执行一次根和标记本地转换', () => {
    const applyCounts = { root: 0, mark: 0 };
    const countingTransform = defineTransform({
      kind: 'count-lineage-locator-apply',
      paramsSchema: object({ scope: union([literal('root'), literal('mark')]) }),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });
    const countingTransformImplementation = defineTransformImplementation({
      definition: countingTransform,
      apply: (rows, operation) => {
        applyCounts[operation.params.scope] += 1;
        return rows;
      },
    });
    const spec = pointSpec();
    spec.transform = [{ operation: { kind: 'count-lineage-locator-apply', params: { scope: 'root' } } }];
    spec.marks[0].transforms = [{ operation: { kind: 'count-lineage-locator-apply', params: { scope: 'mark' } } }];

    createPlotLineageLocator(spec, datasets, {
      definitions: { transforms: [countingTransform] },
      implementations: { transforms: [countingTransformImplementation] },
      environment: {},
      lineage: {},
    });

    expect(applyCounts).toEqual({ root: 1, mark: 1 });
  });

  it('针对单独的 Scene 和血缘下沉请求独立执行转换', () => {
    const applyCounts = { root: 0, mark: 0 };
    const countingTransform = defineTransform({
      kind: 'count-independent-lineage-apply',
      paramsSchema: object({ scope: union([literal('root'), literal('mark')]) }),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });
    const countingTransformImplementation = defineTransformImplementation({
      definition: countingTransform,
      apply: (rows, operation) => {
        applyCounts[operation.params.scope] += 1;
        return rows;
      },
    });
    const spec = pointSpec();
    spec.transform = [{ operation: { kind: 'count-independent-lineage-apply', params: { scope: 'root' } } }];
    spec.marks[0].transforms = [{ operation: { kind: 'count-independent-lineage-apply', params: { scope: 'mark' } } }];
    const options = {
      lineage: {},
      definitions: { transforms: [countingTransform] },
      implementations: { transforms: [countingTransformImplementation] },
    };

    lowerPlotWithLineage(spec, datasets, { ...options, environment: {} });
    lowerPlotWithLineage(spec, datasets, { ...options, environment: {} });

    expect(applyCounts).toEqual({ root: 2, mark: 2 });
  });

  it('当启用的字段不存在时，忽略宿主元数据', () => {
    const { lineage } = lowerPlotWithLineage(pointSpec(), datasets, {
      environment: {},
      lineage: { hostMetadata: { query: true } },
      hostLineageMetadata: {},
    });

    expect('hostMetadata' in lineage).toBe(false);
  });

  it('记录扩展通道字段和声明的比例绑定', () => {
    const { lineage } = lowerPlotWithLineage(extensionChannelSpec(), datasets, {
      definitions: { channels: [intensityChannel] },
      environment: {},

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

  it('拒绝无界行值选项', () => {
    expect(() =>
      lowerPlotWithLineage(pointSpec(), datasets, {
        environment: {},
        lineage: { rowValues: { maxRows: 0, fields: ['region'] } },
      }),
    ).toThrow(/rowValues.maxRows/);
    expect(() =>
      lowerPlotWithLineage(pointSpec(), datasets, {
        environment: {},
        lineage: { rowValues: { maxRows: 1, fields: [] } },
      }),
    ).toThrow(/rowValues.fields/);
  });

  it.each([0.5, 1.5, NaN, Infinity])('拒绝 rowValues.maxRows=%s', maxRows => {
    expect(() =>
      lowerPlotWithLineage(pointSpec(), datasets, {
        environment: {},
        lineage: { rowValues: { maxRows, fields: ['region'] } },
      }),
    ).toThrow(/rowValues\.maxRows must be a positive integer/);
  });

  it('使未知变换误差与 lowerPlots 保持一致', () => {
    const spec = {
      ...pointSpec(),
      transform: [{ operation: { kind: 'missing-transform' as const, params: {} } }],
    };

    expect(() => lowerPlotWithDataArtifact(spec, datasets, { textMeasurer: measureLabel }).child).toThrow(
      /not registered/,
    );
    expect(() => lowerPlotWithLineage(spec, datasets, { environment: {}, lineage: {} })).toThrow(/not registered/);
  });

  it('返回与锚元对齐的定位器血缘', () => {
    const locator = createPlotLineageLocator(pointSpec(), datasets, {
      layout: { width: 480, height: 300 },
      environment: {},

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

  it('不为系列锚点制作基准血缘', () => {
    const locator = createPlotLineageLocator(seriesSpec(), datasets, {
      layout: { width: 480, height: 300 },
      environment: {},

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
