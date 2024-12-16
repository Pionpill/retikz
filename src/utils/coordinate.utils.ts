import { Axis, Quadrant } from '../types/coordinate.type';
import { Point } from '../types/tikz.type';

/** 计算 point2 相对于 point1 的平面直角坐标系象限位置 */
export const getRelatedPointLocation = (point1: Point, point2: Point) => {
  const [centerX, centerY] = point1;
  const [x, y] = point2;
  if (centerX === x && centerY === y) return Axis.CENTER;
  if (centerX === x) return y > centerY ? Axis.Y_POS : Axis.Y_NEG;
  if (centerY === y) return x > centerX ? Axis.X_POS : Axis.X_NEG;
  if (x > centerX) {
    return y > centerY ? Quadrant.I : Quadrant.IV;
  } else {
    return y > centerY ? Quadrant.II : Quadrant.III;
  }
};

