import { collectTransformFields, resolveTransformRegistry, TransformSchema } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { createFieldCollector } from '../../../src/providers/channel/shared';
import { PlotSchema } from '../../../src/schemas/plot';

const densityOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('density transform behavior (contract)', () => {
  it('reports input and output fields for strict model collection', () => {
    const fields = new Set<string>();
    const derivedOutputs = new Set<string>();

    collectTransformFields(
      densityOperation({
        kind: 'density',
        field: 'value',
        groupBy: ['species'],
        xAs: 'densityX',
        densityAs: 'density',
      }),
      createFieldCollector(fields),
      derivedOutputs,
      resolveTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['species', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['density', 'densityX']);
  });

  it('strict model accepts density output fields as derived fields', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'samples',
        model: [
          { name: 'species', type: 'categorical' },
          { name: 'value', type: 'continuous' },
        ],
      },
      transform: [
        { operation: { kind: 'density', field: 'value', groupBy: ['species'], xAs: 'densityX', densityAs: 'density' } },
      ],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'species',
          order: 'densityX',
          encoding: { x: { field: 'densityX' }, y: { field: 'density' } },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['species', 'value']);
  });
});
