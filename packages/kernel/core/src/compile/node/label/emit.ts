import type { ScenePrimitive } from '../../../contract';
import type { CanonicalNode, CanonicalNodeLabel } from '../../../resolve';
import { combineOpacity } from '../../../resolve';
import type { RegisterPaint } from '../../resource';
import { emitTextBlock } from '../../text';
import type { CompiledNodeLayout, NodeLabelLayout } from '../types';
import { calculateNodeLabelBorderPoint, calculateLabelBoxIntersection, calculateNodeLabelCenter } from './layout';

type Round = (n: number) => number;

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
  const [bx, by] = calculateNodeLabelBorderPoint(layout, labelProperties.position);
  const [nx, ny] = calculateLabelBoxIntersection({
    center: [lx, ly],
    border: [bx, by],
    halfWidth: label.measuredWidth / 2,
    halfHeight: label.measuredHeight / 2,
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
    label.laid,
    {
      lines: labelProperties.text.lines,
      color: labelProperties.text.color,
      opacity: combineOpacity(labelProperties.opacity, properties.style.opacity),
      textAlign: labelProperties.text.textAlign,
    },
    lx - label.measuredWidth / 2,
    ly - label.measuredHeight / 2,
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
