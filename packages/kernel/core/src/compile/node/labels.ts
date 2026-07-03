import { arcEndPoint } from '@retikz/math';

import type { IRNodeLabel, IRNodeLabelBoundaryPosition } from '../../schemas';
import type { Position } from '../../shared/geometry';
import type { NodeLabelLayout, NodeLayout } from './types';

import { DEG_TO_RAD, normalizeDegrees, RAD_TO_DEG } from '../../shared/geometry';
import { DirectionVectorByAtDirection, LabelAnchorByAtDirection } from '../direction';
import { anchorOf, angleBoundaryOf } from './anchors';

/** Node label 与 node 边界默认距离（TikZ 默认 0pt 视觉太贴） */
export const DEFAULT_LABEL_DISTANCE = 12;

const isLabelBoundaryPosition = (position: NodeLabelLayout['position']): position is IRNodeLabelBoundaryPosition =>
  typeof position === 'object';

const normalizeLabelBoundaryPosition = (position: IRNodeLabelBoundaryPosition): IRNodeLabelBoundaryPosition => ({
  ...position,
  boundary: position.boundary,
});

export const normalizeLabelPosition = (
  position: IRNodeLabel['position'] | undefined,
): NodeLabelLayout['position'] => {
  if (position === undefined) return 'top';
  if (typeof position !== 'string') {
    return typeof position === 'object' ? normalizeLabelBoundaryPosition(position) : position;
  }
  if (position === 'center') return position;
  return position;
};

const ensureBoxLikeLabelBoundary = (layout: NodeLayout): void => {
  if (layout.shapeName !== 'rectangle') {
    throw new Error(
      `Node label boundary position requires a box-like boundary; shape '${layout.shapeName}' is not supported.`,
    );
  }
};

const labelBoundaryPoint = (layout: NodeLayout, position: IRNodeLabelBoundaryPosition): Position => {
  ensureBoxLikeLabelBoundary(layout);
  const fraction = position.fraction ?? 0.5;
  const left = layout.rect.x - layout.rect.width / 2;
  const right = layout.rect.x + layout.rect.width / 2;
  const top = layout.rect.y - layout.rect.height / 2;
  const bottom = layout.rect.y + layout.rect.height / 2;
  if (position.boundary === 'top') return [left + layout.rect.width * fraction, top];
  if (position.boundary === 'right') return [right, top + layout.rect.height * fraction];
  if (position.boundary === 'bottom') return [left + layout.rect.width * fraction, bottom];
  return [left, top + layout.rect.height * fraction];
};

const labelBoundaryDirection = (position: IRNodeLabelBoundaryPosition): Position => {
  if (position.boundary === 'top') return [0, -1];
  if (position.boundary === 'right') return [1, 0];
  if (position.boundary === 'bottom') return [0, 1];
  return [-1, 0];
};

const labelPlacementSign = (label: NodeLabelLayout): number => (label.placement === 'inside' ? -1 : 1);

/** label 在 node 边界上的附着点（未旋转局部系；pin 引线起点 = 此点） */
export const labelBorderPoint = (layout: NodeLayout, label: NodeLabelLayout): Position => {
  if (label.position === 'center') return [layout.rect.x, layout.rect.y];
  const aaLayout: NodeLayout = { ...layout, rect: { ...layout.rect, rotate: 0 } };
  if (isLabelBoundaryPosition(label.position)) {
    return labelBoundaryPoint(aaLayout, label.position);
  }
  if (typeof label.position === 'number') {
    return angleBoundaryOf(aaLayout, label.position);
  }
  return anchorOf(aaLayout, LabelAnchorByAtDirection[label.position]);
};

export const labelCenter = (layout: NodeLayout, label: NodeLabelLayout): Position => {
  if (label.position === 'center') return [layout.rect.x, layout.rect.y];
  const [bx, by] = labelBorderPoint(layout, label);
  const sign = labelPlacementSign(label);
  if (isLabelBoundaryPosition(label.position)) {
    const vec = labelBoundaryDirection(label.position);
    return [bx + vec[0] * label.distance * sign, by + vec[1] * label.distance * sign];
  }
  if (typeof label.position === 'number') {
    return arcEndPoint([bx, by], label.distance * sign, label.position);
  }
  const vec = DirectionVectorByAtDirection[label.position];
  return [bx + vec[0] * label.distance * sign, by + vec[1] * label.distance * sign];
};

/** 从 label 中心朝 border 方向，求 label 框（halfW×halfH）边界交点（pin 引线终点 = label 框近 node 边） */
export const labelBoxEdgeToward = (center: Position, border: Position, halfW: number, halfH: number): Position => {
  const dx = border[0] - center[0];
  const dy = border[1] - center[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return center;
  const ux = dx / len;
  const uy = dy / len;
  const sx = Math.abs(ux) > 1e-9 ? halfW / Math.abs(ux) : Number.POSITIVE_INFINITY;
  const sy = Math.abs(uy) > 1e-9 ? halfH / Math.abs(uy) : Number.POSITIVE_INFINITY;
  const s = Math.min(sx, sy, len); // 不越过 border 本身
  return [center[0] + ux * s, center[1] + uy * s];
};

/**
 * 算 label 文本自旋角度（度，屏幕 y-down，节点局部系）
 * @description radial = atan2(label中心 − node中心)；tangent = radial + 90；number = 原值；none / 缺省 = 0。
 *   keepUpright 时把"偏离正立 > 90°"的角度翻 180° 保阅读方向。方向向量在局部坐标算，node 自身 rotate 由外层 group 叠加。
 */
export const resolveLabelRotateDeg = (
  label: NodeLabelLayout,
  lx: number,
  ly: number,
  cx: number,
  cy: number,
): number => {
  const mode = label.rotate;
  if (mode === undefined || mode === 'none') return 0;
  let deg: number;
  if (typeof mode === 'number') {
    deg = mode;
  } else {
    const radial = Math.atan2(ly - cy, lx - cx) * RAD_TO_DEG;
    deg = mode === 'tangent' ? radial + 90 : radial;
  }
  if (label.keepUpright) {
    const norm = normalizeDegrees(deg);
    if (norm > 90 && norm < 270) deg += 180;
  }
  return deg;
};

/**
 * 节点 label 的外接点（供顶层 bbox / viewBox 计算，让 label 不被裁——与 step.label 进 bbox 一致）
 * @description 每个 label 取其文本框四角；label 中心走 labelCenter（轴对齐系），node 自身 rotate 时绕 node 中心旋转
 *   （与 emit 的 group rotate 同步）。pin 引线起点在 node 边界内、已被 node 四角覆盖，无需额外。
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
    const halfH = lab.fontSize / 2;
    const corners: Array<Position> = [
      [lx - halfW, ly - halfH],
      [lx + halfW, ly - halfH],
      [lx - halfW, ly + halfH],
      [lx + halfW, ly + halfH],
    ];
    for (const [px, py] of corners) {
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
