import { describe, expect, it } from 'vitest';

import {
  LegendArtifactGeometrySchema,
  LegendArtifactSchema,
  LegendItemsArtifactSchema,
  LegendPlacedChildArtifactSchema,
  LegendRampArtifactSchema,
} from '../../src/presentation/legend/schema';

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

describe('Legend 产物 schema', () => {
  it('解析严格的规范项产物并从 schema 中派生公共类型', () => {
    const parsed = LegendArtifactSchema.parse(itemsArtifact);

    expect(parsed).toEqual(itemsArtifact);
  });

  it('拒绝公共产物契约之外的根、几何图形和放置子字段', () => {
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

  it('将项目标识保留在可重用子几何体之外，并保留可为空的可见边界', () => {
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

  it('拒绝重复的项目键和不连续的项目源顺序', () => {
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

  it('在没有域负载的情况下解析斜坡锚点和刻度标识', () => {
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
    expect(parsed.ticks.map(tick => tick.key)).toEqual(['low', 'high']);
    expect(LegendRampArtifactSchema.safeParse({ ...ramp, field: 'revenue' }).success).toBe(false);
    expect(
      LegendRampArtifactSchema.safeParse({
        ...ramp,
        ticks: [{ ...ramp.ticks[0], anchor: { x: 0, y: 8, value: 0 } }],
      }).success,
    ).toBe(false);
  });

  it('拒绝重复的刻度键和不连续的刻度源顺序', () => {
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
