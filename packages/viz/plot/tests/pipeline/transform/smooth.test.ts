import { collectTransformFields, resolveTransformRegistry, TransformSchema } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { createFieldCollector } from '../../../src/providers/channel/shared';
import { PlotSchema } from '../../../src/schemas/plot';

const smoothOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('smooth transform behavior (contract)', () => {
  it('reports input and output fields for strict model collection', () => {
    const fields = new Set<string>();
    const derivedOutputs = new Set<string>();

    collectTransformFields(
      smoothOperation({
        kind: 'smooth',
        x: 'time',
        y: 'value',
        groupBy: ['series'],
        xAs: 'trendX',
        yAs: 'trendY',
      }),
      createFieldCollector(fields),
      derivedOutputs,
      resolveTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['series', 'time', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['trendX', 'trendY']);
  });

  it('strict model accepts smooth output fields as derived fields', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'samples',
        model: [
          { name: 'series', type: 'categorical' },
          { name: 'time', type: 'continuous' },
          { name: 'value', type: 'continuous' },
        ],
      },
      transform: [{ kind: 'smooth', x: 'time', y: 'value', groupBy: ['series'], xAs: 'trendX', yAs: 'trendY' }],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'series',
          order: 'trendX',
          encoding: { x: { field: 'trendX' }, y: { field: 'trendY' } },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['series', 'time', 'value']);
  });
});
