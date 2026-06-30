import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { PathMark } from '../../../src/components/marks';
import { Transform } from '../../../src/components/transform';

describe('buildPlotSpec alpha.13 ADR-03（density transform 透传）', () => {
  it('density_declared_to_ir', () => {
    const spec = buildPlotSpec(
      <>
        <Transform
          kind="density"
          field="value"
          groupBy={['species']}
          xAs="densityX"
          densityAs="density"
          sampleCount={96}
        />
        <PathMark
          x="densityX"
          y="density"
          series="species"
          order="densityX"
          closure={{ kind: 'baseline', baseline: 0 }}
          fill="#60a5fa"
        />
      </>,
      '__plot',
    );

    expect(spec.transform).toEqual([
      { kind: 'density', field: 'value', groupBy: ['species'], xAs: 'densityX', densityAs: 'density', sampleCount: 96 },
    ]);
    expect(spec.marks[0]).toMatchObject({
      type: 'path',
      series: 'species',
      order: 'densityX',
      closure: { kind: 'baseline', baseline: 0 },
      encoding: { x: { field: 'densityX' }, y: { field: 'density' } },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
