import type { Transform } from '../../contract';
import type { IRPosition } from '../../schemas';
import { applyScopeTransform, applyTransformChain, inverseTransformChain } from '../shared';
import type { ComposedScopeTransform } from '../shared';
import type { CompiledBoundaryGeometry } from './types';

/** 保持既有布局投影口径，只复用合成的点变换与旋转/缩放累计量 */
export const projectLayoutWithTransform = <
  TGeometry extends CompiledBoundaryGeometry & { geometry: { contentCenter?: IRPosition } },
>(
  layout: TGeometry,
  transform: ComposedScopeTransform,
): TGeometry => {
  const [x, y] = applyScopeTransform([layout.geometry.rect.x, layout.geometry.rect.y], transform);
  const scaleX = Math.abs(transform.scaleX);
  const scaleY = Math.abs(transform.scaleY);
  return {
    ...layout,
    geometry: {
      ...layout.geometry,
      ...(layout.geometry.contentCenter === undefined
        ? {}
        : {
            contentCenter: applyScopeTransform(layout.geometry.contentCenter, transform),
          }),
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

/** 将已按 parent ancestor chain 发布的 layout 投影并返回新布局，不修改已发布对象当前 Scope own chain */
export const projectPublishedCompileLayout = <
  TGeometry extends CompiledBoundaryGeometry & { geometry: { contentCenter?: IRPosition } },
>(
  layout: TGeometry,
  parentChain: ReadonlyArray<Transform>,
  ownChain: ReadonlyArray<Transform>,
): TGeometry => {
  if (ownChain.length === 0) return layout;

  const projectAcrossParent = (point: IRPosition): IRPosition => {
    const parentPoint = parentChain.length === 0 ? point : inverseTransformChain(point, parentChain);
    const transformedParent = applyTransformChain(parentPoint, ownChain);
    return parentChain.length === 0 ? transformedParent : applyTransformChain(transformedParent, parentChain);
  };

  const [x, y] = projectAcrossParent([layout.geometry.rect.x, layout.geometry.rect.y]);
  let rotateDegrees = 0;
  let scaleX = 1;
  let scaleY = 1;

  for (const transform of ownChain) {
    if (transform.kind === 'rotate') rotateDegrees += transform.degrees;
    if (transform.kind === 'scale') {
      scaleX *= transform.x;
      scaleY *= transform.y ?? transform.x;
    }
  }

  const rect = {
    ...layout.geometry.rect,
    x,
    y,
    rotate: (layout.geometry.rect.rotate ?? 0) + (rotateDegrees * Math.PI) / 180,
    width: layout.geometry.rect.width * Math.abs(scaleX),
    height: layout.geometry.rect.height * Math.abs(scaleY),
  };
  const margin = {
    top: layout.geometry.margin.top * Math.abs(scaleY),
    right: layout.geometry.margin.right * Math.abs(scaleX),
    bottom: layout.geometry.margin.bottom * Math.abs(scaleY),
    left: layout.geometry.margin.left * Math.abs(scaleX),
  };
  return {
    ...layout,
    geometry: {
      ...layout.geometry,
      rect,
      margin,
      ...(layout.geometry.contentCenter === undefined
        ? {}
        : {
            contentCenter: projectAcrossParent(layout.geometry.contentCenter),
          }),
    },
  };
};
