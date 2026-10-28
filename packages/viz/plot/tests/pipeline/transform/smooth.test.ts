import { collectTransformFields, resolveTransformRegistry, TransformSchema } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { createFieldCollector } from '../../../src/providers/channel/shared';
import { PlotSchema } from '../../../src/schemas/plot';

const smoothOperation = (operation: unknown) => TransformSchema.parse(operation);

describe('平滑变换行为（契约）', () => {
  it('报告输入和输出字段以进行严格的模型收集', () => {
    const fields = new Set<string>();
    const derivedOutputs = new Set<string>();

    collectTransformFields(
      smoothOperation({
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          groupBy: ['series'],
          xAs: 'trendX',
          yAs: 'trendY',
        },
      }),
      createFieldCollector(fields),
      derivedOutputs,
      resolveTransformRegistry(),
    );

    expect([...fields].sort()).toEqual(['series', 'time', 'value']);
    expect([...derivedOutputs].sort()).toEqual(['trendX', 'trendY']);
  });

  it('严格模型接受平滑输出字段作为派生字段', () => {
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
      transform: [
        {
          operation: {
            kind: 'smooth',
            params: { x: 'time', y: 'value', groupBy: ['series'], xAs: 'trendX', yAs: 'trendY' },
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
            series: 'series',
            order: 'trendX',
            position: { x: { field: 'trendX' }, y: { field: 'trendY' } },
          },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['series', 'time', 'value']);
  });
});
