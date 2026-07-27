import { describe, expect, it } from 'vitest';

import type {
  IRTableAutoTrackSize,
  IRTableFixedTrackSize,
  IRTableFractionTrackSize,
  IRTableMinmaxTrackSize,
  IRTableTrackSize,
} from '../../src';
import type { PropagateTableSpanContributionsInput } from '../../src/pipeline/layout';

import { TableTrackSizeKind } from '../../src';
import { propagateTableSpanContributions, resolveTableTrackSizes, solveTableTracks } from '../../src/pipeline/layout';

const fixed = (value: number): IRTableFixedTrackSize => ({ kind: TableTrackSizeKind.Fixed, value });
const auto = (): IRTableAutoTrackSize => ({ kind: TableTrackSizeKind.Auto });
const fraction = (weight = 1): IRTableFractionTrackSize => ({ kind: TableTrackSizeKind.Fraction, weight });
const minmax = (
  min: IRTableFixedTrackSize | IRTableAutoTrackSize,
  max: IRTableFixedTrackSize | IRTableAutoTrackSize | IRTableFractionTrackSize,
): IRTableMinmaxTrackSize => ({ kind: TableTrackSizeKind.Minmax, min, max });

const inputOf = (
  tracks: ReadonlyArray<IRTableTrackSize>,
  override: Partial<PropagateTableSpanContributionsInput> = {},
): PropagateTableSpanContributionsInput => ({
  tracks: resolveTableTrackSizes(tracks),
  contributions: [],
  constraints: [],
  gap: 0,
  ...override,
});

describe('Table span contribution propagation', () => {
  it('canonicalizes non-span contributions by track index and maximum size', () => {
    const input = inputOf([auto(), fixed(10), fraction()], {
      contributions: [
        { trackIndex: 2, size: 4 },
        { trackIndex: 0, size: 6 },
        { trackIndex: 0, size: 8 },
      ],
    });
    const snapshot = structuredClone(input);
    const result = propagateTableSpanContributions(input);

    expect(result).toEqual({
      contributions: [
        { trackIndex: 0, size: 8 },
        { trackIndex: 1, size: 0 },
        { trackIndex: 2, size: 4 },
      ],
      unmet: [],
    });
    expect(input).toEqual(snapshot);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.contributions)).toBe(true);
    expect(Object.isFrozen(result.contributions[0])).toBe(true);
  });

  it('counts fixed natural size and an internal gap before growing auto', () => {
    const input = inputOf([fixed(100), auto()], {
      constraints: [{ cellId: 'wide', startIndex: 0, length: 2, requiredOuterSize: 130 }],
      gap: 10,
    });
    const result = propagateTableSpanContributions(input);

    expect(result).toEqual({
      contributions: [
        { trackIndex: 0, size: 0 },
        { trackIndex: 1, size: 20 },
      ],
      unmet: [{ cellId: 'wide', size: 0 }],
    });
    expect(solveTableTracks({ ...input, contributions: result.contributions })).toEqual([100, 20]);
  });

  it('water-fills natural sizes across a fixed-min platform without cap-order bias', () => {
    const maximumOrders = [
      [100, 10, 100],
      [10, 100, 100],
      [100, 100, 10],
    ];

    for (const maximums of maximumOrders) {
      const input = inputOf(
        maximums.map(maximum => minmax(fixed(0), fixed(maximum))),
        {
          constraints: [{ cellId: 'capped', startIndex: 0, length: 3, requiredOuterSize: 120 }],
        },
      );
      const result = propagateTableSpanContributions(input);
      const sizes = solveTableTracks({ ...input, contributions: result.contributions });
      const cappedIndex = maximums.indexOf(10);

      expect(sizes[cappedIndex]).toBe(10);
      expect(sizes.filter((_, index) => index !== cappedIndex)).toEqual([55, 55]);
      expect(result.unmet).toEqual([{ cellId: 'capped', size: 0 }]);
    }
  });

  it('crosses a fixed-min contribution plateau in natural-size space', () => {
    const input = inputOf([auto(), minmax(fixed(20), fixed(60))], {
      constraints: [{ cellId: 'plateau', startIndex: 0, length: 2, requiredOuterSize: 100 }],
    });
    const result = propagateTableSpanContributions(input);

    expect(result.contributions).toEqual([
      { trackIndex: 0, size: 40 },
      { trackIndex: 1, size: 60 },
    ]);
    expect(solveTableTracks({ ...input, contributions: result.contributions })).toEqual([40, 60]);
    expect(result.unmet).toEqual([{ cellId: 'plateau', size: 0 }]);
  });

  it('processes shorter constraints first independent of input array order', () => {
    const constraints = [
      { cellId: 'wide', startIndex: 0, length: 2, requiredOuterSize: 100 },
      { cellId: 'single', startIndex: 0, length: 1, requiredOuterSize: 100 },
    ];
    const input = inputOf([auto(), auto()], { constraints });
    const first = propagateTableSpanContributions(input);
    const second = propagateTableSpanContributions({ ...input, constraints: [...constraints].reverse() });

    expect(first).toEqual(second);
    expect(first.contributions).toEqual([
      { trackIndex: 0, size: 100 },
      { trackIndex: 1, size: 0 },
    ]);
    expect(first.unmet).toEqual([
      { cellId: 'single', size: 0 },
      { cellId: 'wide', size: 0 },
    ]);
  });

  it('grows capped non-flex tracks before weighted fraction tracks', () => {
    const input = inputOf([minmax(fixed(20), fixed(60)), fraction(2)], {
      constraints: [{ cellId: 'mixed', startIndex: 0, length: 2, requiredOuterSize: 160 }],
    });
    const result = propagateTableSpanContributions(input);

    expect(result.contributions).toEqual([
      { trackIndex: 0, size: 60 },
      { trackIndex: 1, size: 100 },
    ]);
    expect(solveTableTracks({ ...input, contributions: result.contributions })).toEqual([60, 100]);
    expect(result.unmet).toEqual([{ cellId: 'mixed', size: 0 }]);
  });

  it('lets an auto min grow beyond a smaller fixed max', () => {
    const input = inputOf([minmax(auto(), fixed(50))], {
      contributions: [{ trackIndex: 0, size: 20 }],
      constraints: [{ cellId: 'auto-min', startIndex: 0, length: 1, requiredOuterSize: 80 }],
    });
    const result = propagateTableSpanContributions(input);

    expect(result.contributions).toEqual([{ trackIndex: 0, size: 80 }]);
    expect(solveTableTracks({ ...input, contributions: result.contributions })).toEqual([80]);
    expect(result.unmet).toEqual([{ cellId: 'auto-min', size: 0 }]);
  });

  it('distributes a flex-only deficit by positive weight', () => {
    const input = inputOf([fraction(1), fraction(2)], {
      constraints: [{ cellId: 'flex', startIndex: 0, length: 2, requiredOuterSize: 90 }],
    });

    expect(propagateTableSpanContributions(input)).toEqual({
      contributions: [
        { trackIndex: 0, size: 30 },
        { trackIndex: 1, size: 60 },
      ],
      unmet: [{ cellId: 'flex', size: 0 }],
    });
  });

  it('keeps fixed-only deficits as per-Cell unmet sizes in canonical constraint order', () => {
    const constraints = [
      { cellId: 'z', startIndex: 0, length: 2, requiredOuterSize: 30 },
      { cellId: 'b', startIndex: 1, length: 1, requiredOuterSize: 10 },
      { cellId: 'a', startIndex: 0, length: 1, requiredOuterSize: 20 },
    ];
    const input = inputOf([fixed(5), fixed(5)], { constraints });
    const first = propagateTableSpanContributions(input);
    const second = propagateTableSpanContributions({ ...input, constraints: [...constraints].reverse() });

    expect(first).toEqual(second);
    expect(first.unmet).toEqual([
      { cellId: 'a', size: 15 },
      { cellId: 'b', size: 5 },
      { cellId: 'z', size: 20 },
    ]);
  });

  it('uses the highest canonical active track for a representable subnormal residual', () => {
    const input = inputOf([auto(), auto()], {
      constraints: [{ cellId: 'tiny', startIndex: 0, length: 2, requiredOuterSize: Number.MIN_VALUE }],
    });

    expect(propagateTableSpanContributions(input)).toEqual({
      contributions: [
        { trackIndex: 0, size: 0 },
        { trackIndex: 1, size: Number.MIN_VALUE },
      ],
      unmet: [{ cellId: 'tiny', size: 0 }],
    });
  });

  it.each([
    [{ contributions: [{ trackIndex: -1, size: 1 }] }, /trackIndex/i],
    [{ contributions: [{ trackIndex: 2, size: 1 }] }, /trackIndex/i],
    [{ contributions: [{ trackIndex: 0, size: Number.NaN }] }, /contribution size at track 0/i],
    [{ gap: -1 }, /gap/i],
    [{ gap: Number.POSITIVE_INFINITY }, /gap/i],
    [{ constraints: [{ cellId: 'bad', startIndex: -1, length: 1, requiredOuterSize: 1 }] }, /startIndex/i],
    [{ constraints: [{ cellId: 'bad', startIndex: 0.5, length: 1, requiredOuterSize: 1 }] }, /startIndex/i],
    [{ constraints: [{ cellId: 'bad', startIndex: 0, length: 0, requiredOuterSize: 1 }] }, /length/i],
    [{ constraints: [{ cellId: 'bad', startIndex: 0, length: 1.5, requiredOuterSize: 1 }] }, /length/i],
    [{ constraints: [{ cellId: 'bad', startIndex: 1, length: 2, requiredOuterSize: 1 }] }, /range/i],
    [
      { constraints: [{ cellId: 'bad', startIndex: 0, length: 1, requiredOuterSize: Number.NaN }] },
      /requiredOuterSize/i,
    ],
    [{ constraints: [{ cellId: 'bad', startIndex: 0, length: 1, requiredOuterSize: -1 }] }, /requiredOuterSize/i],
  ])('rejects invalid span propagation input %#', (override, message) => {
    expect(() => propagateTableSpanContributions(inputOf([auto(), auto()], override))).toThrow(message);
  });
});
