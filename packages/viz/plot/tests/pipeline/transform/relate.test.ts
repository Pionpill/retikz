import { resolveTransformRegistry } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { PlotSchema } from '../../../src/schemas';

describe('relate transform', () => {
  const operation = {
    kind: 'relate',
    source: { selector: { kind: 'min', by: 'value' }, fields: { x: 'x', y: 'value', id: 'id' } },
    target: { selector: { kind: 'max', by: 'value' }, fields: { x: 'x', y: 'value', id: 'id' } },
    measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
  };

  it('reports input and output fields for strict model collection', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'id', type: 'categorical' },
          { name: 'x', type: 'continuous' },
          { name: 'value', type: 'continuous' },
        ],
      },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'relation',
          transform: [{ operation }],
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          label: { content: { field: 'deltaLabel' } },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['id', 'value', 'x']);
  });
});
