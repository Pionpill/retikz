import type { PropertyPath } from '@retikz/foundation';

import type { IRLine, IRMathSegment, IRTextSegment } from '../../schemas';
import { resolveContextualColor } from '../style';
import type { InlineSegmentColorSource, ColorResolvedTextLine } from './types';

/** 解析单个文字或公式片段的数值颜色 */
const resolveInlineSegmentColor = (
  segment: IRTextSegment | IRMathSegment,
  masterColor: string | undefined,
  mode: 'light' | 'dark',
  fieldPath: PropertyPath,
): InlineSegmentColorSource => {
  const { fill, ...source } = segment;
  return {
    ...source,
    ...(fill === undefined
      ? {}
      : { fill: resolveContextualColor(fill, { masterColor, mode, fieldPath: [...fieldPath, 'fill'] }) }),
  };
};

/** 解析正文行及其片段的数值颜色 */
export const resolveTextLineColors = (
  line: IRLine,
  masterColor: string | undefined,
  mode: 'light' | 'dark',
  fieldPath: PropertyPath,
): ColorResolvedTextLine => {
  if (typeof line === 'string') return line;
  if ('segments' in line) {
    return {
      ...line,
      fill:
        line.fill === undefined
          ? undefined
          : resolveContextualColor(line.fill, { masterColor, mode, fieldPath: [...fieldPath, 'fill'] }),
      segments: line.segments.map((segment, index) =>
        resolveInlineSegmentColor(segment, masterColor, mode, [...fieldPath, 'segments', index]),
      ),
    };
  }

  const { fill, ...source } = line;

  return {
    ...source,
    ...(fill === undefined
      ? {}
      : { fill: resolveContextualColor(fill, { masterColor, mode, fieldPath: [...fieldPath, 'fill'] }) }),
  };
};
