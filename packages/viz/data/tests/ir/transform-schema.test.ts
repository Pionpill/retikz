import { describe, expect, it } from 'vitest';

import { TransformOperationSchema, TransformSchema } from '../../src';

describe('transform schema', () => {
  it('parses transform operation and survives JSON round-trip', () => {
    const operation = TransformOperationSchema.parse({ kind: 'sort', field: 'month', order: 'ascending' });

    expect(TransformOperationSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('rejects invalid built-in transform shape at schema boundary', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', field: '' })).toThrow();
  });
});
