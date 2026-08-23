import { ShapeNameSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ShapeChannelSchema } from '../../src/schemas/encoding';
import { ColorSchemeNameSchema, PlotColorScheme } from '../../src/schemas/scale';

describe('Plot registry-backed open string schemas', () => {
  it('hints built-in color schemes while preserving custom resolver names', () => {
    expect(z.toJSONSchema(ColorSchemeNameSchema)).toMatchObject({
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
    expect(z.toJSONSchema(ShapeNameSchema)).toMatchObject({ anyOf: expect.any(Array) });
  });
});
