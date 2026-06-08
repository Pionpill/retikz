import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '@retikz/plot';
import { buildPlotSpec } from '../../src/components/buildPlotSpec';
import { Axis } from '../../src/components/guides';
import { AreaMark, BarMark, LineMark, PointMark, SectorMark } from '../../src/components/marks';

describe('buildPlotSpec model → type-driven 派生（alpha.6 ADR-03，评审 P1）', () => {
  it('有 model 时省略 AUTO 位置 scale 绑定（交给 expand 派生）', () => {
    const spec = buildPlotSpec(<LineMark x="month" y="revenue" />, '__plot', {
      model: [{ name: 'month', type: 'temporal' }, { name: 'revenue', type: 'continuous' }],
    });
    expect(spec.scales).toEqual([]);
    expect(spec.coordinate).toEqual({ type: 'cartesian2D' });
    expect(spec.data).toEqual({ reference: '__plot', model: [{ name: 'month', type: 'temporal' }, { name: 'revenue', type: 'continuous' }] });
  });

  it('无 model 时沿用 AUTO 绑定（向后兼容）', () => {
    const spec = buildPlotSpec(<LineMark x="month" y="revenue" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.scales.length).toBeGreaterThan(0);
  });

  it('有 model（nominal x）端到端 spec 合法', () => {
    const spec = buildPlotSpec(<LineMark x="cat" y="revenue" />, '__plot', {
      model: [{ name: 'cat', type: 'categorical' }, { name: 'revenue', type: 'continuous' }],
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});

describe('buildPlotSpec 装配（ADR-08 / ADR-05）', () => {
  it('单 line：装配出等价手写 PlotSpec（含默认 guides）', () => {
    const spec = buildPlotSpec(<LineMark x="month" y="revenue" order="month" />, '__plot');
    const expected: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ],
    };
    expect(spec).toEqual(expected);
  });

  it('单 point：marks 等价手写', () => {
    const spec = buildPlotSpec(<PointMark x="month" y="revenue" />, '__plot');
    expect(spec.marks).toEqual([{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }]);
  });

  it('line + point 叠加：marks 两项、共享 scales/coordinate', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <PointMark x="m" y="r" />
      </>,
      '__plot',
    );
    expect(spec.marks).toHaveLength(2);
    expect(spec.marks[0]?.type).toBe('line');
    expect(spec.marks[1]?.type).toBe('point');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
  });

  it('装配产物是合法 IR（过 PlotSpecSchema）', () => {
    const spec = buildPlotSpec(<LineMark x="m" y="r" />, '__plot');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('忽略非 mark 子节点（裸文本等）', () => {
    const spec = buildPlotSpec(
      <>
        hello
        <LineMark x="m" y="r" />
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

  // ADR-05：guide 装配（默认 / 显式 / bare）
  it('dsl_default_guides：无 <Axis> → 默认全套（x 轴 + y 轴带网格）', () => {
    const spec = buildPlotSpec(<LineMark x="m" y="r" />, '__plot');
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
  });

  it('dsl_explicit_axis_only：写 <Axis dimension="x"/> → 仅该轴（显式所得、无默认）', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <Axis dimension="x" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('dsl_axis_fields：<Axis> 字段逐一落位（含 grid）', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <Axis dimension="y" tickCount={5} tickLabels={false} grid id="yA" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'y', tickCount: 5, tickLabels: false, grid: true, id: 'yA' },
    ]);
  });

  it('dsl_axis_with_grid：<Axis dimension="y" grid/> → grid:true', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <Axis dimension="y" grid />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'y', grid: true }]);
  });

  it('dsl_bare_empty_guides：bare → guides:[]', () => {
    const spec = buildPlotSpec(<LineMark x="m" y="r" />, '__plot', { bare: true });
    expect(spec.guides).toEqual([]);
  });

  it('dsl_bare_ignores_axis：bare 优先，忽略 <Axis>', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        <Axis dimension="x" />
      </>,
      '__plot',
      { bare: true },
    );
    expect(spec.guides).toEqual([]);
  });

  it('dsl_built_guides_pass_schema：默认装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(<LineMark x="m" y="r" />, '__plot');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('dsl_axis_bad_dim_type：非法 dimension 经 PlotSpecSchema 被拒', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="m" y="r" />
        {/* @ts-expect-error 故意传非法 dimension，验证装配产物被 schema 拒 */}
        <Axis dimension="z" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });
});

describe('buildPlotSpec ADR-07（BarMark / color / series / stack / scaleX）', () => {
  it('barmark_equivalence_band_x', () => {
    const spec = buildPlotSpec(<BarMark x="month" y="revenue" />, '__plot');
    const expected: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'band', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ],
    };
    expect(spec).toEqual(expected);
  });

  it('point_color_builds_ordinal_scale_and_ref', () => {
    const spec = buildPlotSpec(<PointMark x="gdp" y="life" color="continent" />, '__plot');
    expect(spec.scales).toContainEqual({ type: 'ordinal', name: '__color' });
    expect(spec.marks[0]?.encoding.color).toEqual({ field: 'continent', scale: '__color' });
  });

  it('no_color_no_ordinal_scale', () => {
    const spec = buildPlotSpec(<PointMark x="m" y="r" />, '__plot');
    expect(spec.scales.some(s => s.type === 'ordinal')).toBe(false);
  });

  it('bar_series_dodge_default_and_color_eq_series', () => {
    const spec = buildPlotSpec(<BarMark x="month" y="revenue" series="product" />, '__plot');
    const mark = spec.marks[0];
    expect(mark).toMatchObject({ type: 'interval', series: 'product', arrangement: 'dodge' });
    // color 缺省取 series
    expect(mark.encoding.color).toEqual({ field: 'product', scale: '__color' });
    expect(spec.transform).toBeUndefined();
  });

  it('bar_stack_assembles_transform', () => {
    const spec = buildPlotSpec(<BarMark x="month" y="revenue" series="product" stack />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'interval', series: 'product', arrangement: 'stack' });
    expect(spec.transform).toEqual([{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }]);
  });

  it('scalex_time', () => {
    const spec = buildPlotSpec(<LineMark x="date" y="v" />, '__plot', { scaleX: 'time' });
    expect(spec.scales[0]).toEqual({ type: 'time', name: '__x' });
  });

  it('scalex_log_sqrt', () => {
    expect(buildPlotSpec(<LineMark x="d" y="v" />, '__plot', { scaleX: 'log' }).scales[0]).toEqual({ type: 'log', name: '__x' });
    expect(buildPlotSpec(<LineMark x="d" y="v" />, '__plot', { scaleX: 'sqrt' }).scales[0]).toEqual({ type: 'sqrt', name: '__x' });
  });

  it('scaley_log_sqrt_on_value_axis', () => {
    // scaleY 作用于值轴（__y，scales[1]）；缺省 linear
    expect(buildPlotSpec(<LineMark x="d" y="v" />, '__plot').scales[1]).toEqual({ type: 'linear', name: '__y' });
    expect(buildPlotSpec(<LineMark x="d" y="v" />, '__plot', { scaleY: 'log' }).scales[1]).toEqual({ type: 'log', name: '__y' });
    expect(buildPlotSpec(<PointMark x="d" y="v" />, '__plot', { scaleY: 'sqrt' }).scales[1]).toEqual({ type: 'sqrt', name: '__y' });
  });

  it('line_series_color_eq_series', () => {
    const spec = buildPlotSpec(<LineMark x="t" y="v" series="city" order="t" />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'line', series: 'city', order: 't' });
    expect(spec.marks[0]?.encoding.color).toEqual({ field: 'city', scale: '__color' });
  });

  it('all_dsl_products_pass_schema', () => {
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<BarMark x="m" y="r" series="p" stack />, '__plot'))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PointMark x="m" y="r" color="c" />, '__plot'))).not.toThrow();
  });

  it('mixed_bar_line_band_x', () => {
    // 混合 BarMark + LineMark → x band（BarMark 优先）
    const spec = buildPlotSpec(
      <>
        <BarMark x="month" y="revenue" />
        <LineMark x="month" y="revenue" />
      </>,
      '__plot',
    );
    expect(spec.scales[0]).toEqual({ type: 'band', name: '__x' });
    expect(spec.marks).toHaveLength(2);
  });
});

describe('buildPlotSpec ADR-05（polar coordinate / sector / area / closed / angle·radius）', () => {
  it('radial_bar_equivalence：coordinate="polar2D" + <BarMark> → polar2D + band 角向 + interval mark', () => {
    const spec = buildPlotSpec(<BarMark x="month" y="amount" color="month" />, '__plot', { coordinate: 'polar2D' });
    const expected: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'band', name: '__angle' },
        { type: 'linear', name: '__radius' },
        { type: 'ordinal', name: '__color' },
      ],
      coordinate: { type: 'polar2D', angle: '__angle', radius: '__radius', startAngle: 0, endAngle: 360, innerRadius: 0 },
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'amount' }, color: { field: 'month', scale: '__color' } } }],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('pie_equivalence：coordinate="polar2D" + <SectorMark> → polar2D + linear 角向 + stack transform + sector mark', () => {
    const spec = buildPlotSpec(<SectorMark angle="value" color="label" />, '__plot', { coordinate: 'polar2D' });
    const expected: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      transform: [{ kind: 'stack', y: 'value' }],
      scales: [
        { type: 'linear', name: '__angle' },
        { type: 'linear', name: '__radius' },
        { type: 'ordinal', name: '__color' },
      ],
      coordinate: { type: 'polar2D', angle: '__angle', radius: '__radius', startAngle: 0, endAngle: 360, innerRadius: 0 },
      marks: [{ type: 'sector', encoding: { color: { field: 'label', scale: '__color' } } }],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('pie_color_defaults_to_angle_field：未给 color → 按 angle 值字段分类上色', () => {
    const spec = buildPlotSpec(<SectorMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.marks[0]).toEqual({ type: 'sector', encoding: { color: { field: 'value', scale: '__color' } } });
    expect(spec.transform).toEqual([{ kind: 'stack', y: 'value' }]);
  });

  it('sector_series_orders_stack：<SectorMark series> → stack transform 带 groupBy', () => {
    const spec = buildPlotSpec(<SectorMark angle="value" series="label" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.transform).toEqual([{ kind: 'stack', y: 'value', groupBy: 'label' }]);
    expect(spec.marks[0]).toEqual({ type: 'sector', encoding: { color: { field: 'label', scale: '__color' } } });
  });

  it('donut_inner_radius：coordinate 对象 innerRadius → 进 IR', () => {
    const spec = buildPlotSpec(<SectorMark angle="value" color="label" />, '__plot', {
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
    const spec = buildPlotSpec(<SectorMark angle="value" />, '__plot', {
      coordinate: { type: 'polar2D', startAngle: -90, endAngle: 90 },
    });
    expect(spec.coordinate).toMatchObject({ type: 'polar2D', startAngle: -90, endAngle: 90, innerRadius: 0 });
  });

  it('radar_equivalence：<LineMark closed> + polar → closed line + point 角向', () => {
    const spec = buildPlotSpec(<LineMark x="dim" y="value" closed />, '__plot', { coordinate: 'polar2D' });
    const expected: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'point', name: '__angle' },
        { type: 'linear', name: '__radius' },
      ],
      coordinate: { type: 'polar2D', angle: '__angle', radius: '__radius', startAngle: 0, endAngle: 360, innerRadius: 0 },
      marks: [{ type: 'line', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } }],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('polar_line_equivalence：<LineMark> + polar（不闭合）→ linear 角向', () => {
    const spec = buildPlotSpec(<LineMark x="theta" y="r" order="theta" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.scales[0]).toEqual({ type: 'linear', name: '__angle' });
    expect(spec.marks[0]).toEqual({ type: 'line', order: 'theta', encoding: { x: { field: 'theta' }, y: { field: 'r' } } });
    expect(spec.coordinate).toMatchObject({ type: 'polar2D', angle: '__angle', radius: '__radius' });
  });

  it('area_mark_equivalence：<AreaMark> → area mark IR（baseline / closed 落位）', () => {
    const spec = buildPlotSpec(<AreaMark x="t" y="v" baseline={2} closed />, '__plot', { coordinate: 'polar2D' });
    expect(spec.marks[0]).toEqual({ type: 'area', baseline: 2, closed: true, encoding: { x: { field: 't' }, y: { field: 'v' } } });
  });

  it('polar_explicit_axis：写 <Axis dimension="angle"/> → guides 含该轴', () => {
    const spec = buildPlotSpec(
      <>
        <SectorMark angle="value" />
        <Axis dimension="angle" />
      </>,
      '__plot',
      { coordinate: 'polar2D' },
    );
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'angle' }]);
  });

  it('polar_radius_axis_grid：<Axis dimension="radius" grid/> 落位', () => {
    const spec = buildPlotSpec(
      <>
        <LineMark x="dim" y="value" closed />
        <Axis dimension="angle" />
        <Axis dimension="radius" grid />
      </>,
      '__plot',
      { coordinate: 'polar2D' },
    );
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'angle' },
      { type: 'axis', dimension: 'radius', grid: true },
    ]);
  });

  it('polar_default_no_guides：polar 缺省不画轴（与 cartesian 默认全套相对）', () => {
    const spec = buildPlotSpec(<SectorMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.guides).toEqual([]);
  });

  it('cartesian_regression_no_coordinate：不传 coordinate → cartesian（向后兼容）', () => {
    const spec = buildPlotSpec(<BarMark x="month" y="revenue" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.scales[0]).toEqual({ type: 'band', name: '__x' });
  });

  it('all_polar_products_pass_schema：polar 装配产物全过 PlotSpecSchema', () => {
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<SectorMark angle="v" color="l" />, '__plot', { coordinate: 'polar2D' }))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<BarMark x="m" y="a" color="m" />, '__plot', { coordinate: 'polar2D' }))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<LineMark x="d" y="v" closed />, '__plot', { coordinate: 'polar2D' }))).not.toThrow();
    expect(() =>
      PlotSpecSchema.parse(buildPlotSpec(<AreaMark x="t" y="v" closed />, '__plot', { coordinate: { type: 'polar2D', innerRadius: 0.3 } })),
    ).not.toThrow();
  });
});
