import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { Axis } from '../../../src/components/guides';
import { PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotSpec Axis scale shortcut', () => {
  it('builds the same dimension scale as <Scale>', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="m" y="r" />
        <Axis dimension="y" scale="log" />
      </>,
      '__plot',
    );
    expect(spec.scales[1]).toEqual({ type: 'log', name: '__y' });
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'y' }]);
  });

  it('does not apply to ternary z axes', () => {
    expect(() =>
      buildPlotSpec(
        <>
          <PointMark x="x" y="y" z="z" />
          <Axis dimension="z" scale="linear" />
        </>,
        '__plot',
        { coordinate: 'ternary2D' },
      ),
    ).toThrow(/ternary2D coordinate system does not support scale dimension "z"/i);
  });
});
