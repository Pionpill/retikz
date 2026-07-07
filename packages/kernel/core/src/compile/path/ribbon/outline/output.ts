import type { PathCommand, PathPrim } from '../../../../contract';
import type { IRPosition } from '../../../../schemas';
import type { PaintResolver } from '../../../resource';
import type { RibbonLike } from '../types';

import { resolveShadow } from '../../../style';

/**
 * 将闭合轮廓命令写成最终 PathPrim
 * @description 仅当用户显式请求 stroke / strokeWidth 时写描边字段。
 */
export const styledPrimitiveFromOutline = (
  ribbon: RibbonLike,
  outline: { commands: Array<PathCommand>; points: Array<IRPosition> },
  resolvePaint: PaintResolver,
): PathPrim => {
  const outlineRequested = ribbon.stroke !== undefined || ribbon.strokeWidth !== undefined;
  const primitive: PathPrim = {
    type: 'path',
    commands: outline.commands,
    fill: resolvePaint(ribbon.fill) ?? 'currentColor',
    fillOpacity: ribbon.fillOpacity,
    opacity: ribbon.opacity,
    shadow: resolveShadow(ribbon.shadow),
    blendMode: ribbon.blendMode,
  };
  if (outlineRequested) {
    primitive.stroke = resolvePaint(ribbon.stroke) ?? 'currentColor';
    primitive.strokeWidth = ribbon.strokeWidth ?? 1;
    primitive.strokeOpacity = ribbon.strokeOpacity;
  }
  if (ribbon.id !== undefined) primitive.id = ribbon.id;
  if (ribbon.meta !== undefined) primitive.meta = ribbon.meta;
  if (ribbon.animations !== undefined) primitive.animations = ribbon.animations;
  return primitive;
};
