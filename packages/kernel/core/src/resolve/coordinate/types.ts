import type { IRCoordinate } from '../../schemas';
import type { CanonicalPosition, PositionResolveContext } from '../position';

/** 已确定标识与位置配置的坐标，最终位置由编译阶段计算 */
export type CanonicalCoordinate = {
  /** 坐标声明的标识 */
  id: IRCoordinate['id'];
  /** 补全默认值后的位置配置 */
  position: CanonicalPosition;
};
export type CoordinateResolveContext = PositionResolveContext;
