import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  LegendArtifact,
  LegendArtifactGeometry,
  LegendItemsArtifact,
  LegendPlacedChildArtifact,
  LegendRampArtifact,
} from '../../src/composites/legend/artifact-types';

import {
  LegendArtifactGeometrySchema,
  LegendArtifactSchema,
  LegendItemsArtifactSchema,
  LegendPlacedChildArtifactSchema,
  LegendRampArtifactSchema,
} from '../../src/composites/legend/artifact-schema';

const rect = { x: 0, y: 0, width: 10, height: 8 } as const;
const geometry = { allocationBounds: rect, visualBounds: rect, visibleBounds: rect } as const;
const placed = {
  ...geometry,
  slotBounds: rect,
  translation: { x: 0, y: 0 },
  overflow: {
    allocation: { x: false, y: false },
    visual: { x: false, y: false },
    clipped: false,
  },
} as const;
const container = {
  allocationBounds: rect,
  contentBounds: rect,
  visualBounds: rect,
  visibleBounds: rect,
} as const;
const itemsArtifact = {
  kind: 'items',
  container,
  title: null,
  bodyBounds: null,
  items: [],
} as const;

describe('Legend artifact schema', () => {
  it('parses the strict canonical items artifact and derives public types from the schemas', () => {
    const parsed = LegendArtifactSchema.parse(itemsArtifact);

    expect(parsed).toEqual(itemsArtifact);
    expectTypeOf(parsed).toEqualTypeOf<LegendArtifact>();
    expectTypeOf(LegendItemsArtifactSchema.parse(itemsArtifact)).toEqualTypeOf<LegendItemsArtifact>();
    expectTypeOf(LegendArtifactGeometrySchema.parse(geometry)).toEqualTypeOf<LegendArtifactGeometry>();
    expectTypeOf(LegendPlacedChildArtifactSchema.parse(placed)).toEqualTypeOf<LegendPlacedChildArtifact>();
  });

  it('rejects root, geometry, and placed-child fields outside the public artifact contract', () => {
    expect(LegendArtifactSchema.safeParse({ ...itemsArtifact, extra: true }).success).toBe(false);
    expect(LegendArtifactGeometrySchema.safeParse({ ...geometry, slotBounds: rect }).success).toBe(false);
    expect(LegendPlacedChildArtifactSchema.safeParse({ ...placed, key: 'private' }).success).toBe(false);
    expect(LegendPlacedChildArtifactSchema.safeParse({ ...placed, sourceIndex: 0 }).success).toBe(false);
    expect(LegendPlacedChildArtifactSchema.safeParse({ ...placed, marginBounds: rect }).success).toBe(false);
    expect(
      LegendPlacedChildArtifactSchema.safeParse({
        ...placed,
        alignmentGuide: { name: 'first-baseline', position: 4, fallback: false },
      }).success,
    ).toBe(false);
  });

  it('keeps item identity outside reusable child geometry and preserves nullable visible bounds', () => {
    const parsed = LegendItemsArtifactSchema.parse({
      ...itemsArtifact,
      bodyBounds: rect,
      items: [
        {
          key: 'item',
          sourceIndex: 0,
          geometry: { ...geometry, visibleBounds: null },
          sample: { ...placed, visibleBounds: null },
          label: null,
        },
      ],
    });

    expect(parsed.items[0]?.key).toBe('item');
    expect(parsed.items[0]?.geometry.visibleBounds).toBeNull();
    expect(parsed.items[0]?.sample.visibleBounds).toBeNull();
    expect(parsed.items[0]?.label).toBeNull();
  });

  it('rejects duplicate item keys and non-contiguous item source order', () => {
    const item = {
      key: 'item',
      sourceIndex: 0,
      geometry,
      sample: placed,
      label: null,
    } as const;

    expect(
      LegendItemsArtifactSchema.safeParse({
        ...itemsArtifact,
        bodyBounds: rect,
        items: [item, { ...item, sourceIndex: 1 }],
      }).success,
    ).toBe(false);
    expect(
      LegendItemsArtifactSchema.safeParse({
        ...itemsArtifact,
        bodyBounds: rect,
        items: [{ ...item, sourceIndex: 1 }],
      }).success,
    ).toBe(false);
  });

  it('parses ramp anchors and tick identity without domain payload', () => {
    const ramp = {
      kind: 'ramp',
      container,
      title: null,
      bodyBounds: rect,
      sample: placed,
      ticks: [
        { key: 'low', sourceIndex: 0, anchor: { x: 0, y: 8 }, label: null },
        { key: 'high', sourceIndex: 1, anchor: { x: 10, y: 8 }, label: placed },
      ],
    } as const;
    const parsed = LegendRampArtifactSchema.parse(ramp);

    expect(LegendArtifactSchema.parse(ramp)).toEqual(ramp);
    expectTypeOf(parsed).toEqualTypeOf<LegendRampArtifact>();
    expect(parsed.ticks.map(tick => tick.key)).toEqual(['low', 'high']);
    expect(LegendRampArtifactSchema.safeParse({ ...ramp, field: 'revenue' }).success).toBe(false);
    expect(
      LegendRampArtifactSchema.safeParse({
        ...ramp,
        ticks: [{ ...ramp.ticks[0], anchor: { x: 0, y: 8, value: 0 } }],
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate tick keys and non-contiguous tick source order', () => {
    const tick = { key: 'tick', sourceIndex: 0, anchor: { x: 0, y: 8 }, label: null } as const;
    const ramp = {
      kind: 'ramp',
      container,
      title: null,
      bodyBounds: rect,
      sample: placed,
      ticks: [tick, { ...tick, sourceIndex: 1 }],
    } as const;

    expect(LegendRampArtifactSchema.safeParse(ramp).success).toBe(false);
    expect(
      LegendRampArtifactSchema.safeParse({
        ...ramp,
        ticks: [{ ...tick, sourceIndex: 1 }],
      }).success,
    ).toBe(false);
  });
});
