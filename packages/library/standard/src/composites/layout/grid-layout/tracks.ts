import type { LayoutDistributionValue } from '../shared';
import type { IRGridTrack } from './types';

import { compensatedLayoutSum, distributeWeightedLayoutSizes, layoutEpsilon } from '../internal';
import { LayoutDistribution } from '../shared';

/** 同一 Grid track span 的 minimum 与 natural contribution */
export type GridTrackConstraint = Readonly<{
  start: number;
  span: number;
  minimum: number;
  natural: number;
}>;

/** Grid 单轴 intrinsic profiles 与最终物理分布 */
export type SolvedGridTracks = Readonly<{
  minimumProfile: ReadonlyArray<number>;
  naturalProfile: ReadonlyArray<number>;
  sizes: ReadonlyArray<number>;
  leading: number;
  between: number;
}>;

/** 判断 track 的 authored minimum 是否要求 natural contribution */
const isMinNatural = (track: IRGridTrack): boolean =>
  track.kind === 'minmax' && track.min.kind === 'content' && track.min.mode === 'natural';

/** 判断 track 是否参与 fraction 增长阶段 */
const isFractionGrowth = (track: IRGridTrack): boolean =>
  track.kind === 'fraction' || (track.kind === 'minmax' && track.max.kind === 'fraction');

/** 读取 track 的 fraction 权重，不参与时返回零 */
const fractionFactor = (track: IRGridTrack): number =>
  track.kind === 'fraction'
    ? track.factor
    : track.kind === 'minmax' && track.max.kind === 'fraction'
      ? track.max.factor
      : 0;

/** 从 fixed lower breadth 初始化 track base */
const initialBase = (track: IRGridTrack): number =>
  track.kind === 'fixed' ? track.value : track.kind === 'minmax' && track.min.kind === 'fixed' ? track.min.value : 0;

/** 读取 fixed max，并确保 runtime limit 不低于当前 base */
const hardMaximum = (track: IRGridTrack, current: number): number | undefined =>
  track.kind === 'minmax' && track.max.kind === 'fixed' ? Math.max(current, track.max.value) : undefined;

/** 判断 track 是否能在 minimum-base 阶段等权增长 */
const minimumNonFractionEligible = (track: IRGridTrack): boolean =>
  track.kind === 'content' || (track.kind === 'minmax' && track.max.kind !== 'fraction');

/** 判断 track 是否能在 natural-limit 阶段等权增长 */
const naturalNonFractionEligible = (track: IRGridTrack): boolean =>
  (track.kind === 'content' && track.mode === 'natural') ||
  (track.kind === 'minmax' && track.max.kind === 'content' && track.max.mode === 'natural');

/** 判断 finite free space 是否能通过 stretch 扩张该 track */
const stretchEligible = (track: IRGridTrack): boolean =>
  track.kind !== 'fixed' && !(track.kind === 'minmax' && track.max.kind === 'fixed');

/** 合并相同 range，并以 span/start 稳定排序 */
const aggregateConstraints = (
  constraints: ReadonlyArray<GridTrackConstraint>,
  trackCount: number,
): ReadonlyArray<GridTrackConstraint> => {
  const aggregated = new Map<string, GridTrackConstraint>();
  for (const constraint of constraints) {
    if (
      !Number.isSafeInteger(constraint.start) ||
      constraint.start < 0 ||
      !Number.isSafeInteger(constraint.span) ||
      constraint.span <= 0 ||
      constraint.start > trackCount - constraint.span
    ) {
      throw new Error('Grid track constraint range is outside the resolved tracks');
    }
    if (
      !Number.isFinite(constraint.minimum) ||
      constraint.minimum < 0 ||
      !Number.isFinite(constraint.natural) ||
      constraint.natural < 0
    ) {
      throw new Error('Grid track constraints must remain finite and non-negative');
    }
    const key = `${constraint.start}:${constraint.span}`;
    const previous = aggregated.get(key);
    aggregated.set(key, {
      start: constraint.start,
      span: constraint.span,
      minimum: Math.max(previous?.minimum ?? 0, constraint.minimum),
      natural: Math.max(previous?.natural ?? 0, constraint.natural),
    });
  }
  return Object.freeze(
    [...aggregated.values()].sort((first, second) => first.span - second.span || first.start - second.start),
  );
};

/** 让指定 track 集合以等权或 fraction 权重吸收当前 constraint deficit */
const growSelected = (
  sizes: Array<number>,
  tracks: ReadonlyArray<IRGridTrack>,
  constraint: GridTrackConstraint,
  target: number,
  indexes: ReadonlyArray<number>,
  weighted: boolean,
  ignoreHardMaximum = false,
): number => {
  const range = sizes.slice(constraint.start, constraint.start + constraint.span);
  const current = compensatedLayoutSum(range);
  const deficit = target - current;
  if (deficit <= layoutEpsilon(target, current) || indexes.length === 0) return Math.max(0, deficit);
  const selected = indexes.map(index => ({
    base: sizes[index],
    min: sizes[index],
    ...(!ignoreHardMaximum && hardMaximum(tracks[index], sizes[index]) !== undefined
      ? { max: hardMaximum(tracks[index], sizes[index]) }
      : {}),
    weight: weighted ? fractionFactor(tracks[index]) : 1,
  }));
  const selectedCurrent = compensatedLayoutSum(selected.map(value => value.base));
  const distributed = distributeWeightedLayoutSizes(selected, selectedCurrent + deficit);
  indexes.forEach((index, position) => (sizes[index] = distributed.values[position]));
  const after = compensatedLayoutSum(sizes.slice(constraint.start, constraint.start + constraint.span));
  return Math.max(0, target - after);
};

/** 求解不依赖 finite available size 的 minimum 与 natural profiles */
const solveProfiles = (
  tracks: ReadonlyArray<IRGridTrack>,
  constraints: ReadonlyArray<GridTrackConstraint>,
  finite: boolean,
): Readonly<{ minimum: ReadonlyArray<number>; natural: ReadonlyArray<number> }> => {
  const ordered = aggregateConstraints(constraints, tracks.length);
  const minimum = tracks.map(initialBase);
  for (const constraint of ordered) {
    const rangeIndexes = Array.from({ length: constraint.span }, (_, offset) => constraint.start + offset);
    const naturalMinIndexes = rangeIndexes.filter(index => isMinNatural(tracks[index]));
    growSelected(minimum, tracks, constraint, constraint.natural, naturalMinIndexes, false, true);
    const remaining = growSelected(
      minimum,
      tracks,
      constraint,
      constraint.minimum,
      rangeIndexes.filter(index => minimumNonFractionEligible(tracks[index])),
      false,
    );
    if (remaining > layoutEpsilon(remaining, 0)) {
      growSelected(
        minimum,
        tracks,
        constraint,
        constraint.minimum,
        rangeIndexes.filter(index => isFractionGrowth(tracks[index])),
        true,
      );
    }
  }
  const natural = [...minimum];
  for (const constraint of ordered) {
    const rangeIndexes = Array.from({ length: constraint.span }, (_, offset) => constraint.start + offset);
    const remaining = growSelected(
      natural,
      tracks,
      constraint,
      constraint.natural,
      rangeIndexes.filter(index => naturalNonFractionEligible(tracks[index])),
      false,
    );
    if (!finite && remaining > layoutEpsilon(remaining, 0)) {
      growSelected(
        natural,
        tracks,
        constraint,
        constraint.natural,
        rangeIndexes.filter(index => isFractionGrowth(tracks[index])),
        true,
      );
    }
  }
  return { minimum: Object.freeze(minimum), natural: Object.freeze(natural) };
};

/** 以 freeze-and-redistribute 求解 finite available size 下的 fraction tracks */
const resolveFractionTracks = (
  tracks: ReadonlyArray<IRGridTrack>,
  sizes: Array<number>,
  contentAvailable: number,
): void => {
  const fractionIndexes = tracks
    .map((track, index) => (isFractionGrowth(track) ? index : -1))
    .filter(index => index >= 0);
  const active = new Set(fractionIndexes);
  while (active.size > 0) {
    const fixedTotal = compensatedLayoutSum(sizes.filter((_, index) => !active.has(index)));
    const factorTotal = compensatedLayoutSum([...active].map(index => fractionFactor(tracks[index])));
    const unit = (contentAvailable - fixedTotal) / factorTotal;
    const frozen = [...active].filter(
      index => sizes[index] > fractionFactor(tracks[index]) * unit + layoutEpsilon(sizes[index], unit),
    );
    if (frozen.length > 0) {
      frozen.forEach(index => active.delete(index));
      continue;
    }
    [...active].forEach(index => (sizes[index] = Math.max(sizes[index], fractionFactor(tracks[index]) * unit)));
    break;
  }
};

/** 把剩余空间转换为稳定 leading 与 track 间距 */
const distributionOffsets = (
  distribution: LayoutDistributionValue,
  free: number,
  count: number,
  gap: number,
): Readonly<{ leading: number; between: number }> => {
  if (count === 0) return { leading: 0, between: gap };
  if (free < 0) {
    if (distribution === LayoutDistribution.End) return { leading: free, between: gap };
    if (distribution === LayoutDistribution.Center) return { leading: free / 2, between: gap };
    return { leading: 0, between: gap };
  }
  if (distribution === LayoutDistribution.End) return { leading: free, between: gap };
  if (distribution === LayoutDistribution.Center) return { leading: free / 2, between: gap };
  if (distribution === LayoutDistribution.SpaceBetween && count > 1) {
    return { leading: 0, between: gap + free / (count - 1) };
  }
  if (distribution === LayoutDistribution.SpaceAround) {
    const extra = free / count;
    return { leading: extra / 2, between: gap + extra };
  }
  if (distribution === LayoutDistribution.SpaceEvenly) {
    const extra = free / (count + 1);
    return { leading: extra, between: gap + extra };
  }
  return { leading: 0, between: gap };
};

/** 求解 Grid 单轴 minimum/natural profiles 与可选 finite track positions */
export const solveGridTracks = (
  tracks: ReadonlyArray<IRGridTrack>,
  constraints: ReadonlyArray<GridTrackConstraint>,
  options: Readonly<{ gap: number; availableSize?: number; distribution: LayoutDistributionValue }>,
): SolvedGridTracks => {
  if (!Number.isFinite(options.gap) || options.gap < 0)
    throw new Error('Grid track gap must be finite and non-negative');
  if (options.availableSize !== undefined && (!Number.isFinite(options.availableSize) || options.availableSize < 0)) {
    throw new Error('Grid available track size must be finite and non-negative');
  }
  const profiles = solveProfiles(tracks, constraints, options.availableSize !== undefined);
  const sizes = [...profiles.natural];
  let leading = 0;
  let between = options.gap;
  if (options.availableSize !== undefined) {
    const gaps = Math.max(0, tracks.length - 1) * options.gap;
    resolveFractionTracks(tracks, sizes, Math.max(0, options.availableSize - gaps));
    let free = options.availableSize - gaps - compensatedLayoutSum(sizes);
    if (options.distribution === LayoutDistribution.Stretch && free > 0) {
      const eligible = tracks.map((track, index) => (stretchEligible(track) ? index : -1)).filter(index => index >= 0);
      if (eligible.length > 0) {
        const share = free / eligible.length;
        eligible.forEach((index, position) => {
          const addition = position === eligible.length - 1 ? free - share * position : share;
          sizes[index] += addition;
        });
        free = 0;
      }
    }
    ({ leading, between } = distributionOffsets(options.distribution, free, tracks.length, options.gap));
  }
  return Object.freeze({
    minimumProfile: profiles.minimum,
    naturalProfile: profiles.natural,
    sizes: Object.freeze(sizes),
    leading,
    between,
  });
};
