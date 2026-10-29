import type { NodeReferenceGeometry } from '../../resolve';
import type { NodeBoundaryContext } from './boundary-context';
import type { CompiledNodeLayout } from './types';

/** 从节点布局提取供引用解析使用的几何信息 */
export const createNodeReferenceGeometry = (
  layout: CompiledNodeLayout,
  context?: NodeBoundaryContext,
  id?: string,
  irPath?: string,
): NodeReferenceGeometry => {
  const reference: NodeReferenceGeometry = {
    id,
    shapeName: layout.shape.name,
    shapeDef: layout.shape.definition,
    shapeParams: { ...layout.shape.params },
    rect: { ...layout.geometry.rect },
    margin: { ...layout.geometry.margin },
    boundary: layout.boundarySource,
    boundaryResolution: layout.boundary,
    irPath: irPath ?? context?.get(layout).irPath,
  };
  context?.bind(layout, reference);
  return reference;
};
