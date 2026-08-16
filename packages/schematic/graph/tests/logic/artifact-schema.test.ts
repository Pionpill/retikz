import { beforeEach, describe, expect, it } from 'vitest';

import { ContainerLayoutItemArtifactSchema, ContainerOuterArtifactSchema } from '../../src';

const rect = (x = 0, y = 0, width = 10, height = 10) => ({ x, y, width, height });

const item = {
  marginBounds: rect(0, 0, 24, 24),
  slotBounds: rect(2, 2, 20, 20),
  allocationBounds: rect(4, 4, 16, 16),
  visualBounds: rect(4, 4, 16, 16),
  visibleBounds: rect(4, 4, 16, 16),
  translation: { x: 4, y: 4 },
  overflow: {
    allocation: { x: false, y: false },
    visual: { x: false, y: false },
    clipped: false,
  },
};

const zeroItem = {
  marginBounds: rect(0, 0, 0, 0),
  slotBounds: rect(0, 0, 0, 0),
  allocationBounds: rect(0, 0, 0, 0),
  visualBounds: rect(0, 0, 0, 0),
  visibleBounds: null,
  translation: { x: 0, y: 0 },
  overflow: {
    allocation: { x: false, y: false },
    visual: { x: false, y: false },
    clipped: false,
  },
};

describe('logic artifact schemas', () => {
  beforeEach(() => {
    expect(ContainerOuterArtifactSchema).toBeDefined();
    expect(ContainerLayoutItemArtifactSchema).toBeDefined();
  });

  it('parses strict outer and content placement artifacts and survives JSON round-trip', () => {
    const outer = {
      allocationBounds: rect(0, 0, 120, 80),
      shellVisualBounds: rect(1, 1, 118, 78),
      visualBounds: rect(0, 0, 120, 80),
      visibleBounds: rect(0, 0, 120, 80),
    };

    expect(ContainerOuterArtifactSchema.parse(outer)).toEqual(outer);
    expect(ContainerLayoutItemArtifactSchema.parse(item)).toEqual(item);
    expect(ContainerOuterArtifactSchema.parse(JSON.parse(JSON.stringify(outer)))).toEqual(outer);
    expect(ContainerLayoutItemArtifactSchema.parse(JSON.parse(JSON.stringify(item)))).toEqual(item);
  });

  it('accepts canonical zero geometry and null visibility without inventing positive bounds', () => {
    const outer = {
      allocationBounds: rect(0, 0, 0, 0),
      shellVisualBounds: null,
      visualBounds: rect(0, 0, 0, 0),
      visibleBounds: null,
    };

    expect(ContainerOuterArtifactSchema.parse(outer)).toEqual(outer);
    expect(ContainerLayoutItemArtifactSchema.parse(zeroItem)).toEqual(zeroItem);
  });

  it('keeps authored identity outside the generic item placement artifact', () => {
    expect(() => ContainerLayoutItemArtifactSchema.parse({ ...item, key: 'content' })).toThrow();
    expect(() => ContainerLayoutItemArtifactSchema.parse({ ...item, sourceIndex: 0 })).toThrow();
  });

  it('rejects unknown artifact fields instead of silently widening the JSON contract', () => {
    expect(() =>
      ContainerOuterArtifactSchema.parse({
        allocationBounds: rect(0, 0, 20, 20),
        shellVisualBounds: null,
        visualBounds: rect(0, 0, 20, 20),
        visibleBounds: null,
        extra: true,
      }),
    ).toThrow();
    expect(() => ContainerLayoutItemArtifactSchema.parse({ ...item, extra: true })).toThrow();
    expect(() =>
      ContainerLayoutItemArtifactSchema.parse({ ...item, overflow: { ...item.overflow, extra: true } }),
    ).toThrow();
  });

  it('rejects negative or non-finite rectangles and translations at their authored geometry fields', () => {
    expect(() =>
      ContainerOuterArtifactSchema.parse({
        allocationBounds: rect(0, 0, -1, 10),
        shellVisualBounds: null,
        visualBounds: rect(0, 0, 0, 0),
        visibleBounds: null,
      }),
    ).toThrow();
    expect(() =>
      ContainerOuterArtifactSchema.parse({
        allocationBounds: rect(0, 0, 10, 10),
        shellVisualBounds: rect(0, 0, Number.NaN, 10),
        visualBounds: rect(0, 0, 0, 0),
        visibleBounds: null,
      }),
    ).toThrow();
    expect(() =>
      ContainerLayoutItemArtifactSchema.parse({ ...item, translation: { x: Number.POSITIVE_INFINITY, y: 0 } }),
    ).toThrow();
    expect(() =>
      ContainerLayoutItemArtifactSchema.parse({ ...item, visualBounds: rect(0, 0, 10, Number.NEGATIVE_INFINITY) }),
    ).toThrow();
  });

  it('rejects null allocation or visual geometry while retaining null only for optional visibility', () => {
    expect(() =>
      ContainerOuterArtifactSchema.parse({
        allocationBounds: null,
        shellVisualBounds: null,
        visualBounds: rect(0, 0, 0, 0),
        visibleBounds: null,
      }),
    ).toThrow();
    expect(() =>
      ContainerOuterArtifactSchema.parse({
        allocationBounds: rect(0, 0, 0, 0),
        shellVisualBounds: null,
        visualBounds: null,
        visibleBounds: null,
      }),
    ).toThrow();
    expect(() => ContainerLayoutItemArtifactSchema.parse({ ...zeroItem, allocationBounds: null })).toThrow();
  });
});
