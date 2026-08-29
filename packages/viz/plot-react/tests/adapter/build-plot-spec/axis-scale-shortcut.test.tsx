import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis } from '../../../src/components/guides';
import { PathMark } from '../../../src/components/marks';

describe('buildPlotIR PlotAxis scale shortcut', () => {
  it('builds the same dimension scale as <PlotScale>', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="m" y="r" />
        <PlotAxis dimension="y" scale="log" />
      </>,
      '__plot',
    );
    expect(spec.scales[1]).toEqual({ type: 'log', name: '__y' });
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'y' }]);
  });
});
