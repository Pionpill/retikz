import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import {
  DataFieldFormat,
  DataTransform,
  DataTransformKindSchema,
  FieldFormatSchema,
  ReducerOperationKind,
  ReducerOperationKindSchema,
  SelectorOperationKind,
  SelectorOperationKindSchema,
} from '../../src';

describe('Data registry-backed open string schemas', () => {
  it('hints built-in formats while preserving custom provider names', () => {
    expect(toJSONSchema(FieldFormatSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(DataFieldFormat) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(FieldFormatSchema.parse(DataFieldFormat.NumberString)).toBe(DataFieldFormat.NumberString);
    expect(FieldFormatSchema.parse('custom.currency')).toBe('custom.currency');
    expect(() => FieldFormatSchema.parse('   ')).toThrow();
  });

  it.each([
    ['transform', DataTransformKindSchema, Object.values(DataTransform)],
    ['reducer', ReducerOperationKindSchema, Object.values(ReducerOperationKind)],
    ['selector', SelectorOperationKindSchema, Object.values(SelectorOperationKind)],
  ])('keeps %s operation kinds open while retaining built-in hints', (_label, schema, builtins) => {
    expect(toJSONSchema(schema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: builtins },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(schema.parse('custom.operation')).toBe('custom.operation');
    expect(() => schema.parse('   ')).toThrow();
  });
});
