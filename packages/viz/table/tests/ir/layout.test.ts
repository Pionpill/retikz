import { describe, expect, it } from 'vitest';

import {
  TableAutoTrackSizeSchema,
  TableFixedTrackSizeSchema,
  TableFractionTrackSizeSchema,
  TableLayoutSchema,
  TableMinmaxTrackSizeSchema,
  TableNoBorderSchema,
  TableTrackOverridesSchema,
  TableTrackSizeKind,
  TableTrackSizeSchema,
} from '../../src';

describe('Table 布局 schema', () => {
  it('保留有限整数边界优先级，而不强加安全整数边界', () => {
    for (const priority of [-1e100, -1, 0, 1, 1e100]) {
      expect(TableNoBorderSchema.parse({ kind: 'none', priority }).priority).toBe(priority);
    }
    for (const priority of [0.5, Number.MIN_VALUE, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(TableNoBorderSchema.safeParse({ kind: 'none', priority }).success).toBe(false);
    }
  });

  it('往返 alpha.2 轨道大小、间隙和边框默认值，而不实现默认值', () => {
    const layout = {
      columnSize: { kind: TableTrackSizeKind.Auto },
      rowSize: { kind: TableTrackSizeKind.Fixed, value: 28 },
      headerRowSize: { kind: TableTrackSizeKind.Fixed, value: 36 },
      columns: [{ index: 1, size: { kind: TableTrackSizeKind.Fraction, weight: 2 } }],
      rows: [{ index: 0, size: { kind: TableTrackSizeKind.Auto } }],
      columnGap: 4,
      rowGap: 2,
      borders: {
        mode: 'collapse',
        outer: { top: { kind: 'line', width: 2 } },
        horizontal: { kind: 'none', priority: 1 },
      },
    } as const;

    expect(TableLayoutSchema.parse(JSON.parse(JSON.stringify(layout)))).toEqual(layout);
    expect(TableLayoutSchema.parse({})).toEqual({});
  });

  it.each(['columnWidth', 'rowHeight', 'headerHeight'])('拒绝删除的 alpha.1 字段 %s', field => {
    expect(() => TableLayoutSchema.parse({ [field]: 10 })).toThrow();
  });

  it.each([
    ['columnGap', -1],
    ['rowGap', Number.NaN],
    ['rowGap', Number.POSITIVE_INFINITY],
  ])('拒绝无效的 %s=%s', (field, value) => {
    expect(() => TableLayoutSchema.parse({ [field]: value })).toThrow();
  });

  it('接受零固定轨道和零间隙', () => {
    const layout = {
      columnSize: { kind: TableTrackSizeKind.Fixed, value: 0 },
      rowSize: { kind: TableTrackSizeKind.Fixed, value: 0 },
      columnGap: 0,
      rowGap: 0,
    } as const;

    expect(TableLayoutSchema.parse(layout)).toEqual(layout);
  });

  it('通过公共根字段往返每个轨道大小变体', () => {
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
    expect(TableLayoutSchema.parse({ columnSize: variants[1] })).toEqual({ columnSize: variants[1] });
  });

  it.each([
    { kind: TableTrackSizeKind.Fixed, value: -1 },
    { kind: TableTrackSizeKind.Fixed, value: Number.NaN },
    { kind: TableTrackSizeKind.Fixed, value: Number.POSITIVE_INFINITY },
    { kind: TableTrackSizeKind.Fraction, weight: 0 },
    { kind: TableTrackSizeKind.Fraction, weight: -1 },
    { kind: TableTrackSizeKind.Auto, value: 1 },
    { kind: 'unknown' },
  ])('拒绝无效的磁道尺寸 %#', track => {
    expect(() => TableTrackSizeSchema.parse(track)).toThrow();
  });

  it('拒绝嵌套字段中无效的最小最大组合', () => {
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

  it('接受稀疏覆盖并拒绝重复或无效的规范索引', () => {
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
