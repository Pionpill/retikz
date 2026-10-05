import type { Position } from '@retikz/math';

import type { IRBoundaryLabel } from '../../schemas';
import { DEG_TO_RAD, normalizeDegrees, RAD_TO_DEG } from '../../shared/geometry';

/** 根据外向轴解析文字旋转，保持 Node 既有翻转语义 */
export const resolveBoundaryLabelRotation = (
  rotate: IRBoundaryLabel['rotate'],
  keepUpright: boolean | undefined,
  outward: Position,
): number => {
  if (rotate === undefined || rotate === 'none') return 0;

  let degrees =
    typeof rotate === 'number'
      ? rotate
      : Math.atan2(outward[1], outward[0]) * RAD_TO_DEG + (rotate === 'tangent' ? 90 : 0);
  const normalized = normalizeDegrees(degrees);
  if (keepUpright && normalized > 90 && normalized < 270) degrees += 180;

  return degrees;
};

/** 旋转文字布局框沿单位向量的半投影长度 */
export const labelProjectedHalfExtent = (vector: Position, width: number, height: number, degrees: number): number => {
  const angle = degrees * DEG_TO_RAD;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return (
    (Math.abs(vector[0] * cos + vector[1] * sin) * width) / 2 +
    (Math.abs(-vector[0] * sin + vector[1] * cos) * height) / 2
  );
};

/** 共享边界标签布局输入，向量均为宿主局部单位轴 */
export type BoundaryLabelBoxInput = {
  /** 决定内外放置、对齐及旋转的边界标签配置 */
  label: IRBoundaryLabel;
  /** 宿主局部坐标中的边界采样点 */
  point: Position;
  /** 采样点处朝外的单位法向量 */
  outward: Position;
  /** 采样点处沿边界的单位切向量 */
  tangent: Position;
  /** 已测量的标签文字框宽度 */
  width: number;
  /** 已测量的标签文字框高度 */
  height: number;
  /** 标签文字框与宿主边界之间的净距离 */
  distance: number;
};

/** 将已测量文字框放在边界内外，位置和旋转独立计算 */
export const placeBoundaryLabelBox = ({
  label,
  point,
  outward,
  tangent,
  width,
  height,
  distance,
}: BoundaryLabelBoxInput): { center: Position; rotateDeg: number } => {
  const rotateDeg = resolveBoundaryLabelRotation(label.rotate, label.keepUpright, outward);
  const extent = labelProjectedHalfExtent(outward, width, height, rotateDeg);
  const offset = (label.placement === 'inside' ? -1 : 1) * (distance + extent);
  const alignment =
    (label.align === 'start' ? 1 : label.align === 'end' ? -1 : 0) *
    labelProjectedHalfExtent(tangent, width, height, rotateDeg);

  return {
    center: [
      point[0] + outward[0] * offset + tangent[0] * alignment,
      point[1] + outward[1] * offset + tangent[1] * alignment,
    ],
    rotateDeg,
  };
};
