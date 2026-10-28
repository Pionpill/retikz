import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { IntervalMark, PointMark } from '../../../src/components/marks';
import { PlotTransform } from '../../../src/components/transform';

describe('buildPlotIR alpha.12 ADR-02（normalize / derive-interval / jitter 经同一 <PlotTransform> 透传）', () => {
  it('通过变换标准化然后堆叠百分比', () => {
    // 百分比堆叠：显式 [normalize, stack] 两步链 + <IntervalMark stack>（柱读累积界 y0/y1）；
    // 显式 stack 与 mark shortcut stack 同签名 → shortcut stack 被去重抑制（最终只一条 stack，不二次堆叠）
    const spec = buildPlotIR(
      <>
        <PlotTransform
          operation={{
            kind: 'normalize',
            params: { field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' },
          }}
        />
        <PlotTransform operation={{ kind: 'stack', params: { x: 'quarter', y: 'share', groupBy: 'product' } }} />
        <IntervalMark
          stack
          encodings={{ series: 'product', position: { x: { field: 'quarter' }, y: { field: 'share' } } }}
        />
      </>,
      '__plot',
    );

    expect(spec.transform).toEqual([
      {
        operation: {
          kind: 'normalize',
          params: { field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' },
        },
      },
      { operation: { kind: 'stack', params: { x: 'quarter', y: 'share', groupBy: 'product' } } },
    ]);

    // 只剩一条 stack（shortcut stack 被同签名去重），且 mark 确为 stacked interval（lower 会读 y0/y1）
    expect(
      (spec.transform ?? []).map(declaration => declaration.operation).filter(t => t.kind === 'stack'),
    ).toHaveLength(1);
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      encodings: { bounds: { y: { from: { field: 'y0' }, to: { field: 'y1' } } } },
      properties: { bounds: { y: { kind: 'extent' } } },
    });
  });

  it('保留具有不同签名的快捷方式堆叠', () => {
    // P1 回归：显式 stack 只去重「同签名」的 shortcut stack；签名不同的 <IntervalMark series stack> 的 shortcut stack 必须保留，
    // 否则该 mark 仍是 stacked interval 却无对应 y0/y1，lower 阶段读空累积界出错
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'stack', params: { x: 'quarter', y: 'share', groupBy: 'product' } }} />
        <IntervalMark
          stack
          encodings={{ series: 'product', position: { x: { field: 'quarter' }, y: { field: 'share' } } }}
        />
        {/* 不同 y/groupBy 签名的另一组堆叠柱：其 shortcut stack 不能被误删 */}
        <IntervalMark
          stack
          encodings={{ series: 'region', position: { x: { field: 'month' }, y: { field: 'revenue' } } }}
        />
      </>,
      '__plot',
    );
    const stacks = (spec.transform ?? []).map(declaration => declaration.operation).filter(t => t.kind === 'stack');

    // 显式 stack(quarter/share/product) 去重了第一根柱的同签名 shortcut stack；第二根柱(month/revenue/region)的 shortcut stack 保留 → 共两条
    expect(stacks).toHaveLength(2);
    expect(stacks).toContainEqual({ kind: 'stack', params: { x: 'quarter', y: 'share', groupBy: 'product' } });
    expect(stacks).toContainEqual({ kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'region' } });

    // 两根柱都为 stacked interval（bounds.y extent 读 y0/y1）
    expect(spec.marks.every(m => m.type === 'interval' && m.properties?.bounds?.y?.kind === 'extent')).toBe(true);
  });

  it('导出声明​​给 ir 的间隔', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'derive-interval', params: { startFrom: 'start', endFrom: 'end' } }} />
        <IntervalMark encodings={{ position: { x: { field: 'task' }, y: { field: 'end' } } }} />
      </>,
      '__plot',
    );

    expect(spec.transform).toEqual([
      { operation: { kind: 'derive-interval', params: { startFrom: 'start', endFrom: 'end' } } },
    ]);
  });

  it('向 ir 声明的抖动', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'jitter', params: { axis: 'x', xField: 'dose', amount: 0.3, seed: 42 } }} />
        <PointMark encodings={{ position: { x: { field: 'dose' }, y: { field: 'response' } } }} />
      </>,
      '__plot',
    );

    expect(spec.transform).toEqual([
      { operation: { kind: 'jitter', params: { axis: 'x', xField: 'dose', amount: 0.3, seed: 42 } } },
    ]);
  });

  it('adr02 装配产物过 PlotSchema', () => {
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'jitter', params: { axis: 'both', amount: 1, seed: 7 } }} />
        <PointMark encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }} />
      </>,
      '__plot',
    );

    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
