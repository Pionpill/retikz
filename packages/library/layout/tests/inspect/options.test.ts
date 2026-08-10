import { describe, expect, it } from 'vitest';

import {
  createLayoutInspectionSelection,
  FLEX_LAYOUT_INSPECT_PRESETS,
  FlexLayoutInspectOptionsInputSchema,
  FlexLayoutInspectOptionsSchema,
  GRID_LAYOUT_INSPECT_PRESETS,
  GRID_LAYOUT_INSPECTOR_KEY,
  GridLayoutInspectOptionsInputSchema,
  GridLayoutInspectOptionsSchema,
  OVERLAY_LAYOUT_INSPECT_PRESETS,
  OverlayLayoutInspectOptionsInputSchema,
  OverlayLayoutInspectOptionsSchema,
} from '../../src/inspect';

describe('Layout inspect options', () => {
  it('exposes described strict sparse schemas for every layout family', () => {
    const schemas = [
      FlexLayoutInspectOptionsInputSchema,
      GridLayoutInspectOptionsInputSchema,
      OverlayLayoutInspectOptionsInputSchema,
      FlexLayoutInspectOptionsSchema,
      GridLayoutInspectOptionsSchema,
      OverlayLayoutInspectOptionsSchema,
    ];

    expect(schemas.every(schema => typeof schema.description === 'string' && schema.description.length > 0)).toBe(true);
    expect(() => FlexLayoutInspectOptionsInputSchema.parse({ tracks: true })).toThrow();
    expect(() => GridLayoutInspectOptionsInputSchema.parse({ lines: true })).toThrow();
  });

  it('resolves shared and family options into frozen canonical values', () => {
    expect(FlexLayoutInspectOptionsSchema.parse({})).toEqual({
      bounds: { container: true, content: true, slot: true, allocation: true, visual: false },
      spacing: { padding: true, margin: true },
      overflow: true,
      alignmentGuides: true,
      labels: false,
      lines: true,
      gaps: true,
      distributedSpace: true,
    });
    expect(GridLayoutInspectOptionsSchema.parse({})).toMatchObject({
      tracks: true,
      cells: false,
      gaps: true,
      spans: true,
    });
    expect(OverlayLayoutInspectOptionsSchema.parse({})).toMatchObject({
      placements: true,
      anchors: true,
      stacking: false,
    });

    const options = FlexLayoutInspectOptionsSchema.parse({ spacing: { padding: false }, labels: true });
    expect(options.spacing.padding).toBe(false);
    expect(options.labels).toBe(true);
    expect(Object.isFrozen(options)).toBe(true);
    expect(Object.isFrozen(options.bounds)).toBe(true);
    expect(Object.isFrozen(options.spacing)).toBe(true);
  });

  it('provides recommended, all, and off presets for every layout family', () => {
    expect(FlexLayoutInspectOptionsSchema.parse(FLEX_LAYOUT_INSPECT_PRESETS.Recommended)).toMatchObject({
      bounds: { content: true, container: false, slot: false, allocation: false, visual: false },
      spacing: { padding: false, margin: false },
      overflow: false,
      alignmentGuides: false,
      labels: false,
      lines: true,
      gaps: true,
      distributedSpace: false,
    });
    expect(GridLayoutInspectOptionsSchema.parse(GRID_LAYOUT_INSPECT_PRESETS.Recommended)).toMatchObject({
      tracks: true,
      cells: false,
      gaps: true,
      distributedSpace: false,
      spans: false,
    });
    expect(OverlayLayoutInspectOptionsSchema.parse(OVERLAY_LAYOUT_INSPECT_PRESETS.Recommended)).toMatchObject({
      placements: false,
      anchors: false,
      stacking: false,
    });
    expect(FlexLayoutInspectOptionsSchema.parse(FLEX_LAYOUT_INSPECT_PRESETS.All)).toEqual({
      bounds: { container: true, content: true, slot: true, allocation: true, visual: true },
      spacing: { padding: true, margin: true },
      overflow: true,
      alignmentGuides: true,
      labels: true,
      lines: true,
      gaps: true,
      distributedSpace: true,
    });
    expect(GRID_LAYOUT_INSPECT_PRESETS.All).toMatchObject({ tracks: true, cells: true, spans: true });
    expect(OVERLAY_LAYOUT_INSPECT_PRESETS.All).toMatchObject({ placements: true, anchors: true, stacking: true });
    expect(FLEX_LAYOUT_INSPECT_PRESETS.Off).toBe(false);
    expect(GRID_LAYOUT_INSPECT_PRESETS.Off).toBe(false);
    expect(OVERLAY_LAYOUT_INSPECT_PRESETS.Off).toBe(false);
    expect(Object.isFrozen(FLEX_LAYOUT_INSPECT_PRESETS)).toBe(true);
  });

  it('accepts family-specific sparse options in the shared selection helper', () => {
    const selection = createLayoutInspectionSelection({
      inspector: GRID_LAYOUT_INSPECTOR_KEY,
      target: { kind: 'scene' },
      value: { tracks: true, spans: false },
    });

    expect(selection.rules[0]).toMatchObject({ value: { tracks: true, spans: false } });
  });
});
