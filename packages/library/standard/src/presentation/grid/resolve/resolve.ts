import { computeGridBounds } from '../geometry';
import { GridLineInputSchema, GridSchema } from '../schema';
import type { IRGrid, IRGridLine } from '../types';
import type { CanonicalGrid, CanonicalGridLine } from './types';

/** 在下沉前确定 Grid 的局部边界与方向配置 */
export const resolveGrid = (source: IRGrid): CanonicalGrid => {
  const bounds = computeGridBounds(source.bounds);
  const line = source.line;
  const pair =
    typeof line === 'object' && 'vertical' in line
      ? line
      : {
          vertical: typeof line === 'object' ? line : {},
          horizontal: typeof line === 'object' ? line : {},
        };

  return {
    ...source,
    bounds,
    line:
      line === false
        ? false
        : {
            vertical: resolveGridLine(pair.vertical, bounds.minX),
            horizontal: resolveGridLine(pair.horizontal, bounds.minY),
          },
    border:
      source.border === undefined
        ? undefined
        : {
            ...source.border,
            padding: source.border.padding ?? GridSchema.shape.border.unwrap().shape.padding.parse(undefined),
            order: source.border.order ?? GridSchema.shape.border.unwrap().shape.order.parse(undefined),
            extendLines:
              source.border.extendLines ?? GridSchema.shape.border.unwrap().shape.extendLines.parse(undefined),
          },
  };
};

/** 补全单方向默认值，最终可枚举范围由枚举入口统一检查 */
const resolveGridLine = (source: IRGridLine, min: number): CanonicalGridLine => {
  const line: CanonicalGridLine = {
    ...source,
    spacing: source.spacing ?? GridLineInputSchema.shape.spacing.parse(undefined),
    includeBoundary: source.includeBoundary ?? GridLineInputSchema.shape.includeBoundary.parse(undefined),
    major:
      source.major === undefined
        ? undefined
        : {
            ...source.major,
            offset: source.major.offset ?? GridLineInputSchema.shape.major.unwrap().shape.offset.parse(undefined),
          },
    origin: source.origin ?? min,
  };
  return line;
};
