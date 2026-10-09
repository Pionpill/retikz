import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import {
  BuiltinDataFieldFormat,
  BuiltinDataTransform,
  FieldFormatSchema,
  BuiltinReducerOperationKind,
  BuiltinSelectorOperationKind,
} from '../../src';
import {
  DataTransformKindSchema,
  ReducerOperationKindSchema,
  SelectorOperationKindSchema,
} from '../../src/schemas/transform';

describe('Data registry-backed open string schemas', () => {
  it('hints built-in formats while preserving custom provider names', () => {
    expect(toJSONSchema(FieldFormatSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(BuiltinDataFieldFormat) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(FieldFormatSchema.parse(BuiltinDataFieldFormat.NumberString)).toBe(BuiltinDataFieldFormat.NumberString);
    expect(FieldFormatSchema.parse('custom.currency')).toBe('custom.currency');
    expect(() => FieldFormatSchema.parse('   ')).toThrow();
  });

  it.each([
    ['transform', DataTransformKindSchema, Object.values(BuiltinDataTransform)],
    ['reducer', ReducerOperationKindSchema, Object.values(BuiltinReducerOperationKind)],
    ['selector', SelectorOperationKindSchema, Object.values(BuiltinSelectorOperationKind)],
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
