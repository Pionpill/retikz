import { ShapeNameSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import { ShapeChannelSchema } from '../../src/schemas/encoding';
import { ColorSchemeNameSchema, PlotColorScheme, PlotScale, PlotScaleTypeSchema } from '../../src/schemas/scale';
import { PlotTransform, PlotTransformKindSchema } from '../../src/schemas/transform';

describe('Plot registry-backed open string schemas', () => {
  it('hints built-in color schemes while preserving custom resolver names', () => {
    expect(toJSONSchema(ColorSchemeNameSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(PlotColorScheme) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(ColorSchemeNameSchema.parse(PlotColorScheme.Viridis)).toBe(PlotColorScheme.Viridis);
    expect(ColorSchemeNameSchema.parse('custom.brand')).toBe('custom.brand');
    expect(() => ColorSchemeNameSchema.parse('   ')).toThrow();
  });

  it('reuses the Core shape vocabulary for constant shape channels', () => {
    expect(ShapeChannelSchema.parse({ value: 'custom.glyph' })).toEqual({ value: 'custom.glyph' });
    expect(() => ShapeChannelSchema.parse({ value: '   ' })).toThrow();
    expect(toJSONSchema(ShapeNameSchema)).toMatchObject({ anyOf: expect.any(Array) });
  });

  it.each([
    ['transform', PlotTransformKindSchema, Object.values(PlotTransform)],
    ['scale', PlotScaleTypeSchema, Object.values(PlotScale)],
  ])('keeps %s provider keys open while retaining built-in hints', (_label, schema, builtins) => {
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
