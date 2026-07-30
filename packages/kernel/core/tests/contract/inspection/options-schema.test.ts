import { describe, expect, it } from 'vitest';

import {
  BaseLayoutInspectOptionsInputSchema,
  BaseLayoutInspectOptionsSchema,
  InspectOptionsInputSchema,
  InspectOptionsSchema,
  LayoutInspectBoundsOptionsInputSchema,
  mergeInspectOptions,
  resolveBaseLayoutInspectOptions,
} from '../../../src';

describe('layout inspection option schemas', () => {
  it('describes every public schema and authoring field for schema reference consumers', () => {
    const schemas = [
      LayoutInspectBoundsOptionsInputSchema,
      BaseLayoutInspectOptionsInputSchema,
      InspectOptionsInputSchema,
      BaseLayoutInspectOptionsSchema,
      InspectOptionsSchema,
    ];
    const fields = [
      ...Object.values(LayoutInspectBoundsOptionsInputSchema.shape),
      ...Object.values(BaseLayoutInspectOptionsInputSchema.shape),
      ...Object.values(InspectOptionsInputSchema.shape),
    ];

    expect(schemas.every(schema => typeof schema.description === 'string' && schema.description.length > 0)).toBe(true);
    expect(fields.every(field => typeof field.description === 'string' && field.description.length > 0)).toBe(true);
  });

  it('keeps admission sparse and rejects unknown keys', () => {
    expect(BaseLayoutInspectOptionsInputSchema.parse({ overflow: false })).toEqual({ overflow: false });
    expect(BaseLayoutInspectOptionsInputSchema.parse({ bounds: { visual: true } })).toEqual({
      bounds: { visual: true },
    });
    expect(() => BaseLayoutInspectOptionsInputSchema.parse({ gap: true })).toThrow();
    expect(() => BaseLayoutInspectOptionsInputSchema.parse({ bounds: { clip: true } })).toThrow();
    expect(InspectOptionsInputSchema.parse({ layout: true })).toEqual({ layout: true });
    expect(() => InspectOptionsInputSchema.parse({ layout: true, grids: true })).toThrow();
  });

  it('resolves the single canonical base and root defaults', () => {
    expect(BaseLayoutInspectOptionsSchema.parse({})).toEqual({
      bounds: {
        container: true,
        content: true,
        slot: true,
        allocation: true,
        visual: false,
      },
      overflow: true,
      alignmentGuides: true,
      labels: false,
    });
    expect(InspectOptionsSchema.parse({})).toEqual({ enabled: true, layout: false });
  });

  it('expands bounds booleans and merges sparse objects without clearing siblings', () => {
    expect(resolveBaseLayoutInspectOptions({ bounds: false })).toMatchObject({
      bounds: {
        container: false,
        content: false,
        slot: false,
        allocation: false,
        visual: false,
      },
    });
    expect(resolveBaseLayoutInspectOptions({ bounds: true })).toMatchObject({
      bounds: {
        container: true,
        content: true,
        slot: true,
        allocation: true,
        visual: false,
      },
    });
    expect(resolveBaseLayoutInspectOptions({ bounds: { visual: true } })).toMatchObject({
      bounds: {
        container: true,
        content: true,
        slot: true,
        allocation: true,
        visual: true,
      },
    });
  });

  it('lets descendants override layout false but not an enabled false barrier', () => {
    expect(mergeInspectOptions({ layout: true }, { layout: false })).toEqual({ layout: false });
    expect(mergeInspectOptions({ layout: false }, { layout: true })).toEqual({ layout: true });
    expect(mergeInspectOptions({ enabled: false }, { layout: true })).toEqual({ enabled: false });
  });
});
