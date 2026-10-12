import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import {
  BuiltinDataFieldFormat,
  BuiltinDataTransform,
  BuiltinReducerOperationKind,
  BuiltinSelectorOperationKind,
  FieldDefinitionSchema,
} from '../../src';
import { ExternalReducerOperationSchema, ReducerOperationSchema } from '../../src/operators/reducer';
import { ExternalSelectorOperationSchema, SelectorOperationSchema } from '../../src/operators/selector';
import { ExternalTransformSchema, TransformSchema } from '../../src/transform';

describe('Data registry-backed open string schemas', () => {
  it('hints built-in formats while preserving custom provider names', () => {
    expect(toJSONSchema(FieldDefinitionSchema.options[0]).properties?.format).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(BuiltinDataFieldFormat) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(FieldDefinitionSchema.parse({ name: 'value', format: BuiltinDataFieldFormat.NumberString }).format).toBe(
      BuiltinDataFieldFormat.NumberString,
    );
    expect(FieldDefinitionSchema.parse({ name: 'value', format: 'custom.currency' }).format).toBe('custom.currency');
    expect(() => FieldDefinitionSchema.parse({ name: 'value', format: '   ' })).toThrow();
  });

  it('keeps transform kinds open while retaining built-in hints', () => {
    expect(toJSONSchema(ExternalTransformSchema).properties?.kind).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(BuiltinDataTransform) },
        { type: 'string', minLength: 1 },
      ],
    });
    const custom = { kind: 'custom.operation', params: { parameter: 2 } };
    const builtin = { kind: 'sort', params: { field: 'value' } };
    expect(TransformSchema.parse(custom)).toEqual(custom);
    expect(TransformSchema.parse(builtin)).toMatchObject(builtin);
    expect(() => TransformSchema.parse({ kind: '   ', params: {} })).toThrow();
    expect(() => ExternalTransformSchema.parse(builtin)).toThrow();
  });

  it.each([
    [
      'reducer',
      ReducerOperationSchema,
      ExternalReducerOperationSchema,
      Object.values(BuiltinReducerOperationKind),
      { kind: 'count', as: 'count' },
    ],
    [
      'selector',
      SelectorOperationSchema,
      ExternalSelectorOperationSchema,
      Object.values(BuiltinSelectorOperationKind),
      { kind: 'first' },
    ],
  ] as const)(
    'validates built-in and custom %s operations through the complete schema',
    (_label, schema, externalSchema, builtins, builtin) => {
      expect(toJSONSchema(externalSchema).properties?.kind).toMatchObject({
        anyOf: [
          { type: 'string', enum: [...builtins] },
          { type: 'string', minLength: 1 },
        ],
      });
      const custom = { kind: 'custom.operation', parameter: 2 };
      expect(schema.parse(custom)).toEqual(custom);
      expect(schema.parse(builtin)).toMatchObject(builtin);
      expect(() => schema.parse({ kind: '   ' })).toThrow();
      expect(() => externalSchema.parse(builtin)).toThrow();
    },
  );
});
