import { describe, expect, it } from 'vitest';

import * as plotReact from '../src';

describe('@retikz/plot-react public surface', () => {
  it('exports only prefixed non-Mark declaration components', () => {
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

  it('keeps the Plot root and Mark declaration names unchanged', () => {
    const publicSurface = plotReact as Record<string, unknown>;

    for (const name of ['Plot', 'PathMark', 'PointMark', 'IntervalMark', 'ReferenceMark', 'RelationMark']) {
      expect(publicSurface[name], `${name} must remain exported`).toBeTypeOf('function');
    }
  });
});
