import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { createHistogramSpec } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotIR } from '../../../src/adapter';
import { IntervalMark } from '../../../src/components/marks';
import { PlotTransform } from '../../../src/components/transform';

describe('buildPlotIR 的 PlotTransform、bin、summarize 及 x0x1 直方图', () => {
  it('将声明的 bin 转换为 ir', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'bin', params: { field: 'measurement', count: 20 } }} />
        <IntervalMark x0="binStart" x1="binEnd" encodings={{ position: { y: { field: 'binCount' } } }} />
      </>,
      '__plot',
    );

    expect(spec.transform).toEqual([{ operation: { kind: 'bin', params: { field: 'measurement', count: 20 } } }]);
  });

  it('条形图 x0x1 直方图连续 x 非带状', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'bin', params: { field: 'm', step: 5 } }} />
        <IntervalMark x0="binStart" x1="binEnd" encodings={{ position: { y: { field: 'binCount' } } }} />
      </>,
      '__plot',
    );
    const expected = createHistogramSpec('__plot', { x: '__x', y: '__y' }, 5);
    const mark = spec.marks[0];

    expect(spec.transform).toEqual(expected.transform);
    expect(mark).toMatchObject(expected.marks[0]);

    if (mark.type !== 'interval') throw new Error('expected interval mark');

    // histogram：仅 y 高度通道、无 encoding.x
    expect(mark.encodings?.position?.y).toEqual({ field: 'binCount' });
    expect(mark.encodings?.position?.x).toBeUndefined();

    // 连续 x linear scale（非 band）
    expect(spec.scales).toContainEqual({ type: 'linear', name: '__x' });
    expect(spec.scales.find(s => s.name === '__x')?.type).not.toBe('band');
  });

  it('条形宽度成比例，将 x 保持为轴标签字段', () => {
    const spec = buildPlotIR(
      <IntervalMark
        width="gdp"
        encodings={{ color: 'country', position: { x: { field: 'country' }, y: { field: 'cost' } } }}
      />,
      '__plot',
    );
    const mark = spec.marks[0];

    expect(mark).toMatchObject({
      type: 'interval',
      encodings: {
        bounds: { x: { weight: 'gdp' } },
        color: { field: 'country', scale: '__color' },
        position: { x: { field: 'country' }, y: { field: 'cost' } },
      },
      properties: { bounds: { x: { kind: 'proportional' } } },
    });
    expect(spec.scales.find(scale => scale.name === '__x')?.type).toBe('linear');
  });

  it('声明为 ir 的变换汇总', () => {
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
        <IntervalMark encodings={{ position: { x: { field: 'region' }, y: { field: 'totalRevenue' } } }} />
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
      encodings: { position: { x: { field: 'region' }, y: { field: 'totalRevenue' } } },
    });
  });

  it('绘图变换选项直接传递', () => {
    const spec = buildPlotIR(
      <IntervalMark encodings={{ position: { x: { field: 'region' }, y: { field: 'total' } } }} />,
      '__plot',
      {
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
      },
    );

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

  it('显式堆叠抑制快捷堆叠无双倍', () => {
    // 显式 stack operation 存在时，IntervalMark stack 的 shortcut 不再注入
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } }} />
        <IntervalMark
          stack
          encodings={{ series: 'product', position: { x: { field: 'month' }, y: { field: 'revenue' } } }}
        />
      </>,
      '__plot',
    );
    const stacks = (spec.transform ?? []).map(declaration => declaration.operation).filter(t => t.kind === 'stack');

    expect(stacks).toHaveLength(1);

    // mark 仍标记为 stack 排布（bounds.y extent 读 y0/y1）
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      encodings: { bounds: { y: { from: { field: 'y0' }, to: { field: 'y1' } } } },
      properties: { bounds: { y: { kind: 'extent' } } },
    });
  });

  it('选项通过堆叠进行转换，抑制快捷方式堆叠', () => {
    const spec = buildPlotIR(
      <IntervalMark
        stack
        encodings={{ series: 'product', position: { x: { field: 'month' }, y: { field: 'revenue' } } }}
      />,
      '__plot',
      {
        transforms: [{ operation: { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } } }],
      },
    );

    expect(
      (spec.transform ?? []).map(declaration => declaration.operation).filter(t => t.kind === 'stack'),
    ).toHaveLength(1);
  });

  it('在快捷方式堆叠之前显式转换顺序', () => {
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
        <IntervalMark
          stack
          encodings={{ series: 'product', position: { x: { field: 'month' }, y: { field: 'total' } } }}
        />
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
        <IntervalMark x0="binStart" x1="binEnd" encodings={{ position: { y: { field: 'binCount' } } }} />
      </>,
      '__plot',
    );

    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
