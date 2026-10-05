import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import {
  GraphicColorSchema,
  GraphicElementOpacitySchema,
  GraphicFillSchema,
  GraphicStrokeSchema,
  StrokeCapJoinSchema,
  TextLayoutSchema,
  TextVisualSchema,
} from '../../src';

describe('independent visual contracts', () => {
  it('keeps paint targets and their opacity independent', () => {
    expect(GraphicColorSchema.parse({ color: 'red' })).toEqual({ color: 'red' });
    expect(GraphicColorSchema.safeParse({ color: 0.5 }).success).toBe(false);
    expect(GraphicColorSchema.safeParse({ opacity: 0.5 }).success).toBe(false);
    expect(GraphicElementOpacitySchema.parse({ opacity: 0 })).toEqual({ opacity: 0 });
    expect(GraphicElementOpacitySchema.safeParse({ opacity: 1.1 }).success).toBe(false);
    expect(GraphicFillSchema.parse({ fill: 0.5, fillOpacity: 0 })).toEqual({ fill: 0.5, fillOpacity: 0 });
    expect(GraphicStrokeSchema.parse({ stroke: 'none', strokeOpacity: 1 })).toEqual({
      stroke: 'none',
      strokeOpacity: 1,
    });
    expect(GraphicStrokeSchema.safeParse({ fill: 'red' }).success).toBe(false);
    expect(GraphicFillSchema.safeParse({ stroke: 'red' }).success).toBe(false);
  });

  it('composes sparse text and geometry without admitting unrelated fields', () => {
    const schema = strictObject({
      ...GraphicFillSchema.shape,
      ...GraphicStrokeSchema.shape,
      ...TextVisualSchema.shape,
      ...StrokeCapJoinSchema.shape,
    });
    const value = { fill: 'white', textColor: 'contrast', font: { size: 12 }, lineJoin: 'round' };

    expect(schema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
    expect(schema.parse({})).toEqual({});
    expect(schema.safeParse({ zIndex: 2 }).success).toBe(false);
    expect(schema.safeParse({ opacity: 0.5 }).success).toBe(false);
    expect(schema.safeParse({ lineCap: 'invalid' }).success).toBe(false);
    expect(TextVisualSchema.safeParse({ align: 'middle' }).success).toBe(false);
    expect(TextLayoutSchema.parse({ align: 'middle', maxTextWidth: 10 })).toEqual({
      align: 'middle',
      maxTextWidth: 10,
    });
    expect(TextLayoutSchema.safeParse({ lineHeight: 0 }).success).toBe(false);
    expect(TextLayoutSchema.safeParse({ maxTextWidth: 0 }).success).toBe(false);
  });
});
