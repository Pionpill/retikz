import type { ResolvedTableTrackSize, SolveTableTracksInput } from './types';

import { RetikzTableError } from '../../error';
import { TableTrackSizeKind } from '../../schemas';

/** 单个轨道在 constrained 求解阶段的数值状态 */
type TrackState = Readonly<{
  /** 不允许被可用空间压缩的初始尺寸 */
  base: number;
  /** 非弹性增长上限；弹性轨道使用正无穷 */
  growthLimit: number;
  /** 弹性分配权重；零表示非弹性轨道 */
  flexFactor: number;
}>;

const assertFiniteNonnegative = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RetikzTableError(`table: ${name} must be a finite nonnegative number`);
  }
};

const assertFinitePositive = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RetikzTableError(`table: ${name} must be a finite positive number`);
  }
};

const validateResolvedTrack = (track: ResolvedTableTrackSize, index: number): void => {
  switch (track.kind) {
    case TableTrackSizeKind.Fixed:
      assertFiniteNonnegative(track.value, `track ${index} fixed value`);
      return;
    case TableTrackSizeKind.Auto:
      return;
    case TableTrackSizeKind.Fraction:
      assertFinitePositive(track.weight, `track ${index} fraction weight`);
      return;
    case TableTrackSizeKind.Minmax:
      switch (track.min.kind) {
        case TableTrackSizeKind.Fixed:
          assertFiniteNonnegative(track.min.value, `track ${index} min fixed value`);
          break;
        case TableTrackSizeKind.Auto:
          break;
        default:
          throw new RetikzTableError(`table: track ${index} has an invalid min kind`);
      }
      switch (track.max.kind) {
        case TableTrackSizeKind.Fixed:
          assertFiniteNonnegative(track.max.value, `track ${index} max fixed value`);
          if (track.min.kind === TableTrackSizeKind.Fixed && track.min.value > track.max.value) {
            throw new RetikzTableError(`table: track ${index} fixed max must be greater than or equal to fixed min`);
          }
          break;
        case TableTrackSizeKind.Fraction:
          assertFinitePositive(track.max.weight, `track ${index} max fraction weight`);
          break;
        case TableTrackSizeKind.Auto:
          break;
        default:
          throw new RetikzTableError(`table: track ${index} has an invalid max kind`);
      }
      return;
    default:
      return track satisfies never;
  }
};

const contributionSizesOf = (
  trackCount: number,
  contributions: SolveTableTracksInput['contributions'],
): ReadonlyArray<number> => {
  const sizes = Array.from({ length: trackCount }, () => 0);
  for (const contribution of contributions) {
    if (
      !Number.isInteger(contribution.trackIndex) ||
      contribution.trackIndex < 0 ||
      contribution.trackIndex >= trackCount
    ) {
      throw new RetikzTableError(
        `table: contribution trackIndex ${String(contribution.trackIndex)} is out of range for ${trackCount} tracks`,
      );
    }
    assertFiniteNonnegative(contribution.size, `contribution size at track ${contribution.trackIndex}`);
    sizes[contribution.trackIndex] = Math.max(sizes[contribution.trackIndex], contribution.size);
  }
  return sizes;
};

const unconstrainedSizeOf = (track: ResolvedTableTrackSize, contribution: number): number => {
  switch (track.kind) {
    case TableTrackSizeKind.Fixed:
      return track.value;
    case TableTrackSizeKind.Auto:
    case TableTrackSizeKind.Fraction:
      return contribution;
    case TableTrackSizeKind.Minmax: {
      const minimum = track.min.kind === TableTrackSizeKind.Fixed ? track.min.value : contribution;
      if (track.max.kind === TableTrackSizeKind.Fixed) {
        return track.min.kind === TableTrackSizeKind.Fixed
          ? Math.min(Math.max(contribution, minimum), Math.max(minimum, track.max.value))
          : contribution;
      }
      return track.min.kind === TableTrackSizeKind.Fixed ? Math.max(minimum, contribution) : contribution;
    }
  }
};

const constrainedStateOf = (track: ResolvedTableTrackSize, contribution: number): TrackState => {
  switch (track.kind) {
    case TableTrackSizeKind.Fixed:
      return { base: track.value, growthLimit: track.value, flexFactor: 0 };
    case TableTrackSizeKind.Auto:
      return { base: contribution, growthLimit: contribution, flexFactor: 0 };
    case TableTrackSizeKind.Fraction:
      return { base: 0, growthLimit: Number.POSITIVE_INFINITY, flexFactor: track.weight };
    case TableTrackSizeKind.Minmax: {
      const base = track.min.kind === TableTrackSizeKind.Fixed ? track.min.value : contribution;
      if (track.max.kind === TableTrackSizeKind.Fixed) {
        return { base, growthLimit: Math.max(base, track.max.value), flexFactor: 0 };
      }
      if (track.max.kind === TableTrackSizeKind.Auto) {
        return { base, growthLimit: Math.max(base, contribution), flexFactor: 0 };
      }
      return { base, growthLimit: Number.POSITIVE_INFINITY, flexFactor: track.max.weight };
    }
  }
};

/** 对非弹性 bounded 轨道做顺序无关的等额 water-fill，并返回不可消费的剩余空间 */
const growBoundedTracks = (
  sizes: Array<number>,
  states: ReadonlyArray<TrackState>,
  availableGrowth: number,
): number => {
  let remaining = availableGrowth;
  let active = states.flatMap((state, index) =>
    state.flexFactor === 0 && state.growthLimit > state.base ? [index] : [],
  );

  while (remaining > 0 && active.length > 0) {
    const share = remaining / active.length;
    let consumed = 0;
    active.forEach(index => {
      const current = sizes[index];
      const limit = states[index].growthLimit;
      const growth = Math.min(share, limit - current);
      const next = current + growth;
      if (next > current) {
        sizes[index] = next;
        consumed += next - current;
      }
    });

    if (!(consumed > 0)) {
      for (let activeIndex = active.length - 1; activeIndex >= 0; activeIndex -= 1) {
        const index = active[activeIndex];
        const current = sizes[index];
        const next = Math.min(states[index].growthLimit, current + remaining);
        if (next > current) {
          sizes[index] = next;
          consumed = next - current;
          break;
        }
      }
    }
    if (!(consumed > 0)) break;

    remaining = Math.max(0, remaining - consumed);
    active = active.filter(index => sizes[index] < states[index].growthLimit);
  }

  return remaining;
};

/** 按归一化正权重分配剩余空间，并把不可均分的浮点 residual 确定性留给末轨 */
const growFlexibleTracks = (sizes: Array<number>, states: ReadonlyArray<TrackState>, remaining: number): void => {
  if (!(remaining > 0)) return;
  const flexIndexes = states.flatMap((state, index) => (state.flexFactor > 0 ? [index] : []));
  if (flexIndexes.length === 0) return;

  const maxWeight = Math.max(...flexIndexes.map(index => states[index].flexFactor));
  const normalizedWeight = flexIndexes.map(index => states[index].flexFactor / maxWeight);
  const totalWeight = normalizedWeight.reduce((total, weight) => total + weight, 0);
  let distributed = 0;
  flexIndexes.forEach((index, flexIndex) => {
    const current = sizes[index];
    const growth =
      flexIndex === flexIndexes.length - 1
        ? remaining - distributed
        : (remaining / totalWeight) * normalizedWeight[flexIndex];
    const next = current + growth;
    if (next > current) {
      sizes[index] = next;
      distributed += next - current;
    }
  });
};

/** 从数值 contribution 与可选轴约束确定 canonical 轨道尺寸 */
export const solveTableTracks = (input: SolveTableTracksInput): ReadonlyArray<number> => {
  assertFiniteNonnegative(input.gap, 'gap');
  if (input.availableSize !== undefined) {
    assertFiniteNonnegative(input.availableSize, 'availableSize');
  }
  input.tracks.forEach(validateResolvedTrack);
  const contributions = contributionSizesOf(input.tracks.length, input.contributions);

  if (input.availableSize === undefined) {
    return Object.freeze(input.tracks.map((track, index) => unconstrainedSizeOf(track, contributions[index])));
  }

  const states = input.tracks.map((track, index) => constrainedStateOf(track, contributions[index]));
  const sizes = states.map(state => state.base);
  const trackSpace = Math.max(0, input.availableSize - Math.max(0, input.tracks.length - 1) * input.gap);
  const baseTotal = sizes.reduce((total, size) => total + size, 0);
  if (!(trackSpace > baseTotal)) return Object.freeze(sizes);

  const remaining = growBoundedTracks(sizes, states, trackSpace - baseTotal);
  growFlexibleTracks(sizes, states, remaining);
  return Object.freeze(sizes);
};
