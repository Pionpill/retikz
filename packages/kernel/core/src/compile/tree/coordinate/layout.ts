import type { ShapeDefinition } from '../../../contract';
import type { ProviderRegistry } from '../../../providers';
import { resolveNodeShape } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { CompiledNodeLayout } from '../../layout';

/** 从局部坐标构造可供引用的零尺寸几何，不登记名称 */
export const createCoordinateLayout = (
  position: IRPosition,
  shapeRegistry: ProviderRegistry<ShapeDefinition>,
): CompiledNodeLayout => {
  const shape = resolveNodeShape({ node: { shape: 'rectangle' }, shapeRegistry, scaleX: 1, scaleY: 1 });

  return {
    shape,
    boundary: { name: shape.definition.name, definition: shape.definition, params: shape.params, isShape: true },
    geometry: {
      rect: { x: position[0], y: position[1], width: 0, height: 0, rotate: 0 },
      contentCenter: [position[0], position[1]],
      contentSize: { width: 0, height: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
};
