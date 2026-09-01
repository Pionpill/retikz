import type { IRPlot } from '@retikz/plot';

import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { createPolarPieSpec } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis } from '../../../src/components/guides';
import { IntervalMark, PathMark, ReferenceMark, RelationMark } from '../../../src/components/marks';
import { PlotScale } from '../../../src/components/scales';

describe('buildPlotIR polar coordinate / sector / area / closed / angle·radius', () => {
  it('forwards coordinate and interpolation-sensitive mark overrides unchanged', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="angle" y="radius" interpolation="polar" />
        <IntervalMark x="angle" y="radius" interpolation="chord" />
        <ReferenceMark y={1} yTo={2} interpolation="polar" />
        <RelationMark
          source={{ project: { x: 'sourceAngle', y: 'sourceRadius' } }}
          target={{ project: { x: 'targetAngle', y: 'targetRadius' } }}
          path={{ interpolation: 'chord' }}
        />
      </>,
      '__plot',
      { coordinate: { type: 'polar2D', interpolation: 'chord' } },
    );

    expect(spec.coordinate).toMatchObject({ interpolation: 'chord' });
    expect(spec.marks).toMatchObject([
      { type: 'path', interpolation: 'polar' },
      { type: 'interval', interpolation: 'chord' },
      { type: 'reference', interpolation: 'polar' },
      { type: 'relation', path: { interpolation: 'chord' } },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('radial_bar_equivalence：coordinate="polar2D" + <IntervalMark> → polar2D + band 角向 + interval mark', () => {
    const spec = buildPlotIR(<IntervalMark x="month" y="amount" color="month" />, '__plot', {
      coordinate: 'polar2D',
    });
    const expected: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'band', name: '__angle' },
        { type: 'linear', name: '__radius' },
        { type: 'ordinal', name: '__color' },
      ],
      coordinate: {
        type: 'polar2D',
        angle: '__angle',
        radius: '__radius',
        startAngle: 0,
        endAngle: 360,
        innerRadius: 0,
      },
      marks: [
        {
          type: 'interval',
          encoding: { x: { field: 'month' }, y: { field: 'amount' }, color: { field: 'month', scale: '__color' } },
        },
      ],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('radial_bar_explicit_band_scale_forwards_gap_options', () => {
    const spec = buildPlotIR(
      <>
        <IntervalMark x="month" y="amount" />
        <PlotScale dimension="x" type="band" paddingInner={0.15} paddingOuter={0} />
      </>,
      '__plot',
      { coordinate: 'polar2D' },
    );

    expect(spec.scales[0]).toEqual({
      type: 'band',
      name: '__angle',
      paddingInner: 0.15,
      paddingOuter: 0,
    });
  });

  it('pie_equivalence：coordinate="polar2D" + <IntervalMark angle> → polar2D + linear 角向 + stack transform + interval mark', () => {
    const spec = buildPlotIR(<IntervalMark angle="value" color="label" />, '__plot', { coordinate: 'polar2D' });
    const expected = createPolarPieSpec('__plot', { angle: '__angle', radius: '__radius', color: '__color' });
    expect(spec).toEqual(expected);
  });

  it('pie_color_defaults_to_angle_field：未给 color → 按 angle 值字段分类上色', () => {
    const spec = buildPlotIR(<IntervalMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.marks[0]).toEqual({
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      encoding: { color: { field: 'value', scale: '__color' } },
    });
    expect(spec.transform).toEqual([{ kind: 'stack', y: 'value' }]);
  });

  it('sector_series_orders_stack：<IntervalMark angle series> → stack transform 带 groupBy', () => {
    const spec = buildPlotIR(<IntervalMark angle="value" series="label" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.transform).toEqual([{ kind: 'stack', y: 'value', groupBy: 'label' }]);
    expect(spec.marks[0]).toEqual({
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      encoding: { color: { field: 'label', scale: '__color' } },
    });
  });

  it('donut_inner_radius：coordinate 对象 innerRadius → 进 IR', () => {
    const spec = buildPlotIR(<IntervalMark angle="value" color="label" />, '__plot', {
      coordinate: { type: 'polar2D', innerRadius: 0.5 },
    });
    expect(spec.coordinate).toEqual({
      type: 'polar2D',
      angle: '__angle',
      radius: '__radius',
      startAngle: 0,
      endAngle: 360,
      innerRadius: 0.5,
    });
  });

  it('polar_angle_range_object：startAngle / endAngle 进 IR（半圆等）', () => {
    const spec = buildPlotIR(<IntervalMark angle="value" />, '__plot', {
      coordinate: { type: 'polar2D', startAngle: -90, endAngle: 90 },
    });
    expect(spec.coordinate).toMatchObject({ type: 'polar2D', startAngle: -90, endAngle: 90, innerRadius: 0 });
  });

  it('polar_explicit_scale_dimensions：x / y 维度分别落到 __angle / __radius', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="theta" y="r" order="theta" />
        <PlotScale dimension="x" type="point" />
        <PlotScale dimension="y" type="log" />
      </>,
      '__plot',
      { coordinate: 'polar2D' },
    );
    expect(spec.scales[0]).toEqual({ type: 'point', name: '__angle' });
    expect(spec.scales[1]).toEqual({ type: 'log', name: '__radius' });
    expect(spec.coordinate).toMatchObject({ type: 'polar2D', angle: '__angle', radius: '__radius' });
  });

  it('radar_equivalence：<PathMark> + polar 默认闭合 → point 角向', () => {
    const spec = buildPlotIR(<PathMark x="dim" y="value" />, '__plot', { coordinate: 'polar2D' });
    const expected: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'point', name: '__angle' },
        { type: 'linear', name: '__radius' },
      ],
      coordinate: {
        type: 'polar2D',
        angle: '__angle',
        radius: '__radius',
        startAngle: 0,
        endAngle: 360,
        innerRadius: 0,
      },
      marks: [{ type: 'path', encoding: { x: { field: 'dim' }, y: { field: 'value' } } }],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('polar_line_equivalence：<PathMark closed={false}> + polar（不闭合）→ linear 角向', () => {
    const spec = buildPlotIR(<PathMark x="theta" y="r" order="theta" closed={false} />, '__plot', {
      coordinate: 'polar2D',
    });
    expect(spec.scales[0]).toEqual({ type: 'linear', name: '__angle' });
    expect(spec.marks[0]).toEqual({
      type: 'path',
      order: 'theta',
      closed: false,
      encoding: { x: { field: 'theta' }, y: { field: 'r' } },
    });
    expect(spec.coordinate).toMatchObject({ type: 'polar2D', angle: '__angle', radius: '__radius' });
  });

  it('area_mark_equivalence：<PathMark> → area mark IR（baseline / closed 落位）', () => {
    const spec = buildPlotIR(<PathMark x="t" y="v" closure={{ kind: 'baseline', baseline: 2 }} />, '__plot', {
      coordinate: 'polar2D',
    });
    expect(spec.marks[0]).toEqual({
      type: 'path',
      closure: { kind: 'baseline', baseline: 2 },
      encoding: { x: { field: 't' }, y: { field: 'v' } },
    });
  });

  it('polar_explicit_axis：写 <PlotAxis dimension="x"/> → guides 含该轴', () => {
    const spec = buildPlotIR(
      <>
        <IntervalMark angle="value" />
        <PlotAxis dimension="x" />
      </>,
      '__plot',
      { coordinate: 'polar2D' },
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('polar_radius_axis_grid：<PlotAxis dimension="y" grid/> 落位', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="dim" y="value" closed />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
      </>,
      '__plot',
      { coordinate: 'polar2D' },
    );
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
  });

  it('polar_default_no_guides：polar 缺省不画轴（与 cartesian 默认全套相对）', () => {
    const spec = buildPlotIR(<IntervalMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.guides).toEqual([]);
  });

  it('cartesian_regression_no_coordinate：不传 coordinate → cartesian（向后兼容）', () => {
    const spec = buildPlotIR(<IntervalMark x="month" y="revenue" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.scales[0]).toEqual({ type: 'band', name: '__x' });
  });

  it('all_polar_products_pass_schema：polar 装配产物全过 PlotSchema', () => {
    expect(() =>
      PlotSchema.parse(buildPlotIR(<IntervalMark angle="v" color="l" />, '__plot', { coordinate: 'polar2D' })),
    ).not.toThrow();
    expect(() =>
      PlotSchema.parse(buildPlotIR(<IntervalMark x="m" y="a" color="m" />, '__plot', { coordinate: 'polar2D' })),
    ).not.toThrow();
    expect(() =>
      PlotSchema.parse(buildPlotIR(<PathMark x="d" y="v" closed />, '__plot', { coordinate: 'polar2D' })),
    ).not.toThrow();
    expect(() =>
      PlotSchema.parse(
        buildPlotIR(<PathMark x="t" y="v" closure={{ kind: 'cycle' }} />, '__plot', {
          coordinate: { type: 'polar2D', innerRadius: 0.3 },
        }),
      ),
    ).not.toThrow();
  });
});
