import type { StrokeDashPattern } from '../../schemas';

/** dashed 预设：4 user units 实线 + 2 user units 间隙循环 */
const DASHED_PATTERN: StrokeDashPattern = [4, 2];
/** dotted 预设：1 user unit 短线 + 2 user units 间隙 */
const DOTTED_PATTERN: StrokeDashPattern = [1, 2];

/** 虚线字段优先级：显式 dashPattern > dashed 预设 > dotted 预设 */
export const resolveDashPattern = (
  dashPattern: StrokeDashPattern | undefined,
  dashed: boolean | undefined,
  dotted: boolean | undefined,
): StrokeDashPattern | undefined => {
  if (dashPattern !== undefined) return dashPattern;
  if (dashed) return DASHED_PATTERN;
  if (dotted) return DOTTED_PATTERN;
  return undefined;
};
