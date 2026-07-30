import { describe, expect, it } from 'vitest';

import {
  FlexLayoutInspectLocalOptionsSchema,
  FlexLayoutInspectOptionsInputSchema,
  GridLayoutInspectLocalOptionsSchema,
  GridLayoutInspectOptionsInputSchema,
  OverlayLayoutInspectLocalOptionsSchema,
  OverlayLayoutInspectOptionsInputSchema,
} from '../../src';

describe('Standard layout inspection options', () => {
  it('inherits the Core Base fields while keeping family admission sparse and strict', () => {
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
    expect(FlexLayoutInspectLocalOptionsSchema.parse({})).toEqual({ lines: true, gaps: true });
    expect(GridLayoutInspectLocalOptionsSchema.parse({})).toEqual({
      tracks: true,
      cells: false,
      gaps: true,
      spans: true,
    });
    expect(OverlayLayoutInspectLocalOptionsSchema.parse({})).toEqual({
      placements: true,
      anchors: true,
      stacking: false,
    });
  });
});
