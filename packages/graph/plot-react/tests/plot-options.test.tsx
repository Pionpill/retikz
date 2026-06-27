import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { type ExternalDatasets, type PlotSpec } from '@retikz/plot';
import { IntervalMark, Plot } from '../src';

/**
 * ADR-01 P1 评审回归：<Plot> 必须把新增的 provenance / datumProvenance / datumIdField
 *   转发到 lowerPlots（当前 Plot.tsx 只转发 width/height/fontSize/margin，会静默丢弃）。
 *
 * 结构性断言：开 provenance + root id 时，下沉会合成 '<plotId>.mark.0' 的 scope id，
 *   compile / SVG 渲染会把它 emit 成 data-retikz-id="sales.mark.0"。该属性只在 option
 *   真正到达 lowerPlots 时才出现 → 作转发是否生效的可观测代理。
 */

const spec: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'sales',
  data: { reference: 'sales' },
  scales: [
    { type: 'band', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
};

const data: ExternalDatasets = {
  sales: [
    { month: 0, revenue: 10, q: 'Q1' },
    { month: 1, revenue: 14, q: 'Q2' },
    { month: 2, revenue: 9, q: 'Q3' },
  ],
};

describe('<Plot> lowerPlots option 转发 (ADR-01)', () => {
  it('react_options_forwarded — provenance reaches lowerPlots', () => {
    // provenance:true + root id → 合成 scope id 'sales.mark.0' → SVG data-retikz-id
    const svg = renderToStaticMarkup(<Plot spec={spec} data={data} width={480} height={300} provenance />);
    expect(svg).toContain('data-retikz-id="sales.mark.0"');
  });

  it('provenance_off_no_synthesized_id', () => {
    // 不传 provenance（默认关）→ 不合成内部 id → SVG 无 'sales.mark.0'
    const svg = renderToStaticMarkup(<Plot spec={spec} data={data} width={480} height={300} />);
    expect(svg).not.toContain('data-retikz-id="sales.mark.0"');
  });

  it('datum_id_field_forwarded — datumIdField reaches lowerPlots', () => {
    // provenance + datumProvenance + datumIdField:'q' → datum Node.id 'sales.datum.Q1' → SVG data-retikz-id
    const svg = renderToStaticMarkup(
      <Plot spec={spec} data={data} width={480} height={300} provenance datumProvenance datumIdField="q" />,
    );
    expect(svg).toContain('data-retikz-id="sales.datum.Q1"');
  });
});

describe('<Plot dataTransforms> 快捷数据变换直传 (alpha.12)', () => {
  const orders = [
    { region: 'N', revenue: 3 },
    { region: 'N', revenue: 5 },
    { region: 'S', revenue: 2 },
  ];

  it('data_transforms_reach_pipeline — summarize 折叠行数', () => {
    // dataTransforms 直传 summarize：3 笔明细 → 2 组（N/S）→ 恰 2 根柱（interval 渲染为 <rect>）
    const svg = renderToStaticMarkup(
      <Plot
        data={orders}
        width={480}
        height={300}
        dataTransforms={[{ kind: 'summarize', groupBy: ['region'], metrics: [{ op: 'sum', field: 'revenue', as: 'total' }] }]}
      >
        <IntervalMark x="region" y="total" />
      </Plot>,
    );
    expect((svg.match(/<rect/g) ?? []).length).toBe(2);
  });

  it('data_transforms_compose_with_transform_children', () => {
    // dataTransforms（直传）拼在 <Transform> 子组件之前；与子组件混用同一管线（此处仅直传一条 summarize）
    const svg = renderToStaticMarkup(
      <Plot data={orders} width={480} height={300} dataTransforms={[{ kind: 'summarize', groupBy: ['region'], metrics: [{ op: 'count', as: 'n' }] }]}>
        <IntervalMark x="region" y="n" />
      </Plot>,
    );
    // count：N=2、S=1 → 仍 2 组 2 柱
    expect((svg.match(/<rect/g) ?? []).length).toBe(2);
  });
});
