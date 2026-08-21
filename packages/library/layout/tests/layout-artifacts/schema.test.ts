import { describe, expect, it } from 'vitest';

import type {
  FlexLayoutArtifact,
  GridLayoutArtifact,
  LayoutArtifact,
  LayoutArtifactContainer,
  LayoutArtifactItemBase,
  LayoutSpacingArtifact,
  OverlayLayoutArtifact,
} from '../../src';

import {
  FlexLayoutArtifactSchema,
  GridLayoutArtifactSchema,
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutArtifactSchema,
  LayoutSpacingArtifactSchema,
  OverlayLayoutArtifactSchema,
} from '../../src';

const rect = (x = 0, y = 0, width = 10, height = 10) => ({ x, y, width, height });

const container = {
  allocationBounds: rect(0, 0, 100, 60),
  contentBounds: rect(5, 5, 90, 50),
  visualBounds: rect(10, 10, 20, 20),
  visibleBounds: rect(10, 10, 20, 20),
} satisfies LayoutArtifactContainer;

const item = (key: string, sourceIndex: number) =>
  ({
    key,
    sourceIndex,
    marginBounds: rect(8, 8, 24, 24),
    slotBounds: rect(10, 10, 20, 20),
    allocationBounds: rect(10, 10, 20, 20),
    visualBounds: rect(10, 10, 20, 20),
    visibleBounds: rect(10, 10, 20, 20),
    translation: { x: 10, y: 10 },
    overflow: {
      allocation: { x: false, y: false },
      visual: { x: false, y: false },
      clipped: false,
    },
  }) satisfies LayoutArtifactItemBase;

describe('layout artifact schemas', () => {
  it('parses strict shared JSON payloads and preserves null visibility', () => {
    expect(LayoutArtifactContainerSchema.parse({ ...container, visibleBounds: null })).toEqual({
      ...container,
      visibleBounds: null,
    });
    expect(LayoutArtifactItemBaseSchema.parse({ ...item('a', 0), visibleBounds: null })).toMatchObject({
      key: 'a',
      visibleBounds: null,
    });
    expect(() => LayoutArtifactContainerSchema.parse({ ...container, extra: true })).toThrow();
    expect(() => LayoutArtifactItemBaseSchema.parse({ ...item('a', 0), translation: { x: 0, y: 0, z: 1 } })).toThrow();
    expect(() => LayoutArtifactItemBaseSchema.parse({ ...item('a', 0), slotBounds: rect(0, 0, -1, 1) })).toThrow();
  });

  it('validates strict JSON-safe spacing segments and positive main-axis length', () => {
    const values: Array<LayoutSpacingArtifact> = [
      { kind: 'gap', axis: 'x', bounds: rect(10, 5, 8, 0) },
      { kind: 'distributed', axis: 'y', bounds: rect(10, 5, 0, 8) },
    ];

    expect(values.map(value => LayoutSpacingArtifactSchema.parse(JSON.parse(JSON.stringify(value))))).toEqual(values);
    expect(() => LayoutSpacingArtifactSchema.parse({ ...values[0], kind: 'unknown' })).toThrow();
    expect(() => LayoutSpacingArtifactSchema.parse({ ...values[0], axis: 'z' })).toThrow();
    expect(() => LayoutSpacingArtifactSchema.parse({ ...values[0], bounds: rect(10, 5, 0, 8) })).toThrow();
    expect(() => LayoutSpacingArtifactSchema.parse({ ...values[1], bounds: rect(10, 5, 8, 0) })).toThrow();
    expect(() => LayoutSpacingArtifactSchema.parse({ ...values[0], extra: true })).toThrow();
  });

  it('validates Flex line partition in both directions', () => {
    const value = {
      kind: 'flex',
      container,
      items: [
        { ...item('a', 0), line: 0 },
        { ...item('b', 1), line: 1 },
      ],
      lines: [
        { index: 0, itemKeys: ['a'], mainAxis: 'x', mainStart: 5, mainSize: 90, crossStart: 5, crossSize: 20 },
        { index: 1, itemKeys: ['b'], mainAxis: 'x', mainStart: 5, mainSize: 90, crossStart: 25, crossSize: 30 },
      ],
      spacing: [{ kind: 'gap', axis: 'x', bounds: rect(48, 5, 4, 20) }],
    } satisfies FlexLayoutArtifact;

    expect(FlexLayoutArtifactSchema.parse(value)).toEqual(value);
    expect(() => FlexLayoutArtifactSchema.parse({ ...value, spacing: undefined })).toThrow();
    expect(() =>
      FlexLayoutArtifactSchema.parse({ ...value, lines: [{ ...value.lines[0], itemKeys: ['a', 'b'] }] }),
    ).toThrow();
    expect(() =>
      FlexLayoutArtifactSchema.parse({ ...value, items: [{ ...value.items[0], line: 1 }, value.items[1]] }),
    ).toThrow();
  });

  it('validates Grid track continuity, physical order and resolved spans', () => {
    const value = {
      kind: 'grid',
      container,
      items: [{ ...item('cell', 0), column: 0, row: 0, columnSpan: 2, rowSpan: 1 }],
      columns: [
        { index: 0, start: 5, size: 40, sourceKind: 'fixed', implicit: false },
        { index: 1, start: 50, size: 45, sourceKind: 'fraction', implicit: false },
      ],
      rows: [{ index: 0, start: 5, size: 50, sourceKind: 'content-natural', implicit: true }],
      spacing: [{ kind: 'distributed', axis: 'x', bounds: rect(45, 5, 5, 50) }],
    } satisfies GridLayoutArtifact;

    expect(GridLayoutArtifactSchema.parse(value)).toEqual(value);
    expect(() => GridLayoutArtifactSchema.parse({ ...value, spacing: undefined })).toThrow();
    expect(() => GridLayoutArtifactSchema.parse({ ...value, columns: [{ ...value.columns[0], index: 1 }] })).toThrow();
    expect(() =>
      GridLayoutArtifactSchema.parse({
        ...value,
        columns: [value.columns[1], value.columns[0]],
      }),
    ).toThrow();
    expect(() => GridLayoutArtifactSchema.parse({ ...value, items: [{ ...value.items[0], columnSpan: 3 }] })).toThrow();
  });

  it('validates Overlay paint order as the exact zIndex and sourceIndex permutation', () => {
    const value = {
      kind: 'overlay',
      container,
      items: [
        { ...item('a', 0), placement: 'aligned', sizeParticipation: 'include', zIndex: 2 },
        {
          ...item('b', 1),
          placement: 'positioned',
          sizeParticipation: 'exclude',
          zIndex: -1,
          position: { target: { x: 20, y: 20 }, slotAnchor: { x: 20, y: 20 } },
        },
        { ...item('c', 2), placement: 'aligned', sizeParticipation: 'include', zIndex: 2 },
      ],
      paintOrder: ['b', 'a', 'c'],
    } satisfies OverlayLayoutArtifact;

    expect(OverlayLayoutArtifactSchema.parse(value)).toEqual(value);
    expect(() => OverlayLayoutArtifactSchema.parse({ ...value, paintOrder: ['b', 'c', 'a'] })).toThrow();
    expect(() => OverlayLayoutArtifactSchema.parse({ ...value, paintOrder: ['b', 'a', 'a'] })).toThrow();
    expect(() =>
      OverlayLayoutArtifactSchema.parse({
        ...value,
        items: value.items.map((entry, index) => (index === 1 ? { ...entry, position: undefined } : entry)),
      }),
    ).toThrow();
    expect(() =>
      OverlayLayoutArtifactSchema.parse({
        ...value,
        items: value.items.map((entry, index) =>
          index === 1 ? { ...entry, position: { target: { x: 20, y: 20 }, slotAnchor: { x: 21, y: 20 } } } : entry,
        ),
      }),
    ).toThrow();
    expect(() =>
      OverlayLayoutArtifactSchema.parse({
        ...value,
        items: value.items.map((entry, index) =>
          index === 0 ? { ...entry, position: { target: { x: 20, y: 20 }, slotAnchor: { x: 20, y: 20 } } } : entry,
        ),
      }),
    ).toThrow();
  });

  it('provides one discriminated public union for all layout payloads', () => {
    const emptyContainer = { ...container, visualBounds: rect(0, 0, 0, 0), visibleBounds: null };
    const values: Array<LayoutArtifact> = [
      { kind: 'flex', container: emptyContainer, items: [], lines: [], spacing: [] },
      { kind: 'grid', container: emptyContainer, items: [], columns: [], rows: [], spacing: [] },
      { kind: 'overlay', container: emptyContainer, items: [], paintOrder: [] },
    ];

    expect(values.map(value => LayoutArtifactSchema.parse(value).kind)).toEqual(['flex', 'grid', 'overlay']);
  });
});
