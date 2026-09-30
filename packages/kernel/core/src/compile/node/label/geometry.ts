import type { Position } from '@retikz/math';
import { DEFAULT_EPSILON } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { CanonicalNodeLabelBoundaryPosition } from '../../../resolve';
import { AnchorUnitVectorByAnchor } from '../../../shared';
import { DEG_TO_RAD } from '../../../shared/geometry';
import { placeBoundaryLabelBox, resolveBoundaryLabelRotation } from '../../text';
import { anchorOf, angleBoundaryOf } from '../anchors';
import type { MeasuredNodeLabel, NodeLabelLayout, NodeLayout } from '../types';

const isLabelBoundaryPosition = (
  position: MeasuredNodeLabel['position'],
): position is CanonicalNodeLabelBoundaryPosition => typeof position === 'object';

const ensureBoxLikeLabelBoundary = (layout: NodeLayout): void => {
  if (layout.shapeName !== 'rectangle') {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Node label boundary position requires a box-like boundary; shape '${layout.shapeName}' is not supported.`,
    );
  }
};

const labelBoundaryPoint = (layout: NodeLayout, position: CanonicalNodeLabelBoundaryPosition): Position => {
  ensureBoxLikeLabelBoundary(layout);
  const fraction = position.fraction;
  const left = layout.rect.x - layout.rect.width / 2;
  const right = layout.rect.x + layout.rect.width / 2;
  const top = layout.rect.y - layout.rect.height / 2;
  const bottom = layout.rect.y + layout.rect.height / 2;
  if (position.boundary === 'top') return [left + layout.rect.width * fraction, top];
  if (position.boundary === 'right') return [right, top + layout.rect.height * fraction];
  if (position.boundary === 'bottom') return [left + layout.rect.width * fraction, bottom];
  return [left, top + layout.rect.height * fraction];
};

const labelBoundaryDirection = (position: CanonicalNodeLabelBoundaryPosition): Position => {
  if (position.boundary === 'top') return [0, -1];
  if (position.boundary === 'right') return [1, 0];
  if (position.boundary === 'bottom') return [0, 1];
  return [-1, 0];
};

/** 从 attachment 直接解析 label 放置单位向量 */
const labelPlacementVector = (position: MeasuredNodeLabel['position']): Position => {
  if (position === 'center') return [1, 0];
  if (isLabelBoundaryPosition(position)) return labelBoundaryDirection(position);
  if (typeof position === 'number') {
    const rad = position * DEG_TO_RAD;
    return [Math.cos(rad), Math.sin(rad)];
  }
  return AnchorUnitVectorByAnchor[position];
};

/** 从 label 附着方向取得稳定的切线正向 */
const labelTangentVector = (position: MeasuredNodeLabel['position']): Position => {
  if (isLabelBoundaryPosition(position)) {
    if (position.boundary === 'top' || position.boundary === 'bottom') return [1, 0];
    return [0, 1];
  }
  if (position === 'top' || position === 'bottom') return [1, 0];
  if (position === 'left' || position === 'right') return [0, 1];
  if (position === 'center') return [1, 0];
  const radial = labelPlacementVector(position);
  return [-radial[1], radial[0]];
};

/** label 在 node 边界上的附着点 */
export const labelBorderPoint = (layout: NodeLayout, label: Pick<MeasuredNodeLabel, 'position'>): Position => {
  if (label.position === 'center') return [layout.rect.x, layout.rect.y];
  const aaLayout: NodeLayout = { ...layout, rect: { ...layout.rect, rotate: 0 } };
  if (isLabelBoundaryPosition(label.position)) {
    return labelBoundaryPoint(aaLayout, label.position);
  }
  if (typeof label.position === 'number') {
    return angleBoundaryOf(aaLayout, label.position);
  }
  return anchorOf(aaLayout, label.position);
};

export const labelCenter = (layout: NodeLayout, label: NodeLabelLayout): Position => {
  return [layout.rect.x + label.centerOffset[0], layout.rect.y + label.centerOffset[1]];
};

/** 从 label 中心朝 border 方向，求 label 框边界交点 */
export type LabelBoxEdgeTowardInput = {
  center: Position;
  border: Position;
  halfWidth: number;
  halfHeight: number;
  /** label 视觉盒自旋角 */
  rotateDeg: number;
};

export const labelBoxEdgeToward = ({
  center,
  border,
  halfWidth,
  halfHeight,
  rotateDeg,
}: LabelBoxEdgeTowardInput): Position => {
  const dx = border[0] - center[0];
  const dy = border[1] - center[1];
  const len = Math.hypot(dx, dy);
  if (len < DEFAULT_EPSILON) return center;
  const ux = dx / len;
  const uy = dy / len;
  const rad = rotateDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const alongX = Math.abs(ux * cos + uy * sin);
  const alongY = Math.abs(ux * -sin + uy * cos);
  const sx = alongX > DEFAULT_EPSILON ? halfWidth / alongX : Number.POSITIVE_INFINITY;
  const sy = alongY > DEFAULT_EPSILON ? halfHeight / alongY : Number.POSITIVE_INFINITY;
  const s = Math.min(sx, sy);
  return [center[0] + ux * s, center[1] + uy * s];
};

/**
 * 算 label 文本自旋角度
 * @description keepUpright 会翻转倒置文本
 */
export const resolveLabelRotateDeg = (
  label: Pick<MeasuredNodeLabel, 'position' | 'rotate' | 'keepUpright'>,
): number => {
  return resolveBoundaryLabelRotation(label.rotate, label.keepUpright, labelPlacementVector(label.position));
};

/** 把已测量 label 解析为相对最终 Node rect 的局部几何 */
export const resolveNodeLabelGeometry = (layout: NodeLayout, label: MeasuredNodeLabel): NodeLabelLayout => {
  const rotateDeg = resolveLabelRotateDeg(label);
  if (label.position === 'center') {
    return { ...label, rotateDeg, centerOffset: [0, 0] };
  }

  const placed = placeBoundaryLabelBox({
    label: {
      text: label.text,
      rotate: label.rotate,
      keepUpright: label.keepUpright,
      placement: label.placement,
      align: label.align,
    },
    point: labelBorderPoint(layout, label),
    outward: labelPlacementVector(label.position),
    tangent: labelTangentVector(label.position),
    width: label.measuredWidth,
    height: label.measuredHeight,
    distance: label.distance,
  });
  return {
    ...label,
    rotateDeg: placed.rotateDeg,
    centerOffset: [placed.center[0] - layout.rect.x, placed.center[1] - layout.rect.y],
  };
};

/**
 * 节点 label 的外接点
 * @description 用于顶层 bbox / viewBox 计算
 */
export const labelExtentPoints = (layout: NodeLayout): Array<Position> => {
  if (!layout.labels || layout.labels.length === 0) return [];
  const cx = layout.rect.x;
  const cy = layout.rect.y;
  const rad = layout.rotateDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pts: Array<Position> = [];
  for (const lab of layout.labels) {
    const [lx, ly] = labelCenter(layout, lab);
    const halfW = lab.measuredWidth / 2;
    const halfH = lab.measuredHeight / 2;
    const labelRad = lab.rotateDeg * DEG_TO_RAD;
    const labelCos = Math.cos(labelRad);
    const labelSin = Math.sin(labelRad);
    const cornerOffsets: Array<Position> = [
      [-halfW, -halfH],
      [halfW, -halfH],
      [-halfW, halfH],
      [halfW, halfH],
    ];
    for (const [offsetX, offsetY] of cornerOffsets) {
      const px = lx + offsetX * labelCos - offsetY * labelSin;
      const py = ly + offsetX * labelSin + offsetY * labelCos;
      if (layout.rotateDeg === 0) {
        pts.push([px, py]);
      } else {
        const dx = px - cx;
        const dy = py - cy;
        pts.push([cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]);
      }
    }
  }
  return pts;
};
