import type { GroupPrim, ResolvedShapeStyle, ScenePrimitive, TextLine } from '../../contract';
import {
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import { RAD_TO_DEG } from '../../shared/geometry';
import type { Rect } from '../../shared/geometry';
import type { PaintResolver } from '../resource';
import { validateMarkerPrimitives } from '../resource';
import { validateScenePrimitives } from '../scene-primitive';
import { toAlphabeticBaselineY } from '../text';
import { DEFAULT_LINE_HEIGHT_FACTOR } from './content/text';
import { labelBorderPoint, labelBoxEdgeToward, labelCenter } from './label/geometry';
import type { NodeLabelLayout, NodeLayout } from './types';

type Round = (n: number) => number;

type NodeBaselineYs = Readonly<{
  /** 传给 TextPrim / LaidLine.emit 的原始 baseline y */
  emitted: Array<number>;
  /** 与已 emit 的物理行对应、已按 Scene precision 圆整的 baseline y */
  observed: Array<number>;
}>;

/** 计算 Node 正文实际 emit 与 observation 共用的每条物理行 alphabetic baseline y */
export const nodeBaselineYsOf = (layout: NodeLayout, round: Round): NodeBaselineYs => {
  const text = layout.text;
  if (text === undefined) return { emitted: [], observed: [] };
  const lineCount = text.lines.length;
  if (lineCount === 0) return { emitted: [], observed: [] };

  const blockTop = layout.geometry.contentCenter[1] - layout.geometry.contentSize.height / 2;
  if (text.kind === 'inline') {
    const emitted = text.lines.map(line => blockTop + line.baselineOffset);
    return { emitted, observed: emitted.map(round) };
  }

  const emittedLineHeight = round(text.lineHeight);
  const baselineOffsets = text.baselineOffsets;
  const firstBaseline =
    baselineOffsets !== undefined && baselineOffsets.length === lineCount
      ? blockTop + baselineOffsets[0]
      : toAlphabeticBaselineY({
          y: layout.geometry.contentCenter[1],
          baseline: 'middle',
          lineCount,
          lineHeight: emittedLineHeight,
          fontSize: text.font.size,
        });
  const observedFirstBaseline = round(firstBaseline);

  return {
    emitted: [firstBaseline],
    observed: Array.from({ length: lineCount }, (_value, index) => observedFirstBaseline + index * emittedLineHeight),
  };
};

/** 从 NodeLayout 收敛 shape emit 所需的视觉样式 */
const toShapeStyle = (layout: NodeLayout, resolvePaint: PaintResolver): ResolvedShapeStyle => ({
  fill: resolvePaint(layout.node.fill),
  fillOpacity: layout.node.fillOpacity,
  stroke: resolvePaint(layout.node.stroke) ?? 'currentColor',
  strokeOpacity: layout.node.strokeOpacity,
  strokeWidth: layout.node.strokeWidth,
  dashPattern: layout.node.dashPattern,
  dashOffset: layout.node.dashOffset,
  cornerRadius: layout.node.cornerRadius,
  opacity: layout.node.opacity,
  shadow: layout.node.shadow,
  blendMode: layout.node.blendMode,
});

/** 发出节点 shape 主体图元 */
const emitNodeShapePrimitives = (
  layout: NodeLayout,
  round: Round,
  resolvePaint: PaintResolver,
): Array<ScenePrimitive> => {
  const axisAlignedRect: Rect = { ...layout.geometry.rect, rotate: 0 };
  let emitted: unknown;

  try {
    emitted = layout.shape.definition.emit(
      axisAlignedRect,
      toShapeStyle(layout, resolvePaint),
      round,
      layout.shape.params,
    );
  } catch (thrown) {
    if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;

    throw createLayoutProbeRecoverableError(`Shape '${layout.shape.name}' emit failed: ${safeThrownDetail(thrown)}`, {
      cause: thrown,
      providerKey: `shape:${layout.shape.name}`,
    });
  }

  return validateScenePrimitives(`Shape '${layout.shape.name}'`, emitted, validateMarkerPrimitives);
};

/** 发出节点正文图元 */
const emitNodeContentPrimitives = (layout: NodeLayout, round: Round): Array<ScenePrimitive> => {
  const text = layout.text;
  if (text === undefined) return [];
  if (text.kind === 'inline') {
    const baselineYs = nodeBaselineYsOf(layout, round).emitted;
    const halfBlockW = layout.geometry.contentSize.width / 2;

    return text.lines.flatMap(({ laid }, index) => {
      const originX =
        text.align === 'start'
          ? layout.geometry.contentCenter[0] - halfBlockW
          : text.align === 'end'
            ? layout.geometry.contentCenter[0] + halfBlockW - laid.width
            : layout.geometry.contentCenter[0] - laid.width / 2;
      return laid.emit(originX, baselineYs[index], round);
    });
  }

  const halfBlockW = layout.geometry.contentSize.width / 2;
  const xOffset = text.align === 'start' ? -halfBlockW : text.align === 'end' ? halfBlockW : 0;
  const lineHeight = round(text.lineHeight);
  const baselineYs = nodeBaselineYsOf(layout, round).emitted;

  /** 用现有 grouped TextPrim 合同发出 authoritative physical-line baselines */
  const textPrimitive = (lines: Array<TextLine>, baselineY: number, measuredHeight: number): ScenePrimitive => ({
    type: 'text',
    x: round(layout.geometry.contentCenter[0] + xOffset),
    y: round(baselineY),
    lines,
    fontSize: text.font.size,
    fontFamily: text.font.family,
    fontWeight: text.font.weight,
    fontStyle: text.font.style,
    align: text.align,
    baseline: 'alphabetic',
    lineHeight,
    fill: layout.node.textColor ?? 'currentColor',
    opacity: layout.node.opacity,
    measuredWidth: round(layout.geometry.contentSize.width),
    measuredHeight: round(measuredHeight),
  });

  return [textPrimitive(text.lines, baselineYs[0], layout.geometry.contentSize.height)];
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
    opacity: label.opacity ?? layout.node.opacity,
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
    opacity: label.opacity ?? layout.node.opacity,
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
  if (layout.node.id !== undefined) {
    for (const prim of primitives) prim.id = layout.node.id;
  }

  if (layout.node.meta !== undefined) {
    for (const prim of primitives) prim.meta = layout.node.meta;
  }

  if (layout.node.animations !== undefined) {
    for (const prim of primitives) prim.animations = layout.node.animations;
  }
};

/** 包装带文本或旋转的节点 group */
const wrapNodeGroupPrimitive = (layout: NodeLayout, children: Array<ScenePrimitive>, round: Round): GroupPrim => {
  const group: GroupPrim = { type: 'group', children };
  if (layout.node.id !== undefined) group.id = layout.node.id;
  if (layout.node.meta !== undefined) group.meta = layout.node.meta;
  if (layout.node.animations !== undefined) group.animations = layout.node.animations;
  if ((layout.geometry.rect.rotate ?? 0) !== 0) {
    group.transforms = [
      {
        kind: 'rotate',
        degrees: round((layout.geometry.rect.rotate ?? 0) * RAD_TO_DEG),
        cx: round(layout.geometry.rect.x),
        cy: round(layout.geometry.rect.y),
      },
    ];
  }

  return group;
};

/**
 * 将节点布局转换为场景图元
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

  const needsGroup = (layout.geometry.rect.rotate ?? 0) !== 0 || layout.text !== undefined;
  if (!needsGroup) {
    stampNodeShapePrimitives(layout, shapePrimitives);
    return inner;
  }

  return [wrapNodeGroupPrimitive(layout, inner, round)];
};
