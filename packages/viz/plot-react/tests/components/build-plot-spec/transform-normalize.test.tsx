import { isBuiltinMark, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { IntervalMark, PointMark } from '../../../src/components/marks';
import { Transform } from '../../../src/components/transform';

describe('buildPlotSpec alpha.12 ADR-02（normalize / derive-interval / jitter 经同一 <Transform> 透传）', () => {
  it('normalize_then_stack_percentage_via_transform', () => {
    // 百分比堆叠：显式 [normalize, stack] 两步链 + <IntervalMark stack>（柱读累积界 y0/y1）；
    // 显式 stack 与 mark shortcut stack 同签名 → shortcut stack 被去重抑制（最终只一条 stack，不二次堆叠）
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
    // 只剩一条 stack（shortcut stack 被同签名去重），且 mark 确为 stacked interval（lower 会读 y0/y1）
    expect((spec.transform ?? []).filter(t => t.kind === 'stack')).toHaveLength(1);
    expect(spec.marks[0]).toMatchObject({ type: 'interval', bounds: { y: { kind: 'extent', from: 'y0', to: 'y1' } } });
  });

  it('shortcut_stack_with_different_signature_is_kept', () => {
    // P1 回归：显式 stack 只去重「同签名」的 shortcut stack；签名不同的 <IntervalMark series stack> 的 shortcut stack 必须保留，
    // 否则该 mark 仍是 stacked interval 却无对应 y0/y1，lower 阶段读空累积界出错
    const spec = buildPlotSpec(
      <>
        <Transform kind="stack" x="quarter" y="share" groupBy="product" />
        <IntervalMark x="quarter" y="share" series="product" stack />
        {/* 不同 y/groupBy 签名的另一组堆叠柱：其 shortcut stack 不能被误删 */}
        <IntervalMark x="month" y="revenue" series="region" stack />
      </>,
      '__plot',
    );
    const stacks = (spec.transform ?? []).filter(t => t.kind === 'stack');
    // 显式 stack(quarter/share/product) 去重了第一根柱的同签名 shortcut stack；第二根柱(month/revenue/region)的 shortcut stack 保留 → 共两条
    expect(stacks).toHaveLength(2);
    expect(stacks).toContainEqual({ kind: 'stack', x: 'quarter', y: 'share', groupBy: 'product' });
    expect(stacks).toContainEqual({ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'region' });
    // 两根柱都为 stacked interval（bounds.y extent 读 y0/y1）
    expect(spec.marks.every(m => isBuiltinMark(m) && m.type === 'interval' && m.bounds?.y?.kind === 'extent')).toBe(
      true,
    );
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
