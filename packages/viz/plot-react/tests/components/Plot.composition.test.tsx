import type { IRPlot } from '@retikz/plot';

import { Layout } from '@retikz/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Axis, IntervalMark, PathMark, Plot, PointMark, Scale } from '../../src';

const rows = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

/** 抽出点 glyph（ellipse）的 cx,cy 与 path 的 d，与资源 id 无关，作几何等价比较 */
const geometry = (svg: string) => {
  const glyphs = (svg.match(/<ellipse[^>]*>/g) ?? [])
    .map(c => {
      const m = /cx="([^"]+)"\s+cy="([^"]+)"/.exec(c);
      return m ? `${m[1]},${m[2]}` : c;
    })
    .sort();
  const paths = (svg.match(/\sd="[^"]+"/g) ?? []).sort();
  return { glyphs, paths };
};

describe('<Plot data>{marks} 组合 DSL', () => {
  it('多个嵌入 Plot 通过 provider graph 合并数据并各自渲染', () => {
    const svg = renderToStaticMarkup(
      <Layout width={480} height={300}>
        <Plot id="revenue-a" data={rows} width={220} height={140}>
          <PointMark x="month" y="revenue" />
        </Plot>
        <Plot id="revenue-b" data={rows} x={240} width={220} height={140}>
          <PointMark x="month" y="revenue" />
        </Plot>
      </Layout>,
    );

    expect(svg.match(/<ellipse/g)).toHaveLength(6);
  });

  it('端到端渲出 path（折线）+ ellipse（散点）', () => {
    const svg = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <PathMark x="month" y="revenue" order="month" />
        <PointMark x="month" y="revenue" />
      </Plot>,
    );
    expect(svg).toContain('<path');
    expect(svg).toContain('<ellipse');
  });

  it('与等价 spec 入口渲染几何一致（DSL 只装配、渲染同源）', () => {
    const viaDsl = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <PathMark x="month" y="revenue" order="month" />
        <PointMark x="month" y="revenue" />
      </Plot>,
    );
    // 薄 Plot DSL 不补默认 guides，等价 spec 也无 guides
    const equivalentSpec: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [
        { type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
        { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
      ],
      guides: [],
    };
    const viaSpec = renderToStaticMarkup(
      <Plot spec={equivalentSpec} data={{ __plot: rows }} width={480} height={300} />,
    );
    expect(geometry(viaDsl)).toEqual(geometry(viaSpec));
  });

  // 薄 Plot 默认不出轴；显式 <Axis> 才渲轴文字
  it('dsl_no_axis_no_text：薄 <Plot> 无 <Axis> → 渲 path 但不出刻度文字', () => {
    const svg = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <PathMark x="month" y="revenue" order="month" />
      </Plot>,
    );
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<text');
  });

  it('dsl_explicit_axis_renders_text：显式 <Axis> → 渲出刻度文字', () => {
    const svg = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <PathMark x="month" y="revenue" order="month" />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>,
    );
    expect(svg).toContain('<path');
    expect(svg).toContain('<text');
  });

  it('dsl_line_categorical_x_infers_point_scale：字符串 x 字段折线自动渲染', () => {
    const quarterly = [
      { quarter: 'Q1', revenue: 18 },
      { quarter: 'Q2', revenue: 24 },
      { quarter: 'Q3', revenue: 15 },
      { quarter: 'Q4', revenue: 30 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={quarterly} width={480} height={300}>
        <PathMark x="quarter" y="revenue" order="quarter" />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>,
    );
    expect(svg).toMatch(/<path[^>]+d="M [^"]+ L [^"]+"/);
    expect(svg).toContain('Q1');
  });

  // <IntervalMark> / <Scale> 渲染契约
  it('barmark_renders_rect：<IntervalMark> 渲出矩形', () => {
    const svg = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <IntervalMark x="month" y="revenue" />
      </Plot>,
    );
    expect(svg).toMatch(/<rect/);
  });

  it('horizontal_barmark_renders_rect：<IntervalMark direction="horizontal"> 渲出矩形', () => {
    const svg = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <IntervalMark x="revenue" y="month" direction="horizontal" />
      </Plot>,
    );
    expect(svg).toMatch(/<rect/);
  });

  it('horizontal_grouped_bar_renders：横向 dodge 在 y band 内切子带', () => {
    const sales = [
      { month: 'Jan', product: 'A', revenue: 3 },
      { month: 'Jan', product: 'B', revenue: 5 },
      { month: 'Feb', product: 'A', revenue: 2 },
      { month: 'Feb', product: 'B', revenue: 4 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={sales} width={480} height={300}>
        <IntervalMark x="revenue" y="month" direction="horizontal" group="product" />
      </Plot>,
    );
    expect(svg).toMatch(/<rect/);
  });

  it('stacked_bar_renders：分组数据堆叠柱端到端', () => {
    const sales = [
      { month: 'Jan', product: 'A', revenue: 3 },
      { month: 'Jan', product: 'B', revenue: 5 },
      { month: 'Feb', product: 'A', revenue: 2 },
      { month: 'Feb', product: 'B', revenue: 4 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={sales} width={480} height={300}>
        <IntervalMark x="month" y="revenue" series="product" stack />
      </Plot>,
    );
    expect(svg).toMatch(/<rect/);
  });

  it('scale_time_renders：time x scale 折线 + 显式 x 轴端到端（时间刻度标签）', () => {
    const trend = [
      { date: '2024-01-01', v: 1 },
      { date: '2024-06-01', v: 3 },
      { date: '2024-12-01', v: 2 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={trend} width={480} height={300}>
        <PathMark x="date" y="v" order="date" />
        <Scale dimension="x" type="time" />
        <Axis dimension="x" />
      </Plot>,
    );
    expect(svg).toContain('<path');
    expect(svg).toContain('<text'); // 时间轴刻度标签
  });

  // polar 端到端渲染（不崩 + 产物含扇形 / 路径）
  const share = [
    { label: 'A', value: 30 },
    { label: 'B', value: 50 },
    { label: 'C', value: 20 },
  ];

  it('polar_pie_renders：<Plot coordinate="polar2D"><IntervalMark angle/> 渲出扇形 path 不崩', () => {
    const svg = renderToStaticMarkup(
      <Plot data={share} coordinate="polar2D" width={360} height={360}>
        <IntervalMark angle="value" color="label" />
      </Plot>,
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
  });

  it('polar_donut_renders：coordinate 对象 innerRadius 渲染不崩', () => {
    const svg = renderToStaticMarkup(
      <Plot data={share} coordinate={{ type: 'polar2D', innerRadius: 0.5 }} width={360} height={360}>
        <IntervalMark angle="value" color="label" />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_radial_bar_renders：<IntervalMark> + polar 渲出扇形（径向柱）', () => {
    const svg = renderToStaticMarkup(
      <Plot data={share} coordinate="polar2D" width={360} height={360}>
        <IntervalMark x="label" y="value" color="label" />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_radar_renders：<PathMark closed> + polar + 角向/径向轴渲染不崩', () => {
    const metrics = [
      { dim: 'speed', value: 8 },
      { dim: 'power', value: 5 },
      { dim: 'range', value: 7 },
      { dim: 'agility', value: 6 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={metrics} coordinate="polar2D" width={360} height={360}>
        <PathMark x="dim" y="value" closed />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_line_renders：极坐标折线渲染不崩', () => {
    const spiral = [
      { theta: 0, r: 0 },
      { theta: 90, r: 1 },
      { theta: 180, r: 2 },
      { theta: 270, r: 3 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={spiral} coordinate="polar2D" width={360} height={360}>
        <PathMark x="theta" y="r" order="theta" closed={false} />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_area_renders：填充雷达（<PathMark closed>）渲染不崩', () => {
    const metrics = [
      { dim: 'a', value: 4 },
      { dim: 'b', value: 7 },
      { dim: 'c', value: 5 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={metrics} coordinate="polar2D" width={360} height={360}>
        <PathMark x="dim" y="value" closure={{ kind: 'cycle' }} />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_dsl_matches_spec_geometry：polar DSL 与等价手写 spec 渲染几何一致', () => {
    const viaDsl = renderToStaticMarkup(
      <Plot data={share} coordinate="polar2D" width={360} height={360}>
        <IntervalMark angle="value" color="label" />
      </Plot>,
    );
    const equivalentSpec: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      transform: [{ kind: 'stack', y: 'value' }],
      scales: [
        { type: 'linear', name: '__angle' },
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
          bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
          encoding: { color: { field: 'label', scale: '__color' } },
        },
      ],
      guides: [],
    };
    const viaSpec = renderToStaticMarkup(
      <Plot spec={equivalentSpec} data={{ __plot: share }} width={360} height={360} />,
    );
    expect(geometry(viaDsl)).toEqual(geometry(viaSpec));
  });
});
