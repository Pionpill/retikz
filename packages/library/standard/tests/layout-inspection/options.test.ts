import { describe, expect, it } from 'vitest';

import {
  FlexLayoutInspectOptionsInputSchema,
  FlexLayoutInspectOptionsSchema,
  GridLayoutInspectOptionsInputSchema,
  GridLayoutInspectOptionsSchema,
  OverlayLayoutInspectOptionsInputSchema,
  OverlayLayoutInspectOptionsSchema,
} from '../../src';

describe('Standard layout inspection options', () => {
  it('describes every public family option schema for schema reference consumers', () => {
    const schemas = [
      FlexLayoutInspectOptionsInputSchema,
      GridLayoutInspectOptionsInputSchema,
      OverlayLayoutInspectOptionsInputSchema,
      FlexLayoutInspectOptionsSchema,
      GridLayoutInspectOptionsSchema,
      OverlayLayoutInspectOptionsSchema,
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

  it('resolves shared and family fields into one frozen canonical options object', () => {
    const flex = FlexLayoutInspectOptionsSchema.parse({});
    expect(flex).toEqual({
      bounds: { container: true, content: true, slot: true, allocation: true, visual: false },
      spacing: { padding: true, margin: true },
      overflow: true,
      alignmentGuides: true,
      labels: false,
      lines: true,
      gaps: true,
      distributedSpace: true,
    });
    expect(Object.isFrozen(flex)).toBe(true);
    expect(Object.isFrozen(flex.bounds)).toBe(true);
    expect(Object.isFrozen(flex.spacing)).toBe(true);

    expect(GridLayoutInspectOptionsSchema.parse({})).toEqual({
      bounds: { container: true, content: true, slot: true, allocation: true, visual: false },
      spacing: { padding: true, margin: true },
      overflow: true,
      alignmentGuides: true,
      labels: false,
      tracks: true,
      cells: false,
      gaps: true,
      distributedSpace: true,
      spans: true,
    });
    expect(OverlayLayoutInspectOptionsSchema.parse({})).toEqual({
      bounds: { container: true, content: true, slot: true, allocation: true, visual: false },
      spacing: { padding: true, margin: true },
      overflow: true,
      alignmentGuides: true,
      labels: false,
      placements: true,
      anchors: true,
      stacking: false,
    });
  });
});
