import type { Position } from '@retikz/math';
import { DEFAULT_EPSILON, DEG_TO_RAD } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { CanonicalNodeLabel, CanonicalNodeLabelBoundaryPosition } from '../../../resolve';
import { anchorUnitVectorByAnchor } from '../../../shared';
import { evaluateNamedBoundaryAnchor, evaluateAngleBoundaryPoint } from '../../boundary';
import { placeLabelBox, calculateLabelRotation, layoutTextBlock } from '../../text';
import type {
  CompiledNodeLayout,
  MeasuredNodeLabel,
  NodeLabelLayout,
  CompiledNodeLabelPlacement,
  NodeCompileContext,
} from '../types';

const isLabelBoundaryPosition = (
  position: CanonicalNodeLabel['position'],
): position is CanonicalNodeLabelBoundaryPosition => typeof position === 'object';

const assertBoxLikeLabelBoundary = (layout: CompiledNodeLayout): void => {
  if (layout.shape.name !== 'rectangle') {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Node label boundary position requires a box-like boundary; shape '${layout.shape.name}' is not supported.`,
    );
  }
};

const calculateLabelBoundaryPoint = (
  layout: CompiledNodeLayout,
  canon: CanonicalNodeLabelBoundaryPosition,
): Position => {
  assertBoxLikeLabelBoundary(layout);
  const fraction = canon.fraction;
  const left = layout.geometry.rect.x - layout.geometry.rect.width / 2;
  const right = layout.geometry.rect.x + layout.geometry.rect.width / 2;
  const top = layout.geometry.rect.y - layout.geometry.rect.height / 2;
  const bottom = layout.geometry.rect.y + layout.geometry.rect.height / 2;
  if (canon.boundary === 'top') return [left + layout.geometry.rect.width * fraction, top];
  if (canon.boundary === 'right') return [right, top + layout.geometry.rect.height * fraction];
  if (canon.boundary === 'bottom') return [left + layout.geometry.rect.width * fraction, bottom];

  return [left, top + layout.geometry.rect.height * fraction];
};

const getLabelBoundaryDirection = (canon: CanonicalNodeLabelBoundaryPosition): Position => {
  if (canon.boundary === 'top') return [0, -1];
  if (canon.boundary === 'right') return [1, 0];
  if (canon.boundary === 'bottom') return [0, 1];

  return [-1, 0];
};

/** 从 attachment 直接解析 label 放置单位向量 */
const calculateLabelPlacementVector = (position: CanonicalNodeLabel['position']): Position => {
  if (position === 'center') return [1, 0];
  if (isLabelBoundaryPosition(position)) return getLabelBoundaryDirection(position);
  if (typeof position === 'number') {
    const rad = position * DEG_TO_RAD;
    return [Math.cos(rad), Math.sin(rad)];
  }

  return anchorUnitVectorByAnchor[position];
};

/** 从 label 附着方向取得稳定的切线正向 */
const calculateLabelTangentVector = (position: CanonicalNodeLabel['position']): Position => {
  if (isLabelBoundaryPosition(position)) {
    if (position.boundary === 'top' || position.boundary === 'bottom') return [1, 0];
    return [0, 1];
  }

  if (position === 'top' || position === 'bottom') return [1, 0];
  if (position === 'left' || position === 'right') return [0, 1];
  if (position === 'center') return [1, 0];

  const radial = calculateLabelPlacementVector(position);

  return [-radial[1], radial[0]];
};

/** label 在 node 边界上的附着点 */
export const calculateNodeLabelBorderPoint = (
  layout: CompiledNodeLayout,
  position: CanonicalNodeLabel['position'],
): Position => {
  if (position === 'center') return [layout.geometry.rect.x, layout.geometry.rect.y];

  const aaLayout: CompiledNodeLayout = {
    ...layout,
    geometry: { ...layout.geometry, rect: { ...layout.geometry.rect, rotate: 0 } },
  };
  if (isLabelBoundaryPosition(position)) {
    return calculateLabelBoundaryPoint(aaLayout, position);
  }

  if (typeof position === 'number') {
    return evaluateAngleBoundaryPoint(aaLayout, position);
  }

  return evaluateNamedBoundaryAnchor(aaLayout, position);
};

/** 将标签相对节点中心的偏移换算为当前布局坐标中的中心点 */
export const calculateNodeLabelCenter = (
  layout: Pick<CompiledNodeLayout, 'geometry'>,
  label: Pick<NodeLabelLayout, 'centerOffset'>,
): Position => {
  return [layout.geometry.rect.x + label.centerOffset[0], layout.geometry.rect.y + label.centerOffset[1]];
};

/** 从 label 中心朝 border 方向，求 label 框边界交点 */
type InputLabelBoxIntersection = {
  /** 标签视觉盒的中心，与 border 使用同一坐标系 */
  center: Position;
  /** 用于确定从标签中心向外求交方向的目标点 */
  border: Position;
  /** 标签未旋转视觉盒的半宽 */
  halfWidth: number;
  /** 标签未旋转视觉盒的半高 */
  halfHeight: number;
  /** label 视觉盒自旋角 */
  rotateDeg: number;
};

/**
 * 从标签中心朝目标点求旋转矩形的边界交点
 * @returns 射线与视觉盒的首次交点；两点距离小于几何容差时返回原 center 引用
 */
export const calculateLabelBoxIntersection = ({
  center,
  border,
  halfWidth,
  halfHeight,
  rotateDeg,
}: InputLabelBoxIntersection): Position => {
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
const calculateLabelRotationDegrees = (
  label: Pick<CanonicalNodeLabel, 'position' | 'rotate' | 'keepUpright'>,
): number => {
  return calculateLabelRotation(label.rotate, label.keepUpright, calculateLabelPlacementVector(label.position));
};

/** 把已测量 label 解析为相对最终 Node rect 的局部几何 */
export const placeNodeLabel = (
  layout: CompiledNodeLayout,
  label: MeasuredNodeLabel,
  canon: CanonicalNodeLabel,
): CompiledNodeLabelPlacement => {
  const rotateDeg = calculateLabelRotationDegrees(canon);
  if (canon.position === 'center') {
    return { rotateDeg, centerOffset: [0, 0] };
  }

  const placed = placeLabelBox({
    label: {
      text: canon.text.lines.map(line => line.plainText).join('\n'),
      rotate: canon.rotate,
      keepUpright: canon.keepUpright,
      placement: canon.placement,
      align: canon.align,
    },
    point: calculateNodeLabelBorderPoint(layout, canon.position),
    outward: calculateLabelPlacementVector(canon.position),
    tangent: calculateLabelTangentVector(canon.position),
    width: label.measuredWidth,
    height: label.measuredHeight,
    distance: canon.distance,
  });

  return {
    rotateDeg: placed.rotateDeg,
    centerOffset: [placed.center[0] - layout.geometry.rect.x, placed.center[1] - layout.geometry.rect.y],
  };
};

/**
 * 节点 label 的外接点
 * @description 用于顶层 bbox / viewBox 计算
 */
export const calculateNodeLabelExtentPoints = (
  layout: Pick<CompiledNodeLayout, 'geometry'> & { labels?: Array<Omit<NodeLabelLayout, 'lineLayout'>> },
): Array<Position> => {
  if (!layout.labels || layout.labels.length === 0) return [];

  const cx = layout.geometry.rect.x;
  const cy = layout.geometry.rect.y;
  const rad = layout.geometry.rect.rotate ?? 0;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pts: Array<Position> = [];

  for (const lab of layout.labels) {
    const [lx, ly] = calculateNodeLabelCenter(layout, lab);
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
      if ((layout.geometry.rect.rotate ?? 0) === 0) {
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

/** 测量单个节点附属标签，不读取主体几何或附着配置 */
export const measureNodeLabel = (
  canon: CanonicalNodeLabel,
  context: Pick<NodeCompileContext, 'measureText' | 'texLowering'>,
): MeasuredNodeLabel => {
  const { measureText, texLowering } = context;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  const lineLayout = layoutTextBlock(
    canon.text.lines,
    {
      lineHeight: canon.text.lineHeight,
      maxTextWidth: canon.text.maxTextWidth,
    },
    { measureText, lowerTex: texLowering?.lowerTex, font: canon.text.font, warn: inlineWarn },
  );
  return {
    lineLayout,
    measuredWidth: lineLayout.width,
    measuredHeight: lineLayout.height,
    ascent: lineLayout.height / 2,
    descent: lineLayout.height / 2,
  };
};
