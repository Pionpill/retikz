import type { IRPlot } from '@retikz/plot';

import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { IntervalMark, PathMark, PointMark } from '../../../src/components/marks';
import { PlotScale } from '../../../src/components/scales';

describe('buildPlotIR IntervalMark / color / series / stack / PlotScale', () => {
  it('barmark_equivalence_band_x', () => {
    const spec = buildPlotIR(<IntervalMark x="month" y="revenue" />, '__plot');
    const expected: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'band', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('bar_explicit_band_scale_forwards_gap_options', () => {
    const spec = buildPlotIR(
      <>
        <IntervalMark x="month" y="revenue" />
        <PlotScale dimension="x" type="band" paddingInner={0} paddingOuter={0} align={0.25} />
      </>,
      '__plot',
    );

    expect(spec.scales[0]).toEqual({
      type: 'band',
      name: '__x',
      paddingInner: 0,
      paddingOuter: 0,
      align: 0.25,
    });
  });

  it('point_color_builds_ordinal_scale_and_ref', () => {
    const spec = buildPlotIR(<PointMark x="gdp" y="life" color="continent" />, '__plot', {
      dataFieldNames: new Set(['continent']),
    });
    expect(spec.scales).toContainEqual({ type: 'ordinal', name: '__color' });
    expect(spec.marks[0]).toMatchObject({ color: { kind: 'field', value: 'continent', scale: '__color' } });
  });

  it('plot_theme_palette_is_preserved_without_adapter_owned_range', () => {
    const colors = ['#2563eb', '#f97316', 'currentColor'];
    const spec = buildPlotIR(<PointMark x="gdp" y="life" color="continent" />, '__plot', {
      plotTheme: { palette: { categorical: colors } },
      dataFieldNames: new Set(['continent']),
    });
    expect(spec.plotTheme?.palette?.categorical).toEqual(colors);
    expect(spec.scales).toContainEqual({ type: 'ordinal', name: '__color' });
  });

  it('no_color_no_ordinal_scale', () => {
    const spec = buildPlotIR(<PointMark x="m" y="r" />, '__plot');
    expect(spec.scales.some(s => s.type === 'ordinal')).toBe(false);
  });

  it('bar_series_dodge_default_and_color_eq_series', () => {
    const spec = buildPlotIR(<IntervalMark x="month" y="revenue" series="product" />, '__plot');
    const mark = spec.marks[0];
    expect(mark).toMatchObject({
      type: 'interval',
      series: 'product',
      bounds: { x: { kind: 'band', group: 'product' } },
    });
    // color 缺省取 series
    expect(mark).toMatchObject({ encoding: { color: { field: 'product', scale: '__color' } } });
    expect(spec.transform).toBeUndefined();
  });

  it('bar_stack_assembles_transform', () => {
    const spec = buildPlotIR(<IntervalMark x="month" y="revenue" series="product" stack />, '__plot');
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      series: 'product',
      bounds: { y: { kind: 'extent', from: 'y0', to: 'y1' } },
    });
    expect(spec.transform).toEqual([{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }]);
  });

  it('scale_x_time', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="date" y="v" />
        <PlotScale dimension="x" type="time" />
      </>,
      '__plot',
    );
    expect(spec.scales[0]).toEqual({ type: 'time', name: '__x' });
  });

  it('scale_x_log_sqrt', () => {
    expect(
      buildPlotIR(
        <>
          <PathMark x="d" y="v" />
          <PlotScale dimension="x" type="log" />
        </>,
        '__plot',
      ).scales[0],
    ).toEqual({ type: 'log', name: '__x' });
    expect(
      buildPlotIR(
        <>
          <PathMark x="d" y="v" />
          <PlotScale dimension="x" type="sqrt" />
        </>,
        '__plot',
      ).scales[0],
    ).toEqual({ type: 'sqrt', name: '__x' });
  });

  it('scale_y_log_sqrt_on_value_axis', () => {
    // <PlotScale dimension="y"> 作用于值轴（__y，scales[1]）；缺省 linear
    expect(buildPlotIR(<PathMark x="d" y="v" />, '__plot').scales[1]).toEqual({ type: 'linear', name: '__y' });
    expect(
      buildPlotIR(
        <>
          <PathMark x="d" y="v" />
          <PlotScale dimension="y" type="log" />
        </>,
        '__plot',
      ).scales[1],
    ).toEqual({ type: 'log', name: '__y' });
    expect(
      buildPlotIR(
        <>
          <PointMark x="d" y="v" />
          <PlotScale dimension="y" type="sqrt" />
        </>,
        '__plot',
      ).scales[1],
    ).toEqual({ type: 'sqrt', name: '__y' });
  });

  it('scale_y_symlog_radial_map_to_own_type_not_linear', () => {
    // 回归：symlog / radial 曾因 buildPositionScale 缺 case 静默回退 linear，导致 demo 与 linear 无差别
    expect(
      buildPlotIR(
        <>
          <PathMark x="d" y="v" />
          <PlotScale dimension="y" type="symlog" />
        </>,
        '__plot',
      ).scales[1],
    ).toEqual({ type: 'symlog', name: '__y' });
    expect(
      buildPlotIR(
        <>
          <PointMark x="d" y="v" />
          <PlotScale dimension="y" type="radial" />
        </>,
        '__plot',
      ).scales[1],
    ).toEqual({ type: 'radial', name: '__y' });
  });

  it('scale_duplicate_alias_rejected', () => {
    expect(() =>
      buildPlotIR(
        <>
          <PathMark x="d" y="v" />
          <PlotScale dimension="x" type="time" />
          <PlotScale dimension="x" type="linear" />
        </>,
        '__plot',
      ),
    ).toThrow(/duplicate scale/);
  });

  it('line_series_color_eq_series', () => {
    const spec = buildPlotIR(<PathMark x="t" y="v" series="city" order="t" />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'path', series: 'city', order: 't' });
    expect(spec.marks[0]).toMatchObject({ encoding: { color: { field: 'city', scale: '__color' } } });
  });

  it('all_dsl_products_pass_schema', () => {
    expect(() => PlotSchema.parse(buildPlotIR(<IntervalMark x="m" y="r" series="p" stack />, '__plot'))).not.toThrow();
    expect(() =>
      PlotSchema.parse(buildPlotIR(<PointMark x="m" y="r" color="c" />, '__plot', { dataFieldNames: new Set(['c']) })),
    ).not.toThrow();
  });

  it('mixed_bar_line_band_x', () => {
    // 混合 IntervalMark + PathMark → x band（IntervalMark 优先）
    const spec = buildPlotIR(
      <>
        <IntervalMark x="month" y="revenue" />
        <PathMark x="month" y="revenue" />
      </>,
      '__plot',
    );
    expect(spec.scales[0]).toEqual({ type: 'band', name: '__x' });
    expect(spec.marks).toHaveLength(2);
  });
});
