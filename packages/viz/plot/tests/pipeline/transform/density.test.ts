import { collectTransformFields, resolveTransformRegistry, TransformSchema } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { createFieldCollector } from '../../../src/providers/channel/shared';
import { PlotSchema } from '../../../src/schemas/plot';

const densityOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('密度变换行为（契约）', () => {
  it('报告输入和输出字段以进行严格的模型收集', () => {
    const fields = new Set<string>();
    const derivedOutputs = new Set<string>();

    collectTransformFields(
      densityOperation({
        kind: 'density',
        params: {
          field: 'value',
          groupBy: ['species'],
          xAs: 'densityX',
          densityAs: 'density',
        },
      }),
      createFieldCollector(fields),
      derivedOutputs,
      resolveTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['species', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['density', 'densityX']);
  });

  it('严格模型接受密度输出字段作为派生字段', () => {
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
        {
          operation: {
            kind: 'density',
            params: { field: 'value', groupBy: ['species'], xAs: 'densityX', densityAs: 'density' },
          },
        },
      ],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          encodings: {
            series: 'species',
            order: 'densityX',
            position: { x: { field: 'densityX' }, y: { field: 'density' } },
          },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['species', 'value']);
  });
});
