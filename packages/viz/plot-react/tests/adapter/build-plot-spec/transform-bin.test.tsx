import { isBuiltinMark, PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { createHistogramSpec } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotIR } from '../../../src/adapter';
import { IntervalMark } from '../../../src/components/marks';
import { PlotTransform } from '../../../src/components/transform';

describe('buildPlotIR <PlotTransform> / bin / summarize / histogram x0x1', () => {
  it('transform_bin_declared_to_ir', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'bin', params: { field: 'measurement', count: 20 } }} />
        <IntervalMark x0="binStart" x1="binEnd" encodings={{ position: { y: 'binCount' } }} />
      </>,
      '__plot',
    );

    expect(spec.transform).toEqual([{ operation: { kind: 'bin', params: { field: 'measurement', count: 20 } } }]);
  });

  it('bar_x0x1_histogram_continuous_x_not_band', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'bin', params: { field: 'm', step: 5 } }} />
        <IntervalMark x0="binStart" x1="binEnd" encodings={{ position: { y: 'binCount' } }} />
      </>,
      '__plot',
    );
    const expected = createHistogramSpec('__plot', { x: '__x', y: '__y' }, 5);
    const mark = spec.marks[0];

    expect(spec.transform).toEqual(expected.transform);
    expect(mark).toMatchObject(expected.marks[0]);

    if (!isBuiltinMark(mark) || mark.type !== 'interval') throw new Error('expected interval mark');

    // histogram：仅 y 高度通道、无 encoding.x
    expect(mark.encodings?.position?.y).toEqual('binCount');
    expect(mark.encodings?.position?.x).toBeUndefined();

    // 连续 x linear scale（非 band）
    expect(spec.scales).toContainEqual({ type: 'linear', name: '__x' });
    expect(spec.scales.find(s => s.name === '__x')?.type).not.toBe('band');
  });

  it('bar_width_proportional_keeps_x_as_axis_label_field', () => {
    const spec = buildPlotIR(
      <IntervalMark width="gdp" encodings={{ color: 'country', position: { x: 'country', y: 'cost' } }} />,
      '__plot',
    );
    const mark = spec.marks[0];

    expect(mark).toMatchObject({
      type: 'interval',
      kind: 'data',
      encodings: {
        bounds: { x: { weight: 'gdp' } },
        color: { field: 'country', scale: '__color' },
        position: { x: 'country', y: 'cost' },
      },
      properties: { bounds: { x: { kind: 'proportional' } } },
    });
    expect(spec.scales.find(scale => scale.name === '__x')?.type).toBe('linear');
  });

  it('transform_summarize_declared_to_ir', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform
          operation={{
            kind: 'summarize',
            params: {
              groupBy: ['region'],
              metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
            },
          }}
        />
        <IntervalMark encodings={{ position: { x: 'region', y: 'totalRevenue' } }} />
      </>,
      '__plot',
    );

    expect(spec.transform).toEqual([
      {
        operation: {
          kind: 'summarize',
          params: {
            groupBy: ['region'],
            metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
          },
        },
      },
    ]);

    // 普通分类柱（x band）
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'region', y: 'totalRevenue' } },
    });
  });

  it('plot_transforms_option_direct_pass', () => {
    const spec = buildPlotIR(<IntervalMark encodings={{ position: { x: 'region', y: 'total' } }} />, '__plot', {
      transforms: [
        {
          operation: {
            kind: 'summarize',
            params: {
              groupBy: ['region'],
              metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }],
            },
          },
        },
      ],
    });

    expect(spec.transform).toEqual([
      {
        operation: {
          kind: 'summarize',
          params: {
            groupBy: ['region'],
            metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }],
          },
        },
      },
    ]);
  });

  it('explicit_stack_suppresses_shortcut_stack_no_double', () => {
    // 显式 stack operation 存在时，IntervalMark stack 的 shortcut 不再注入
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } }} />
        <IntervalMark stack encodings={{ series: 'product', position: { x: 'month', y: 'revenue' } }} />
      </>,
      '__plot',
    );
    const stacks = (spec.transform ?? []).map(declaration => declaration.operation).filter(t => t.kind === 'stack');

    expect(stacks).toHaveLength(1);

    // mark 仍标记为 stack 排布（bounds.y extent 读 y0/y1）
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      kind: 'data',
      encodings: { bounds: { y: { from: 'y0', to: 'y1' } } },
      properties: { bounds: { y: { kind: 'extent' } } },
    });
  });

  it('options_transforms_with_stack_suppresses_shortcut_stack', () => {
    const spec = buildPlotIR(
      <IntervalMark stack encodings={{ series: 'product', position: { x: 'month', y: 'revenue' } }} />,
      '__plot',
      {
        transforms: [{ operation: { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } } }],
      },
    );

    expect(
      (spec.transform ?? []).map(declaration => declaration.operation).filter(t => t.kind === 'stack'),
    ).toHaveLength(1);
  });

  it('transform_order_explicit_before_shortcut_stack', () => {
    // summarize（显式）在前、无显式 stack → shortcut stack 补在后
    const spec = buildPlotIR(
      <>
        <PlotTransform
          operation={{
            kind: 'summarize',
            params: {
              groupBy: ['month', 'product'],
              metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }],
            },
          }}
        />
        <IntervalMark stack encodings={{ series: 'product', position: { x: 'month', y: 'total' } }} />
      </>,
      '__plot',
    );

    expect(spec.transform?.[0].operation).toMatchObject({ kind: 'summarize', params: {} });
    expect(spec.transform?.[1].operation).toMatchObject({ kind: 'stack', params: {} });
  });

  it('transform 装配产物过 PlotSchema', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'bin', params: { field: 'm', count: 10 } }} />
        <IntervalMark x0="binStart" x1="binEnd" encodings={{ position: { y: 'binCount' } }} />
      </>,
      '__plot',
    );

    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
