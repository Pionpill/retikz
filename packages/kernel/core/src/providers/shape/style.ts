import type { EllipsePrimitive, RectPrimitive, CompiledShapeStyle } from '../../contract';

type ShapeStylePassthrough = Omit<CompiledShapeStyle, 'fill' | 'stroke' | 'strokeWidth'>;

type EllipsePrimitiveStyle = Pick<
  EllipsePrimitive,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'dashPattern'
  | 'dashOffset'
  | 'lineCap'
  | 'lineJoin'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
>;

type RectPrimitiveStyle = Pick<
  RectPrimitive,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'dashPattern'
  | 'dashOffset'
  | 'lineCap'
  | 'lineJoin'
  | 'cornerRadius'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
>;

const withoutCornerRadius = (style: ShapeStylePassthrough): Omit<ShapeStylePassthrough, 'cornerRadius'> => {
  const passthroughStyle = { ...style };
  delete passthroughStyle.cornerRadius;
  return passthroughStyle;
};

/** 将 shape style 落到 ellipse primitive；过滤 cornerRadius 并补默认 fill / stroke / strokeWidth */
export const ellipsePrimitiveStyle = (style: CompiledShapeStyle): EllipsePrimitiveStyle => {
  const { fill, stroke, strokeWidth, ...passthroughStyle } = style;
  return {
    ...withoutCornerRadius(passthroughStyle),
    fill: fill ?? 'transparent',
    stroke: stroke ?? 'currentColor',
    strokeWidth: strokeWidth ?? 1,
  };
};

/** 将 shape style 落到 rect primitive；用调用方圆角覆盖 style.cornerRadius */
export const rectPrimitiveStyle = (
  style: CompiledShapeStyle,
  cornerRadius: RectPrimitive['cornerRadius'],
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
