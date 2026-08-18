import type { ResolvedTableTrackSize, TableTrackContribution } from './types';

import { RetikzTableError } from '../../error';
import { TableTrackSizeKind } from '../../schemas';
import { deepFreeze } from '../../shared';
import { solveTableTracks } from './track';

/** 单个 spanning Cell 对一个 canonical 轴的自然尺寸要求 */
export type TableSpanConstraint = Readonly<{
  /** semantic Cell id */
  cellId: string;
  /** span 起始 canonical track index */
  startIndex: number;
  /** 连续覆盖的 canonical track 数量 */
  length: number;
  /** 不含内部 grid gap 的 finite nonnegative 外部尺寸 */
  requiredOuterSize: number;
}>;

/** span contribution 传播输入 */
export type PropagateTableSpanContributionsInput = Readonly<{
  /** 与 canonical 轨道同序的 resolved size */
  tracks: ReadonlyArray<ResolvedTableTrackSize>;
  /** 非 spanning Cell 形成的数值 contribution */
  contributions: ReadonlyArray<TableTrackContribution>;
  /** spanning Cell 的轴向约束 */
  constraints: ReadonlyArray<TableSpanConstraint>;
  /** 相邻轨道间 finite nonnegative gap */
  gap: number;
}>;

/** 单个 Cell 仍未被轨道自然尺寸覆盖的外部尺寸 */
export type TableSpanUnmetSize = Readonly<{
  /** semantic Cell id */
  cellId: string;
  /** finite nonnegative 未满足尺寸 */
  size: number;
}>;

/** span contribution 传播结果 */
export type TableSpanContributionResult = Readonly<{
  /** 与 canonical 轨道同序且每轨恰一项的 contribution */
  contributions: ReadonlyArray<TableTrackContribution>;
  /** 按 canonical constraint 顺序保留 Cell 归属的未满足尺寸 */
  unmet: ReadonlyArray<TableSpanUnmetSize>;
}>;

/** span natural-size growth 阶段中的单轨候选 */
type SpanGrowthCandidate = Readonly<{
  /** canonical track index */
  index: number;
  /** natural size 增长上限 */
  limit: number;
  /** flex 阶段的正权重；非 flex 阶段为 0 */
  weight: number;
}>;

const assertFiniteNonnegative = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RetikzTableError(`table: ${name} must be a finite nonnegative number`);
  }
};

const validateConstraint = (constraint: TableSpanConstraint, trackCount: number): void => {
  if (!Number.isInteger(constraint.startIndex) || constraint.startIndex < 0) {
    throw new RetikzTableError(`table: span Cell "${constraint.cellId}" startIndex must be a nonnegative integer`);
  }
  if (!Number.isInteger(constraint.length) || constraint.length <= 0) {
    throw new RetikzTableError(`table: span Cell "${constraint.cellId}" length must be a positive integer`);
  }
  if (constraint.startIndex + constraint.length > trackCount) {
    throw new RetikzTableError(`table: span Cell "${constraint.cellId}" range exceeds ${trackCount} tracks`);
  }
  assertFiniteNonnegative(constraint.requiredOuterSize, `span Cell "${constraint.cellId}" requiredOuterSize`);
};

/** 按 span length、start index 与 Cell id 形成确定的 constraint 顺序 */
const compareConstraint = (a: TableSpanConstraint, b: TableSpanConstraint): number => {
  if (a.length !== b.length) return a.length - b.length;
  if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
  if (a.cellId === b.cellId) return 0;
  return a.cellId < b.cellId ? -1 : 1;
};

/** 把 resolved track 分类为非增长、等额增长或 flex 增长候选 */
const growthCandidateOf = (track: ResolvedTableTrackSize, index: number): SpanGrowthCandidate | undefined => {
  switch (track.kind) {
    case TableTrackSizeKind.Fixed:
      return undefined;
    case TableTrackSizeKind.Auto:
      return { index, limit: Number.POSITIVE_INFINITY, weight: 0 };
    case TableTrackSizeKind.Fraction:
      return { index, limit: Number.POSITIVE_INFINITY, weight: track.weight };
    case TableTrackSizeKind.Minmax:
      if (track.max.kind === TableTrackSizeKind.Fraction) {
        return { index, limit: Number.POSITIVE_INFINITY, weight: track.max.weight };
      }
      if (track.min.kind === TableTrackSizeKind.Fixed && track.max.kind === TableTrackSizeKind.Fixed) {
        return { index, limit: Math.max(track.min.value, track.max.value), weight: 0 };
      }
      return { index, limit: Number.POSITIVE_INFINITY, weight: 0 };
  }
};

/** 等额增长非 flex natural sizes，并返回 flex 阶段仍需消费的 deficit */
const growEqualNaturalSizes = (
  contributionSizes: Array<number>,
  naturalSizes: Array<number>,
  candidates: ReadonlyArray<SpanGrowthCandidate>,
  deficit: number,
): number => {
  let remaining = deficit;
  let active = candidates.filter(
    candidate => candidate.weight === 0 && candidate.limit > naturalSizes[candidate.index],
  );

  while (remaining > 0 && active.length > 0) {
    const share = remaining / active.length;
    let consumed = 0;
    active.forEach(candidate => {
      const current = naturalSizes[candidate.index];
      const next = Math.min(candidate.limit, current + share);
      if (next > current) {
        naturalSizes[candidate.index] = next;
        contributionSizes[candidate.index] = next;
        consumed += next - current;
      }
    });

    if (!(consumed > 0)) {
      for (let activeIndex = active.length - 1; activeIndex >= 0; activeIndex -= 1) {
        const candidate = active[activeIndex];
        const current = naturalSizes[candidate.index];
        const next = Math.min(candidate.limit, current + remaining);
        if (next > current) {
          naturalSizes[candidate.index] = next;
          contributionSizes[candidate.index] = next;
          consumed = next - current;
          break;
        }
      }
    }

    if (!(consumed > 0)) return 0;
    remaining = Math.max(0, remaining - consumed);
    active = active.filter(candidate => candidate.limit > naturalSizes[candidate.index]);
  }

  return remaining;
};

/** 按正权重增长 flex natural sizes；不可表示的有限 residual 视为已耗尽 */
const growFlexibleNaturalSizes = (
  contributionSizes: Array<number>,
  naturalSizes: Array<number>,
  candidates: ReadonlyArray<SpanGrowthCandidate>,
  deficit: number,
): number => {
  const active = candidates.filter(candidate => candidate.weight > 0);
  if (active.length === 0 || !(deficit > 0)) return deficit;

  const maxWeight = Math.max(...active.map(candidate => candidate.weight));
  const normalizedWeights = active.map(candidate => candidate.weight / maxWeight);
  const totalWeight = normalizedWeights.reduce((total, weight) => total + weight, 0);
  let remaining = deficit;

  while (remaining > 0) {
    let consumed = 0;
    active.forEach((candidate, activeIndex) => {
      const current = naturalSizes[candidate.index];
      const growth =
        activeIndex === active.length - 1
          ? remaining - consumed
          : (remaining / totalWeight) * normalizedWeights[activeIndex];
      const next = current + growth;
      if (next > current) {
        naturalSizes[candidate.index] = next;
        contributionSizes[candidate.index] = next;
        consumed += next - current;
      }
    });

    if (!(consumed > 0)) {
      for (let activeIndex = active.length - 1; activeIndex >= 0; activeIndex -= 1) {
        const candidate = active[activeIndex];
        const current = naturalSizes[candidate.index];
        const next = current + remaining;
        if (next > current) {
          naturalSizes[candidate.index] = next;
          contributionSizes[candidate.index] = next;
          consumed = next - current;
          break;
        }
      }
    }

    if (!(consumed > 0)) return 0;
    remaining = Math.max(0, remaining - consumed);
  }

  return 0;
};

/** 把 spanning Cell 的自然尺寸要求传播为 canonical per-track contributions */
export const propagateTableSpanContributions = (
  input: PropagateTableSpanContributionsInput,
): TableSpanContributionResult => {
  solveTableTracks({
    tracks: input.tracks,
    contributions: input.contributions,
    gap: input.gap,
  });
  const contributionSizes = Array.from({ length: input.tracks.length }, () => 0);
  input.contributions.forEach(contribution => {
    contributionSizes[contribution.trackIndex] = Math.max(
      contributionSizes[contribution.trackIndex],
      contribution.size,
    );
  });

  input.constraints.forEach(constraint => validateConstraint(constraint, input.tracks.length));
  const constraints = [...input.constraints].sort(compareConstraint);
  const unmet: Array<TableSpanUnmetSize> = [];

  constraints.forEach(constraint => {
    const naturalSizes = [
      ...solveTableTracks({
        tracks: input.tracks,
        contributions: contributionSizes.map((size, trackIndex) => ({ trackIndex, size })),
        gap: input.gap,
      }),
    ];
    const endIndex = constraint.startIndex + constraint.length;
    const covered =
      naturalSizes.slice(constraint.startIndex, endIndex).reduce((total, size) => total + size, 0) +
      (constraint.length - 1) * input.gap;
    let remaining = Math.max(0, constraint.requiredOuterSize - covered);
    const candidates = input.tracks.slice(constraint.startIndex, endIndex).flatMap((track, localIndex) => {
      const candidate = growthCandidateOf(track, constraint.startIndex + localIndex);
      return candidate === undefined ? [] : [candidate];
    });

    remaining = growEqualNaturalSizes(contributionSizes, naturalSizes, candidates, remaining);
    remaining = growFlexibleNaturalSizes(contributionSizes, naturalSizes, candidates, remaining);
    unmet.push({ cellId: constraint.cellId, size: remaining });
  });
  return deepFreeze({
    contributions: contributionSizes.map((size, trackIndex) => ({ trackIndex, size })),
    unmet,
  });
};
