import type { Position } from '@retikz/math';
import { DEFAULT_EPSILON, DEG_TO_RAD } from '@retikz/math';

import type { ScenePrimitive } from '../../../contract';
import type { CanonicalNode, CanonicalNodeLabel } from '../../../resolve';
import { combineOpacity } from '../../../resolve';
import type { RegisterPaint } from '../../resource';
import { emitTextBlock } from '../../text';
import type { CompiledNodeLayout, NodeLabelLayout } from '../types';
import { calculateNodeLabelBorderPoint, calculateNodeLabelCenter } from './layout';

type Round = (n: number) => number;

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
const calculateLabelBoxIntersection = ({
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

/** 发出 label pin 引线图元 */
const emitNodeLabelPinPrimitive = (
  layout: CompiledNodeLayout,
  label: NodeLabelLayout,
  labelProperties: CanonicalNodeLabel,
  properties: CanonicalNode,
  labelCenterPosition: [number, number],
  round: Round,
  registerPaint: RegisterPaint,
): ScenePrimitive | undefined => {
  if (!labelProperties.pin) return undefined;

  const style = typeof labelProperties.pin === 'object' ? labelProperties.pin : undefined;
  const [lx, ly] = labelCenterPosition;
  const [bx, by] = calculateNodeLabelBorderPoint(
    { shape: properties.shape, boundary: properties.boundary, geometry: layout.geometry },
    labelProperties.position,
  );
  const [nx, ny] = calculateLabelBoxIntersection({
    center: [lx, ly],
    border: [bx, by],
    halfWidth: label.lineLayout.width / 2,
    halfHeight: label.lineLayout.height / 2,
    rotateDeg: label.rotateDeg,
  });

  return {
    type: 'path',
    commands: [
      { kind: 'move', to: [round(bx), round(by)] },
      { kind: 'line', to: [round(nx), round(ny)] },
    ],
    stroke: registerPaint(style?.stroke) ?? labelProperties.text.color ?? 'currentColor',
    strokeWidth: style?.strokeWidth ?? 1,
    dashPattern: style?.dashPattern,
    dashOffset: style?.dashOffset,
    lineCap: style?.lineCap,
    lineJoin: style?.lineJoin,
    opacity: combineOpacity(style?.opacity ?? labelProperties.opacity, properties.style.opacity),
  };
};

/** 发出 label 正文图元 */
const emitNodeLabelContentPrimitive = (
  label: NodeLabelLayout,
  labelProperties: CanonicalNodeLabel,
  properties: CanonicalNode,
  labelCenterPosition: [number, number],
  round: Round,
): ScenePrimitive => {
  const [lx, ly] = labelCenterPosition;
  const children = emitTextBlock(
    label.lineLayout,
    {
      lines: labelProperties.text.lines,
      color: labelProperties.text.color,
      opacity: combineOpacity(labelProperties.opacity, properties.style.opacity),
      textAlign: labelProperties.text.textAlign,
    },
    lx - label.lineLayout.width / 2,
    ly - label.lineLayout.height / 2,
    round,
  );
  return children.length === 1 ? children[0] : { type: 'group', children };
};

/** 发出节点附属 label 图元 */
export const emitNodeLabelPrimitives = (
  layout: CompiledNodeLayout,
  label: NodeLabelLayout,
  labelProperties: CanonicalNodeLabel,
  properties: CanonicalNode,
  round: Round,
  registerPaint: RegisterPaint,
): Array<ScenePrimitive> => {
  const labelCenterPosition = calculateNodeLabelCenter(layout, label);
  const [lx, ly] = labelCenterPosition;
  const primitives: Array<ScenePrimitive> = [];
  const pinPrimitive = emitNodeLabelPinPrimitive(
    layout,
    label,
    labelProperties,
    properties,
    labelCenterPosition,
    round,
    registerPaint,
  );
  if (pinPrimitive !== undefined) primitives.push(pinPrimitive);

  const labelContent = emitNodeLabelContentPrimitive(label, labelProperties, properties, labelCenterPosition, round);
  const deg = label.rotateDeg;
  primitives.push(
    deg === 0
      ? labelContent
      : {
          type: 'group',
          transforms: [{ kind: 'rotate', degrees: round(deg), cx: round(lx), cy: round(ly) }],
          children: [labelContent],
        },
  );

  return primitives;
};
