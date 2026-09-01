import type { IRNodeDefault } from '@retikz/core';

import type { IRPlotPointMark } from '../../../schemas';
import type { MarkPaint } from '../shared';

/** Point glyph 默认最终半径（user units） */
export const POINT_DEFAULT_RADIUS = 5;

/** Point 与 Relation endpoint 共用的 glyph 样式输入 */
export type PointGlyphStyleSource = Pick<
  IRPlotPointMark,
  'padding' | 'minimumSize' | 'stroke' | 'strokeWidth' | 'fillOpacity' | 'strokeOpacity' | 'opacity' | 'rotate'
>;

/** 组装 Point 与 Relation endpoint 共用的 circle glyph 样式 */
export const pointGlyphStyle = (fill: MarkPaint, mark: PointGlyphStyleSource): IRNodeDefault => {
  const padding = mark.padding?.kind === 'constant' ? mark.padding.value : undefined;
  const minimumSize = mark.minimumSize?.kind === 'constant' ? mark.minimumSize.value : undefined;
  const stroke = mark.stroke?.kind === 'constant' ? mark.stroke.value : undefined;
  const strokeWidth = mark.strokeWidth?.kind === 'constant' ? mark.strokeWidth.value : undefined;
  const fillOpacity = mark.fillOpacity?.kind === 'constant' ? mark.fillOpacity.value : undefined;
  const strokeOpacity = mark.strokeOpacity?.kind === 'constant' ? mark.strokeOpacity.value : undefined;
  const opacity = mark.opacity?.kind === 'constant' ? mark.opacity.value : undefined;
  const rotate = mark.rotate?.kind === 'constant' ? mark.rotate.value : undefined;
  return {
    shape: 'circle',
    padding: padding ?? 0,
    minimumSize: minimumSize ?? (POINT_DEFAULT_RADIUS * 2) / Math.SQRT2,
    ...(typeof fill === 'string' ? { color: fill } : {}),
    fill,
    ...(stroke !== undefined ? { stroke } : {}),
    ...(strokeWidth !== undefined ? { strokeWidth } : {}),
    ...(fillOpacity !== undefined ? { fillOpacity } : {}),
    ...(strokeOpacity !== undefined ? { strokeOpacity } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(rotate !== undefined ? { rotate } : {}),
  };
};
