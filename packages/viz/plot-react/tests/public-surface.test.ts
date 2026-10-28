import { describe, expect, it } from 'vitest';

import * as plotReact from '../src';

describe('@retikz/plot-react 公开接口', () => {
  it('仅导出带前缀的非标记声明组件', () => {
    const publicSurface = plotReact as Record<string, unknown>;

    for (const name of [
      'PlotFacet',
      'PlotScaffold',
      'PlotTrack',
      'PlotAxis',
      'PlotLegend',
      'PlotScale',
      'PlotTransform',
    ]) {
      expect(publicSurface[name], `${name} must be exported`).toBeTypeOf('function');
    }

    for (const legacyName of ['Facet', 'Scaffold', 'Track', 'Axis', 'Legend', 'Scale', 'Transform']) {
      expect(legacyName in publicSurface, `${legacyName} must be removed`).toBe(false);
    }
  });

  it('保持 Plot 根和 Mark 声明名称不变', () => {
    const publicSurface = plotReact as Record<string, unknown>;

    for (const name of ['Plot', 'PathMark', 'PointMark', 'IntervalMark', 'RelationMark']) {
      expect(publicSurface[name], `${name} must remain exported`).toBeTypeOf('function');
    }
  });
});
