import { describe, expect, it } from 'vitest';
import { PlotSpecSchema } from '@retikz/plot';
import { buildPlotSpec, resolveLabelOf } from '../../src/components/build-plot-spec';
import { IntervalMark, PointMark } from '../../src/components/marks';

/**
 * ADR-04（alpha.11）：plot-react 装配契约。
 * priority-1：位置 mark 的扁平 label* props → IR mark.label（MarkLabelSchema），resolveLabel 收进旁路、不落 IR；
 * priority-2：<PointMark text> 扁平 props → IR point mark（type:'point'、encoding.text、x/y/color、dx/dy 落顶层）。
 */

describe('priority-1 宿主 mark label 扁平 props → IR mark.label', () => {
  it('react-mark-label-assembly：IntervalMark label* → interval mark.label，与手写 IR 等价', () => {
    const spec = buildPlotSpec(<IntervalMark x="month" y="revenue" label="revenue" labelPosition="above" labelDistance={6} labelFormat=",.0f" />, '__plot');
    const mark = spec.marks[0] as { type: string; label?: unknown };
    expect(mark.type).toBe('interval');
    expect(mark.label).toEqual({ content: { field: 'revenue', format: ',.0f' }, position: 'above', distance: 6 });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('labelPin → label.pin=true', () => {
    const spec = buildPlotSpec(<PointMark x="px" y="py" label="lbl" labelPin />, '__plot');
    const mark = spec.marks[0] as { label?: { pin?: boolean } };
    expect(mark.label?.pin).toBe(true);
  });

  it('无 label prop → mark 无 label 字段', () => {
    const spec = buildPlotSpec(<IntervalMark x="m" y="r" />, '__plot');
    expect(spec.marks[0]).not.toHaveProperty('label');
  });

  it('resolveLabel prop（配 id）→ 收进旁路、不落 IR', () => {
    const fn = (row: { revenue?: number }) => `$${row.revenue}`;
    const spec = buildPlotSpec(<IntervalMark id="bars" x="month" y="revenue" resolveLabel={fn} />, '__plot');
    expect(JSON.stringify(spec)).not.toContain('resolveLabel');
    expect(resolveLabelOf(spec)).toEqual({ bars: fn });
  });

  it('resolveLabel prop 无 id → fail-loud', () => {
    expect(() => buildPlotSpec(<IntervalMark x="month" y="revenue" resolveLabel={() => 'x'} />, '__plot')).toThrow(/mark id/i);
  });
});

describe('priority-2 PointMark text 扁平 props → IR point mark', () => {
  it('react-textmark-encoding-assembly：PointMark text → type point、encoding.text、x/y/color、dx/dy 落顶层', () => {
    const spec = buildPlotSpec(<PointMark x="month" y="revenue" text="revenue" color="cat" dy={-8} />, '__plot');
    const mark = spec.marks[0] as { type: string; dx?: number; dy?: number; encoding: Record<string, unknown> };
    expect(mark.type).toBe('point');
    expect(mark.encoding.text).toEqual({ field: 'revenue' });
    expect(mark.encoding.x).toEqual({ field: 'month' });
    expect(mark.encoding.y).toEqual({ field: 'revenue' });
    expect(mark.encoding.color).toEqual({ field: 'cat', scale: '__color' });
    expect(mark.dy).toBe(-8);
    expect(mark).not.toHaveProperty('dx');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('PointMark text format → encoding.text.format', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" text="v" format=",.1f" />, '__plot');
    const mark = spec.marks[0] as { encoding: { text?: unknown } };
    expect(mark.encoding.text).toEqual({ field: 'v', format: ',.1f' });
  });

  it('PointMark text resolveLabel（配 id）→ 旁路收集、不落 IR', () => {
    const fn = (row: { label?: string }) => `<${row.label}>`;
    const spec = buildPlotSpec(<PointMark id="t1" x="x" y="y" text="label" resolveLabel={fn} />, '__plot');
    expect(JSON.stringify(spec)).not.toContain('resolveLabel');
    expect(resolveLabelOf(spec)).toEqual({ t1: fn });
  });
});
