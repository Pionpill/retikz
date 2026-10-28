import { resolveTransformRegistry } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { PlotSchema } from '../../../src/schemas';

describe('关联变换', () => {
  const operation = {
    kind: 'relate',
    params: {
      source: { selector: { kind: 'min', by: 'value' }, fields: { x: 'x', y: 'value', id: 'id' } },
      target: { selector: { kind: 'max', by: 'value' }, fields: { x: 'x', y: 'value', id: 'id' } },
      measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
    },
  };

  it('报告输入和输出字段以进行严格的模型收集', () => {
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
          type: 'path',
          transforms: [{ operation }],
          encodings: {
            label: { text: 'deltaLabel' },
            from: { x: { field: 'sourceX' }, y: { field: 'sourceY' } },
            to: { x: { field: 'targetX' }, y: { field: 'targetY' } },
          },
          properties: { label: {} },
        },
      ],
    });

    expect([...collectSourceFields(spec, resolveTransformRegistry())].sort()).toEqual(['id', 'value', 'x']);
  });
});
