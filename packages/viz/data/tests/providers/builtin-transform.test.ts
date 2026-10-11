import { describe, expect, it } from 'vitest';

import { applyTransforms, RetikzDataError, TransformSchema } from '../../src';

describe('data built-in operations through the package root', () => {
  it.each([
    {
      operation: { kind: 'stack', params: { y: 'value' } },
      rows: [{ value: 2 }, { value: 3 }],
      expected: [
        { value: 2, y0: 0, y1: 2 },
        { value: 3, y0: 2, y1: 5 },
      ],
    },
    {
      operation: { kind: 'bin', params: { field: 'value', count: 2, extent: [0, 4], nice: false } },
      rows: [{ value: 0 }, { value: 4 }],
      expected: [
        { value: 1, binStart: 0, binEnd: 2, binCount: 1 },
        { value: 3, binStart: 2, binEnd: 4, binCount: 1 },
      ],
    },
    {
      operation: { kind: 'normalize', params: { field: 'value' } },
      rows: [{ value: 2 }, { value: 6 }],
      expected: [{ value: 0.25 }, { value: 0.75 }],
    },
    {
      operation: { kind: 'derive-interval', params: { from: 'value', baseline: 1 } },
      rows: [{ value: 3 }],
      expected: [{ value: 3, y0: 1, y1: 3 }],
    },
    {
      operation: {
        kind: 'relate',
        params: {
          source: { selector: { kind: 'first' }, fields: { value: 'value' } },
          target: { selector: { kind: 'last' }, fields: { value: 'value' } },
        },
      },
      rows: [{ value: 2 }, { value: 6 }],
      expected: [{ sourceValue: 2, targetValue: 6 }],
    },
    {
      operation: { kind: 'jitter', params: { xField: 'value', amount: 0, seed: 4 } },
      rows: [{ value: 3 }],
      expected: [{ value: 3 }],
    },
    {
      operation: {
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          xAs: 'sample',
          yAs: 'prediction',
          sampleCount: 2,
          extent: [0, 2],
        },
      },
      rows: [
        { time: 0, value: 1 },
        { time: 1, value: 3 },
        { time: 2, value: 5 },
      ],
      expected: [
        { sample: 0, prediction: 1 },
        { sample: 2, prediction: 5 },
      ],
    },
  ])('executes $operation.kind without a host definition', ({ operation, rows, expected }) => {
    const parsed = TransformSchema.parse(JSON.parse(JSON.stringify(operation)));

    expect(applyTransforms(rows, [parsed]).rows).toEqual(expected);
  });

  it('executes density with numeric output and a declared sampling extent', () => {
    const operation = TransformSchema.parse({
      kind: 'density',
      params: {
        field: 'value',
        bandwidth: { kind: 'value', value: 1 },
        sampleCount: 2,
        extent: [0, 2],
        xAs: 'sample',
        densityAs: 'density',
      },
    });
    const rows = applyTransforms([{ value: 0 }, { value: 2 }], [operation]).rows;

    expect(rows.map(row => row.sample)).toEqual([0, 2]);
    expect(rows[0].density).toBeCloseTo(0.226466623, 8);
    expect(rows[1].density).toBeCloseTo(0.226466623, 8);
  });

  it('validates built-in config instead of accepting it as an external operation', () => {
    expect(TransformSchema.safeParse({ kind: 'stack', params: {} }).success).toBe(false);
    expect(
      TransformSchema.safeParse({ kind: 'density', params: { field: 'value', xAs: 'same', densityAs: 'same' } })
        .success,
    ).toBe(false);
    expect(
      TransformSchema.parse({ kind: 'custom.result', params: { field: 'value', nested: { enabled: true } } }),
    ).toEqual({
      kind: 'custom.result',
      params: {
        field: 'value',
        nested: { enabled: true },
      },
    });
  });

  it('reports invalid numeric transform input as a data error', () => {
    expect(() => applyTransforms([{ value: -1 }], [{ kind: 'normalize', params: { field: 'value' } }]).rows).toThrow(
      RetikzDataError,
    );
  });
});
