import { applyTransforms } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import { resolvePlotTransformRegistry } from '../../../src/providers';
import { PlotSpecSchema } from '../../../src/schemas';
import { TransformSchema } from '../../../src/schemas';

describe('relate transform', () => {
  const operation = {
    kind: 'relate',
    source: { selector: { op: 'min', by: 'value' }, fields: { x: 'x', y: 'value', id: 'id' } },
    target: { selector: { op: 'max', by: 'value' }, fields: { x: 'x', y: 'value', id: 'id' } },
    measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
  };

  it('accepts relate schema and preserves JSON round trip', () => {
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('rejects min/max selectors without by', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'relate',
        source: { selector: { op: 'min' }, fields: { id: 'id' } },
        target: { selector: { op: 'max', by: 'value' }, fields: { id: 'id' } },
      }),
    ).toThrow();
  });

  it('rejects endpoint selectors with empty fields', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'relate',
        source: { selector: { op: 'first' }, fields: {} },
        target: { selector: { op: 'last' }, fields: { id: 'id' } },
      }),
    ).toThrow();
  });

  it('derives one global relation row from min to max', () => {
    const rows = applyTransforms(
      [
        { id: 'a', x: 0, value: 12 },
        { id: 'b', x: 1, value: 4 },
        { id: 'c', x: 2, value: 21 },
      ],
      [operation],
      resolvePlotTransformRegistry(),
    );
    expect(rows).toEqual([
      {
        sourceX: 1,
        sourceY: 4,
        sourceId: 'b',
        targetX: 2,
        targetY: 21,
        targetId: 'c',
        delta: 17,
        deltaLabel: '+17',
      },
    ]);
  });

  it('derives one relation row per group', () => {
    const rows = applyTransforms(
      [
        { group: 'A', id: 'a1', x: 0, value: 12 },
        { group: 'A', id: 'a2', x: 1, value: 4 },
        { group: 'B', id: 'b1', x: 0, value: 7 },
        { group: 'B', id: 'b2', x: 1, value: 15 },
      ],
      [{ ...operation, groupBy: ['group'] }],
      resolvePlotTransformRegistry(),
    );
    expect(rows).toEqual([
      expect.objectContaining({ group: 'A', sourceId: 'a2', targetId: 'a1', delta: 8 }),
      expect.objectContaining({ group: 'B', sourceId: 'b1', targetId: 'b2', delta: 8 }),
    ]);
  });

  it('uses deterministic tie handling and skips groups without finite values', () => {
    const rows = applyTransforms(
      [
        { group: 'A', id: 'first', value: 10 },
        { group: 'A', id: 'last', value: 10 },
        { group: 'B', id: 'missing', value: undefined },
      ],
      [
        {
          kind: 'relate',
          groupBy: ['group'],
          source: { selector: { op: 'max', by: 'value', tie: 'last' }, fields: { id: 'id' } },
          target: { selector: { op: 'first' }, fields: { id: 'id' } },
        },
      ],
      resolvePlotTransformRegistry(),
    );
    expect(rows).toEqual([expect.objectContaining({ group: 'A', sourceId: 'last', targetId: 'first' })]);
  });

  it('reports input and output fields for strict model collection', () => {
    const spec = PlotSpecSchema.parse({
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
          transform: [operation],
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          label: { content: { field: 'deltaLabel' } },
        },
      ],
    });
    expect([...collectSourceFields(spec, resolvePlotTransformRegistry())].sort()).toEqual(['id', 'value', 'x']);
  });
});
