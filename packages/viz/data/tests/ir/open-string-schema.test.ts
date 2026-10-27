import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import { BuiltinDataFieldFormat, BuiltinDataTransform, FieldDefinitionSchema } from '../../src';
import { ReducerOperationSchema } from '../../src/operators/reducer';
import { SelectorOperationSchema } from '../../src/operators/selector';
import { ExternalTransformSchema, TransformSchema } from '../../src/transform';

describe('数据注册表支持的开放字符串 schema', () => {
  it('提示内置格式，同时保留自定义提供者名称', () => {
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

  it('保持变换类型打开，同时保留内置提示', () => {
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
    ['reducer', ReducerOperationSchema, { kind: 'count', as: 'count' }],
    ['selector', SelectorOperationSchema, { kind: 'first' }],
  ] as const)('通过完整 schema 验证内置和自定义 %s 操作', (_label, schema, builtin) => {
    const custom = { kind: 'custom.operation', parameter: 2 };
    expect(schema.parse(custom)).toEqual(custom);
    expect(schema.parse(builtin)).toMatchObject(builtin);
    expect(() => schema.parse({ kind: '   ' })).toThrow();
  });
});
