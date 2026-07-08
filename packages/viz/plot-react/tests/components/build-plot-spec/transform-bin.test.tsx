import { isBuiltinMark, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { createHistogramSpec } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { IntervalMark } from '../../../src/components/marks';
import { Transform } from '../../../src/components/transform';

describe('buildPlotSpec <Transform> / bin / summarize / histogram x0x1', () => {
  it('transform_bin_declared_to_ir', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="bin" field="measurement" count={20} />
        <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
      </>,
      '__plot',
    );
    expect(spec.transform).toEqual([{ kind: 'bin', field: 'measurement', count: 20 }]);
  });

  it('bar_x0x1_histogram_continuous_x_not_band', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="bin" field="m" step={5} />
        <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
      </>,
      '__plot',
    );
    const expected = createHistogramSpec('__plot', { x: '__x', y: '__y' }, 5);
    const mark = spec.marks[0];
    expect(spec.transform).toEqual(expected.transform);
    expect(mark).toMatchObject(expected.marks[0]);
    if (!isBuiltinMark(mark) || mark.type !== 'interval') throw new Error('expected interval mark');
    // histogram：仅 y 高度通道、无 encoding.x
    expect(mark.encoding.y).toEqual({ field: 'binCount' });
    expect(mark.encoding.x).toBeUndefined();
    // 连续 x linear scale（非 band）
    expect(spec.scales).toContainEqual({ type: 'linear', name: '__x' });
    expect(spec.scales.find(s => s.name === '__x')?.type).not.toBe('band');
  });

  it('bar_width_proportional_keeps_x_as_axis_label_field', () => {
    const spec = buildPlotSpec(<IntervalMark x="country" y="cost" width="gdp" color="country" />, '__plot');
    const mark = spec.marks[0];
    expect(mark).toMatchObject({
      type: 'interval',
      bounds: { x: { kind: 'proportional', field: 'gdp' } },
      encoding: { x: { field: 'country' }, y: { field: 'cost' }, color: { field: 'country', scale: '__color' } },
    });
    expect(spec.scales.find(scale => scale.name === '__x')?.type).toBe('linear');
  });

  it('transform_summarize_declared_to_ir', () => {
    const spec = buildPlotSpec(
      <>
        <Transform
          kind="summarize"
          groupBy={['region']}
          metrics={[{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }]}
        />
        <IntervalMark x="region" y="totalRevenue" />
      </>,
      '__plot',
    );
    expect(spec.transform).toEqual([
      { kind: 'summarize', groupBy: ['region'], metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }] },
    ]);
    // 普通分类柱（x band）
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      encoding: { x: { field: 'region' }, y: { field: 'totalRevenue' } },
    });
  });

  it('plot_transforms_option_direct_pass', () => {
    const spec = buildPlotSpec(<IntervalMark x="region" y="total" />, '__plot', {
      transforms: [
        { kind: 'summarize', groupBy: ['region'], metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }] },
      ],
    });
    expect(spec.transform).toEqual([
      { kind: 'summarize', groupBy: ['region'], metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }] },
    ]);
  });

  it('explicit_stack_suppresses_shortcut_stack_no_double', () => {
    // 显式 <Transform kind="stack"> 存在时，<IntervalMark stack> 的 shortcut stack 不再注入（B4 去重）
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

  it('options_transforms_with_stack_suppresses_shortcut_stack', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="revenue" series="product" stack />, '__plot', {
      transforms: [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }],
    });
    expect((spec.transform ?? []).filter(t => t.kind === 'stack')).toHaveLength(1);
  });

  it('transform_order_explicit_before_shortcut_stack', () => {
    // summarize（显式）在前、无显式 stack → shortcut stack 补在后
    const spec = buildPlotSpec(
      <>
        <Transform
          kind="summarize"
          groupBy={['month', 'product']}
          metrics={[{ kind: 'sum', field: 'revenue', as: 'total' }]}
        />
        <IntervalMark x="month" y="total" series="product" stack />
      </>,
      '__plot',
    );
    expect(spec.transform?.[0]).toMatchObject({ kind: 'summarize' });
    expect(spec.transform?.[1]).toMatchObject({ kind: 'stack' });
  });

  it('transform 装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(
      <>
        <Transform kind="bin" field="m" count={10} />
        <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
