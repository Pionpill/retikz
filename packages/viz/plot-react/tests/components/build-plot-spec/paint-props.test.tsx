import type { IRPaintSpec } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { IntervalMark, PathMark, PointMark, ReferenceMark } from '../../../src/components/marks';

const gradientPaint: IRPaintSpec = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

describe('buildPlotSpec paint props', () => {
  it('point paint props pass through to mark IR', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="y" fill={gradientPaint} stroke={gradientPaint} />, '__plot');
    expect(spec.marks[0]).toMatchObject({
      type: 'point',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
    });
  });

  it('path paint props pass through to mark IR', () => {
    const spec = buildPlotSpec(<PathMark x="x" y="y" fill={gradientPaint} stroke={gradientPaint} />, '__plot');
    expect(spec.marks[0]).toMatchObject({
      type: 'path',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
    });
  });

  it('path paint none passes through as constant paint', () => {
    const spec = buildPlotSpec(<PathMark x="x" y="y" stroke="none" />, '__plot');
    expect(spec.marks[0]).toMatchObject({
      type: 'path',
      stroke: { kind: 'constant', value: 'none' },
    });
  });

  it('path connectNulls passes through to mark IR', () => {
    const spec = buildPlotSpec(<PathMark x="x" y="y" connectNulls />, '__plot');
    expect(spec.marks[0]).toMatchObject({
      type: 'path',
      connectNulls: true,
    });
  });

  it('interval paint props pass through to mark IR', () => {
    const spec = buildPlotSpec(
      <IntervalMark x="month" y="revenue" fill={gradientPaint} stroke={gradientPaint} />,
      '__plot',
    );
    expect(spec.marks[0]).toMatchObject({
      type: 'interval',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
    });
  });

  it('reference paint props pass through to mark IR', () => {
    const spec = buildPlotSpec(<ReferenceMark y={8} yTo={12} fill={gradientPaint} stroke={gradientPaint} />, '__plot');
    expect(spec.marks[0]).toMatchObject({
      type: 'reference',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
    });
  });
});
