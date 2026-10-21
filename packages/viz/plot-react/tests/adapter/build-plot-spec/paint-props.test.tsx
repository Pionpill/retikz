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

describe('buildPlotIR paint props', () => {
  it('omits nested optional props while preserving explicit values and label array positions', () => {
    const spec = buildPlotIR(
      <PointMark
        encodings={{ position: { x: 'x', y: 'y' } }}
        properties={{
          fill: undefined,
          dashed: false,
          opacity: { overall: 0, fill: undefined },
          label: [
            { content: 'A', distance: undefined },
            { content: 'B', distance: 0 },
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
      label: [{ content: 'A' }, { content: 'B', distance: 0 }],
    });
    expect(properties?.opacity).not.toHaveProperty('fill');
    expect(properties?.label).toHaveLength(2);
    expect(JSON.parse(JSON.stringify(properties))).toEqual(properties);
  });

  it('point paint props pass through to mark IR', () => {
    const spec = buildPlotIR(
      <PointMark
        encodings={{ position: { x: 'x', y: 'y' } }}
        properties={{ fill: gradientPaint, stroke: gradientPaint }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'point',
      kind: 'data',
      properties: { fill: gradientPaint, stroke: gradientPaint },
    });
  });

  it('path paint props pass through to mark IR', () => {
    const spec = buildPlotIR(
      <PathMark
        encodings={{ position: { x: 'x', y: 'y' } }}
        properties={{ fill: gradientPaint, stroke: gradientPaint }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'path',
      kind: 'data',
      properties: { fill: gradientPaint, stroke: gradientPaint },
    });
  });

  it('path paint none passes through as constant paint', () => {
    const spec = buildPlotIR(
      <PathMark encodings={{ position: { x: 'x', y: 'y' } }} properties={{ stroke: 'none' }} />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({ type: 'path', kind: 'data', properties: { stroke: 'none' } });
  });

  it('path connectNulls passes through to mark IR', () => {
    const spec = buildPlotIR(
      <PathMark encodings={{ position: { x: 'x', y: 'y' } }} properties={{ connectNulls: true }} />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'path',
      properties: { connectNulls: true },
    });
  });

  it('interval paint props pass through to mark IR', () => {
    const spec = buildPlotIR(
      <IntervalMark
        encodings={{ position: { x: 'month', y: 'revenue' } }}
        properties={{ fill: gradientPaint, stroke: gradientPaint }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      kind: 'data',
      properties: { fill: gradientPaint, stroke: gradientPaint },
    });
  });
});
