import { PlotSchema } from '@retikz/plot';
import { normalizePlotIR, resolveLabelOf } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../src/adapter';
import { IntervalMark, PointMark } from '../../src/components/marks';

describe('宿主标签简写与详细配置', () => {
  it('详细字段标签与手写 IR 等价', () => {
    const spec = buildPlotIR(
      <IntervalMark
        encodings={{ position: { x: 'month', y: 'revenue' }, label: { content: 'revenue' } }}
        properties={{ label: { position: 'top', distance: 6, displayFormat: ',.0f' } }}
      />,
      '__plot',
    );
    const mark = spec.marks[0];

    expect(mark.type).toBe('interval');
    expect(mark.encodings).toMatchObject({ label: { content: 'revenue' } });
    expect(mark.properties?.label).toEqual({
      displayFormat: ',.0f',
      position: 'top',
      distance: 6,
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('标签引线保留显式开关', () => {
    const spec = buildPlotIR(
      <PointMark
        encodings={{ position: { x: 'px', y: 'py' }, label: { content: 'lbl' } }}
        properties={{ label: { pin: true } }}
      />,
      '__plot',
    );
    const mark = spec.marks[0];

    expect(mark.properties?.label).toMatchObject({ pin: true });
  });

  it('label core style props pass through', () => {
    const spec = buildPlotIR(
      <IntervalMark
        encodings={{ position: { x: 'month', y: 'revenue' }, label: { content: 'revenue' } }}
        properties={{
          label: {
            textColor: '#334155',
            opacity: 0.75,
            font: { family: 'serif', size: 12, weight: 'bold' },
            rotate: 'tangent',
            keepUpright: true,
            pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
          },
        }}
      />,
      '__plot',
    );
    const mark = spec.marks[0];

    expect(mark.properties?.label).toMatchObject({
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
      <PointMark
        encodings={{ position: { x: 'px', y: 'py' }, label: [{ content: 'name' }, {}] }}
        properties={{ label: [{}, { content: 'fixed', distance: 0, pin: false }] }}
      />,
      '__plot',
    );
    expect(spec.marks[0]).toMatchObject({
      encodings: { label: [{ content: 'name' }, {}] },
      properties: { label: [{}, { content: 'fixed', distance: 0, pin: false }] },
    });
    expect(PlotSchema.safeParse(spec).success).toBe(true);
  });

  it('无 label prop → mark 无 label 字段', () => {
    const spec = buildPlotIR(<IntervalMark encodings={{ position: { x: 'm', y: 'r' } }} />, '__plot');

    expect(spec.marks[0]).not.toHaveProperty('properties.label');
  });

  it('resolveLabel prop（配 id）→ 收进旁路、不落 IR', () => {
    const fn = (row: { revenue?: number }) => `$${row.revenue}`;
    const spec = buildPlotIR(
      <IntervalMark id="bars" resolveLabel={fn} encodings={{ position: { x: 'month', y: 'revenue' } }} />,
      '__plot',
    );

    expect(JSON.stringify(spec)).not.toContain('resolveLabel');
    expect(resolveLabelOf(spec)).toEqual({ bars: fn });
  });

  it('resolveLabel prop 无 id → fail-loud', () => {
    expect(() =>
      buildPlotIR(
        <IntervalMark resolveLabel={() => 'x'} encodings={{ position: { x: 'month', y: 'revenue' } }} />,
        '__plot',
      ),
    ).toThrow(/mark id/i);
  });
});

describe('PointMark 内容字段与固定属性', () => {
  it('文本与位置颜色字段进入 encodings，偏移保留在 properties', () => {
    const spec = buildPlotIR(
      <PointMark
        encodings={{ color: 'cat', text: 'revenue', position: { x: 'month', y: 'revenue' } }}
        properties={{ dy: -8 }}
      />,
      '__plot',
      {
        dataFieldNames: new Set(['cat']),
      },
    );
    expect(spec.marks[0]).toMatchObject({
      type: 'point',
      kind: 'data',
      encodings: { text: 'revenue', position: { x: 'month', y: 'revenue' }, color: { field: 'cat', scale: '__color' } },
      properties: { dy: -8 },
    });
    expect(spec.marks[0]).not.toHaveProperty('properties.dx');
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('文本格式保留在 properties.displayFormat', () => {
    const spec = buildPlotIR(
      <PointMark encodings={{ text: 'v', position: { x: 'x', y: 'y' } }} properties={{ displayFormat: ',.1f' }} />,
      '__plot',
    );
    expect(spec.marks[0]).toMatchObject({ encodings: { text: 'v' }, properties: { displayFormat: ',.1f' } });
  });

  it('PointMark text resolveLabel（配 id）→ 旁路收集、不落 IR', () => {
    const fn = (row: { label?: string }) => `<${row.label}>`;
    const spec = buildPlotIR(
      <PointMark id="t1" resolveLabel={fn} encodings={{ position: { x: 'x', y: 'y' }, text: 'label' }} />,
      '__plot',
    );

    expect(JSON.stringify(spec)).not.toContain('resolveLabel');
    expect(resolveLabelOf(spec)).toEqual({ t1: fn });
  });
});

it('React and Vanilla preserve split opacity and label declarations', () => {
  const encodings = {
    position: { x: 'x', y: 'y' },
    opacity: { fill: { field: 'alpha', scale: 'alpha-scale' } },
    label: { content: 'name' },
  };
  const properties = {
    opacity: { overall: 0.5, stroke: 0 },
    label: { position: 'top' as const, distance: 0, pin: false },
  };
  const react = buildPlotIR(<PointMark encodings={encodings} properties={properties} />, '__plot');
  const vanilla = normalizePlotIR(
    { declarations: [{ kind: 'point-mark', props: { encodings, properties }, path: [0] }], runtimeSources: [] },
    '__plot',
  );
  expect(react.marks).toEqual(vanilla.marks);
  expect(react.marks[0]).toMatchObject({ encodings, properties });
});
