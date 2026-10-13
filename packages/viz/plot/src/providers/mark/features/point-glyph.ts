import type { IRNodeDefault } from '@retikz/core';

import type { IRPlotPointMark } from '../../../schemas';
import { constantMarkOpacity } from '../shared';
import type { MarkPaint } from '../shared';

/** Point glyph 默认最终半径（user units） */
export const POINT_DEFAULT_RADIUS = 5;

/** Point 与 Relation endpoint 共用的 glyph 样式输入 */
export type PointGlyphStyleSource = Pick<
  IRPlotPointMark,
  'padding' | 'minimumSize' | 'stroke' | 'strokeWidth' | 'opacity' | 'rotate'
>;

/** 组装 Point 与 Relation endpoint 共用的 circle glyph 样式 */
export const pointGlyphStyle = (fill: MarkPaint, mark: PointGlyphStyleSource): IRNodeDefault => {
  const padding = mark.padding?.kind === 'constant' ? mark.padding.value : undefined;
  const minimumSize = mark.minimumSize?.kind === 'constant' ? mark.minimumSize.value : undefined;
  const stroke = mark.stroke?.kind === 'constant' ? mark.stroke.value : undefined;
  const strokeWidth = mark.strokeWidth?.kind === 'constant' ? mark.strokeWidth.value : undefined;
  const opacity = constantMarkOpacity(mark.opacity);
  const rotate = mark.rotate?.kind === 'constant' ? mark.rotate.value : undefined;

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
