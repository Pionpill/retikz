import { RetikzStandardError, RetikzStandardErrorCode } from '../../../shared/errors';
import { getLatticeRangeError } from '../../shared/lattice';
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
            vertical: resolveGridLine(pair.vertical, bounds.minX, bounds.maxX, 'vertical'),
            horizontal: resolveGridLine(pair.horizontal, bounds.minY, bounds.maxY, 'horizontal'),
          },
    border: GridSchema.shape.border.parse(source.border),
  };
};

/** 补全单方向默认值并检查可枚举范围 */
const resolveGridLine = (source: IRGridLine, min: number, max: number, direction: string): CanonicalGridLine => {
  const line: CanonicalGridLine = {
    ...GridLineInputSchema.parse(source),
    origin: source.origin ?? min,
  };
  const error = getLatticeRangeError({ ...line, min, max });
  if (error !== undefined)
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.ResolutionInvalid,
      message: error,
      details: { path: ['line', direction, 'spacing'] },
    });
  return line;
};
