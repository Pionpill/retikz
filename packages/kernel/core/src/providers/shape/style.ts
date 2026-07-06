import type { EllipsePrim, PathPrim, RectPrim, ResolvedShapeStyle } from '../../contract';

type ShapeStylePassthrough = Omit<ResolvedShapeStyle, 'fill' | 'stroke' | 'strokeWidth'>;

type PathPrimitiveStyle = Pick<
  PathPrim,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'dashPattern'
  | 'dashOffset'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
>;

type EllipsePrimitiveStyle = Pick<
  EllipsePrim,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'dashPattern'
  | 'dashOffset'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
>;

type RectPrimitiveStyle = Pick<
  RectPrim,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'dashPattern'
  | 'dashOffset'
  | 'cornerRadius'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
>;

const withoutCornerRadius = (
  style: ShapeStylePassthrough,
): Omit<ShapeStylePassthrough, 'cornerRadius'> => {
  const passthroughStyle = { ...style };
  delete passthroughStyle.cornerRadius;
  return passthroughStyle;
};

/** 将 shape style 落到 path primitive；过滤 cornerRadius 并补默认 fill / stroke / strokeWidth。 */
export const pathPrimitiveStyle = (
  style: ResolvedShapeStyle,
  options?: { fill?: PathPrim['fill'] },
): PathPrimitiveStyle => {
  const { fill, stroke, strokeWidth, ...passthroughStyle } = style;
  return {
    ...withoutCornerRadius(passthroughStyle),
    fill: options?.fill ?? fill ?? 'transparent',
    stroke: stroke ?? 'currentColor',
    strokeWidth: strokeWidth ?? 1,
  };
};

/** 将 shape style 落到 ellipse primitive；过滤 cornerRadius 并补默认 fill / stroke / strokeWidth。 */
export const ellipsePrimitiveStyle = (style: ResolvedShapeStyle): EllipsePrimitiveStyle => {
  const { fill, stroke, strokeWidth, ...passthroughStyle } = style;
  return {
    ...withoutCornerRadius(passthroughStyle),
    fill: fill ?? 'transparent',
    stroke: stroke ?? 'currentColor',
    strokeWidth: strokeWidth ?? 1,
  };
};

/** 将 shape style 落到 rect primitive；用调用方圆角覆盖 style.cornerRadius。 */
export const rectPrimitiveStyle = (
  style: ResolvedShapeStyle,
  cornerRadius: RectPrim['cornerRadius'],
): RectPrimitiveStyle => {
  const { fill, stroke, strokeWidth, ...passthroughStyle } = style;
  return {
    ...passthroughStyle,
    fill: fill ?? 'transparent',
    stroke: stroke ?? 'currentColor',
    strokeWidth: strokeWidth ?? 1,
    cornerRadius,
  };
};
