import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';
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
  PatternShape,
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

describe('Core registry-backed open string schemas', () => {
  it('exposes built-in shape vocabularies without closing custom names', () => {
    expectOpenStringSchema(ShapeNameSchema, Object.values(BuiltinShape));
    expectOpenStringSchema(ArrowShapeSchema, Object.values(BuiltinArrowShape));
    expectOpenStringSchema(PatternShapeNameSchema, Object.values(PatternShape));

    expect(ShapeNameSchema.parse('custom.shape')).toBe('custom.shape');
    expect(ArrowShapeSchema.parse('custom.arrow')).toBe('custom.arrow');
    expect(PatternShapeNameSchema.parse('custom.pattern')).toBe('custom.pattern');
    expect(() => ShapeNameSchema.parse('   ')).toThrow();
  });

  it('uses open built-in hints in nested provider-backed fields', () => {
    expect(BoundarySchema.parse('custom.boundary')).toBe('custom.boundary');
    expect(EasingSchema.parse('custom.easing')).toBe('custom.easing');
    expect(AnchorRefSchema.parse('custom.anchor')).toBe('custom.anchor');
    expect(PathStructureSchema.parse({ type: 'path', kind: 'custom.path-kind' })).toEqual({
      type: 'path',
      kind: 'custom.path-kind',
    });
    expect(
      AnimationTrackSchema.parse({
        property: 'custom.property',
        keyframes: [{ at: 0, value: { enabled: true } }],
        duration: 100,
      }),
    ).toMatchObject({ property: 'custom.property' });

    expect(() => BoundarySchema.parse('   ')).toThrow();
    expect(() => EasingSchema.parse('   ')).toThrow();
    expect(() => AnchorRefSchema.parse('   ')).toThrow();
    expect(() => PathStructureSchema.parse({ type: 'path', kind: '   ' })).toThrow();
  });
});
