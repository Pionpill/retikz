import type { IRPlotRelateTransform, IRPlotRelationRoutingSpec, IRPlotSpec } from '@retikz/plot';
import type { TextProps } from '@retikz/react';
import type { FC } from 'react';

import { lowerPlots, PlotSpecSchema } from '@retikz/plot';
import { Text } from '@retikz/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { buildPlotSpec } from '../../../src/adapter';
import { Axis, Legend } from '../../../src/components/guides';
import { CaptionLabel, TitleLabel } from '../../../src/components/labels';
import { IntervalMark, PathMark, PointMark, RelationMark } from '../../../src/components/marks';

const ShadowText: FC<TextProps> = () => null;
ShadowText.displayName = Text.displayName;

describe('buildPlotSpec 装配', () => {
  it('透传 Plot styleTokens 到 canonical PlotSpec', () => {
    const styleTokens: NonNullable<IRPlotSpec['styleTokens']> = { 'plot.palette.series': ['#2563eb'] };
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, '__plot', { styleTokens });
    expect(spec.styleTokens).toEqual(styleTokens);
  });

  it('单 line：装配出等价手写 IRPlotSpec（薄 Plot：无默认 guides）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" order="month" />, '__plot');
    const expected: IRPlotSpec = {
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

  it('point size 字段 → size 通道', () => {
    const spec = buildPlotSpec(<PointMark x="lng" y="lat" size="pop" />, '__plot', {
      dataFieldNames: new Set(['pop']),
    });
    expect(spec.marks[0]).toEqual({
      type: 'point',
      size: { kind: 'field', value: 'pop' },
      encoding: { x: { field: 'lng' }, y: { field: 'lat' } },
    });
  });

  it('point opacity 字段 → opacity 通道', () => {
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

  it('layer prop forwards to mark, guide, legend, and plot labels', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="x" y="y" layer={{ zIndex: 120 }} color="kind" />
        <Axis dimension="x" layer={{ zIndex: 240 }} />
        <Legend channel="color" layer={{ zIndex: 520 }} />
        <TitleLabel text="Revenue" layer={{ zIndex: 430 }} />
      </>,
      '__plot',
      { dataFieldNames: new Set(['kind']) },
    );

    expect(spec.marks[0]).toMatchObject({ layer: { zIndex: 120 } });
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x', layer: { zIndex: 240 } },
      { type: 'legend', channel: 'color', layer: { zIndex: 520 } },
    ]);
    expect(spec.labels?.[0]).toMatchObject({ role: 'title', layer: { zIndex: 430 } });
  });

  it('point shape 字段 → shape 通道', () => {
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
        strokeOpacity={0.9}
        opacity={0.8}
        rotate={45}
        padding={2}
        minimumSize={{ default: 14, width: 16, height: 12 }}
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
      strokeOpacity: { kind: 'constant', value: 0.9 },
      opacity: { kind: 'constant', value: 0.8 },
      rotate: { kind: 'constant', value: 45 },
      padding: { kind: 'constant', value: 2 },
      minimumSize: { kind: 'constant', value: { default: 14, width: 16, height: 12 } },
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

  it('relation mark assembles source-target refs, top-level label, path config, and color channel', () => {
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
    const transform: Array<IRPlotRelateTransform> = [
      {
        kind: 'relate',
        source: { selector: { kind: 'min', by: 'value' }, fields: { id: 'id' } },
        target: { selector: { kind: 'max', by: 'value' }, fields: { id: 'id' } },
        measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
      },
    ];
    const routing: IRPlotRelationRoutingSpec = { kind: 'bend', bendDirection: 'left', bendAngle: 20 };
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

  it('collects plot label components as plot-level labels', () => {
    const spec = buildPlotSpec(
      <>
        <TitleLabel
          text={['Monthly Revenue', 'Internal view']}
          placement={{ kind: 'side', side: 'top', placement: 'midway', padding: 8 }}
        />
        <CaptionLabel>Source: internal data</CaptionLabel>
        <PathMark x="month" y="revenue" />
      </>,
      '__plot',
      {
        layout: { autoPadding: true },
      },
    );
    expect(spec.layout).toEqual({ autoPadding: true });
    expect(spec.labels?.[0]).toMatchObject({
      type: 'text',
      role: 'title',
      text: ['Monthly Revenue', 'Internal view'],
    });
    expect(spec.labels?.[1]).toMatchObject({ type: 'text', role: 'caption', text: 'Source: internal data' });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('collects core Text children inside plot labels as styled text lines', () => {
    const spec = buildPlotSpec(
      <>
        <TitleLabel>
          <Text fill="#0f172a" font={{ weight: 'bold' }}>
            Monthly Revenue
          </Text>
          <Text opacity={0.65}>Internal view</Text>
        </TitleLabel>
        <PathMark x="month" y="revenue" />
      </>,
      '__plot',
    );
    expect(spec.labels?.[0]).toMatchObject({
      type: 'text',
      role: 'title',
      text: [
        { text: 'Monthly Revenue', fill: '#0f172a', font: { weight: 'bold' } },
        { text: 'Internal view', opacity: 0.65 },
      ],
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('collects plain text followed by core Text inside plot labels', () => {
    const spec = buildPlotSpec(
      <>
        <TitleLabel>
          Monthly Revenue
          <Text opacity={0.65}>Internal view</Text>
        </TitleLabel>
        <PathMark x="month" y="revenue" />
      </>,
      '__plot',
    );
    expect(spec.labels?.[0]).toMatchObject({
      type: 'text',
      role: 'title',
      text: ['Monthly Revenue', { text: 'Internal view', opacity: 0.65 }],
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('collects core Text children when the text child is wrapped in a single-item array', () => {
    const textElement = createElement(Text, { opacity: 0.65, children: ['Internal view'] } as unknown as TextProps);
    const spec = buildPlotSpec(
      <>
        <TitleLabel>
          Monthly Revenue
          {textElement}
        </TitleLabel>
        <PathMark x="month" y="revenue" />
      </>,
      '__plot',
    );
    expect(spec.labels?.[0]).toMatchObject({
      type: 'text',
      role: 'title',
      text: ['Monthly Revenue', { text: 'Internal view', opacity: 0.65 }],
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('collects Text-compatible children by displayName across module instances', () => {
    const spec = buildPlotSpec(
      <>
        <TitleLabel>
          Monthly Revenue
          <ShadowText opacity={0.65}>Internal view</ShadowText>
        </TitleLabel>
        <PathMark x="month" y="revenue" />
      </>,
      '__plot',
    );
    expect(spec.labels?.[0]).toMatchObject({
      type: 'text',
      role: 'title',
      text: ['Monthly Revenue', { text: 'Internal view', opacity: 0.65 }],
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('does not invoke unknown function components while collecting plot label children', () => {
    const ThrowingWrapper: FC = () => {
      throw new Error('wrapper component must not run during buildPlotSpec');
    };

    const spec = buildPlotSpec(
      <>
        <TitleLabel>
          Monthly Revenue
          <ThrowingWrapper />
        </TitleLabel>
        <PathMark x="month" y="revenue" />
      </>,
      '__plot',
    );

    expect(spec.labels?.[0]).toMatchObject({ type: 'text', role: 'title', text: 'Monthly Revenue' });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('rejects plot labels with both text prop and children', () => {
    expect(() =>
      buildPlotSpec(
        <>
          <TitleLabel text="Monthly Revenue">Internal view</TitleLabel>
          <PathMark x="month" y="revenue" />
        </>,
        '__plot',
      ),
    ).toThrow(/<TitleLabel> cannot use both text and children/);
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

  it('无 mark 子节点 → buildPlotSpec fail-loud 抛 schema 错误', () => {
    expect(() => buildPlotSpec(<></>, '__plot')).toThrow(ZodError);
  });

  // 薄 Plot guide 装配（无默认 / 显式）
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
        <Axis
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
