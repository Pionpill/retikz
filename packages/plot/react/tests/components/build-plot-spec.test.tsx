import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '@retikz/plot';
import { buildPlotSpec, decorateDefaultGuides } from '../../src/components/build-plot-spec';
import { Axis, Legend } from '../../src/components/guides';
import { IntervalMark, PathMark, PointMark, ReferenceMark, RegionMark } from '../../src/components/marks';
import { Scale } from '../../src/components/scales';
import { Transform } from '../../src/components/transform';

describe('buildPlotSpec model → type-driven 派生（alpha.6 ADR-03，评审 P1）', () => {
  it('有 model 时省略 AUTO 位置 scale 绑定（交给 expand 派生）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, '__plot', {
      model: [{ name: 'month', type: 'temporal' }, { name: 'revenue', type: 'continuous' }],
    });
    expect(spec.scales).toEqual([]);
    expect(spec.coordinate).toEqual({ type: 'cartesian2D' });
    expect(spec.data).toEqual({ reference: '__plot', model: [{ name: 'month', type: 'temporal' }, { name: 'revenue', type: 'continuous' }] });
  });

  it('无 model 时沿用 AUTO 绑定（向后兼容）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.scales.length).toBeGreaterThan(0);
  });

  it('延迟位置 scale 推断时省略 AUTO 绑定（交给 lower 按数据派生）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, '__plot', {
      deferPositionScaleInference: true,
    });
    expect(spec.coordinate).toEqual({ type: 'cartesian2D' });
    expect(spec.scales).toEqual([]);
    expect(spec.data).toEqual({ reference: '__plot' });
  });

  it('可写入 plot id 与自描述尺寸（组合 anchor / 面板尺寸）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, 'panelA', {
      id: 'panelA',
      width: 320,
      height: 180,
      deferPositionScaleInference: true,
    });
    expect(spec).toMatchObject({ id: 'panelA', width: 320, height: 180, data: { reference: 'panelA' } });
  });

  it('有 model（nominal x）端到端 spec 合法', () => {
    const spec = buildPlotSpec(<PathMark x="cat" y="revenue" />, '__plot', {
      model: [{ name: 'cat', type: 'categorical' }, { name: 'revenue', type: 'continuous' }],
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('显式 <Scale> 可覆盖 model 的单个位置维度，其余维度继续派生', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="month" y="revenue" />
        <Scale dimension="x" type="time" />
      </>,
      '__plot',
      {
        model: [{ name: 'month', type: 'temporal' }, { name: 'revenue', type: 'continuous' }],
      },
    );
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x' });
    expect(spec.scales).toEqual([{ type: 'time', name: '__x' }]);
  });
});

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
    const spec = buildPlotSpec(<PointMark x="lng" y="lat" size="pop" />, '__plot', { dataFieldNames: new Set(['pop']) });
    expect(spec.marks[0]).toEqual({ type: 'point', size: { kind: 'field', value: 'pop' }, encoding: { x: { field: 'lng' }, y: { field: 'lat' } } });
  });

  it('point opacity 字段 → opacity 通道（alpha.7 ADR-04）', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" opacity="density" />, '__plot', { dataFieldNames: new Set(['density']) });
    expect(spec.marks[0]).toEqual({ type: 'point', opacity: { kind: 'field', value: 'density' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } });
  });

  it('point shape 字段 → shape 通道（alpha.7 ADR-05）', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" shape="category" />, '__plot', { dataFieldNames: new Set(['category']) });
    expect(spec.marks[0]).toEqual({ type: 'point', shape: { kind: 'field', value: 'category' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } });
  });

  it('point stroke 字段 → stroke / strokeWidth 通道', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" stroke="region" strokeWidth="density" />, '__plot', { dataFieldNames: new Set(['region', 'density']) });
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

  it('dsl_axis_bad_dim_type：非法 dimension 经 PlotSpecSchema 被拒', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        {/* @ts-expect-error 故意传非法 dimension，验证装配产物被 schema 拒 */}
        <Axis dimension="q" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });
});

// ADR-03：Legend 装配（不吞默认 axes / 收集 / 字段落位）
describe('buildPlotSpec legend 装配（ADR-03 alpha.8）', () => {
  it('legend_only_no_default_axes：只声明 <Legend> → 仅 legend（薄 Plot 无默认轴）', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <Legend channel="color" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'legend', channel: 'color' }]);
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

describe('buildPlotSpec Axis scale shortcut', () => {
  it('builds the same dimension scale as <Scale>', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        <Axis dimension="y" scale="log" />
      </>,
      '__plot',
    );
    expect(spec.scales[1]).toEqual({ type: 'log', name: '__y' });
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'y' }]);
  });

  it('does not apply to ternary z axes', () => {
    expect(() =>
      buildPlotSpec(
        <>
          <PointMark x="x" y="y" z="z" />
          <Axis dimension="z" scale="linear" />
        </>,
        '__plot',
        { coordinate: 'ternary2D' },
      ),
    ).toThrow(/ternary2D coordinate system does not support scale dimension "z"/i);
  });
});

describe('buildPlotSpec ADR-07（IntervalMark / color / series / stack / Scale）', () => {
  it('barmark_equivalence_band_x', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="revenue" />, '__plot');
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
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('point_color_builds_ordinal_scale_and_ref', () => {
    const spec = buildPlotSpec(<PointMark x="gdp" y="life" color="continent" />, '__plot', { dataFieldNames: new Set(['continent']) });
    expect(spec.scales).toContainEqual({ type: 'ordinal', name: '__color' });
    expect(spec.marks[0]).toMatchObject({ color: { kind: 'field', value: 'continent', scale: '__color' } });
  });

  it('plot_colors_builds_palette_and_ordinal_range', () => {
    const colors = ['#2563eb', '#f97316', 'currentColor'];
    const spec = buildPlotSpec(<PointMark x="gdp" y="life" color="continent" />, '__plot', { colors, dataFieldNames: new Set(['continent']) });
    expect(spec.colors).toEqual(colors);
    expect(spec.scales).toContainEqual({ type: 'ordinal', name: '__color', range: colors });
  });

  it('no_color_no_ordinal_scale', () => {
    const spec = buildPlotSpec(<PointMark x="m" y="r" />, '__plot');
    expect(spec.scales.some(s => s.type === 'ordinal')).toBe(false);
  });

  it('bar_series_dodge_default_and_color_eq_series', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="revenue" series="product" />, '__plot');
    const mark = spec.marks[0];
    expect(mark).toMatchObject({ type: 'interval', series: 'product', bounds: { x: { kind: 'band', group: 'product' } } });
    // color 缺省取 series
    expect(mark).toMatchObject({ encoding: { color: { field: 'product', scale: '__color' } } });
    expect(spec.transform).toBeUndefined();
  });

  it('bar_stack_assembles_transform', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="revenue" series="product" stack />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'interval', series: 'product', bounds: { y: { kind: 'extent', from: 'y0', to: 'y1' } } });
    expect(spec.transform).toEqual([{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }]);
  });

  it('scale_x_time', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="date" y="v" />
        <Scale dimension="x" type="time" />
      </>,
      '__plot',
    );
    expect(spec.scales[0]).toEqual({ type: 'time', name: '__x' });
  });

  it('scale_x_log_sqrt', () => {
    expect(
      buildPlotSpec(
        <>
          <PathMark x="d" y="v" />
          <Scale dimension="x" type="log" />
        </>,
        '__plot',
      ).scales[0],
    ).toEqual({ type: 'log', name: '__x' });
    expect(
      buildPlotSpec(
        <>
          <PathMark x="d" y="v" />
          <Scale dimension="x" type="sqrt" />
        </>,
        '__plot',
      ).scales[0],
    ).toEqual({ type: 'sqrt', name: '__x' });
  });

  it('scale_y_log_sqrt_on_value_axis', () => {
    // <Scale dimension="y"> 作用于值轴（__y，scales[1]）；缺省 linear
    expect(buildPlotSpec(<PathMark x="d" y="v" />, '__plot').scales[1]).toEqual({ type: 'linear', name: '__y' });
    expect(
      buildPlotSpec(
        <>
          <PathMark x="d" y="v" />
          <Scale dimension="y" type="log" />
        </>,
        '__plot',
      ).scales[1],
    ).toEqual({ type: 'log', name: '__y' });
    expect(
      buildPlotSpec(
        <>
          <PointMark x="d" y="v" />
          <Scale dimension="y" type="sqrt" />
        </>,
        '__plot',
      ).scales[1],
    ).toEqual({ type: 'sqrt', name: '__y' });
  });

  it('scale_duplicate_alias_rejected', () => {
    expect(() =>
      buildPlotSpec(
        <>
          <PathMark x="d" y="v" />
          <Scale dimension="x" type="time" />
          <Scale dimension="x" type="linear" />
        </>,
        '__plot',
      ),
    ).toThrow(/duplicate scale/);
  });

  it('line_series_color_eq_series', () => {
    const spec = buildPlotSpec(<PathMark x="t" y="v" series="city" order="t" />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'path', series: 'city', order: 't' });
    expect(spec.marks[0]).toMatchObject({ encoding: { color: { field: 'city', scale: '__color' } } });
  });

  it('all_dsl_products_pass_schema', () => {
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<IntervalMark x="m" y="r" series="p" stack />, '__plot'))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PointMark x="m" y="r" color="c" />, '__plot', { dataFieldNames: new Set(['c']) }))).not.toThrow();
  });

  it('mixed_bar_line_band_x', () => {
    // 混合 IntervalMark + PathMark → x band（IntervalMark 优先）
    const spec = buildPlotSpec(
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

describe('buildPlotSpec ADR-05（polar coordinate / sector / area / closed / angle·radius）', () => {
  it('radial_bar_equivalence：coordinate="polar2D" + <IntervalMark> → polar2D + band 角向 + interval mark', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="amount" color="month" />, '__plot', { coordinate: 'polar2D' });
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

  it('pie_equivalence：coordinate="polar2D" + <IntervalMark angle> → polar2D + linear 角向 + stack transform + interval mark', () => {
    const spec = buildPlotSpec(<IntervalMark angle="value" color="label" />, '__plot', { coordinate: 'polar2D' });
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
      marks: [{ type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label', scale: '__color' } } }],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('pie_color_defaults_to_angle_field：未给 color → 按 angle 值字段分类上色', () => {
    const spec = buildPlotSpec(<IntervalMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.marks[0]).toEqual({ type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'value', scale: '__color' } } });
    expect(spec.transform).toEqual([{ kind: 'stack', y: 'value' }]);
  });

  it('sector_series_orders_stack：<IntervalMark angle series> → stack transform 带 groupBy', () => {
    const spec = buildPlotSpec(<IntervalMark angle="value" series="label" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.transform).toEqual([{ kind: 'stack', y: 'value', groupBy: 'label' }]);
    expect(spec.marks[0]).toEqual({ type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label', scale: '__color' } } });
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

  it('radar_equivalence：<PathMark closed> + polar → closed line + point 角向', () => {
    const spec = buildPlotSpec(<PathMark x="dim" y="value" closed />, '__plot', { coordinate: 'polar2D' });
    const expected: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'point', name: '__angle' },
        { type: 'linear', name: '__radius' },
      ],
      coordinate: { type: 'polar2D', angle: '__angle', radius: '__radius', startAngle: 0, endAngle: 360, innerRadius: 0 },
      marks: [{ type: 'path', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } }],
      guides: [],
    };
    expect(spec).toEqual(expected);
  });

  it('polar_line_equivalence：<PathMark> + polar（不闭合）→ linear 角向', () => {
    const spec = buildPlotSpec(<PathMark x="theta" y="r" order="theta" />, '__plot', { coordinate: 'polar2D' });
    expect(spec.scales[0]).toEqual({ type: 'linear', name: '__angle' });
    expect(spec.marks[0]).toEqual({ type: 'path', order: 'theta', encoding: { x: { field: 'theta' }, y: { field: 'r' } } });
    expect(spec.coordinate).toMatchObject({ type: 'polar2D', angle: '__angle', radius: '__radius' });
  });

  it('area_mark_equivalence：<RegionMark> → area mark IR（baseline / closed 落位）', () => {
    const spec = buildPlotSpec(<RegionMark x="t" y="v" baseline={2} closed />, '__plot', { coordinate: 'polar2D' });
    expect(spec.marks[0]).toEqual({ type: 'region', baseline: 2, closed: true, encoding: { x: { field: 't' }, y: { field: 'v' } } });
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
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<IntervalMark angle="v" color="l" />, '__plot', { coordinate: 'polar2D' }))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<IntervalMark x="m" y="a" color="m" />, '__plot', { coordinate: 'polar2D' }))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PathMark x="d" y="v" closed />, '__plot', { coordinate: 'polar2D' }))).not.toThrow();
    expect(() =>
      PlotSpecSchema.parse(buildPlotSpec(<RegionMark x="t" y="v" closed />, '__plot', { coordinate: { type: 'polar2D', innerRadius: 0.3 } })),
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

  it('ternary_coordinate_input：ternary2D + PointMark x/y/z → IR x/y/z encoding', () => {
    const spec = buildPlotSpec(<PointMark x="sand" y="silt" z="clay" color="region" />, '__plot', { coordinate: 'ternary2D', dataFieldNames: new Set(['region']) });
    expect(spec.coordinate).toEqual({ type: 'ternary2D' });
    expect(spec.scales).toEqual([{ type: 'ordinal', name: '__color' }]);
    expect(spec.marks[0]).toEqual({
      type: 'point',
      color: { kind: 'field', value: 'region', scale: '__color' },
      encoding: { x: { field: 'sand' }, y: { field: 'silt' }, z: { field: 'clay' } },
    });
  });

  it('cartesian_regression：默认 cartesian2D scale/coord 推断不变；薄 Plot 无默认轴', () => {
    const spec = buildPlotSpec(<PointMark x="m" y="r" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.guides).toEqual([]);
  });

  it('all_family_products_pass_schema：1D / ternary 装配产物全过 PlotSpecSchema', () => {
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PointMark x="v" />, '__plot', { coordinate: 'cartesian1D' }))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PointMark x="h" />, '__plot', { coordinate: 'polar1D' }))).not.toThrow();
    expect(() => PlotSpecSchema.parse(buildPlotSpec(<PointMark x="x" y="y" z="z" />, '__plot', { coordinate: 'ternary2D' }))).not.toThrow();
  });
});

describe('buildPlotSpec 自定义坐标系（alpha.12 ADR-05）', () => {
  it('custom_coordinate_input：对象形态 → IR {type:<customType>, ...config}', () => {
    const spec = buildPlotSpec(<PointMark x="hx" y="vy" />, '__plot', {
      coordinate: { type: 'bridge', archHeight: 70 },
    });
    expect(spec.coordinate).toEqual({ type: 'bridge', archHeight: 70 });
    expect(spec.scales).toEqual([]); // 自定义坐标系自建几何，无 AUTO 位置 scale
    expect(spec.guides).toEqual([]); // 非 cartesian2D，无默认轴
  });

  it('custom_coordinate_no_config：仅 type 可用', () => {
    const spec = buildPlotSpec(<PointMark x="v" />, '__plot', { coordinate: { type: 'sine' } });
    expect(spec.coordinate).toEqual({ type: 'sine' });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('custom_coordinate_pass_schema：装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(<PointMark x="sa" y="si" z="cl" />, '__plot', {
      coordinate: { type: 'tri' },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
    expect(spec.marks[0]).toEqual({ type: 'point', encoding: { x: { field: 'sa' }, y: { field: 'si' }, z: { field: 'cl' } } });
  });

  it('legacy_custom_coordinate_rejected', () => {
    expect(() => buildPlotSpec(<PointMark x="v" />, '__plot', { coordinate: { type: 'custom', name: 'sine', roles: ['x'] } })).toThrow(/custom coordinates must use a non-built-in type/i);
  });

  it('[adversarial] custom_coordinate_rejects_non_json_config_at_build_time', () => {
    expect(() =>
      buildPlotSpec(<PointMark x="v" />, '__plot', {
        coordinate: { type: 'sine', project: () => [0, 0] },
      }),
    ).toThrow(/JSON-serializable/);
  });
});

// alpha.10：薄 Plot 退化 + 装饰函数抽出（供 v0.2 chart 复用）
describe('decorateDefaultGuides（薄 Plot 装饰函数，PlotSpec 进出、框架无关）', () => {
  it('decorate_adds_cartesian_axes：cartesian2D 无 axis → 前置 x 轴 + y 轴(网格)', () => {
    const thin = buildPlotSpec(<PathMark x="m" y="r" />, '__plot');
    expect(thin.guides).toEqual([]);
    expect(decorateDefaultGuides(thin).guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
  });

  it('decorate_equivalent_to_old_default：装饰产物 = 退化前默认轴行为', () => {
    const decorated = decorateDefaultGuides(buildPlotSpec(<IntervalMark x="m" y="r" />, '__plot'));
    expect(decorated.guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
  });

  it('decorate_keeps_explicit_axis：已有显式 <Axis> → 原样不补', () => {
    const withAxis = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        <Axis dimension="x" />
      </>,
      '__plot',
    );
    expect(decorateDefaultGuides(withAxis).guides).toEqual([{ type: 'axis', dimension: 'x' }]);
  });

  it('decorate_prepends_before_legend：只有 legend → 前置默认轴、legend 保留其后', () => {
    const withLegend = buildPlotSpec(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <Legend channel="color" />
      </>,
      '__plot',
    );
    expect(decorateDefaultGuides(withLegend).guides).toEqual([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
      { type: 'legend', channel: 'color' },
    ]);
  });

  it('decorate_noop_polar：非 cartesian2D（polar）→ 原样返回，不补轴', () => {
    const polar = buildPlotSpec(<IntervalMark angle="value" />, '__plot', { coordinate: 'polar2D' });
    expect(decorateDefaultGuides(polar).guides).toEqual([]);
  });

  it('decorate_pass_schema：装饰产物过 PlotSpecSchema', () => {
    const decorated = decorateDefaultGuides(buildPlotSpec(<PathMark x="m" y="r" />, '__plot'));
    expect(() => PlotSpecSchema.parse(decorated)).not.toThrow();
  });
});

describe('buildPlotSpec heatmap interval mark（ADR-02 双 band，显式 bounds）', () => {
  const bandBounds = { x: { kind: 'band' }, y: { kind: 'band' } } as const;

  it('heatmap-react-build-plot-spec：显式双 band bounds → interval IR + 双 band 推断', () => {
    const spec = buildPlotSpec(<IntervalMark x="rowKey" y="colKey" color="value" bounds={bandBounds} />, '__plot');
    expect(spec.marks).toEqual([
      { type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'rowKey' }, y: { field: 'colKey' }, color: { field: 'value', scale: '__color' } } },
    ]);
    // band×band bounds → x / y 双轴强制 band scale
    expect(spec.scales).toContainEqual({ type: 'band', name: '__x' });
    expect(spec.scales).toContainEqual({ type: 'band', name: '__y' });
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
  });

  it('heatmap 缺 color → 纯网格（无 color 编码），仍双 band', () => {
    const spec = buildPlotSpec(<IntervalMark x="day" y="hour" bounds={bandBounds} />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'day' }, y: { field: 'hour' } } });
    expect(spec.scales).toContainEqual({ type: 'band', name: '__x' });
    expect(spec.scales).toContainEqual({ type: 'band', name: '__y' });
  });

  it('heatmap + 显式 <Scale dimension="y"> → fail-loud（y 由 band bounds 强制 band）', () => {
    expect(() =>
      buildPlotSpec(
        <>
          <IntervalMark x="rowKey" y="colKey" color="value" bounds={bandBounds} />
          <Scale dimension="y" type="linear" />
        </>,
        '__plot',
      ),
    ).toThrow(/band y scale/i);
  });

  it('heatmap 装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(<IntervalMark x="rowKey" y="colKey" color="value" bounds={bandBounds} />, '__plot');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});

describe('buildPlotSpec rule 装配（alpha.11 ADR-03）', () => {
  it('rulemark-constant：数字 → value（line），常量 color → value', () => {
    const spec = buildPlotSpec(<ReferenceMark y={80} color="crimson" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', encoding: { y: { value: 80 }, color: { value: 'crimson' } } });
  });

  it('rulemark-field：字符串 → field（per-datum line），color field → AUTO_COLOR', () => {
    const spec = buildPlotSpec(<ReferenceMark y="threshold" color="category" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', encoding: { y: { field: 'threshold' }, color: { field: 'category', scale: '__color' } } });
    // per-datum color field → 自动色 scale
    expect(spec.scales.some(scale => scale.name === '__color')).toBe(true);
  });

  it('rulemark-band：给 yTo → band（数字常量上界）', () => {
    const spec = buildPlotSpec(<ReferenceMark y={70} yTo={90} color="amber" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', yTo: 90, encoding: { y: { value: 70 }, color: { value: 'amber' } } });
  });

  it('rulemark-band-field：字符串上界 → field band', () => {
    const spec = buildPlotSpec(<ReferenceMark y="lo" yTo="hi" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', yTo: 'hi', encoding: { y: { field: 'lo' } } });
  });

  it('rulemark-orientation-vertical：绑 x → 竖直 rule（encoding.x）', () => {
    const spec = buildPlotSpec(<ReferenceMark x={5} />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', encoding: { x: { value: 5 } } });
  });

  it('rulemark-extent：透传 extent 字段', () => {
    const spec = buildPlotSpec(<ReferenceMark x="date" extentField="rowLo" extentToField="rowHi" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', extentField: 'rowLo', extentToField: 'rowHi', encoding: { x: { field: 'date' } } });
  });

  it('rulemark-vertical-band-xTo：绑 x + xTo → band', () => {
    const spec = buildPlotSpec(<ReferenceMark x={2} xTo={5} />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', xTo: 5, encoding: { x: { value: 2 } } });
  });

  it('rulemark-orientation-conflict：x 与 y 皆给 → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark x={1} y={2} />, '__plot')).toThrow(/exactly one of x|both|neither/i);
  });

  it('rulemark-orientation-missing：x 与 y 皆缺 → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark />, '__plot')).toThrow(/exactly one of x|both|neither/i);
  });

  it('rulemark-bound-mismatch：绑 x 却给 yTo → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark x={5} yTo={10} />, '__plot')).toThrow(/yTo|match the bound dimension|xTo/i);
  });

  it('rulemark-bound-mismatch-y：绑 y 却给 xTo → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark y={5} xTo={10} />, '__plot')).toThrow(/xTo|match the bound dimension|yTo/i);
  });

  it('rulemark-extent-unpaired：仅 extentField → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark x="date" extentField="lo" />, '__plot')).toThrow(/extentField|extentToField|together/i);
  });

  it('rule 装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(
      <>
        <ReferenceMark y={80} color="crimson" />
        <ReferenceMark y={70} yTo={90} color="amber" />
        <ReferenceMark x="date" extentField="a" extentToField="b" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});

describe('buildPlotSpec alpha.12（<Transform> / bin / aggregate / histogram x0x1）', () => {
  it('transform_bin_declared_to_ir', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="bin" field="measurement" count={20} />
        <IntervalMark x0="binStart" x1="binEnd" y="binValue" />
      </>,
      '__plot',
    );
    expect(spec.transform).toEqual([{ kind: 'bin', field: 'measurement', count: 20 }]);
  });

  it('bar_x0x1_histogram_continuous_x_not_band', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="bin" field="m" step={5} />
        <IntervalMark x0="binStart" x1="binEnd" y="binValue" />
      </>,
      '__plot',
    );
    const mark = spec.marks[0];
    expect(mark).toMatchObject({ type: 'interval', bounds: { x: { kind: 'extent', from: 'binStart', to: 'binEnd' } } });
    if (mark.type !== 'interval') throw new Error('expected interval mark');
    // histogram：仅 y 高度通道、无 encoding.x
    expect(mark.encoding.y).toEqual({ field: 'binValue' });
    expect(mark.encoding.x).toBeUndefined();
    // 连续 x linear scale（非 band）
    expect(spec.scales).toContainEqual({ type: 'linear', name: '__x' });
    expect(spec.scales.find(s => s.name === '__x')?.type).not.toBe('band');
  });

  it('transform_aggregate_declared_to_ir', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="aggregate" groupBy={['region']} reduce="sum" field="revenue" as="totalRevenue" />
        <IntervalMark x="region" y="totalRevenue" />
      </>,
      '__plot',
    );
    expect(spec.transform).toEqual([{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 'totalRevenue' }]);
    // 普通分类柱（x band）
    expect(spec.marks[0]).toMatchObject({ type: 'interval', encoding: { x: { field: 'region' }, y: { field: 'totalRevenue' } } });
  });

  it('plot_transforms_option_direct_pass', () => {
    const spec = buildPlotSpec(<IntervalMark x="region" y="total" />, '__plot', {
      transforms: [{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 'total' }],
    });
    expect(spec.transform).toEqual([{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 'total' }]);
  });

  it('explicit_stack_suppresses_auto_stack_no_double', () => {
    // 显式 <Transform kind="stack"> 存在时，<IntervalMark stack> 的 auto-stack 不再注入（B4 去重）
    const spec = buildPlotSpec(
      <>
        <Transform kind="stack" x="month" y="revenue" groupBy="product" />
        <IntervalMark x="month" y="revenue" series="product" stack />
      </>,
      '__plot',
    );
    const stacks = (spec.transform ?? []).filter(t => t.kind === 'stack');
    expect(stacks).toHaveLength(1);
    // mark 仍标记为 stack 排布（bounds.y extent 读 y0/y1）
    expect(spec.marks[0]).toMatchObject({ type: 'interval', bounds: { y: { kind: 'extent', from: 'y0', to: 'y1' } } });
  });

  it('options_transforms_with_stack_suppresses_auto_stack', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="revenue" series="product" stack />, '__plot', {
      transforms: [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }],
    });
    expect((spec.transform ?? []).filter(t => t.kind === 'stack')).toHaveLength(1);
  });

  it('transform_order_explicit_before_auto_stack', () => {
    // aggregate（显式）在前、无显式 stack → auto-stack 补在后
    const spec = buildPlotSpec(
      <>
        <Transform kind="aggregate" groupBy={['month', 'product']} reduce="sum" field="revenue" as="total" />
        <IntervalMark x="month" y="total" series="product" stack />
      </>,
      '__plot',
    );
    expect(spec.transform?.[0]).toMatchObject({ kind: 'aggregate' });
    expect(spec.transform?.[1]).toMatchObject({ kind: 'stack' });
  });

  it('alpha12 装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="bin" field="m" count={10} />
        <IntervalMark x0="binStart" x1="binEnd" y="binValue" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});

describe('buildPlotSpec alpha.12 ADR-02（normalize / derive-interval / jitter 经同一 <Transform> 透传）', () => {
  it('normalize_then_stack_percentage_via_transform', () => {
    // 百分比堆叠：显式 [normalize, stack] 两步链 + <IntervalMark stack>（柱读累积界 y0/y1）；
    // 显式 stack 与 mark auto-stack 同签名 → auto-stack 被去重抑制（最终只一条 stack，不二次堆叠）
    const spec = buildPlotSpec(
      <>
        <Transform kind="normalize" field="amount" groupBy={['quarter']} basis="percent" as="share" />
        <Transform kind="stack" x="quarter" y="share" groupBy="product" />
        <IntervalMark x="quarter" y="share" series="product" stack />
      </>,
      '__plot',
    );
    expect(spec.transform).toEqual([
      { kind: 'normalize', field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' },
      { kind: 'stack', x: 'quarter', y: 'share', groupBy: 'product' },
    ]);
    // 只剩一条 stack（auto-stack 被同签名去重），且 mark 确为 stacked interval（lower 会读 y0/y1）
    expect((spec.transform ?? []).filter(t => t.kind === 'stack')).toHaveLength(1);
    expect(spec.marks[0]).toMatchObject({ type: 'interval', bounds: { y: { kind: 'extent', from: 'y0', to: 'y1' } } });
  });

  it('auto_stack_with_different_signature_is_kept', () => {
    // P1 回归：显式 stack 只去重「同签名」的 auto-stack；签名不同的 <IntervalMark series stack> 的 auto-stack 必须保留，
    // 否则该 mark 仍是 stacked interval 却无对应 y0/y1，lower 阶段读空累积界出错
    const spec = buildPlotSpec(
      <>
        <Transform kind="stack" x="quarter" y="share" groupBy="product" />
        <IntervalMark x="quarter" y="share" series="product" stack />
        {/* 不同 y/groupBy 签名的另一组堆叠柱：其 auto-stack 不能被误删 */}
        <IntervalMark x="month" y="revenue" series="region" stack />
      </>,
      '__plot',
    );
    const stacks = (spec.transform ?? []).filter(t => t.kind === 'stack');
    // 显式 stack(quarter/share/product) 去重了第一根柱的同签名 auto-stack；第二根柱(month/revenue/region)的 auto-stack 保留 → 共两条
    expect(stacks).toHaveLength(2);
    expect(stacks).toContainEqual({ kind: 'stack', x: 'quarter', y: 'share', groupBy: 'product' });
    expect(stacks).toContainEqual({ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'region' });
    // 两根柱都为 stacked interval（bounds.y extent 读 y0/y1）
    expect(spec.marks.every(m => m.type === 'interval' && m.bounds?.y?.kind === 'extent')).toBe(true);
  });

  it('derive_interval_declared_to_ir', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="derive-interval" startFrom="start" endFrom="end" />
        <IntervalMark x="task" y="end" />
      </>,
      '__plot',
    );
    expect(spec.transform).toEqual([{ kind: 'derive-interval', startFrom: 'start', endFrom: 'end' }]);
  });

  it('jitter_declared_to_ir', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="jitter" axis="x" xField="dose" amount={0.3} seed={42} />
        <PointMark x="dose" y="response" />
      </>,
      '__plot',
    );
    expect(spec.transform).toEqual([{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 42 }]);
  });

  it('adr02 装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="jitter" axis="both" amount={1} seed={7} />
        <PointMark x="x" y="y" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
