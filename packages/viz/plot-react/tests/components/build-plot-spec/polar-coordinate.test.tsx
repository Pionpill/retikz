import type { PlotSpec } from '@retikz/plot';

import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { createPolarPieSpec } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { Axis } from '../../../src/components/guides';
import { IntervalMark, PathMark } from '../../../src/components/marks';
import { Scale } from '../../../src/components/scales';

describe('buildPlotSpec polar coordinate / sector / area / closed / angle·radius', () => {
  it('radial_bar_equivalence：coordinate="polar2D" + <IntervalMark> → polar2D + band 角向 + interval mark', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="amount" color="month" />, '__plot', {
      coordinate: 'polar2D',
    });
    const expected: PlotSpec = {
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

  it('pie_equivalence：coordinate="polar2D" + <IntervalMark angle> → polar2D + linear 角向 + stack transform + interval mark', () => {
    const spec = buildPlotSpec(<IntervalMark angle="value" color="label" />, '__plot', { coordinate: 'polar2D' });
    const expected = createPolarPieSpec('__plot', { angle: '__angle', radius: '__radius', color: '__color' });
    expect(spec).toEqual(expected);
  });

  it('pie_color_defaults_to_angle_field：未给 color → 按 angle 值字段分类上色', () => {
    const spec = buildPlotSpec(<IntervalMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.marks[0]).toEqual({
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      encoding: { color: { field: 'value', scale: '__color' } },
    });
    expect(spec.transform).toEqual([{ kind: 'stack', y: 'value' }]);
  });

  it('sector_series_orders_stack：<IntervalMark angle series> → stack transform 带 groupBy', () => {
    const spec = buildPlotSpec(<IntervalMark angle="value" series="label" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.transform).toEqual([{ kind: 'stack', y: 'value', groupBy: 'label' }]);
    expect(spec.marks[0]).toEqual({
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      encoding: { color: { field: 'label', scale: '__color' } },
    });
  });

  it('donut_inner_radius：coordinate 对象 innerRadius → 进 IR', () => {
    const spec = buildPlotSpec(<IntervalMark angle="value" color="label" />, '__plot', {
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
    const spec = buildPlotSpec(<IntervalMark angle="value" />, '__plot', {
      coordinate: { type: 'polar2D', startAngle: -90, endAngle: 90 },
    });
    expect(spec.coordinate).toMatchObject({ type: 'polar2D', startAngle: -90, endAngle: 90, innerRadius: 0 });
  });

  it('polar_explicit_scale_dimensions：x / y 维度分别落到 __angle / __radius', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="theta" y="r" order="theta" />
        <Scale dimension="x" type="point" />
        <Scale dimension="y" type="log" />
      </>,
      '__plot',
      { coordinate: 'polar2D' },
    );
    expect(spec.scales[0]).toEqual({ type: 'point', name: '__angle' });
    expect(spec.scales[1]).toEqual({ type: 'log', name: '__radius' });
    expect(spec.coordinate).toMatchObject({ type: 'polar2D', angle: '__angle', radius: '__radius' });
  });

  it('radar_equivalence：<PathMark> + polar 默认闭合 → point 角向', () => {
    const spec = buildPlotSpec(<PathMark x="dim" y="value" />, '__plot', { coordinate: 'polar2D' });
    const expected: PlotSpec = {
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
    const spec = buildPlotSpec(<PathMark x="theta" y="r" order="theta" closed={false} />, '__plot', {
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
    const spec = buildPlotSpec(<PathMark x="t" y="v" closure={{ kind: 'baseline', baseline: 2 }} />, '__plot', {
      coordinate: 'polar2D',
    });
    expect(spec.marks[0]).toEqual({
      type: 'path',
      closure: { kind: 'baseline', baseline: 2 },
      encoding: { x: { field: 't' }, y: { field: 'v' } },
    });
  });

  it('polar_explicit_axis：写 <Axis dimension="x"/> → guides 含该轴', () => {
    const spec = buildPlotSpec(
      <>
        <IntervalMark angle="value" />
        <Axis dimension="x" />
      </>,
      '__plot',
      { coordinate: 'polar2D' },
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('polar_radius_axis_grid：<Axis dimension="y" grid/> 落位', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="dim" y="value" closed />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
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
    const spec = buildPlotSpec(<IntervalMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.guides).toEqual([]);
  });

  it('cartesian_regression_no_coordinate：不传 coordinate → cartesian（向后兼容）', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="revenue" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.scales[0]).toEqual({ type: 'band', name: '__x' });
  });

  it('all_polar_products_pass_schema：polar 装配产物全过 PlotSpecSchema', () => {
    expect(() =>
      PlotSpecSchema.parse(buildPlotSpec(<IntervalMark angle="v" color="l" />, '__plot', { coordinate: 'polar2D' })),
    ).not.toThrow();
    expect(() =>
      PlotSpecSchema.parse(buildPlotSpec(<IntervalMark x="m" y="a" color="m" />, '__plot', { coordinate: 'polar2D' })),
    ).not.toThrow();
    expect(() =>
      PlotSpecSchema.parse(buildPlotSpec(<PathMark x="d" y="v" closed />, '__plot', { coordinate: 'polar2D' })),
    ).not.toThrow();
    expect(() =>
      PlotSpecSchema.parse(
        buildPlotSpec(<PathMark x="t" y="v" closure={{ kind: 'cycle' }} />, '__plot', {
          coordinate: { type: 'polar2D', innerRadius: 0.3 },
        }),
      ),
    ).not.toThrow();
  });
});
