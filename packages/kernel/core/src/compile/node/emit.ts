import { RAD_TO_DEG } from '@retikz/math';
import type { CenteredBox } from '@retikz/math';

import type { GroupPrimitive, CompiledShapeStyle, ScenePrimitive, TextLine } from '../../contract';
import type { CanonicalNode } from '../../resolve';
import {
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import type { PaintResolver } from '../resource';
import { snapshotScenePrimitives } from '../scene-primitive';
import { emitInlineLine, inlineSegmentPaintsOf, toAlphabeticBaselineY } from '../text';
import { DEFAULT_LINE_HEIGHT_FACTOR } from './content/text';
import { labelBorderPoint, labelBoxEdgeToward, labelCenter } from './label/geometry';
import type {
  NodeCompilation,
  NodeLabelLayout,
  NodeLabelResolution,
  CompiledNodeLayout,
  NodeResolvedProperties,
} from './types';

/** 节点形状绘制使用的有效样式 */
type NodeShapeProperties = Pick<
  CanonicalNode,
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'dashPattern'
  | 'dashOffset'
  | 'lineCap'
  | 'lineJoin'
  | 'cornerRadius'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
>;

type Round = (n: number) => number;

type NodeBaselineYs = Readonly<{
  /** 传给 TextPrimitive / emitInlineLine 的原始 baseline y */
  emitted: Array<number>;
  /** 与已 emit 的物理行对应、已按 Scene precision 圆整的 baseline y */
  observed: Array<number>;
}>;

/** 计算 Node 正文实际 emit 与 observation 共用的每条物理行 alphabetic baseline y */
export const nodeBaselineYsOf = (layout: CompiledNodeLayout, round: Round): NodeBaselineYs => {
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

/** 从 CompiledNodeLayout 收敛 shape emit 所需的视觉样式 */
const toShapeStyle = (properties: NodeShapeProperties, resolvePaint: PaintResolver): CompiledShapeStyle => ({
  fill: resolvePaint(properties.fill),
  fillOpacity: properties.fillOpacity,
  stroke: resolvePaint(properties.stroke) ?? 'currentColor',
  strokeOpacity: properties.strokeOpacity,
  strokeWidth: properties.strokeWidth,
  dashPattern: properties.dashPattern,
  dashOffset: properties.dashOffset,
  lineCap: properties.lineCap,
  lineJoin: properties.lineJoin,
  cornerRadius: properties.cornerRadius,
  opacity: properties.opacity,
  shadow: properties.shadow,
  blendMode: properties.blendMode,
});

/** 发出节点 shape 主体图元 */
const emitNodeShapePrimitives = (
  layout: CompiledNodeLayout,
  properties: NodeShapeProperties,
  round: Round,
  resolvePaint: PaintResolver,
): Array<ScenePrimitive> => {
  const axisAlignedRect: CenteredBox = { ...layout.geometry.rect, rotate: 0 };
  let emitted: unknown;

  try {
    emitted = layout.shape.definition.emit(
      axisAlignedRect,
      toShapeStyle(properties, resolvePaint),
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

  return snapshotScenePrimitives(`Shape '${layout.shape.name}'`, emitted);
};

/** 发出节点正文图元 */
const emitNodeContentPrimitives = (
  layout: CompiledNodeLayout,
  properties: NodeResolvedProperties,
  round: Round,
): Array<ScenePrimitive> => {
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
      return emitInlineLine(
        laid,
        {
          color: properties.textColor,
          opacity: properties.opacity,
          segments: inlineSegmentPaintsOf(properties.text![index].segments),
        },
        originX,
        baselineYs[index],
        round,
      );
    });
  }

  const halfBlockW = layout.geometry.contentSize.width / 2;
  const xOffset = text.align === 'start' ? -halfBlockW : text.align === 'end' ? halfBlockW : 0;
  const lineHeight = round(text.lineHeight);
  const baselineYs = nodeBaselineYsOf(layout, round).emitted;

  /** 用现有 grouped TextPrimitive 合同发出 authoritative physical-line baselines */
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
    fill: properties.textColor ?? 'currentColor',
    opacity: properties.opacity,
    measuredWidth: round(layout.geometry.contentSize.width),
    measuredHeight: round(measuredHeight),
  });

  return [
    textPrimitive(
      text.lines.map(({ sourceLineIndex, ...line }) => ({
        ...line,
        fill: properties.text![sourceLineIndex].style?.fill,
        opacity: properties.text![sourceLineIndex].style?.opacity,
      })),
      baselineYs[0],
      layout.geometry.contentSize.height,
    ),
  ];
};

/** 发出 label pin 引线图元 */
const emitNodeLabelPinPrimitive = (
  layout: CompiledNodeLayout,
  label: NodeLabelLayout,
  labelProperties: NodeLabelResolution,
  properties: NodeResolvedProperties,
  labelCenterPosition: [number, number],
  round: Round,
  resolvePaint: PaintResolver,
): ScenePrimitive | undefined => {
  if (!labelProperties.pin) return undefined;

  const style = typeof labelProperties.pin === 'object' ? labelProperties.pin : undefined;
  const [lx, ly] = labelCenterPosition;
  const [bx, by] = labelBorderPoint(layout, labelProperties);
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
    stroke: resolvePaint(style?.stroke) ?? labelProperties.textColor ?? 'currentColor',
    strokeWidth: style?.strokeWidth ?? 1,
    dashPattern: style?.dashPattern,
    dashOffset: style?.dashOffset,
    lineCap: style?.lineCap,
    lineJoin: style?.lineJoin,
    opacity: style?.opacity ?? labelProperties.opacity ?? properties.opacity,
  };
};

/** 发出 label 正文图元 */
const emitNodeLabelContentPrimitive = (
  layout: CompiledNodeLayout,
  label: NodeLabelLayout,
  labelProperties: NodeLabelResolution,
  properties: NodeResolvedProperties,
  labelCenterPosition: [number, number],
  round: Round,
): ScenePrimitive => {
  const [lx, ly] = labelCenterPosition;
  if (label.laid) {
    let offset = 0;
    return {
      type: 'group',
      children: label.laid.flatMap((laid, index) => {
        const height =
          label.laid!.length > 1
            ? Math.max(labelProperties.font.size * DEFAULT_LINE_HEIGHT_FACTOR, laid.ascent + laid.descent)
            : laid.ascent + laid.descent;
        const baselineY =
          ly - label.measuredHeight / 2 + offset + (height - laid.ascent - laid.descent) / 2 + laid.ascent;
        offset += height;
        return emitInlineLine(
          laid,
          {
            color: labelProperties.textColor,
            opacity: labelProperties.opacity ?? properties.opacity,
            segments: inlineSegmentPaintsOf(labelProperties.text[index].segments),
          },
          lx - laid.width / 2,
          baselineY,
          round,
        );
      }),
    };
  }

  const labelLineHeight = round(labelProperties.font.size * DEFAULT_LINE_HEIGHT_FACTOR);

  return {
    type: 'text',
    x: round(lx),
    y: round(ly + (label.ascent - label.descent) / 2),
    lines: [{ text: labelProperties.text[0].plainText }],
    fontSize: labelProperties.font.size,
    fontFamily: labelProperties.font.family,
    fontWeight: labelProperties.font.weight,
    fontStyle: labelProperties.font.style,
    align: 'middle',
    baseline: 'alphabetic',
    lineHeight: labelLineHeight,
    fill: labelProperties.textColor ?? 'currentColor',
    opacity: labelProperties.opacity ?? properties.opacity,
    measuredWidth: round(label.measuredWidth),
    measuredHeight: round(label.measuredHeight),
  };
};

/** 发出节点附属 label 图元 */
const emitNodeLabelPrimitives = (
  layout: CompiledNodeLayout,
  label: NodeLabelLayout,
  labelProperties: NodeLabelResolution,
  properties: NodeResolvedProperties,
  round: Round,
  resolvePaint: PaintResolver,
): Array<ScenePrimitive> => {
  const labelCenterPosition = labelCenter(layout, label);
  const [lx, ly] = labelCenterPosition;
  const primitives: Array<ScenePrimitive> = [];
  const pinPrimitive = emitNodeLabelPinPrimitive(
    layout,
    label,
    labelProperties,
    properties,
    labelCenterPosition,
    round,
    resolvePaint,
  );
  if (pinPrimitive !== undefined) primitives.push(pinPrimitive);

  const labelContent = emitNodeLabelContentPrimitive(
    layout,
    label,
    labelProperties,
    properties,
    labelCenterPosition,
    round,
  );
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
const stampNodeShapePrimitives = (
  metadata: Pick<CanonicalNode, 'id' | 'meta' | 'animations'>,
  primitives: Array<ScenePrimitive>,
): void => {
  if (metadata.id !== undefined) {
    for (const prim of primitives) prim.id = metadata.id;
  }

  if (metadata.meta !== undefined) {
    for (const prim of primitives) prim.meta = metadata.meta;
  }

  if (metadata.animations !== undefined) {
    for (const prim of primitives) prim.animations = metadata.animations;
  }
};

/** 包装带文本或旋转的节点 group */
const wrapNodeGroupPrimitive = (
  layout: CompiledNodeLayout,
  metadata: Pick<CanonicalNode, 'id' | 'meta' | 'animations'>,
  children: Array<ScenePrimitive>,
  round: Round,
): GroupPrimitive => {
  const group: GroupPrimitive = { type: 'group', children };
  if (metadata.id !== undefined) group.id = metadata.id;
  if (metadata.meta !== undefined) group.meta = metadata.meta;
  if (metadata.animations !== undefined) group.animations = metadata.animations;
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
  compilation: NodeCompilation,
  round: Round,
  resolvePaint: PaintResolver,
): Array<ScenePrimitive> => {
  const { layout, properties } = compilation;
  const shapePrimitives = emitNodeShapePrimitives(layout, properties, round, resolvePaint);
  const inner: Array<ScenePrimitive> = [
    ...shapePrimitives,
    ...emitNodeContentPrimitives(layout, properties, round),
    ...(layout.labels?.flatMap((label, index) =>
      emitNodeLabelPrimitives(layout, label, properties.label![index], properties, round, resolvePaint),
    ) ?? []),
  ];

  const needsGroup = (layout.geometry.rect.rotate ?? 0) !== 0 || layout.text !== undefined;
  if (!needsGroup) {
    stampNodeShapePrimitives(properties, shapePrimitives);
    return inner;
  }

  return [wrapNodeGroupPrimitive(layout, properties, inner, round)];
};
