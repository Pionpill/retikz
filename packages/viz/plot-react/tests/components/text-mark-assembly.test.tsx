import { PlotSchema } from '@retikz/plot';
import { resolveLabelOf } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../src/adapter';
import { IntervalMark, PointMark } from '../../src/components/marks';

/**
 * ADR-04（alpha.11）：plot-react 装配契约。
 * priority-1：位置 mark 的扁平 label* props → IR mark.label（MarkLabelSchema），resolveLabel 收进旁路、不落 IR；
 * priority-2：<PointMark text> 扁平 props → IR point mark（type:'point'、encoding.text、x/y/color、dx/dy 落顶层）
 */

describe('priority-1 宿主 mark label 扁平 props → IR mark.label', () => {
  it('react-mark-label-assembly：IntervalMark label* → interval mark.label，与手写 IR 等价', () => {
    const spec = buildPlotIR(
      <IntervalMark
        x="month"
        y="revenue"
        label="revenue"
        labelPosition="top"
        labelDistance={6}
        labelDisplayFormat=",.0f"
      />,
      '__plot',
    );
    const mark = spec.marks[0] as { type: string; label?: unknown };
    expect(mark.type).toBe('interval');
    expect(mark.label).toEqual({
      content: { field: 'revenue', displayFormat: ',.0f' },
      position: 'top',
      distance: 6,
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('labelPin → label.pin=true', () => {
    const spec = buildPlotIR(<PointMark x="px" y="py" label="lbl" labelPin />, '__plot');
    const mark = spec.marks[0] as { label?: { pin?: boolean } };
    expect(mark.label?.pin).toBe(true);
  });

  it('label core style props pass through', () => {
    const spec = buildPlotIR(
      <IntervalMark
        x="month"
        y="revenue"
        label="revenue"
        labelTextColor="#334155"
        labelOpacity={0.75}
        labelFont={{ family: 'serif', size: 12, weight: 'bold' }}
        labelRotate="tangent"
        labelKeepUpright
        labelPin={{ stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] }}
      />,
      '__plot',
    );
    const mark = spec.marks[0] as { label?: unknown };
    expect(mark.label).toMatchObject({
      content: { field: 'revenue' },
      textColor: '#334155',
      opacity: 0.75,
      font: { family: 'serif', size: 12, weight: 'bold' },
      rotate: 'tangent',
      keepUpright: true,
      pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
    });
  });

  it('无 label prop → mark 无 label 字段', () => {
    const spec = buildPlotIR(<IntervalMark x="m" y="r" />, '__plot');
    expect(spec.marks[0]).not.toHaveProperty('label');
  });

  it('resolveLabel prop（配 id）→ 收进旁路、不落 IR', () => {
    const fn = (row: { revenue?: number }) => `$${row.revenue}`;
    const spec = buildPlotIR(<IntervalMark id="bars" x="month" y="revenue" resolveLabel={fn} />, '__plot');
    expect(JSON.stringify(spec)).not.toContain('resolveLabel');
    expect(resolveLabelOf(spec)).toEqual({ bars: fn });
  });

  it('resolveLabel prop 无 id → fail-loud', () => {
    expect(() => buildPlotIR(<IntervalMark x="month" y="revenue" resolveLabel={() => 'x'} />, '__plot')).toThrow(
      /mark id/i,
    );
  });
});

describe('priority-2 PointMark text 扁平 props → IR point mark', () => {
  it('react-textmark-encoding-assembly：PointMark text → type point、encoding.text、x/y/color、dx/dy 落顶层', () => {
    const spec = buildPlotIR(<PointMark x="month" y="revenue" text="revenue" color="cat" dy={-8} />, '__plot', {
      dataFieldNames: new Set(['cat']),
    });
    const mark = spec.marks[0] as {
      type: string;
      dx?: number;
      dy?: number;
      color?: unknown;
      encoding: Record<string, unknown>;
    };
    expect(mark.type).toBe('point');
    expect(mark.encoding.text).toEqual({ field: 'revenue' });
    expect(mark.encoding.x).toEqual({ field: 'month' });
    expect(mark.encoding.y).toEqual({ field: 'revenue' });
    expect(mark.color).toEqual({ kind: 'field', value: 'cat', scale: '__color' });
    expect(mark.dy).toBe(-8);
    expect(mark).not.toHaveProperty('dx');
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('PointMark text displayFormat → encoding.text.displayFormat', () => {
    const spec = buildPlotIR(<PointMark x="x" y="y" text="v" displayFormat=",.1f" />, '__plot');
    const mark = spec.marks[0] as { encoding: { text?: unknown } };
    expect(mark.encoding.text).toEqual({ field: 'v', displayFormat: ',.1f' });
  });

  it('PointMark text resolveLabel（配 id）→ 旁路收集、不落 IR', () => {
    const fn = (row: { label?: string }) => `<${row.label}>`;
    const spec = buildPlotIR(<PointMark id="t1" x="x" y="y" text="label" resolveLabel={fn} />, '__plot');
    expect(JSON.stringify(spec)).not.toContain('resolveLabel');
    expect(resolveLabelOf(spec)).toEqual({ t1: fn });
  });
});
