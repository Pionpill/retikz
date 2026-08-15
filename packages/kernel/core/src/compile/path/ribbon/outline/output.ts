import type { PathCommand, PathPrim } from '../../../../contract';
import type { PathStyleResolution } from '../../../../resolve/path';
import type { IRPosition } from '../../../../schemas';
import type { PaintInput, PaintResolver } from '../../../resource';
import type { RibbonLike } from '../types';

/**
 * 将闭合轮廓命令写成最终 PathPrim
 * @description 仅当用户显式请求 stroke / strokeWidth 时写描边字段
 */
export const styledPrimitiveFromOutline = (
  ribbon: RibbonLike,
  outline: { commands: Array<PathCommand>; points: Array<IRPosition> },
  resolvePaint: PaintResolver,
  style: PathStyleResolution,
  paint?: Readonly<{ fill?: PaintInput; stroke?: PaintInput }>,
): PathPrim => {
  const primitive: PathPrim = {
    type: 'path',
    commands: outline.commands,
    fill: resolvePaint(paint?.fill) ?? style.ribbonFillDefault,
    fillOpacity: ribbon.fillOpacity,
    opacity: ribbon.opacity,
    shadow: ribbon.shadow,
    blendMode: ribbon.blendMode,
  };
  if (style.strokeRequested) {
    primitive.stroke = resolvePaint(paint?.stroke) ?? style.strokeDefault;
    primitive.strokeWidth = style.strokeWidth;
    primitive.strokeOpacity = ribbon.strokeOpacity;
  }
  if (ribbon.id !== undefined) primitive.id = ribbon.id;
  if (ribbon.meta !== undefined) primitive.meta = ribbon.meta;
  if (ribbon.animations !== undefined) primitive.animations = ribbon.animations;
  return primitive;
};
