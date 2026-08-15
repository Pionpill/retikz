import type { IRPosition, PathCommand, PathPrim, ResolvedPathKindAppearance } from '@retikz/core';

import type { RibbonLike } from '../types';

/**
 * 将闭合轮廓命令写成最终 PathPrim
 * @description 仅当用户显式请求 stroke / strokeWidth 时写描边字段
 */
export const styledPrimitiveFromOutline = (
  ribbon: RibbonLike,
  outline: { commands: Array<PathCommand>; points: Array<IRPosition> },
  appearance: ResolvedPathKindAppearance,
): PathPrim => {
  const strokeRequested = ribbon.stroke !== undefined || ribbon.strokeWidth !== undefined;
  const primitive: PathPrim = {
    type: 'path',
    commands: outline.commands,
    fill: appearance.fill ?? appearance.color ?? 'currentColor',
    fillRule: appearance.fillRule,
    fillOpacity: ribbon.fillOpacity,
    opacity: ribbon.opacity,
    shadow: appearance.shadow,
    blendMode: appearance.blendMode,
  };
  if (strokeRequested) {
    primitive.stroke = appearance.stroke ?? 'currentColor';
    primitive.strokeWidth = appearance.strokeWidth;
    primitive.strokeOpacity = ribbon.strokeOpacity;
    primitive.dashPattern = appearance.dashPattern;
    primitive.dashOffset = appearance.dashOffset;
    primitive.strokeLinecap = appearance.strokeLinecap;
    primitive.strokeLinejoin = appearance.strokeLinejoin;
  }
  if (ribbon.id !== undefined) primitive.id = ribbon.id;
  if (ribbon.meta !== undefined) primitive.meta = ribbon.meta;
  if (ribbon.animations !== undefined) primitive.animations = ribbon.animations;
  return primitive;
};
