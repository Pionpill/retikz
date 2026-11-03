import type { IRPosition } from '../../../schemas';
import type { CompiledNodeLayout } from '../../layout';
import { createSyntheticRectangleLayout } from '../node';
import type { SyntheticLayoutRegistryContext } from '../node';

/** 从局部坐标构造可供引用的零尺寸几何，不登记名称 */
export const createCoordinateLayout = (
  id: string,
  position: IRPosition,
  context: SyntheticLayoutRegistryContext,
): CompiledNodeLayout =>
  createSyntheticRectangleLayout(
    { id, rect: { x: position[0], y: position[1], width: 0, height: 0, rotate: 0 } },
    context,
  );
