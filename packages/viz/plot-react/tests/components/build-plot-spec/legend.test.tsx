import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { Axis, Legend } from '../../../src/components/guides';
import { PointMark } from '../../../src/components/marks';

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
        <Legend
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
