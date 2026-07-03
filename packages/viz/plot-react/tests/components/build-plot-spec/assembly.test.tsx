import type { PlotSpec, RelateTransform, RelationRoutingSpec } from '@retikz/plot';

import { lowerPlots, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { Axis } from '../../../src/components/guides';
import { IntervalMark, PathMark, PointMark, RelationMark } from '../../../src/components/marks';

describe('buildPlotSpec 装配（ADR-08 / ADR-05）', () => {
  it('单 line：装配出等价手写 PlotSpec（薄 Plot：无默认 guides）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" order="month" />, '__plot');
    const expected: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [{ type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('单 point：marks 等价手写', () => {
    const spec = buildPlotSpec(<PointMark x="month" y="revenue" />, '__plot');
    expect(spec.marks).toEqual([{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }]);
  });

  it('point size 字段 → size 通道（alpha.7 ADR-02）', () => {
    const spec = buildPlotSpec(<PointMark x="lng" y="lat" size="pop" />, '__plot', {
      dataFieldNames: new Set(['pop']),
    });
    expect(spec.marks[0]).toEqual({
      type: 'point',
      size: { kind: 'field', value: 'pop' },
      encoding: { x: { field: 'lng' }, y: { field: 'lat' } },
    });
  });

  it('point opacity 字段 → opacity 通道（alpha.7 ADR-04）', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" opacity="density" />, '__plot', {
      dataFieldNames: new Set(['density']),
    });
    expect(spec.marks[0]).toEqual({
      type: 'point',
      opacity: { kind: 'field', value: 'density' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    });
  });

  it('point extension channels -> encoding.channels', () => {
    const spec = buildPlotSpec(
      <PointMark x="x" y="y" channels={{ intensity: 'score', threshold: { kind: 'constant', value: 0.8 } }} />,
      '__plot',
    );
    expect(spec.marks[0]).toEqual({
      type: 'point',
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
        channels: {
          intensity: { field: 'score' },
          threshold: { value: 0.8 },
        },
      },
    });
  });

  it('point shape 字段 → shape 通道（alpha.7 ADR-05）', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" shape="category" />, '__plot', {
      dataFieldNames: new Set(['category']),
    });
    expect(spec.marks[0]).toEqual({
      type: 'point',
      shape: { kind: 'field', value: 'category' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    });
  });

  it('point stroke 字段 → stroke / strokeWidth 通道', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" stroke="region" strokeWidth="density" />, '__plot', {
      dataFieldNames: new Set(['region', 'density']),
    });
    expect(spec.marks[0]).toEqual({
      type: 'point',
      stroke: { kind: 'field', value: 'region' },
      strokeWidth: { kind: 'field', value: 'density' },
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
      },
    });
  });

  it('point node style props pass through to mark IR', () => {
    const spec = buildPlotSpec(
      <PointMark
        x="x"
        y="y"
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth={1.5}
        fillOpacity={0.7}
        drawOpacity={0.9}
        opacity={0.8}
        rotate={45}
        padding={2}
        minimumSize={14}
        minimumWidth={16}
        minimumHeight={12}
        zIndex={3}
      />,
      '__plot',
    );
    expect(spec.marks[0]).toEqual({
      type: 'point',
      fill: { kind: 'constant', value: '#f8fafc' },
      stroke: { kind: 'constant', value: '#0f172a' },
      strokeWidth: { kind: 'constant', value: 1.5 },
      fillOpacity: { kind: 'constant', value: 0.7 },
      drawOpacity: { kind: 'constant', value: 0.9 },
      opacity: { kind: 'constant', value: 0.8 },
      rotate: { kind: 'constant', value: 45 },
      padding: { kind: 'constant', value: 2 },
      minimumSize: { kind: 'constant', value: 14 },
      minimumWidth: { kind: 'constant', value: 16 },
      minimumHeight: { kind: 'constant', value: 12 },
      zIndex: { kind: 'constant', value: 3 },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    });
  });

  it('path core style props pass through to mark IR', () => {
    const spec = buildPlotSpec(
      <PathMark
        x="x"
        y="y"
        strokeWidth={3}
        opacity={0.6}
        lineCap="round"
        lineJoin="bevel"
        roundedCorners={4}
        marks={[{ pos: 1, mark: { kind: 'arrow' } }]}
      />,
      '__plot',
    );
    expect(spec.marks[0]).toEqual({
      type: 'path',
      strokeWidth: { kind: 'constant', value: 3 },
      opacity: { kind: 'constant', value: 0.6 },
      lineCap: { kind: 'constant', value: 'round' },
      lineJoin: { kind: 'constant', value: 'bevel' },
      roundedCorners: { kind: 'constant', value: 4 },
      marks: [{ pos: 1, mark: { kind: 'arrow' } }],
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    });
  });

  it('interval core node style props pass through to mark IR', () => {
    const spec = buildPlotSpec(
      <IntervalMark x="month" y="revenue" strokeWidth="weight" fillOpacity={0.5} opacity={0.9} />,
      '__plot',
      { dataFieldNames: new Set(['weight']) },
    );
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      strokeWidth: { kind: 'field', value: 'weight' },
      fillOpacity: { kind: 'constant', value: 0.5 },
      opacity: { kind: 'constant', value: 0.9 },
    });
  });

  it('interval padAngle forwards to interval mark', () => {
    const spec = buildPlotSpec(<IntervalMark angle="value" padAngle={4} />, '__plot', { coordinate: 'polar2D' });
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      padAngle: 4,
    });
  });

  it('interval pull forwards numeric and field values to interval mark', () => {
    const numeric = buildPlotSpec(<IntervalMark angle="value" pull={12} />, '__plot', { coordinate: 'polar2D' });
    expect(numeric.marks[0]).toMatchObject({
      type: 'interval',
      pull: { kind: 'constant', value: 12 },
    });

    const field = buildPlotSpec(<IntervalMark angle="value" pull="offset" />, '__plot', { coordinate: 'polar2D' });
    expect(field.marks[0]).toMatchObject({
      type: 'interval',
      pull: { kind: 'field', value: 'offset' },
    });
  });

  it('relation mark assembles source-target refs, top-level label, path passthrough, and color channel', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="x" y="y" anchorId={{ prefix: 'pt', field: 'id' }} />
        <RelationMark
          source={{ anchorId: { prefix: 'pt', field: 'from' } }}
          target={{ anchorId: { prefix: 'pt', field: 'to' } }}
          label={{ content: { field: 'label' }, position: 'midway' }}
          path={{ options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }], roundedCorners: 6 } }}
          color="kind"
        />
      </>,
      '__plot',
      { dataFieldNames: new Set(['kind']) },
    );
    expect(spec.marks[0]).toMatchObject({
      type: 'point',
      anchorId: { prefix: 'pt', field: 'id' },
    });
    expect(spec.marks[1]).toEqual({
      type: 'relation',
      source: { anchorId: { prefix: 'pt', field: 'from' } },
      target: { anchorId: { prefix: 'pt', field: 'to' } },
      label: { content: { field: 'label' }, position: 'midway' },
      path: { options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }], roundedCorners: 6 } },
      encoding: { color: { field: 'kind', scale: '__color' } },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('relation mark forwards mark-scoped transform and routing strategy', () => {
    const transform: Array<RelateTransform> = [
      {
        kind: 'relate',
        source: { selector: { op: 'min', by: 'value' }, fields: { id: 'id' } },
        target: { selector: { op: 'max', by: 'value' }, fields: { id: 'id' } },
        measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
      },
    ];
    const routing: RelationRoutingSpec = { kind: 'bend', bendDirection: 'left', bendAngle: 20 };
    const spec = buildPlotSpec(
      <RelationMark
        transform={transform}
        source={{ anchorId: { prefix: 'trend', field: 'sourceId' } }}
        target={{ anchorId: { prefix: 'trend', field: 'targetId' } }}
        label={{ content: { field: 'deltaLabel' }, position: 0.5 }}
        path={{ routing }}
      />,
      '__plot',
    );
    expect(spec.marks[0]).toEqual({
      type: 'relation',
      transform,
      source: { anchorId: { prefix: 'trend', field: 'sourceId' } },
      target: { anchorId: { prefix: 'trend', field: 'targetId' } },
      label: { content: { field: 'deltaLabel' }, position: 0.5 },
      path: { routing },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('relation mark assembles ribbon kind, shared style, and ribbon options', () => {
    const spec = buildPlotSpec(
      <RelationMark
        kind="ribbon"
        source={{ project: { x: 'sourceX', y: 'sourceY' } }}
        target={{ project: { x: 'targetX', y: 'targetY' } }}
        style={{ fill: { kind: 'field', value: 'fill' }, opacity: { kind: 'constant', value: 0.8 } }}
        ribbon={{
          width: { kind: 'field', value: 'width' },
          endWidth: { kind: 'constant', value: 4 },
          options: { interpolation: 'smooth' },
        }}
      />,
      '__plot',
    );
    expect(spec.marks[0]).toEqual({
      type: 'relation',
      kind: 'ribbon',
      source: { project: { x: 'sourceX', y: 'sourceY' } },
      target: { project: { x: 'targetX', y: 'targetY' } },
      style: { fill: { kind: 'field', value: 'fill' }, opacity: { kind: 'constant', value: 0.8 } },
      ribbon: {
        width: { kind: 'field', value: 'width' },
        endWidth: { kind: 'constant', value: 4 },
        options: { interpolation: 'smooth' },
      },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('line + point 叠加：marks 两项、共享 scales/coordinate', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        <PointMark x="m" y="r" />
      </>,
      '__plot',
    );
    expect(spec.marks).toHaveLength(2);
    expect(spec.marks[0]?.type).toBe('path');
    expect(spec.marks[1]?.type).toBe('point');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
  });

  it('装配产物是合法 IR（过 PlotSpecSchema）', () => {
    const spec = buildPlotSpec(<PathMark x="m" y="r" />, '__plot');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('忽略非 mark 子节点（裸文本等）', () => {
    const spec = buildPlotSpec(
      <>
        hello
        <PathMark x="m" y="r" />
      </>,
      '__plot',
    );
    expect(spec.marks).toHaveLength(1);
  });

  it('无 mark 子节点 → marks 为空 → PlotSpecSchema(.min(1)) 拒绝', () => {
    const spec = buildPlotSpec(<></>, '__plot');
    expect(spec.marks).toHaveLength(0);
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });

  // alpha.10：薄 Plot guide 装配（无默认 / 显式）
  it('dsl_no_axis_no_guides：无 <Axis> → guides 为空（薄 Plot 不补默认轴）', () => {
    const spec = buildPlotSpec(<PathMark x="m" y="r" />, '__plot');
    expect(spec.guides).toEqual([]);
  });

  it('dsl_explicit_axis_only：写 <Axis dimension="x"/> → 仅该轴（显式所得、无默认）', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        <Axis dimension="x" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('dsl_axis_fields：<Axis> 字段逐一落位（含 grid）', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        <Axis dimension="y" ticks={{ count: 5 }} tickLabels={false} grid id="yA" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'y', ticks: { count: 5 }, tickLabels: false, grid: true, id: 'yA' },
    ]);
  });

  it('dsl_axis_with_grid：<Axis dimension="y" grid/> → grid:true', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        <Axis dimension="y" grid />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'y', grid: true }]);
  });

  it('dsl_built_guides_pass_schema：默认装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(<PathMark x="m" y="r" />, '__plot');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('dsl_axis_bad_dim_type：非法 dimension 经 lowering 按坐标系角色拒绝', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        {/* @ts-expect-error 故意传非法 dimension，验证 lowering 按坐标系角色拒绝 */}
        <Axis dimension="q" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'q' }]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
    expect(() => lowerPlots({ __plot: [{ m: 1, r: 2 }] }, { width: 320, height: 200 })[0]?.expand(spec)).toThrow(
      /does not support axis dimension "q"/,
    );
  });
});
