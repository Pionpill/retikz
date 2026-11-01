import { applyScopeTransform } from '../../shared';
import type { ComposedScopeTransform } from '../../shared';
import type { CompiledNodeLayout } from './types';

/** 保持既有布局投影口径，只复用合成的点变换与旋转/缩放累计量 */
export const projectLayoutWithTransform = (
  layout: CompiledNodeLayout,
  transform: ComposedScopeTransform,
): CompiledNodeLayout => {
  const [x, y] = applyScopeTransform([layout.geometry.rect.x, layout.geometry.rect.y], transform);
  const scaleX = Math.abs(transform.scaleX);
  const scaleY = Math.abs(transform.scaleY);
  return {
    ...layout,
    geometry: {
      ...layout.geometry,
      rect: {
        ...layout.geometry.rect,
        x,
        y,
        rotate: (layout.geometry.rect.rotate ?? 0) + transform.rotation,
        width: layout.geometry.rect.width * scaleX,
        height: layout.geometry.rect.height * scaleY,
      },
      margin: {
        top: layout.geometry.margin.top * scaleY,
        right: layout.geometry.margin.right * scaleX,
        bottom: layout.geometry.margin.bottom * scaleY,
        left: layout.geometry.margin.left * scaleX,
      },
    },
  };
};
