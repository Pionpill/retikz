import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PlotSpec } from '@retikz/plot';
import { AreaMark, Axis, BarMark, LineMark, Plot, PointMark, SectorMark } from '../../src';

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

describe('<Plot data>{marks} 组合 DSL（ADR-08）', () => {
  it('端到端渲出 path（折线）+ ellipse（散点）', () => {
    const svg = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <LineMark x="month" y="revenue" order="month" />
        <PointMark x="month" y="revenue" />
      </Plot>,
    );
    expect(svg).toContain('<path');
    expect(svg).toContain('<ellipse');
  });

  it('与等价 spec 入口渲染几何一致（DSL 只装配、渲染同源）', () => {
    const viaDsl = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <LineMark x="month" y="revenue" order="month" />
        <PointMark x="month" y="revenue" />
      </Plot>,
    );
    // 等价 spec 须带 DSL 默认 guides（x 轴 + y 轴带网格），否则轴/网格几何对不上
    const equivalentSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [
        { type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
        { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
      ],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ],
    };
    const viaSpec = renderToStaticMarkup(<Plot spec={equivalentSpec} data={{ __plot: rows }} width={480} height={300} />);
    expect(geometry(viaDsl)).toEqual(geometry(viaSpec));
  });

  // ADR-05：默认出轴 / bare
  it('dsl_default_renders_axis：默认 <Plot> 渲出轴线 + 刻度文字', () => {
    const svg = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <LineMark x="month" y="revenue" order="month" />
      </Plot>,
    );
    expect(svg).toContain('<path');
    // 刻度标签文字（如 revenue 域内的数字）渲为 <text>
    expect(svg).toContain('<text');
  });

  it('dsl_bare_equals_alpha1_geometry：bare 几何等价于无 guides 的 spec 入口（plot area = 整图）', () => {
    const viaBare = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300} bare>
        <LineMark x="month" y="revenue" order="month" />
        <PointMark x="month" y="revenue" />
      </Plot>,
    );
    const bareSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: '__plot' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [
        { type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
        { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
      ],
    };
    const viaSpec = renderToStaticMarkup(<Plot spec={bareSpec} data={{ __plot: rows }} width={480} height={300} />);
    expect(geometry(viaBare)).toEqual(geometry(viaSpec));
    // bare 不出轴文字
    expect(viaBare).not.toContain('<text');
  });

  // ADR-07：<BarMark> / scaleX
  it('barmark_renders_rect：<BarMark> 渲出矩形', () => {
    const svg = renderToStaticMarkup(
      <Plot data={rows} width={480} height={300}>
        <BarMark x="month" y="revenue" />
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
        <BarMark x="month" y="revenue" series="product" stack />
      </Plot>,
    );
    expect(svg).toMatch(/<rect/);
  });

  it('scalex_time_renders：scaleX time 折线端到端', () => {
    const trend = [
      { date: '2024-01-01', v: 1 },
      { date: '2024-06-01', v: 3 },
      { date: '2024-12-01', v: 2 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={trend} width={480} height={300} scaleX="time">
        <LineMark x="date" y="v" order="date" />
      </Plot>,
    );
    expect(svg).toContain('<path');
    expect(svg).toContain('<text'); // 时间轴刻度标签
  });

  // ADR-05：polar 端到端渲染（不崩 + 产物含扇形 / 路径）
  const share = [
    { label: 'A', value: 30 },
    { label: 'B', value: 50 },
    { label: 'C', value: 20 },
  ];

  it('polar_pie_renders：<Plot coordinate="polar2D"><SectorMark/> 渲出扇形 path 不崩', () => {
    const svg = renderToStaticMarkup(
      <Plot data={share} coordinate="polar2D" width={360} height={360}>
        <SectorMark angle="value" color="label" />
      </Plot>,
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
  });

  it('polar_donut_renders：coordinate 对象 innerRadius 渲染不崩', () => {
    const svg = renderToStaticMarkup(
      <Plot data={share} coordinate={{ type: 'polar2D', innerRadius: 0.5 }} width={360} height={360}>
        <SectorMark angle="value" color="label" />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_radial_bar_renders：<BarMark> + polar 渲出扇形（径向柱）', () => {
    const svg = renderToStaticMarkup(
      <Plot data={share} coordinate="polar2D" width={360} height={360}>
        <BarMark x="label" y="value" color="label" />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_radar_renders：<LineMark closed> + polar + 角向/径向轴渲染不崩', () => {
    const metrics = [
      { dim: 'speed', value: 8 },
      { dim: 'power', value: 5 },
      { dim: 'range', value: 7 },
      { dim: 'agility', value: 6 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={metrics} coordinate="polar2D" width={360} height={360}>
        <LineMark x="dim" y="value" closed />
        <Axis dimension="angle" />
        <Axis dimension="radius" grid />
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
        <LineMark x="theta" y="r" order="theta" />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_area_renders：填充雷达（<AreaMark closed>）渲染不崩', () => {
    const metrics = [
      { dim: 'a', value: 4 },
      { dim: 'b', value: 7 },
      { dim: 'c', value: 5 },
    ];
    const svg = renderToStaticMarkup(
      <Plot data={metrics} coordinate="polar2D" width={360} height={360}>
        <AreaMark x="dim" y="value" closed />
      </Plot>,
    );
    expect(svg).toContain('<path');
  });

  it('polar_dsl_matches_spec_geometry：polar DSL 与等价手写 spec 渲染几何一致', () => {
    const viaDsl = renderToStaticMarkup(
      <Plot data={share} coordinate="polar2D" width={360} height={360}>
        <SectorMark angle="value" color="label" />
      </Plot>,
    );
    const equivalentSpec: PlotSpec = {
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
    const viaSpec = renderToStaticMarkup(<Plot spec={equivalentSpec} data={{ __plot: share }} width={360} height={360} />);
    expect(geometry(viaDsl)).toEqual(geometry(viaSpec));
  });
});
