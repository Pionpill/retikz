import type { NodeReferenceView } from '../../resolve';
import type { NodeGeometryContext } from './geometry-context';
import type { NodeLayout } from './types';

/** 将布局结果投影为 resolver 消费的节点引用视图 */
export const nodeReferenceViewOf = (layout: NodeLayout, context?: NodeGeometryContext): NodeReferenceView => {
  const reference: NodeReferenceView = {
    id: layout.node.id,
    shapeName: layout.shape.name,
    shapeDef: layout.shape.definition,
    shapeParams: { ...layout.shape.params },
    rect: { ...layout.geometry.rect },
    margin: { ...layout.geometry.margin },
    boundary: layout.node.boundary,
    boundaryResolution: layout.boundary,
    irPath: layout.irPath,
  };
  context?.bind(layout, reference);
  return reference;
};
