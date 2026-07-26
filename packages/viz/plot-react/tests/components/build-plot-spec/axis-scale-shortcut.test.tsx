import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { Axis } from '../../../src/components/guides';
import { PathMark } from '../../../src/components/marks';

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
});
