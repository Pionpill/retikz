import { RetikzTableError } from '../../error';
import { computeTableSpanContributions } from './span-computation';
import { assertTableTrackSize } from './track-validation';

/** 独立调用时先确定静态轨道约束，再传播跨轨道尺寸贡献 */
export const propagateTableSpanContributions = (
  input: Parameters<typeof computeTableSpanContributions>[0],
): ReturnType<typeof computeTableSpanContributions> => {
  if (!Number.isFinite(input.gap) || input.gap < 0) {
    throw new RetikzTableError('table: gap must be a finite nonnegative number');
  }
  input.tracks.forEach(assertTableTrackSize);
  return computeTableSpanContributions(input);
};
