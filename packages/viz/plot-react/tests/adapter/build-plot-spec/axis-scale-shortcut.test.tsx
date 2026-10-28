import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis } from '../../../src/components/guides';
import { PathMark } from '../../../src/components/marks';

describe('buildPlotIR PlotAxis 缩放快捷键', () => {
  it('构建与<PlotScale>相同的尺寸比例', () => {
    const spec = buildPlotIR(
      <>
        <PathMark encodings={{ position: { x: { field: 'm' }, y: { field: 'r' } } }} />
        <PlotAxis dimension="y" scale="log" />
      </>,
      '__plot',
    );

    expect(spec.scales[1]).toEqual({ type: 'log', name: '__y' });
    expect(spec.guides).toEqual([{ type: 'axis', dimension: 'y' }]);
  });
});
