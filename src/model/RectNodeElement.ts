import { Direction, RectEndPoint } from '../types/coordinate.type';
import { Area } from '../types/shape.type';
import { AllLayoutDistance, Point, Size } from '../types/tikz.type';
import { between } from '../utils/math.utils';
import { calculateLinearEquation } from '../utils/equation';

/**
 * SVG 元素封装类，主要用于位置计算
 * 相对于原生 SVG 的区别：中心改为元素几何中心
 */
export default class RectNodeElement {
  center: Point = [0, 0];
  size: Size = [0, 0];
  distanceConfig: AllLayoutDistance;

  constructor(center: Point, size: Size, distanceConfig: AllLayoutDistance) {
    this.center = center;
    this.size = size;
    this.distanceConfig = distanceConfig;
  }

  update(center: Point, size: Size, distanceConfig: AllLayoutDistance) {
    this.center = center;
    this.size = size;
    this.distanceConfig = distanceConfig;
  }

  /** 获取点在盒模型的位置 */
  getPointBoxLocation(point: Point): Direction | 'center' {
    const [pointX, pointY] = point;
    const [x, y] = this.center;
    if (x === pointX && y === pointY) return 'center';
    const diagonalY1 = calculateLinearEquation([
      this.getBoxEndpoint(RectEndPoint.RIGHT_TOP),
      this.getBoxEndpoint(RectEndPoint.LEFT_BOTTOM),
    ])(pointX);
    const diagonalY2 = calculateLinearEquation([
      this.getBoxEndpoint(RectEndPoint.LEFT_TOP),
      this.getBoxEndpoint(RectEndPoint.RIGHT_BOTTOM),
    ])(pointX);
    if (pointY <= diagonalY1 && pointY <= diagonalY2) return Direction.TOP;
    if (pointY >= diagonalY1 && pointY <= diagonalY2) return Direction.RIGHT;
    if (pointY >= diagonalY1 && pointY >= diagonalY2) return Direction.BOTTOM;
    return Direction.LEFT;
  }

  /** 根据其他点的位置计算连线端点位置 TODO 支持三分点 */
  getLinkPoint(point: Point, type?: 'center' | 'direct'): [number, number] | undefined {
    type = type ?? 'direct';
    if (this.getPointArea(point) !== Area.OUTER) return undefined;
    const boxLocation = this.getPointBoxLocation(point);
    console.log('boxLocation', boxLocation);
    switch (type) {
      case 'center':
        return this.getBoxEndpoint(boxLocation);
      default:
        if (boxLocation === 'center') return this.center;
        if ([Direction.TOP, Direction.BOTTOM].includes(boxLocation)) {
          const diagonal = calculateLinearEquation([this.center, point], 'y');
          const { top, bottom } = this.getAllDistance();
          const pointY =
            boxLocation === Direction.TOP
              ? this.center[1] - top - this.size[1] / 2
              : this.center[1] + bottom + this.size[1] / 2;
          console.log('pointY', point, pointY);
          const pointX = diagonal(pointY);
          return [pointX, pointY];
        } else {
          const diagonal = calculateLinearEquation([this.center, point]);
          const { left, right } = this.getAllDistance();
          const pointX =
            boxLocation === Direction.LEFT
              ? this.center[0] - left - this.size[0] / 2
              : this.center[0] + right + this.size[0] / 2;
          const pointY = diagonal(pointX);
          return [pointX, pointY];
        }
    }
  }

  /** 获取某个点相对于盒模型位置 */
  getPointArea(point: Point) {
    const [pointX, pointY] = point;
    const [x, y] = this.center;
    const edgeX: Point = [x - this.size[0] / 2, x + this.size[0] / 2];
    const edgeY: Point = [y - this.size[1] / 2, y + this.size[1] / 2];
    if (between(pointX, edgeX) && between(pointY, edgeY)) {
      return Area.INNER;
    }
    if (!between(pointX, edgeX, true) || !between(pointY, edgeY, true)) {
      return Area.OUTER;
    }
    return Area.EDGE;
  }

  /** 获取盒模型端点 */
  getBoxEndpoint(point: Direction | RectEndPoint | 'center'): Point {
    const [x, y] = this.center;
    const [innerWidth, innerHeight] = this.size;
    const halfWidth = innerWidth / 2;
    const halfHeight = innerHeight / 2;
    const { left, right, top, bottom } = this.getAllDistance();

    switch (point) {
      case 'center':
        return this.center;
      case Direction.TOP:
        return [x, y - halfHeight - top];
      case Direction.BOTTOM:
        return [x, y + halfHeight + bottom];
      case Direction.LEFT:
        return [x - halfWidth - left, y];
      case Direction.RIGHT:
        return [x + halfWidth + right, y];
      case RectEndPoint.LEFT_TOP:
        return [x - halfWidth - left, y - halfHeight - top];
      case RectEndPoint.LEFT_BOTTOM:
        return [x - halfWidth - left, y + halfHeight + bottom];
      case RectEndPoint.RIGHT_TOP:
        return [x + halfWidth + right, y - halfHeight - top];
      case RectEndPoint.RIGHT_BOTTOM:
        return [x + halfWidth + right, y + halfHeight + bottom];
    }
  }

  getAllDistance() {
    return Object.values(this.distanceConfig).reduce(
      (acc, cur) => {
        acc.left += cur.left;
        acc.right += cur.right;
        acc.top += cur.top;
        acc.bottom += cur.bottom;
        return acc;
      },
      { left: 0, right: 0, top: 0, bottom: 0 },
    );
  }
}
