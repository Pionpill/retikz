import type { IRCoordinate } from '../../schemas';
import type { PositionResolveContext } from '../position';
import { resolvePosition } from '../position';
import type { CanonicalCoordinate } from './types';

/** 确定坐标标识与位置配置，补全依赖上下文的默认值 */
export const resolveCoordinate = (input: IRCoordinate, context: PositionResolveContext): CanonicalCoordinate => ({
  id: input.id,
  position: resolvePosition(input.position, context),
});
