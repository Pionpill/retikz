import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '@retikz/plot';
import { buildPlotSpec } from '../../src/components/build-plot-spec';
import { Axis, Legend } from '../../src/components/guides';
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

  it('point size 字段 → size 通道（alpha.7 ADR-02）', () => {
    const spec = buildPlotSpec(<PointMark x="lng" y="lat" size="pop" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'point', encoding: { x: { field: 'lng' }, y: { field: 'lat' }, size: { field: 'pop' } } });
  });

  it('point opacity 字段 → opacity 通道（alpha.7 ADR-04）', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" opacity="density" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, opacity: { field: 'density' } } });
  });

  it('point shape 字段 → shape 通道（alpha.7 ADR-05）', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" shape="category" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, shape: { field: 'category' } } });
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

// ADR-03：Legend 装配（不吞默认 axes / 收集 / 字段落位）
describe('buildPlotSpec legend 装配（ADR-03 alpha.8）', () => {
  it('legend_does_not_suppress_default_axes：只声明 <Legend> → 默认 x/y 轴仍在 + legend', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <Legend channel="color" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
      { type: 'legend', channel: 'color' },
    ]);
  });

  it('explicit_axis_and_legend_coexist：显式 <Axis> + <Legend> → 该轴覆盖默认、legend 保留', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <Axis dimension="x" grid />
        <Legend channel="color" position="bottom" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x', grid: true },
      { type: 'legend', channel: 'color', position: 'bottom' },
    ]);
  });

  it('legend_fields：<Legend> 字段逐一落位', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="lon" y="lat" size="pop" />
        <Legend channel="size" scale="__size" title="Population" position="left" orient="vertical" tickCount={4} tickLabels={false} />
      </>,
      '__plot',
    );
    const legend = (spec.guides ?? []).find(guide => guide.type === 'legend');
    expect(legend).toEqual({ type: 'legend', channel: 'size', scale: '__size', title: 'Population', position: 'left', orient: 'vertical', tickCount: 4, tickLabels: false });
  });

  it('legend_bare_suppressed：bare → guides 为空（含 legend）', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <Legend channel="color" />
      </>,
      '__plot',
      { bare: true },
    );
    expect(spec.guides).toEqual([]);
  });

  it('legend_built_pass_schema：legend 装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <Legend channel="color" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
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

describe('buildPlotSpec 坐标系族 cartesian1D / polar1D / ternary2D（alpha.9 ADR-04）', () => {
  it('cartesian1d_coordinate_input：字符串简写 → IR coordinate.type', () => {
    const spec = buildPlotSpec(<PointMark x="value" />, '__plot', { coordinate: 'cartesian1D' });
    expect(spec.coordinate).toEqual({ type: 'cartesian1D', x: '__x' });
    expect(spec.marks[0]).toEqual({ type: 'point', encoding: { x: { field: 'value' } } });
  });

  it('cartesian1d_object_orientation：对象配置 orientation 进 IR', () => {
    const spec = buildPlotSpec(<PointMark x="value" />, '__plot', { coordinate: { type: 'cartesian1D', orientation: 'vertical' } });
    expect(spec.coordinate).toEqual({ type: 'cartesian1D', x: '__x', orientation: 'vertical' });
  });

  it('cartesian1d_point_only_x：PointMark 只 x（无 y）→ 合法 IR', () => {
    const spec = buildPlotSpec(<PointMark x="value" />, '__plot', { coordinate: 'cartesian1D' });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
    expect(spec.guides).toEqual([]);
  });

  it('polar1d_coordinate_input：字符串简写 + 对象半径/角向区间', () => {
    expect(buildPlotSpec(<PointMark x="hour" />, '__plot', { coordinate: 'polar1D' }).coordinate).toEqual({ type: 'polar1D', angle: '__angle' });
    const half = buildPlotSpec(<PointMark x="hour" />, '__plot', { coordinate: { type: 'polar1D', radius: 0.8, startAngle: 180, endAngle: 360 } });
    expect(half.coordinate).toEqual({ type: 'polar1D', angle: '__angle', radius: 0.8, startAngle: 180, endAngle: 360 });
  });

  it('ternary_coordinate_input：ternary2D + PointMark a/b/c → IR a/b/c encoding', () => {
    const spec = buildPlotSpec(<PointMark a="sand" b="silt" c="clay" color="region" />, '__plot', { coordinate: 'ternary2D' });
    expect(spec.coordinate).toEqual({ type: 'ternary2D' });
    expect(spec.scales).toEqual([{ type: 'ordinal', name: '__color' }]);
    expect(spec.marks[0]).toEqual({
      type: 'point',
      encoding: { a: { field: 'sand' }, b: { field: 'silt' }, c: { field: 'clay' }, color: { field: 'region', scale: '__color' } },
    });
  });

  it('cartesian_regression：默认 cartesian2D x/y 仍带默认轴（回归不变）', () => {
    const spec = buildPlotSpec(<PointMark x="m" y="r" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
  });

  it('all_family_products_pass_schema：1D / ternary 装配产物全过 PlotSpecSchema', () => {
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PointMark x="v" />, '__plot', { coordinate: 'cartesian1D' }))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PointMark x="h" />, '__plot', { coordinate: 'polar1D' }))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PointMark a="x" b="y" c="z" />, '__plot', { coordinate: 'ternary2D' }))).not.toThrow();
  });
});

describe('buildPlotSpec 自定义坐标系 custom（实验性，alpha.9 设计探讨）', () => {
  it('custom_coordinate_input：对象形态 → IR {type:custom, name, roles, params}', () => {
    const spec = buildPlotSpec(<PointMark x="hx" y="vy" />, '__plot', {
      coordinate: { type: 'custom', name: 'bridge', roles: ['x', 'y'], params: { archHeight: 70 } },
    });
    expect(spec.coordinate).toEqual({ type: 'custom', name: 'bridge', roles: ['x', 'y'], params: { archHeight: 70 } });
    expect(spec.scales).toEqual([]); // 自定义坐标系自建几何，无 AUTO 位置 scale
    expect(spec.guides).toEqual([]); // 非 cartesian2D，无默认轴
  });

  it('custom_coordinate_no_params：params 可省', () => {
    const spec = buildPlotSpec(<PointMark x="v" />, '__plot', { coordinate: { type: 'custom', name: 'sine', roles: ['x'] } });
    expect(spec.coordinate).toEqual({ type: 'custom', name: 'sine', roles: ['x'] });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('custom_coordinate_pass_schema：装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(<PointMark a="sa" b="si" c="cl" />, '__plot', {
      coordinate: { type: 'custom', name: 'tri', roles: ['a', 'b', 'c'] },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
    expect(spec.marks[0]).toEqual({ type: 'point', encoding: { a: { field: 'sa' }, b: { field: 'si' }, c: { field: 'cl' } } });
  });
});
