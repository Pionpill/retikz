import type { GroupPrim, ResolvedShapeStyle, ScenePrimitive } from '../../contract';
import type { IRJsonObject } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { PaintResolver } from '../resource';
import type { NodeLabelLayout, NodeLayout } from './types';

import {
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  LayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import { validateMarkerPrimitives } from '../resource';
import { validateScenePrimitives } from '../scene-primitive';
import { toAlphabeticBaselineY } from '../text';
import { DEFAULT_LINE_HEIGHT_FACTOR } from './content/text';
import { labelBorderPoint, labelBoxEdgeToward, labelCenter } from './label/geometry';

/** 空 shape params */
const EMPTY_SHAPE_PARAMS: IRJsonObject = {};

type Round = (n: number) => number;

/** 从 NodeLayout 收敛 shape emit 所需的视觉样式 */
const toShapeStyle = (layout: NodeLayout, resolvePaint: PaintResolver): ResolvedShapeStyle => ({
  fill: resolvePaint(layout.fill),
  fillOpacity: layout.fillOpacity,
  stroke: resolvePaint(layout.stroke) ?? 'currentColor',
  strokeOpacity: layout.strokeOpacity,
  strokeWidth: layout.strokeWidth,
  dashPattern: layout.dashPattern,
  dashOffset: layout.dashOffset,
  cornerRadius: layout.cornerRadius,
  opacity: layout.opacity,
  shadow: layout.shadow,
  blendMode: layout.blendMode,
});

/** 发出节点 shape 主体图元 */
const emitNodeShapePrimitives = (
  layout: NodeLayout,
  round: Round,
  resolvePaint: PaintResolver,
): Array<ScenePrimitive> => {
  const axisAlignedRect: Rect = { ...layout.rect, rotate: 0 };
  let emitted: unknown;
  try {
    emitted = layout.shapeDef.emit(
      axisAlignedRect,
      toShapeStyle(layout, resolvePaint),
      round,
      layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
    );
  } catch (thrown) {
    if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;
    throw new LayoutProbeRecoverableError(`Shape '${layout.shapeName}' emit failed: ${safeThrownDetail(thrown)}`, {
      cause: thrown,
      providerKey: `shape:${layout.shapeName}`,
    });
  }
  return validateScenePrimitives(`Shape '${layout.shapeName}'`, emitted, validateMarkerPrimitives);
};

/** 发出节点正文图元 */
const emitNodeContentPrimitives = (layout: NodeLayout, round: Round): Array<ScenePrimitive> => {
  if (layout.inlineBlock) {
    const blockTop = layout.contentCenter[1] - layout.textHeight / 2;
    const halfBlockW = layout.textWidth / 2;
    return layout.inlineBlock.lines.flatMap(({ laid, baselineOffset }) => {
      const originX =
        layout.align === 'start'
          ? layout.contentCenter[0] - halfBlockW
          : layout.align === 'end'
            ? layout.contentCenter[0] + halfBlockW - laid.width
            : layout.contentCenter[0] - laid.width / 2;
      return laid.emit(originX, blockTop + baselineOffset, round);
    });
  }

  if (layout.lines === undefined) {
    return [];
  }

  const halfBlockW = layout.textWidth / 2;
  const xOffset = layout.align === 'start' ? -halfBlockW : layout.align === 'end' ? halfBlockW : 0;
  const lineHeight = round(layout.lineHeight);
  const baselineOffsets = layout.textBaselineOffsets;
  const blockTop = layout.contentCenter[1] - layout.textHeight / 2;
  /** 用现有 grouped TextPrim 合同发出 authoritative physical-line baselines */
  const textPrimitive = (
    lines: NonNullable<NodeLayout['lines']>,
    baselineY: number,
    measuredHeight: number,
  ): ScenePrimitive => ({
    type: 'text',
    x: round(layout.contentCenter[0] + xOffset),
    y: round(baselineY),
    lines,
    fontSize: layout.fontSize,
    fontFamily: layout.fontFamily,
    fontWeight: layout.fontWeight,
    fontStyle: layout.fontStyle,
    align: layout.align,
    baseline: 'alphabetic',
    lineHeight,
    fill: layout.textColor ?? 'currentColor',
    opacity: layout.opacity,
    measuredWidth: round(layout.textWidth),
    measuredHeight: round(measuredHeight),
  });
  if (baselineOffsets === undefined || baselineOffsets.length !== layout.lines.length) {
    return [
      textPrimitive(
        layout.lines,
        toAlphabeticBaselineY({
          y: layout.contentCenter[1],
          baseline: 'middle',
          lineCount: layout.lines.length,
          lineHeight,
          fontSize: layout.fontSize,
        }),
        layout.textHeight,
      ),
    ];
  }
  return [textPrimitive(layout.lines, blockTop + baselineOffsets[0], layout.textHeight)];
};

/** 发出 label pin 引线图元 */
const emitNodeLabelPinPrimitive = (
  layout: NodeLayout,
  label: NodeLabelLayout,
  labelCenterPosition: [number, number],
  round: Round,
): ScenePrimitive | undefined => {
  if (!label.pin) return undefined;
  const style = typeof label.pin === 'object' ? label.pin : undefined;
  const [lx, ly] = labelCenterPosition;
  const [bx, by] = labelBorderPoint(layout, label);
  const [nx, ny] = labelBoxEdgeToward({
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
    stroke: style?.stroke ?? label.textColor ?? 'currentColor',
    strokeWidth: style?.strokeWidth ?? 1,
    dashPattern: style?.dashPattern,
    dashOffset: style?.dashOffset,
    opacity: label.opacity ?? layout.opacity,
  };
};

/** 发出 label 正文图元 */
const emitNodeLabelContentPrimitive = (
  layout: NodeLayout,
  label: NodeLabelLayout,
  labelCenterPosition: [number, number],
  round: Round,
): ScenePrimitive => {
  const [lx, ly] = labelCenterPosition;
  if (label.laid) {
    const laid = label.laid;
    const originX = lx - laid.width / 2;
    const baselineY = ly + (laid.ascent - laid.descent) / 2;
    return { type: 'group', children: laid.emit(originX, baselineY, round) };
  }

  const labelLineHeight = round(label.fontSize * DEFAULT_LINE_HEIGHT_FACTOR);
  return {
    type: 'text',
    x: round(lx),
    y: round(ly + (label.ascent - label.descent) / 2),
    lines: [{ text: label.text }],
    fontSize: label.fontSize,
    fontFamily: label.fontFamily,
    fontWeight: label.fontWeight,
    fontStyle: label.fontStyle,
    align: 'middle',
    baseline: 'alphabetic',
    lineHeight: labelLineHeight,
    fill: label.textColor ?? 'currentColor',
    opacity: label.opacity ?? layout.opacity,
    measuredWidth: round(label.measuredWidth),
    measuredHeight: round(label.measuredHeight),
  };
};

/** 发出节点附属 label 图元 */
const emitNodeLabelPrimitives = (layout: NodeLayout, label: NodeLabelLayout, round: Round): Array<ScenePrimitive> => {
  const labelCenterPosition = labelCenter(layout, label);
  const [lx, ly] = labelCenterPosition;
  const primitives: Array<ScenePrimitive> = [];
  const pinPrimitive = emitNodeLabelPinPrimitive(layout, label, labelCenterPosition, round);
  if (pinPrimitive !== undefined) primitives.push(pinPrimitive);

  const labelContent = emitNodeLabelContentPrimitive(layout, label, labelCenterPosition, round);
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

/** 把节点标识和元数据写到纯几何节点的 shape 图元 */
const stampNodeShapePrimitives = (layout: NodeLayout, primitives: Array<ScenePrimitive>): void => {
  if (layout.id !== undefined) {
    for (const prim of primitives) prim.id = layout.id;
  }
  if (layout.meta !== undefined) {
    for (const prim of primitives) prim.meta = layout.meta;
  }
  if (layout.animations !== undefined) {
    for (const prim of primitives) prim.animations = layout.animations;
  }
};

/** 包装带文本或旋转的节点 group */
const wrapNodeGroupPrimitive = (layout: NodeLayout, children: Array<ScenePrimitive>, round: Round): GroupPrim => {
  const group: GroupPrim = { type: 'group', children };
  if (layout.id !== undefined) group.id = layout.id;
  if (layout.meta !== undefined) group.meta = layout.meta;
  if (layout.animations !== undefined) group.animations = layout.animations;
  if (layout.rotateDeg !== 0) {
    group.transforms = [
      {
        kind: 'rotate',
        degrees: round(layout.rotateDeg),
        cx: round(layout.rect.x),
        cy: round(layout.rect.y),
      },
    ];
  }
  return group;
};

/**
 * NodeLayout → Scene primitives
 * @description shape 主体走 `shapeDef.emit`；文本和 label 追加为附属 primitive
 */
export const emitNodePrimitives = (
  layout: NodeLayout,
  round: Round,
  resolvePaint: PaintResolver,
): Array<ScenePrimitive> => {
  const shapePrimitives = emitNodeShapePrimitives(layout, round, resolvePaint);
  const inner: Array<ScenePrimitive> = [
    ...shapePrimitives,
    ...emitNodeContentPrimitives(layout, round),
    ...(layout.labels?.flatMap(label => emitNodeLabelPrimitives(layout, label, round)) ?? []),
  ];

  const needsGroup = layout.rotateDeg !== 0 || layout.lines !== undefined || layout.inlineBlock !== undefined;
  if (!needsGroup) {
    stampNodeShapePrimitives(layout, shapePrimitives);
    return inner;
  }

  return [wrapNodeGroupPrimitive(layout, inner, round)];
};
