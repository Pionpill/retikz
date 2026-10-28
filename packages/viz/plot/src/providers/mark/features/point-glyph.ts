import type { IRNodeDefault } from '@retikz/core';

import type { IRPlotPointMark } from '../../../schemas';
import { constantMarkOpacity } from '../shared';
import type { MarkPaint } from '../shared';

/** Point glyph 默认最终半径（user units） */
export const POINT_DEFAULT_RADIUS = 5;

/** Point 的 glyph 样式输入 */
type PointGlyphStyleSource = Pick<
  NonNullable<IRPlotPointMark['properties']>,
  'padding' | 'minimumSize' | 'size' | 'stroke' | 'strokeWidth' | 'opacity' | 'rotate'
>;

/** 组装 Point 的 circle glyph 样式 */
export const pointGlyphStyle = (fill: MarkPaint, mark: PointGlyphStyleSource): Omit<IRNodeDefault, 'label'> => {
  const padding = mark.padding;
  const minimumSize = mark.size === undefined ? mark.minimumSize : mark.size * Math.SQRT2;
  const stroke = mark.stroke;
  const strokeWidth = mark.strokeWidth;
  const opacity = constantMarkOpacity(mark.opacity);
  const rotate = mark.rotate;

  return {
    shape: 'circle',
    ...(rotate !== undefined ? { rotate } : {}),
    style: {
      ...(typeof fill === 'string' ? { color: fill } : {}),
      fill,
      ...(stroke !== undefined ? { stroke } : {}),
      ...(strokeWidth !== undefined ? { strokeWidth } : {}),
      ...(opacity !== undefined ? { opacity } : {}),
    },
    layout: {
      padding: padding ?? 0,
      minimumSize: minimumSize ?? (POINT_DEFAULT_RADIUS * 2) / Math.SQRT2,
    },
  };
};
