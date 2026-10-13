import { PlotSchema } from '@retikz/plot';
import { normalizePlotIR, resolveLabelOf } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../src/adapter';
import { IntervalMark, PointMark } from '../../src/components/marks';

describe('宿主标签简写与详细配置', () => {
  it('详细字段标签与手写 IR 等价', () => {
    const spec = buildPlotIR(
      <IntervalMark
        x="month"
        y="revenue"
        label={{ field: 'revenue', position: 'top', distance: 6, displayFormat: ',.0f' }}
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

  it('标签引线保留显式开关', () => {
    const spec = buildPlotIR(<PointMark x="px" y="py" label={{ field: 'lbl', pin: true }} />, '__plot');
    const mark = spec.marks[0] as { label?: { pin?: boolean } };

    expect(mark.label?.pin).toBe(true);
  });

  it('label core style props pass through', () => {
    const spec = buildPlotIR(
      <IntervalMark
        x="month"
        y="revenue"
        label={{
          field: 'revenue',
          textColor: '#334155',
          opacity: 0.75,
          font: { family: 'serif', size: 12, weight: 'bold' },
          rotate: 'tangent',
          keepUpright: true,
          pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
        }}
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

  it('字符串与常量标签数组保持内容与顺序，零间距和关闭引线不会丢失', () => {
    const spec = buildPlotIR(
      <PointMark x="px" y="py" label={['name', { value: 'fixed', distance: 0, pin: false }]} />,
      '__plot',
    );
    expect(spec.marks[0]).toMatchObject({
      label: [{ content: { field: 'name' } }, { content: { value: 'fixed' }, distance: 0, pin: false }],
    });
    expect(PlotSchema.safeParse(spec).success).toBe(true);
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

it('React and Vanilla share progressive opacity and label normalization', () => {
  const opacity = { overall: 0.5, fill: { kind: 'field' as const, value: 'alpha', scale: 'alpha-scale' }, stroke: 0 };
  const label = { field: 'name', position: 'top' as const, distance: 0, pin: false };
  const react = buildPlotIR(<PointMark x="x" y="y" opacity={opacity} label={label} />, '__plot');
  const vanilla = normalizePlotIR(
    {
      declarations: [{ kind: 'point-mark', props: { x: 'x', y: 'y', opacity, label }, path: [0] }],
      runtimeSources: [],
    },
    '__plot',
  );
  expect(react.marks).toEqual(vanilla.marks);
  expect(react.marks[0]).toMatchObject({
    opacity: {
      overall: { kind: 'constant', value: 0.5 },
      fill: { kind: 'field', value: 'alpha', scale: 'alpha-scale' },
      stroke: { kind: 'constant', value: 0 },
    },
    label: { content: { field: 'name' }, distance: 0, pin: false },
  });
  const scalar = buildPlotIR(<PointMark x="x" y="y" opacity={0.5} />, '__plot');
  const detailed = buildPlotIR(<PointMark x="x" y="y" opacity={{ overall: 0.5 }} />, '__plot');
  expect(scalar.marks).toEqual(detailed.marks);
});
