import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import { toJSONSchema } from 'zod';

import {
  AnchorRefSchema,
  AnimationTrackSchema,
  ArrowShapeSchema,
  BoundarySchema,
  BuiltinArrowShape,
  BuiltinShape,
  EasingSchema,
  PathStructureSchema,
  BuiltinPatternShape,
  PatternShapeNameSchema,
  ShapeNameSchema,
} from '../../src';

const expectOpenStringSchema = (schema: ZodType, values: ReadonlyArray<string>): void => {
  expect(toJSONSchema(schema)).toMatchObject({
    anyOf: [
      { type: 'string', enum: values },
      { type: 'string', minLength: 1 },
    ],
  });
};

describe('Core 注册表支持的开放字符串 schema', () => {
  it('公开内置形状词汇表而不关闭自定义名称', () => {
    expectOpenStringSchema(ShapeNameSchema, Object.values(BuiltinShape));
    expectOpenStringSchema(ArrowShapeSchema, Object.values(BuiltinArrowShape));
    expectOpenStringSchema(PatternShapeNameSchema, Object.values(BuiltinPatternShape));

    expect(ShapeNameSchema.parse('custom.shape')).toBe('custom.shape');
    expect(ArrowShapeSchema.parse('custom.arrow')).toBe('custom.arrow');
    expect(PatternShapeNameSchema.parse('custom.pattern')).toBe('custom.pattern');
    expect(() => ShapeNameSchema.parse('   ')).toThrow();
  });

  it('在嵌套提供者支持的字段中使用开放的内置提示', () => {
    expect(BoundarySchema.parse('custom.boundary')).toBe('custom.boundary');
    expect(() => EasingSchema.parse('custom.easing')).toThrow();
    expect(AnchorRefSchema.parse('custom.anchor')).toBe('custom.anchor');
    expect(PathStructureSchema.parse({ type: 'path', kind: 'custom.path-definition' })).toEqual({
      type: 'path',
      kind: 'custom.path-definition',
    });
    expect(() =>
      AnimationTrackSchema.parse({
        property: 'custom.property',
        keyframes: [{ at: 0, value: { enabled: true } }],
        duration: 100,
      }),
    ).toThrow();

    expect(() => BoundarySchema.parse('   ')).toThrow();
    expect(() => EasingSchema.parse('   ')).toThrow();
    expect(() => AnchorRefSchema.parse('   ')).toThrow();
    expect(() => PathStructureSchema.parse({ type: 'path', kind: '   ' })).toThrow();
  });
});
