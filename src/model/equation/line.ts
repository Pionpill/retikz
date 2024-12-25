import { Position } from '../../types/coordinate/descartes';

export default class Line {
  // 一般式系数 Ax + By + C = 0，A >= 0
  private a = 0;
  private b = 0;
  private c = 0;

  constructor(a: number, b: number, c: number) {
    if (a === 0 && b === 0) {
        console.error('invalid line equation');
        return;
    }
    this.a = a;
    this.b = b;
    this.c = c;
  }

  getY(x: number) {
    if (this.b === 0) return;
    return -(this.a * x + this.c) / this.b;
  }

  getX(y: number) {
    if (this.a === 0) return;
    return -(this.b * y + this.c) / this.a;
  }

  /** 判断点是否在线上 */
  isPointOn(point: Position, epsilon = 1e-9) {
    const value = this.a * point[0] + this.b * point[1] + this.c;
    return Math.abs(value) <= epsilon;
  }

  /** 两点获取直线方程 */
  static fromPoints(point1: Position, point2: Position) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    const A = y2 - y1;
    const B = x1 - x2;
    const C = x2 * y1 - x1 * y2;
    return new Line(A, B, C);
  }

  /** 获取两条直线交点 */
  getIntersection(line: Line, epsilon = 1e-9) {
    const A1 = this.a;
    const B1 = this.b;
    const C1 = this.c;
    const A2 = line.a;
    const B2 = line.b;
    const C2 = line.c;
    const D = A1 * B2 - A2 * B1;
    if (Math.abs(D) <= epsilon) return;
    const x = (C2 * B1 - C1 * B2) / D;
    const y = (A2 * C1 - A1 * C2) / D;
    return [x, y] as Position;
  }

  /** 点到直线距离 */
  getPointDistance(point: Position) {
    return Math.abs(this.a * point[0] + this.b * point[1] + this.c) / Math.sqrt(this.a * this.a + this.b * this.b);
  }
}
