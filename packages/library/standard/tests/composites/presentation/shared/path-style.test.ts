import { describe, expect, it } from 'vitest';

import { StandardPathBorderStyleSchema, StandardPathStrokeStyleSchema } from '../../../../src';

describe('Standard presentation path style fragments', () => {
  it('keeps the existing stroke style field set and constraints', () => {
    const value = {
      color: 'red',
      stroke: '#111827',
      strokeWidth: 2,
      dashPattern: [4, 2],
      dashOffset: -1,
      lineCap: 'round' as const,
      lineJoin: 'bevel' as const,
      opacity: 0.8,
      strokeOpacity: 0.6,
      zIndex: 3,
    };

    expect(StandardPathStrokeStyleSchema.parse(value)).toEqual(value);
    expect(StandardPathStrokeStyleSchema.safeParse({ fill: 'blue' }).success).toBe(false);
    expect(StandardPathStrokeStyleSchema.safeParse({ ...value, roundedCorners: 2 }).success).toBe(false);
    expect(StandardPathStrokeStyleSchema.safeParse({ ...value, strokeWidth: -1 }).success).toBe(false);
    expect(StandardPathStrokeStyleSchema.safeParse({ ...value, dashPattern: [] }).success).toBe(false);
    expect(StandardPathStrokeStyleSchema.safeParse({ ...value, unknown: true }).success).toBe(false);
  });

  it('adds only fill semantics to the border composite and remains strict', () => {
    const value = {
      color: 'red',
      stroke: '#111827',
      strokeWidth: 2,
      fill: '#fee2e2',
      fillOpacity: 0.4,
      fillRule: 'evenodd' as const,
      zIndex: 1,
    };

    expect(StandardPathBorderStyleSchema.parse(value)).toEqual(value);
    expect(StandardPathBorderStyleSchema.safeParse({ fill: 'red', fillRule: 'evenodd' }).success).toBe(true);
    expect(StandardPathBorderStyleSchema.safeParse({ ...value, rotate: 15 }).success).toBe(false);
    expect(StandardPathBorderStyleSchema.safeParse({ ...value, zIndex: 1.5 }).success).toBe(false);
  });

  it('round-trips Standard path style through JSON', () => {
    const value = { stroke: 'teal', strokeWidth: 1.5, opacity: 0.7, zIndex: 2 };

    expect(StandardPathStrokeStyleSchema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
    expect(StandardPathBorderStyleSchema.parse(JSON.parse(JSON.stringify({ ...value, fill: 'white' })))).toEqual({
      ...value,
      fill: 'white',
    });
  });
});
