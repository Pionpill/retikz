import { describe, expect, it } from 'vitest';

import {
  BaseLayoutInspectOptionsInputSchema,
  BaseLayoutInspectOptionsSchema,
  InspectOptionsInputSchema,
  InspectOptionsSchema,
  resolveBaseLayoutInspectOptions,
} from '../../../src';

describe('layout inspection option schemas', () => {
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
});
