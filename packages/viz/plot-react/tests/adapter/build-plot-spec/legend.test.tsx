import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis, PlotLegend } from '../../../src/components/guides';
import { PointMark } from '../../../src/components/marks';

// ADR-03：PlotLegend 装配（不吞默认 axes / 收集 / 字段落位）
describe('buildPlotIR legend 装配（ADR-03 alpha.8）', () => {
  it('legend_only_no_default_axes：只声明 <PlotLegend> → 仅 legend（薄 Plot 无默认轴）', () => {
    const spec = buildPlotIR(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <PlotLegend channel="color" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([{ type: 'legend', channel: 'color' }]);
  });

  it('explicit_axis_and_legend_coexist：显式 <PlotAxis> + <PlotLegend> → 该轴覆盖默认、legend 保留', () => {
    const spec = buildPlotIR(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <PlotAxis dimension="x" grid />
        <PlotLegend channel="color" position="bottom" />
      </>,
      '__plot',
    );
    expect(spec.guides).toEqual([
      { type: 'axis', dimension: 'x', grid: true },
      { type: 'legend', channel: 'color', position: 'bottom' },
    ]);
  });

  it('legend_fields：<PlotLegend> 字段逐一落位', () => {
    const spec = buildPlotIR(
      <>
        <PointMark x="lon" y="lat" size="pop" />
        <PlotLegend
          channel="size"
          scale="__size"
          title="Population"
          position="left"
          orient="vertical"
          ticks={{ count: 4 }}
          tickLabels={false}
        />
      </>,
      '__plot',
    );
    const legend = (spec.guides ?? []).find(guide => guide.type === 'legend');
    expect(legend).toEqual({
      type: 'legend',
      channel: 'size',
      scale: '__size',
      title: 'Population',
      position: 'left',
      orient: 'vertical',
      ticks: { count: 4 },
      tickLabels: false,
    });
  });

  it('legend_built_pass_schema：legend 装配产物过 PlotSchema', () => {
    const spec = buildPlotIR(
      <>
        <PointMark x="lon" y="lat" color="kind" />
        <PlotLegend channel="color" />
      </>,
      '__plot',
    );
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
