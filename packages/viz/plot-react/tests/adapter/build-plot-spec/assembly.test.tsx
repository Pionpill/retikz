import { compileToScene } from '@retikz/core';
import type { IRDataTransformDeclaration } from '@retikz/data';
import type { IRPlot, IRPlotRelationRouting } from '@retikz/plot';
import { lowerPlots, PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis, PlotLegend } from '../../../src/components/guides';
import { IntervalMark, PathMark, PointMark, RelationMark } from '../../../src/components/marks';

const compilePlot = (
  spec: IRPlot,
  datasets: Parameters<typeof lowerPlots>[0],
  options?: Parameters<typeof lowerPlots>[1],
) => compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots(datasets, options) });

describe('buildPlotIR 装配', () => {
  it('透传 Plot defaultPlot 到 canonical IRPlot', () => {
    const defaultPlot: NonNullable<IRPlot['defaultPlot']> = { palette: { series: ['#2563eb'] } };
    const spec = buildPlotIR(<PathMark encodings={{ position: { x: 'month', y: 'revenue' } }} />, '__plot', {
      defaultPlot,
    });

    expect(spec.defaultPlot).toEqual(defaultPlot);
  });

  it('透传 Plot plotRules 到 canonical IRPlot', () => {
    const plotRules: NonNullable<IRPlot['plotRules']> = [
      {
        select: { dimension: 'x' },
        axis: { grid: { includeDomain: true } },
      },
    ];
    const spec = buildPlotIR(<PathMark encodings={{ position: { x: 'month', y: 'revenue' } }} />, '__plot', {
      plotRules,
    });

    expect(spec.plotRules).toEqual(plotRules);
  });

  it('单 line：装配出等价手写 IRPlot（薄 Plot：无默认 guides）', () => {
    const spec = buildPlotIR(
      <PathMark encodings={{ order: 'month', position: { x: 'month', y: 'revenue' } }} />,
      '__plot',
    );
    const expected: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [{ type: 'path', kind: 'data', encodings: { order: 'month', position: { x: 'month', y: 'revenue' } } }],
      guides: [],
    };

    expect(spec).toEqual(expected);
  });

  it('单 point：marks 等价手写', () => {
    const spec = buildPlotIR(<PointMark encodings={{ position: { x: 'month', y: 'revenue' } }} />, '__plot');

    expect(spec.marks).toEqual([
      { type: 'point', kind: 'data', encodings: { position: { x: 'month', y: 'revenue' } } },
    ]);
  });

  it('point size 字段 → size 通道', () => {
    const spec = buildPlotIR(<PointMark encodings={{ size: 'pop', position: { x: 'lng', y: 'lat' } }} />, '__plot', {
      dataFieldNames: new Set(['pop']),
    });

    expect(spec.marks[0]).toEqual({
      type: 'point',
      kind: 'data',
      encodings: { size: 'pop', position: { x: 'lng', y: 'lat' } },
    });
  });

  it('point opacity 字段 → opacity 通道', () => {
    const spec = buildPlotIR(
      <PointMark encodings={{ opacity: { overall: 'density' }, position: { x: 'x', y: 'y' } }} />,
      '__plot',
      {
        dataFieldNames: new Set(['density']),
      },
    );

    expect(spec.marks[0]).toEqual({
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' }, opacity: { overall: 'density' } },
    });
  });

  it('point extension fields remain in encodings', () => {
    const spec = buildPlotIR(
      <PointMark encodings={{ intensity: 'score', threshold: 'limit', position: { x: 'x', y: 'y' } }} />,
      '__plot',
    );

    expect(spec.marks[0]).toEqual({
      type: 'point',
      kind: 'data',
      encodings: { intensity: 'score', threshold: 'limit', position: { x: 'x', y: 'y' } },
    });
  });

  it('layer prop forwards to marks and guides', () => {
    const spec = buildPlotIR(
      <>
        <PointMark layer={{ zIndex: 120 }} encodings={{ color: 'kind', position: { x: 'x', y: 'y' } }} />
        <PlotAxis dimension="x" layer={{ zIndex: 240 }} />
        <PlotLegend channel="color" layer={{ zIndex: 520 }} />
      </>,
      '__plot',
      { dataFieldNames: new Set(['kind']) },
    );

    expect(spec.marks[0]).toMatchObject({ layer: { zIndex: 120 } });
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x', layer: { zIndex: 240 } },
      { type: 'legend', channel: 'color', layer: { zIndex: 520 } },
    ]);
  });

  it('point shape 字段 → shape 通道', () => {
    const spec = buildPlotIR(<PointMark encodings={{ shape: 'category', position: { x: 'x', y: 'y' } }} />, '__plot', {
      dataFieldNames: new Set(['category']),
    });

    expect(spec.marks[0]).toEqual({
      type: 'point',
      kind: 'data',
      encodings: { shape: 'category', position: { x: 'x', y: 'y' } },
    });
  });

  it('point stroke 字段 → stroke / strokeWidth 通道', () => {
    const spec = buildPlotIR(
      <PointMark encodings={{ stroke: 'region', strokeWidth: 'density', position: { x: 'x', y: 'y' } }} />,
      '__plot',
      {
        dataFieldNames: new Set(['region', 'density']),
      },
    );

    expect(spec.marks[0]).toEqual({
      type: 'point',
      kind: 'data',
      encodings: { stroke: 'region', strokeWidth: 'density', position: { x: 'x', y: 'y' } },
    });
  });

  it('point node style props pass through to mark IR', () => {
    const spec = buildPlotIR(
      <PointMark
        encodings={{ position: { x: 'x', y: 'y' } }}
        properties={{
          fill: '#f8fafc',
          stroke: '#0f172a',
          strokeWidth: 1.5,
          opacity: { fill: 0.7, stroke: 0.9, overall: 0.8 },
          rotate: 45,
          padding: 2,
          minimumSize: { default: 14, width: 16, height: 12 },
          zIndex: 3,
        }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toEqual({
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: {
        fill: '#f8fafc',
        stroke: '#0f172a',
        strokeWidth: 1.5,
        rotate: 45,
        padding: 2,
        minimumSize: { default: 14, width: 16, height: 12 },
        zIndex: 3,
        opacity: { fill: 0.7, stroke: 0.9, overall: 0.8 },
      },
    });
  });

  it('path core style props pass through to mark IR', () => {
    const spec = buildPlotIR(
      <PathMark
        encodings={{ position: { x: 'x', y: 'y' } }}
        properties={{
          strokeWidth: 3,
          opacity: { overall: 0.6 },
          lineCap: 'round',
          lineJoin: 'bevel',
          roundedCorners: 4,
          marks: [{ pos: 1, mark: { kind: 'arrow' } }],
        }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toEqual({
      type: 'path',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: {
        strokeWidth: 3,
        lineCap: 'round',
        lineJoin: 'bevel',
        roundedCorners: 4,
        marks: [{ pos: 1, mark: { kind: 'arrow' } }],
        opacity: { overall: 0.6 },
      },
    });
  });

  it('interval core node style props pass through to mark IR', () => {
    const spec = buildPlotIR(
      <IntervalMark
        encodings={{ strokeWidth: 'weight', position: { x: 'month', y: 'revenue' } }}
        properties={{ opacity: { fill: 0.5, overall: 0.9 } }}
      />,
      '__plot',
      { dataFieldNames: new Set(['weight']) },
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      kind: 'data',
      encodings: { strokeWidth: 'weight' },
      properties: { opacity: { fill: 0.5, overall: 0.9 } },
    });
  });

  it('interval padAngle forwards to interval mark', () => {
    const spec = buildPlotIR(<IntervalMark angle="value" properties={{ padAngle: 4 }} />, '__plot', {
      coordinate: 'polar2D',
    });

    expect(spec.marks[0]).toMatchObject({ type: 'interval', kind: 'data', properties: { padAngle: 4 } });
  });

  it('interval pull forwards numeric and field values to interval mark', () => {
    const numeric = buildPlotIR(<IntervalMark angle="value" properties={{ pull: 12 }} />, '__plot', {
      coordinate: 'polar2D',
    });

    expect(numeric.marks[0]).toMatchObject({ type: 'interval', kind: 'data', properties: { pull: 12 } });

    const field = buildPlotIR(<IntervalMark angle="value" encodings={{ pull: 'offset' }} />, '__plot', {
      coordinate: 'polar2D',
    });

    expect(field.marks[0]).toMatchObject({ type: 'interval', kind: 'data', encodings: { pull: 'offset' } });
  });

  it('relation mark assembles source-target refs, top-level label, path config, and color channel', () => {
    const spec = buildPlotIR(
      <>
        <PointMark
          encodings={{ anchorId: 'id', position: { x: 'x', y: 'y' } }}
          properties={{ anchorId: { prefix: 'pt' } }}
        />
        <RelationMark
          encodings={{
            source: { anchorId: 'from' },
            target: { anchorId: 'to' },
            color: 'kind',
            label: { content: 'label' },
          }}
          properties={{
            source: { anchorId: { prefix: 'pt' } },
            target: { anchorId: { prefix: 'pt' } },
            label: { position: 'midway' },
            geometry: { kind: 'path', options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }], roundedCorners: 6 } },
          }}
        />
      </>,
      '__plot',
      { dataFieldNames: new Set(['kind']) },
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'point',
      kind: 'data',
      encodings: { anchorId: 'id' },
      properties: { anchorId: { prefix: 'pt' } },
    });
    expect(spec.marks[1]).toEqual({
      type: 'relation',
      kind: 'data',
      encodings: {
        source: { anchorId: 'from' },
        target: { anchorId: 'to' },
        label: { content: 'label' },
        color: { field: 'kind', scale: '__color' },
      },
      properties: {
        source: { anchorId: { prefix: 'pt' } },
        target: { anchorId: { prefix: 'pt' } },
        label: { position: 'midway' },
        geometry: { kind: 'path', options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }], roundedCorners: 6 } },
      },
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('relation mark forwards mark-scoped transform and routing strategy', () => {
    const transform: Array<IRDataTransformDeclaration> = [
      {
        operation: {
          kind: 'relate',
          params: {
            source: { selector: { kind: 'min', by: 'value' }, fields: { id: 'id' } },
            target: { selector: { kind: 'max', by: 'value' }, fields: { id: 'id' } },
            measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
          },
        },
      },
    ];
    const routing: IRPlotRelationRouting = { kind: 'bend', bendDirection: 'left', bendAngle: 20 };
    const spec = buildPlotIR(
      <RelationMark
        transforms={transform}
        encodings={{
          source: { anchorId: 'sourceId' },
          target: { anchorId: 'targetId' },
          label: { content: 'deltaLabel' },
        }}
        properties={{
          source: { anchorId: { prefix: 'trend' } },
          target: { anchorId: { prefix: 'trend' } },
          label: { position: 0.5 },
          geometry: { kind: 'path', routing },
        }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toEqual({
      type: 'relation',
      transforms: transform,
      kind: 'data',
      encodings: {
        source: { anchorId: 'sourceId' },
        target: { anchorId: 'targetId' },
        label: { content: 'deltaLabel' },
      },
      properties: {
        source: { anchorId: { prefix: 'trend' } },
        target: { anchorId: { prefix: 'trend' } },
        label: { position: 0.5 },
        geometry: { kind: 'path', routing },
      },
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('relation mark assembles ribbon kind, shared style, and ribbon options', () => {
    const spec = buildPlotIR(
      <RelationMark
        encodings={{
          source: { position: { x: 'sourceX', y: 'sourceY' } },
          target: { position: { x: 'targetX', y: 'targetY' } },
          fill: 'fill',
          geometry: { width: 'width' },
        }}
        properties={{
          opacity: { overall: 0.8 },
          geometry: {
            kind: 'ribbon',
            endWidth: 4,
            options: { interpolation: 'smooth' },
          },
        }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toEqual({
      type: 'relation',
      kind: 'data',
      encodings: {
        source: { position: { x: 'sourceX', y: 'sourceY' } },
        target: { position: { x: 'targetX', y: 'targetY' } },
        fill: 'fill',
        geometry: { width: 'width' },
      },
      properties: {
        opacity: { overall: 0.8 },
        geometry: { kind: 'ribbon', endWidth: 4, options: { interpolation: 'smooth' } },
      },
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('line + point 叠加：marks 两项、共享 scales/coordinate', () => {
    const spec = buildPlotIR(
      <>
        <PathMark encodings={{ position: { x: 'm', y: 'r' } }} />
        <PointMark encodings={{ position: { x: 'm', y: 'r' } }} />
      </>,
      '__plot',
    );

    expect(spec.marks).toHaveLength(2);
    expect(spec.marks[0]?.type).toBe('path');
    expect(spec.marks[1]?.type).toBe('point');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
  });

  it('装配产物是合法 IR（过 PlotSchema）', () => {
    const spec = buildPlotIR(<PathMark encodings={{ position: { x: 'm', y: 'r' } }} />, '__plot');

    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('忽略非 mark 子节点（裸文本等）', () => {
    const spec = buildPlotIR(
      <>
        hello
        <PathMark encodings={{ position: { x: 'm', y: 'r' } }} />
      </>,
      '__plot',
    );

    expect(spec.marks).toHaveLength(1);
  });

  // 薄 Plot guide 装配（无默认 / 显式）
  it('dsl_no_axis_no_guides：无 <PlotAxis> → guides 为空（薄 Plot 不补默认轴）', () => {
    const spec = buildPlotIR(<PathMark encodings={{ position: { x: 'm', y: 'r' } }} />, '__plot');

    expect(spec.guides).toEqual([]);
  });

  it('dsl_explicit_axis_only：写 <PlotAxis dimension="x"/> → 仅该轴（显式所得、无默认）', () => {
    const spec = buildPlotIR(
      <>
        <PathMark encodings={{ position: { x: 'm', y: 'r' } }} />
        <PlotAxis dimension="x" />
      </>,
      '__plot',
    );

    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('dsl_axis_fields：<PlotAxis> 字段逐一落位（含 grid）', () => {
    const spec = buildPlotIR(
      <>
        <PathMark encodings={{ position: { x: 'm', y: 'r' } }} />
        <PlotAxis
          dimension="y"
          ticks={{ count: 5 }}
          crossing={{ value: 0, tick: 'hide', label: 'hide' }}
          tickLabels={false}
          grid
          id="yA"
        />
      </>,
      '__plot',
    );

    expect(spec.guides).toEqual([
      {
        type: 'axis',
        dimension: 'y',
        ticks: { count: 5 },
        crossing: { value: 0, tick: 'hide', label: 'hide' },
        tickLabels: false,
        grid: true,
        id: 'yA',
      },
    ]);
  });

  it('dsl_axis_with_grid：<PlotAxis dimension="y" grid/> → grid:true', () => {
    const spec = buildPlotIR(
      <>
        <PathMark encodings={{ position: { x: 'm', y: 'r' } }} />
        <PlotAxis dimension="y" grid />
      </>,
      '__plot',
    );

    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'y', grid: true }]);
  });

  it('dsl_axis_grid_domain_endpoints：端点策略原样进入 canonical guide', () => {
    const spec = buildPlotIR(
      <>
        <PathMark encodings={{ position: { x: 'm', y: 'r' } }} />
        <PlotAxis dimension="x" grid={{ includeDomain: true }} />
      </>,
      '__plot',
    );

    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'x', grid: { includeDomain: true } }]);
  });

  it('dsl_axis_bad_dim_type：非法 dimension 经 lowering 按坐标系角色拒绝', () => {
    const spec = buildPlotIR(
      <>
        <PathMark encodings={{ position: { x: 'm', y: 'r' } }} />
        <PlotAxis dimension="q" />
      </>,
      '__plot',
    );

    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'q' }]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
    expect(() => compilePlot(spec, { __plot: [{ m: 1, r: 2 }] }, { layout: { width: 320, height: 200 } })).toThrow(
      /does not support axis dimension "q"/,
    );
  });
});
