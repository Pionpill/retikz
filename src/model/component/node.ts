import { NodeConfig } from '../../components/node/_hooks/useNodeConfig';
import { Position } from '../../types/coordinate/descartes';
import { DirectionDistance } from '../../types/distance';
import { Area, Size } from '../../types/shape';
import { RectMidPoint, RectThirdPoint, RectVertexPoint } from '../../types/shape/rect';
import { between } from '../../utils/math.utils';
import Line from '../equation/line';

// 目前只支持矩形节点
export default class NodeModel {
  center: Position = [0, 0];
  size: Size = [0, 0];
  innerSep: DirectionDistance = { left: 0, right: 0, top: 0, bottom: 0 };
  outerSep: DirectionDistance = { left: 0, right: 0, top: 0, bottom: 0 };

  constructor(config: NodeConfig) {
    this.update(config);
  }

  update(config: Partial<NodeConfig>) {
    if (config.position) this.center = config.position;
    if (config.contentSize) this.size = config.contentSize;
    if (config.innerSep) this.innerSep = config.innerSep;
    if (config.outerSep) this.outerSep = config.outerSep;
  }

  /** 获取某个点相对于节点外边界的区域 */
  getPointArea(point: Position) {
    const [pX, pY] = point;
    const [x, y] = this.center;
    const edgeX: Size = [
      x - this.size[0] / 2 - this.innerSep.left - this.outerSep.left,
      x + this.size[0] / 2 + this.innerSep.right + this.outerSep.right,
    ];
    const edgeY: Size = [
      y - this.size[1] / 2 - this.innerSep.left - this.outerSep.left,
      y + this.size[1] / 2 + this.innerSep.right + this.outerSep.right,
    ];
    if (between(pX, edgeX) && between(pY, edgeY)) return Area.INSIDE;
    if (between(pX, edgeX, true) && between(pY, edgeY, true)) return Area.EDGE;
    return Area.OUTSIDE;
  }

  /** 获取外边界特殊点（中点，顶点，三等分点） */
  getOuterPoint(point: RectVertexPoint | RectMidPoint | RectThirdPoint): Position {
    const [x, y] = this.center;
    const [width, height] = this.size;
    const { left: innerLeft, right: innerRight, top: innerTop, bottom: innerBottom } = this.innerSep;
    const { left: outerLeft, right: outerRight, top: outerTop, bottom: outerBottom } = this.outerSep;
    switch (point) {
      case RectVertexPoint.TL:
        return [x - width / 2 - innerLeft - outerLeft, y - height / 2 - innerTop - outerTop];
      case RectVertexPoint.TR:
        return [x + width / 2 + innerRight + outerRight, y - height / 2 - innerTop - outerTop];
      case RectVertexPoint.BL:
        return [x - width / 2 - innerLeft - outerLeft, y + height / 2 + innerBottom + outerBottom];
      case RectVertexPoint.BR:
        return [x + width / 2 + innerRight + outerRight, y + height / 2 + innerBottom + outerBottom];
      case RectMidPoint.T:
        return [x, y - height / 2 - innerTop - outerTop];
      case RectMidPoint.B:
        return [x, y + height / 2 + innerBottom + outerBottom];
      case RectMidPoint.L:
        return [x - width / 2 - innerLeft - outerLeft, y];
      case RectMidPoint.R:
        return [x + width / 2 + innerRight + outerRight, y];
      case RectThirdPoint.TL:
        return [x - (width / 2 + innerLeft + outerLeft) / 3, y - (height / 2 + innerTop + outerTop) / 3];
      case RectThirdPoint.TR:
        return [x + (width / 2 + innerRight + outerRight) / 3, y - (height / 2 + innerTop + outerTop) / 3];
      case RectThirdPoint.BL:
        return [x - (width / 2 + innerLeft + outerLeft) / 3, y + (height / 2 + innerBottom + outerBottom) / 3];
      case RectThirdPoint.BR:
        return [x + (width / 2 + innerRight + outerRight) / 3, y + (height / 2 + innerBottom + outerBottom) / 3];
      case RectThirdPoint.LT:
        return [x - (width / 2 + innerLeft + outerLeft) / 3, y - (height / 2 + innerTop + outerTop) / 3];
      case RectThirdPoint.LB:
        return [x - (width / 2 + innerLeft + outerLeft) / 3, y + (height / 2 + innerBottom + outerBottom) / 3];
      case RectThirdPoint.RT:
        return [x + (width / 2 + innerRight + outerRight) / 3, y - (height / 2 + innerTop + outerTop) / 3];
      case RectThirdPoint.RB:
        return [x + (width / 2 + innerRight + outerRight) / 3, y + (height / 2 + innerBottom + outerBottom) / 3];
    }
  }

  /** 获取外部点与 node 中心连线与外边缘的交点 */
  getCrossPoint(point: Position) {
    if (this.getPointArea(point) !== Area.OUTSIDE) return;
    const line = Line.fromPoints(point, this.center);
    const PointTL = this.getOuterPoint(RectVertexPoint.TL);
    const PointTR = this.getOuterPoint(RectVertexPoint.TR);
    const aboveCrossPoint = line.getIntersection(Line.fromPoints(PointTL, PointTR));
    if (aboveCrossPoint && between(aboveCrossPoint[0], [PointTL[0], PointTR[0]], true)) return aboveCrossPoint;
    const PointBL = this.getOuterPoint(RectVertexPoint.BL);
    const PointBR = this.getOuterPoint(RectVertexPoint.BR);
    const belowCrossPoint = line.getIntersection(Line.fromPoints(PointBL, PointBR));
    if (belowCrossPoint && between(belowCrossPoint[0], [PointBL[0], PointBR[0]], true)) return belowCrossPoint;
    const leftCrossPoint = line.getIntersection(Line.fromPoints(PointTL, PointBL));
    if (leftCrossPoint && between(leftCrossPoint[1], [PointTL[1], PointBL[1]], true)) return leftCrossPoint;
    const rightCrossPoint = line.getIntersection(Line.fromPoints(PointTR, PointBR));
    return rightCrossPoint;
  }
}
