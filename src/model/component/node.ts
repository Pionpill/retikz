import { Position } from '../../types/coordinate/descartes';
import { DirectionDistance } from '../../types/distance';
import { Area, Size } from '../../types/shape';
import { RectMidPoint, RectThirdPoint, RectVertexPoint } from '../../types/shape/rect';
import { isSameArray, isSameObj } from '../../utils/compare';
import { between } from '../../utils/math';
import Line from '../equation/line';

export type StateListener = (state?: NodeModel, prevState?: NodeModel) => void;

export type NodeConfig = {
  /** 内容中心位置 */
  position: Position;
  /** 内容（文本）尺寸 */
  contentSize: Size;
  /** 内边框距离 */
  innerSep: DirectionDistance;
  /** 外边框距离 */
  outerSep: DirectionDistance;
};

export type NodeAttribute = keyof NodeConfig;

// 目前只支持矩形节点
export default class NodeModel {
  type = ['node'];
  /** 是否初始化节点数据, 很多节点在 layout 阶段才能初始化全部数据 */
  init: boolean = false;
  /** 节点是否已经被销毁，如果已近销毁，其他地方应该删除对节点对象的引用 */
  disposed: boolean = false;
  center: Position = [0, 0];
  size: Size = [0, 0];
  innerSep: DirectionDistance = { left: 0, right: 0, top: 0, bottom: 0 };
  outerSep: DirectionDistance = { left: 0, right: 0, top: 0, bottom: 0 };
  listeners = new Set<StateListener>();

  constructor(config: NodeConfig, init = true) {
    this.update(config, init);
  }

  update(config: Partial<NodeConfig>, init = true) {
    const preSelf = { ...this };
    const { position, contentSize, innerSep, outerSep } = config;
    let needUpdate = false;

    if (!this.init && init) {
      this.init = init;
      needUpdate = true;
    }
    if (position && !isSameArray(position, this.center)) {
      this.center = position;
      needUpdate = true;
    }
    if (contentSize && !isSameArray(contentSize, this.size)) {
      this.size = contentSize;
      needUpdate = true;
    }
    if (innerSep && !isSameObj(innerSep, this.innerSep)) {
      this.innerSep = innerSep;
      needUpdate = true;
    }
    if (outerSep && !isSameObj(outerSep, this.outerSep)) {
      this.outerSep = outerSep;
      needUpdate = true;
    }
    if (this.init && needUpdate) {
      this.notify(preSelf);
    }
  }

  notify(preSelf?: NodeModel) {
    this.listeners.forEach(listener => listener({ ...this }, preSelf));
  }

  subscribe(listener: StateListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose() {
    this.listeners.clear();
    this.disposed = true;
    this.notify(this);
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
  getOuterPoint(point: RectVertexPoint | RectMidPoint | RectThirdPoint): Position | undefined {
    if (!this.init) return undefined;
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
    if (!this.init) return this.center;
    const pointArea = this.getPointArea(point);
    if (pointArea === Area.EDGE) return point;

    const line = Line.fromPoints(point, this.center);
    const PointTL = this.getOuterPoint(RectVertexPoint.TL) as Position;
    const PointTR = this.getOuterPoint(RectVertexPoint.TR) as Position;
    const topCrossPoint = line.getIntersection(Line.fromPoints(PointTL, PointTR));
    if (topCrossPoint && point[1] < this.center[1] && between(topCrossPoint[0], [PointTL[0], PointTR[0]], true)) {
      return topCrossPoint;
    }
    const PointBL = this.getOuterPoint(RectVertexPoint.BL) as Position;
    const PointBR = this.getOuterPoint(RectVertexPoint.BR) as Position;
    const belowCrossPoint = line.getIntersection(Line.fromPoints(PointBL, PointBR));
    if (belowCrossPoint && point[1] > this.center[1] && between(belowCrossPoint[0], [PointBL[0], PointBR[0]], true))
      return belowCrossPoint;
    const leftCrossPoint = line.getIntersection(Line.fromPoints(PointTL, PointBL));
    if (leftCrossPoint && point[0] < this.center[0] && between(leftCrossPoint[1], [PointTL[1], PointBL[1]], true))
      return leftCrossPoint;
    const rightCrossPoint = line.getIntersection(Line.fromPoints(PointTR, PointBR));
    return rightCrossPoint!;
  }

  /** 判断某个变量是否为初始化完成的节点 */
  static isInitializedNode = (node: unknown) => {
    return NodeModel.isNode(node) && (node as NodeModel).init;
  };

  static isNode = (node: unknown) => {
    if (typeof node !== 'object' || node === null) return false;
    if (!('type' in node) || !Array.isArray(node.type)) return false;
    return node.type.includes('node');
  };
}
