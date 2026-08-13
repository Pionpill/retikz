import type { StrokeDashPattern } from '../../schemas';

/** 虚线预设 */
const DASHED_PATTERN: StrokeDashPattern = [4, 2];

/** 点线预设 */
const DOTTED_PATTERN: StrokeDashPattern = [1, 2];

/** 将描边虚线简写按显式数组、虚线预设、点线预设的优先级归一化 */
export const normalizeDashPattern = (
  dashPattern: StrokeDashPattern | undefined,
  dashed: boolean | undefined,
  dotted: boolean | undefined,
): StrokeDashPattern | undefined => {
  if (dashPattern !== undefined) return dashPattern;
  if (dashed) return DASHED_PATTERN;
  if (dotted) return DOTTED_PATTERN;
  return undefined;
};
