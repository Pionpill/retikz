import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { createDensityAreaSpec } from '../../../../plot/tests/helpers/plot-spec-fixtures';
import { buildPlotIR } from '../../../src/adapter';
import { PathMark } from '../../../src/components/marks';
import { Transform } from '../../../src/components/transform';

describe('buildPlotIR density transform forwarding', () => {
  it('density_declared_to_ir', () => {
    const spec = buildPlotIR(
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
    const expected = createDensityAreaSpec('__plot', {
      sampleCount: 96,
      scales: { x: '__x', y: '__y' },
    });

    expect(spec.transform).toEqual(expected.transform);
    expect(spec.marks[0]).toMatchObject(expected.marks[0]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
