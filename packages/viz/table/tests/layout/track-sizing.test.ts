import { describe, expect, it } from 'vitest';

import type {
  IRTableAutoTrackSize,
  IRTableFixedTrackSize,
  IRTableFractionTrackSize,
  IRTableMinmaxTrackSize,
  IRTableTrackSize,
} from '../../src';
import { TableTrackSizeKind } from '../../src';
import type { CanonicalTableTrackSize } from '../../src/pipeline/layout';
import { resolveTableTrackSizes, solveTableTracks } from '../../src/pipeline/layout';

const fixed = (value: number): IRTableFixedTrackSize => ({ kind: TableTrackSizeKind.Fixed, value });

const auto = (): IRTableAutoTrackSize => ({ kind: TableTrackSizeKind.Auto });

const fraction = (weight?: number): IRTableFractionTrackSize => ({
  kind: TableTrackSizeKind.Fraction,
  ...(weight === undefined ? {} : { weight }),
});

const minmax = (
  min: IRTableFixedTrackSize | IRTableAutoTrackSize,
  max: IRTableFixedTrackSize | IRTableAutoTrackSize | IRTableFractionTrackSize,
): IRTableMinmaxTrackSize => ({ kind: TableTrackSizeKind.Minmax, min, max });

const resolve = (tracks: ReadonlyArray<IRTableTrackSize>): ReadonlyArray<CanonicalTableTrackSize> =>
  resolveTableTrackSizes(tracks);

describe('Table 轨道尺寸', () => {
  it('将嵌套分数权重具体化为分离的不可变解析轨道', () => {
    const tracks = [fraction(), minmax(fixed(10), fraction())];
    const snapshot = structuredClone(tracks);
    const resolved = resolve(tracks);

    expect(resolved).toEqual([
      { kind: TableTrackSizeKind.Fraction, weight: 1 },
      {
        kind: TableTrackSizeKind.Minmax,
        min: { kind: TableTrackSizeKind.Fixed, value: 10 },
        max: { kind: TableTrackSizeKind.Fraction, weight: 1 },
      },
    ]);
    expect(tracks).toEqual(snapshot);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved[1])).toBe(true);
    expect(Object.isFrozen((resolved[1] as Extract<CanonicalTableTrackSize, { kind: 'minmax' }>).max)).toBe(true);
  });

  it('通过规范索引应用稀疏覆盖并拒绝重复或超出范围的索引', () => {
    const defaults = [auto(), auto(), auto()];
    const overrides = [
      { index: 2, size: fraction(2) },
      { index: 0, size: fixed(24) },
    ];

    expect(resolveTableTrackSizes(defaults, overrides)).toEqual([
      { kind: TableTrackSizeKind.Fixed, value: 24 },
      { kind: TableTrackSizeKind.Auto },
      { kind: TableTrackSizeKind.Fraction, weight: 2 },
    ]);
    expect(() => resolveTableTrackSizes(defaults, [...overrides, overrides[0]])).toThrow(/duplicate.*2/i);
    expect(() => resolveTableTrackSizes(defaults, [{ index: 3, size: auto() }])).toThrow(/index.*3/i);
    expect(() => resolveTableTrackSizes(defaults, [{ index: -1, size: auto() }])).toThrow(/index.*-1/i);
  });

  it('在不受约束的轴上使用自然贡献大小', () => {
    const tracks = resolve([
      fixed(10),
      auto(),
      fraction(2),
      minmax(fixed(5), fixed(15)),
      minmax(fixed(5), auto()),
      minmax(fixed(5), fraction()),
      minmax(auto(), fixed(5)),
      minmax(auto(), auto()),
      minmax(auto(), fraction()),
    ]);
    const contributions = [
      { trackIndex: 1, size: 12 },
      { trackIndex: 2, size: 14 },
      { trackIndex: 3, size: 20 },
      { trackIndex: 4, size: 3 },
      { trackIndex: 5, size: 8 },
      { trackIndex: 6, size: 9 },
      { trackIndex: 7, size: 11 },
      { trackIndex: 8, size: 13 },
    ];

    expect(solveTableTracks({ tracks, contributions, gap: 4 })).toEqual([10, 12, 14, 15, 5, 8, 9, 11, 13]);
  });

  it('使用每个轨道的最大贡献，与输入顺序无关', () => {
    const tracks = resolve([auto(), fraction()]);
    const first = [
      { trackIndex: 0, size: 12 },
      { trackIndex: 0, size: 30 },
      { trackIndex: 1, size: 8 },
    ];

    expect(solveTableTracks({ tracks, contributions: first, gap: 0 })).toEqual([30, 8]);
    expect(solveTableTracks({ tracks, contributions: [...first].reverse(), gap: 0 })).toEqual([30, 8]);
  });

  it('在弹性分配之前恰好减去一次间隙', () => {
    expect(
      solveTableTracks({
        tracks: resolve([fraction(), fraction()]),
        contributions: [],
        gap: 10,
        availableSize: 120,
      }),
    ).toEqual([55, 55]);
  });

  it.each([
    [
      [100, 10, 100],
      [55, 10, 55],
    ],
    [
      [10, 100, 100],
      [10, 55, 55],
    ],
    [
      [100, 100, 10],
      [55, 55, 10],
    ],
  ])('有界 minmax 轨道按水位填充分配且不受上限顺序影响：%#', (maximums, expected) => {
    expect(
      solveTableTracks({
        tracks: resolve(maximums.map(maximum => minmax(fixed(0), fixed(maximum)))),
        contributions: [],
        gap: 0,
        availableSize: 120,
      }),
    ).toEqual(expected);
  });

  it('在加权分数增长之前运行有界增长', () => {
    expect(
      solveTableTracks({
        tracks: resolve([minmax(fixed(20), fixed(60)), fraction(), fraction(2)]),
        contributions: [],
        gap: 0,
        availableSize: 300,
      }),
    ).toEqual([60, 80, 160]);
  });

  it('通过确定性残差分配保留最小正约束空间', () => {
    const availableSize = Number.MIN_VALUE;
    const bounded = solveTableTracks({
      tracks: resolve([minmax(fixed(0), fixed(1)), minmax(fixed(0), fixed(1))]),
      contributions: [],
      gap: 0,
      availableSize,
    });
    const flexible = solveTableTracks({
      tracks: resolve([fraction(), fraction()]),
      contributions: [],
      gap: 0,
      availableSize,
    });

    expect(bounded.reduce((total, size) => total + size, 0)).toBe(availableSize);
    expect(flexible.reduce((total, size) => total + size, 0)).toBe(availableSize);
    expect(bounded.every(size => Number.isFinite(size) && size >= 0)).toBe(true);
    expect(flexible.every(size => Number.isFinite(size) && size >= 0)).toBe(true);
  });

  it('使用自动贡献作为有界限制，而不增长普通自动轨道', () => {
    expect(
      solveTableTracks({
        tracks: resolve([minmax(fixed(20), auto()), auto()]),
        contributions: [
          { trackIndex: 0, size: 80 },
          { trackIndex: 1, size: 10 },
        ],
        gap: 0,
        availableSize: 100,
      }),
    ).toEqual([80, 10]);
    expect(
      solveTableTracks({
        tracks: resolve([minmax(fixed(20), auto())]),
        contributions: [{ trackIndex: 0, size: 80 }],
        gap: 0,
        availableSize: 50,
      }),
    ).toEqual([50]);
  });

  it('保持自动最小值高于较小的固定最大值', () => {
    expect(
      solveTableTracks({
        tracks: resolve([minmax(auto(), fixed(50))]),
        contributions: [{ trackIndex: 0, size: 80 }],
        gap: 0,
        availableSize: 40,
      }),
    ).toEqual([80]);
  });

  it('当可用空间不足时，保留固定和最小碱基', () => {
    expect(
      solveTableTracks({
        tracks: resolve([fixed(80), minmax(fixed(40), fixed(100))]),
        contributions: [],
        gap: 5,
        availableSize: 50,
      }),
    ).toEqual([80, 40]);
  });

  it.each([
    [{ contributions: [{ trackIndex: -1, size: 1 }] }, /trackIndex/i],
    [{ contributions: [{ trackIndex: 0.5, size: 1 }] }, /trackIndex/i],
    [{ contributions: [{ trackIndex: 1, size: 1 }] }, /trackIndex/i],
    [{ contributions: [{ trackIndex: 0, size: -1 }] }, /contribution/i],
    [{ contributions: [{ trackIndex: 0, size: Number.NaN }] }, /contribution/i],
    [{ gap: -1 }, /gap/i],
    [{ gap: Number.POSITIVE_INFINITY }, /gap/i],
    [{ availableSize: -1 }, /availableSize/i],
    [{ availableSize: Number.NaN }, /availableSize/i],
  ])('拒绝无效的数值解算器输入 %#', (override, message) => {
    expect(() =>
      solveTableTracks({
        tracks: resolve([auto()]),
        contributions: [],
        gap: 0,
        ...override,
      }),
    ).toThrow(message);
  });

  it('拒绝解算器边界处的无效解析轨迹', () => {
    expect(() =>
      solveTableTracks({
        tracks: [{ kind: TableTrackSizeKind.Fraction, weight: 0 }] as ReadonlyArray<CanonicalTableTrackSize>,
        contributions: [],
        gap: 0,
      }),
    ).toThrow(/weight/i);
  });

  it('返回分离的不可变的确定性大小，而不改变输入', () => {
    const tracks = resolve([minmax(fixed(20), fixed(60)), fraction()]);
    const contributions = [{ trackIndex: 1, size: 999 }];
    const input = { tracks, contributions, gap: 4, availableSize: 104 };
    const snapshot = structuredClone(input);
    const first = solveTableTracks(input);
    const second = solveTableTracks({ ...input, contributions: [...contributions].reverse() });

    expect(first).toEqual([60, 40]);
    expect(second).toEqual(first);
    expect(input).toEqual(snapshot);
    expect(Object.isFrozen(first)).toBe(true);
  });
});
