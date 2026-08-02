import { describe, expect, it } from 'vitest';

import {
  FlexLayoutInspectLocalOptionsInputSchema,
  FlexLayoutInspectLocalOptionsSchema,
  FlexLayoutInspectOptionsInputSchema,
  GridLayoutInspectLocalOptionsInputSchema,
  GridLayoutInspectLocalOptionsSchema,
  GridLayoutInspectOptionsInputSchema,
  OverlayLayoutInspectLocalOptionsInputSchema,
  OverlayLayoutInspectLocalOptionsSchema,
  OverlayLayoutInspectOptionsInputSchema,
} from '../../src';

describe('Standard layout inspection options', () => {
  it('describes every public family option schema for schema reference consumers', () => {
    const schemas = [
      FlexLayoutInspectLocalOptionsInputSchema,
      GridLayoutInspectLocalOptionsInputSchema,
      OverlayLayoutInspectLocalOptionsInputSchema,
      FlexLayoutInspectOptionsInputSchema,
      GridLayoutInspectOptionsInputSchema,
      OverlayLayoutInspectOptionsInputSchema,
      FlexLayoutInspectLocalOptionsSchema,
      GridLayoutInspectLocalOptionsSchema,
      OverlayLayoutInspectLocalOptionsSchema,
    ];

    expect(schemas.every(schema => typeof schema.description === 'string' && schema.description.length > 0)).toBe(true);
  });

  it('inherits the Core Base fields while keeping family admission sparse and strict', () => {
    expect(
      FlexLayoutInspectOptionsInputSchema.safeParse({
        spacing: { padding: false },
        overflow: false,
        lines: false,
        distributedSpace: false,
      }),
    ).toMatchObject({
      success: true,
      data: {
        spacing: { padding: false },
        distributedSpace: false,
      },
    });
    expect(FlexLayoutInspectOptionsInputSchema.parse({ overflow: false, lines: false })).toEqual({
      overflow: false,
      lines: false,
    });
    expect(GridLayoutInspectOptionsInputSchema.parse({ bounds: { visual: true }, cells: true })).toEqual({
      bounds: { visual: true },
      cells: true,
    });
    expect(OverlayLayoutInspectOptionsInputSchema.parse({ labels: true, anchors: false })).toEqual({
      labels: true,
      anchors: false,
    });
    expect(() => FlexLayoutInspectOptionsInputSchema.parse({ tracks: true })).toThrow();
    expect(() => GridLayoutInspectOptionsInputSchema.parse({ lines: true })).toThrow();
  });

  it('resolves the frozen family canonical defaults', () => {
    expect(FlexLayoutInspectLocalOptionsSchema.parse({})).toEqual({
      lines: true,
      gaps: true,
      distributedSpace: true,
    });
    expect(GridLayoutInspectLocalOptionsSchema.parse({})).toEqual({
      tracks: true,
      cells: false,
      gaps: true,
      distributedSpace: true,
      spans: true,
    });
    expect(OverlayLayoutInspectLocalOptionsSchema.parse({})).toEqual({
      placements: true,
      anchors: true,
      stacking: false,
    });
  });
});
