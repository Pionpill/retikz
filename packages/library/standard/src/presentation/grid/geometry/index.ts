import type { IRGrid } from '../types';

/** Grid 在局部坐标中的数值边界 */
export type GridNumericBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  position?: Extract<IRGrid['bounds'], { position: unknown }>['position'];
};

/** 将两种 Grid 边界表示投影到同一局部坐标系 */
export const computeGridBounds = (bounds: IRGrid['bounds']): GridNumericBounds => {
  if ('start' in bounds) {
    const [startX, startY] = bounds.start;
    const [endX, endY] = bounds.end;
    return {
      minX: Math.min(startX, endX),
      minY: Math.min(startY, endY),
      maxX: Math.max(startX, endX),
      maxY: Math.max(startY, endY),
    };
  }

  return {
    position: bounds.position,
    minX: -bounds.width / 2,
    minY: -bounds.height / 2,
    maxX: bounds.width / 2,
    maxY: bounds.height / 2,
  };
};
