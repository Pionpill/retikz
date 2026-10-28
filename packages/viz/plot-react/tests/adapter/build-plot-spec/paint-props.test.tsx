import type { IRPaint } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { IntervalMark, PathMark, PointMark } from '../../../src/components/marks';

const gradientPaint: IRPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

describe('buildPlotIR 绘制 props', () => {
  it('省略嵌套的可选属性，同时保留显式值和标签数组位置', () => {
    const spec = buildPlotIR(
      <PointMark
        encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{
          fill: undefined,
          dashed: false,
          opacity: { overall: 0, fill: undefined },
          label: [
            { text: 'A', distance: undefined },
            { text: 'B', distance: 0 },
          ],
        }}
      />,
      '__plot',
    );
    const properties = spec.marks[0].properties;
    expect(properties).not.toHaveProperty('fill');
    expect(properties).toMatchObject({
      dashed: false,
      opacity: { overall: 0 },
      label: [{ text: 'A' }, { text: 'B', distance: 0 }],
    });
    expect(properties?.opacity).not.toHaveProperty('fill');
    expect(properties?.label).toHaveLength(2);
    expect(JSON.parse(JSON.stringify(properties))).toEqual(properties);
  });

  it('点绘制 props 穿过标记 IR', () => {
    const spec = buildPlotIR(
      <PointMark
        encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{ fill: gradientPaint, stroke: gradientPaint }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'point',
      properties: { fill: gradientPaint, stroke: gradientPaint },
    });
  });

  it('路径绘画 props 穿过以标记 IR', () => {
    const spec = buildPlotIR(
      <PathMark
        encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{ fill: gradientPaint, stroke: gradientPaint }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'path',
      properties: { fill: gradientPaint, stroke: gradientPaint },
    });
  });

  it('路径绘制没有作为恒定绘制穿过', () => {
    const spec = buildPlotIR(
      <PathMark encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }} properties={{ stroke: 'none' }} />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({ type: 'path', properties: { stroke: 'none' } });
  });

  it('路径 connectNulls 经过以标记 IR', () => {
    const spec = buildPlotIR(
      <PathMark
        encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
        properties={{ connectNulls: true }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'path',
      properties: { connectNulls: true },
    });
  });

  it('间隔绘制 props 穿过标记 IR', () => {
    const spec = buildPlotIR(
      <IntervalMark
        encodings={{ position: { x: { field: 'month' }, y: { field: 'revenue' } } }}
        properties={{ fill: gradientPaint, stroke: gradientPaint }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      properties: { fill: gradientPaint, stroke: gradientPaint },
    });
  });
});
