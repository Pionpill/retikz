import { ShapeNameSchema } from '@retikz/core';
import { BuiltinDataTransform, ExternalTransformSchema } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import { PointPropertiesSchema } from '../../src/schemas';
import {
  ColorSchemeNameSchema,
  BuiltinPlotColorScheme,
  BuiltinPlotScale,
  PlotScaleTypeSchema,
} from '../../src/schemas/scale';

describe('Plot 注册表支持的开放字符串 schema', () => {
  it('提示内置配色方案，同时保留自定义解析器名称', () => {
    expect(toJSONSchema(ColorSchemeNameSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(BuiltinPlotColorScheme) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(ColorSchemeNameSchema.parse(BuiltinPlotColorScheme.Viridis)).toBe(BuiltinPlotColorScheme.Viridis);
    expect(ColorSchemeNameSchema.parse('custom.brand')).toBe('custom.brand');
    expect(() => ColorSchemeNameSchema.parse('   ')).toThrow();
  });

  it('重复使用 Core 形状词汇来固定形状属性', () => {
    expect(PointPropertiesSchema.parse({ shape: 'custom.glyph' }).shape).toBe('custom.glyph');
    expect(() => PointPropertiesSchema.parse({ shape: '   ' })).toThrow();
    expect(toJSONSchema(ShapeNameSchema)).toMatchObject({ anyOf: expect.any(Array) });
  });

  it.each([
    ['transform', ExternalTransformSchema.shape.kind, Object.values(BuiltinDataTransform)],
    ['scale', PlotScaleTypeSchema, Object.values(BuiltinPlotScale)],
  ])('保持 %s 提供者键打开，同时保留内置提示', (_label, schema, builtins) => {
    expect(toJSONSchema(schema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: expect.arrayContaining(builtins) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(schema.parse('custom.operation')).toBe('custom.operation');
    expect(() => schema.parse('   ')).toThrow();
  });
});
