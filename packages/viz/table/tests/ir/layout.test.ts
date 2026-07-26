import { describe, expect, it } from 'vitest';

import {
  TableAutoTrackSizeSchema,
  TableFixedTrackSizeSchema,
  TableFractionTrackSizeSchema,
  TableLayoutSchema,
  TableMinmaxTrackSizeSchema,
  TableTrackOverridesSchema,
  TableTrackSizeKind,
  TableTrackSizeSchema,
} from '../../src';

describe('Table layout schema', () => {
  it('round-trips fixed track sizes and gaps without materializing defaults', () => {
    const layout = {
      columnWidth: 100,
      rowHeight: 28,
      headerHeight: 36,
      columnGap: 4,
      rowGap: 2,
    };

    expect(TableLayoutSchema.parse(JSON.parse(JSON.stringify(layout)))).toEqual(layout);
    expect(TableLayoutSchema.parse({})).toEqual({});
  });

  it.each([
    ['columnWidth', 0],
    ['columnWidth', -1],
    ['columnWidth', Number.NaN],
    ['columnWidth', Number.POSITIVE_INFINITY],
    ['rowHeight', 0],
    ['headerHeight', -1],
    ['columnGap', -1],
    ['rowGap', Number.NaN],
  ])('rejects invalid %s=%s', (field, value) => {
    expect(() => TableLayoutSchema.parse({ [field]: value })).toThrow();
  });

  it('accepts extremely small positive tracks and zero gaps', () => {
    const layout = { columnWidth: Number.MIN_VALUE, rowHeight: Number.MIN_VALUE, columnGap: 0, rowGap: 0 };

    expect(TableLayoutSchema.parse(layout)).toEqual(layout);
  });

  it('round-trips each standalone track-size variant without activating root layout fields', () => {
    const variants = [
      { kind: TableTrackSizeKind.Fixed, value: 0 },
      { kind: TableTrackSizeKind.Auto },
      { kind: TableTrackSizeKind.Fraction },
      {
        kind: TableTrackSizeKind.Minmax,
        min: { kind: TableTrackSizeKind.Fixed, value: 20 },
        max: { kind: TableTrackSizeKind.Fraction, weight: 2 },
      },
    ] as const;

    expect(variants.map(variant => TableTrackSizeSchema.parse(JSON.parse(JSON.stringify(variant))))).toEqual(variants);
    expect(TableFixedTrackSizeSchema.parse(variants[0])).toEqual(variants[0]);
    expect(TableAutoTrackSizeSchema.parse(variants[1])).toEqual(variants[1]);
    expect(TableFractionTrackSizeSchema.parse(variants[2])).toEqual(variants[2]);
    expect(TableMinmaxTrackSizeSchema.parse(variants[3])).toEqual(variants[3]);
    expect(() => TableLayoutSchema.parse({ columnSize: variants[1] })).toThrow();
  });

  it.each([
    { kind: TableTrackSizeKind.Fixed, value: -1 },
    { kind: TableTrackSizeKind.Fixed, value: Number.NaN },
    { kind: TableTrackSizeKind.Fixed, value: Number.POSITIVE_INFINITY },
    { kind: TableTrackSizeKind.Fraction, weight: 0 },
    { kind: TableTrackSizeKind.Fraction, weight: -1 },
    { kind: TableTrackSizeKind.Auto, value: 1 },
    { kind: 'unknown' },
  ])('rejects an invalid standalone track size %#', track => {
    expect(() => TableTrackSizeSchema.parse(track)).toThrow();
  });

  it('rejects invalid minmax combinations at the nested field', () => {
    expect(() =>
      TableMinmaxTrackSizeSchema.parse({
        kind: TableTrackSizeKind.Minmax,
        min: { kind: TableTrackSizeKind.Fraction, weight: 1 },
        max: { kind: TableTrackSizeKind.Auto },
      }),
    ).toThrow();
    expect(() =>
      TableMinmaxTrackSizeSchema.parse({
        kind: TableTrackSizeKind.Minmax,
        min: { kind: TableTrackSizeKind.Fixed, value: 20 },
        max: { kind: TableTrackSizeKind.Fixed, value: 10 },
      }),
    ).toThrow();
  });

  it('accepts sparse overrides and rejects duplicate or invalid canonical indexes', () => {
    const overrides = [
      { index: 2, size: { kind: TableTrackSizeKind.Auto } },
      { index: 0, size: { kind: TableTrackSizeKind.Fixed, value: 24 } },
    ];

    expect(TableTrackOverridesSchema.parse(overrides)).toEqual(overrides);
    expect(() => TableTrackOverridesSchema.parse([...overrides, overrides[0]])).toThrow(/duplicate/i);
    expect(() => TableTrackOverridesSchema.parse([{ index: -1, size: overrides[0].size }])).toThrow();
    expect(() => TableTrackOverridesSchema.parse([{ index: 0.5, size: overrides[0].size }])).toThrow();
  });
});
