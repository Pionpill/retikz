import { RetikzTableError } from '../../error';
import { computeTableTracks } from './track-computation';
import { assertTableTrackSize } from './track-validation';
import type { InputTableTrackSizing } from './types';

/** 独立调用时先确定静态轨道约束，再执行数值求解 */
export const solveTableTracks = (input: InputTableTrackSizing): ReadonlyArray<number> => {
  if (!Number.isFinite(input.gap) || input.gap < 0) {
    throw new RetikzTableError('table: gap must be a finite nonnegative number');
  }
  input.tracks.forEach(assertTableTrackSize);
  return computeTableTracks(input);
};
