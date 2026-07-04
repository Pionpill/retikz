import type {
  BoundaryDefinition,
  ShapeDefinition,
  TextLine,
  Transform,
} from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type {
  IRAxisScale,
  IRBoxSize,
  IRBoxSpacing,
  IRJsonObject,
  IRLabelDefault,
  IRLineSpec,
  IRNode,
  IRNodeLabel,
  JsonValue,
} from '../../schemas';
import type { NameStack } from '../name-stack';
import type { ResolveBetweenGlobal } from '../position';
import type { FontSpec, LaidLine, LineLayoutContext, TextMeasurer } from '../text';
import type { NodeLabelLayout, NodeLayout, TexLoweringContext } from './types';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { providerDefinitionOf } from '../../providers/registry';
import { resolveShapeRegistry } from '../../providers/shape';
import { JsonObjectSchema } from '../../schemas';
import { DEG_TO_RAD } from '../../shared/geometry';
import { CompileWarningCode } from '../constant';
import { resolvePosition } from '../position';
import { resolveShadow } from '../style';
import { layoutInlineLine, resolveLineRuns } from '../text';
import { DEFAULT_LABEL_DISTANCE, normalizeLabelPosition } from './labels';
import { resolveNodeShapePreset } from './shape-presets';
import { alignToTextAnchor, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT_FACTOR, resolveDashPattern, wrapText } from './text';

const DEFAULT_PADDING = 8;

type NodeSpacingValue = number | IRBoxSpacing | undefined;
type NodeAxisScaleValue = number | IRAxisScale | undefined;
type NodeBoxSizeValue = number | IRBoxSize | undefined;

const resolveBoxSpacing = (value: NodeSpacingValue, fallback: number): { left: number; right: number; top: number; bottom: number } => {
  if (typeof value === 'number') {
    return { left: value, right: value, top: value, bottom: value };
  }
  const base = value?.default ?? fallback;
  return {
    left: value?.left ?? value?.x ?? base,
    right: value?.right ?? value?.x ?? base,
    top: value?.top ?? value?.y ?? base,
    bottom: value?.bottom ?? value?.y ?? base,
  };
};

const resolveAxisScale = (value: NodeAxisScaleValue, fallback: number): { x: number; y: number } => {
  if (typeof value === 'number') return { x: value, y: value };
  const base = value?.default ?? fallback;
  return {
    x: value?.x ?? base,
    y: value?.y ?? base,
  };
};

const resolveBoxSize = (value: NodeBoxSizeValue, fallback: number): { width: number; height: number } => {
  if (typeof value === 'number') return { width: value, height: value };
  const base = value?.default ?? fallback;
  return {
    width: value?.width ?? base,
    height: value?.height ?? base,
  };
};

/** 递归把 JSON 值里的数值叶子乘以 factor。 */
const scaleJsonNumbers = <T extends JsonValue>(value: T, factor: number): T => {
  if (typeof value === 'number') return (value * factor) as T;
  if (Array.isArray(value)) return value.map(v => scaleJsonNumbers(v, factor)) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value)) out[k] = scaleJsonNumbers(v, factor);
    return out as T;
  }
  return value;
};
export const layoutNode = (
  node: IRNode,
  measureText: TextMeasurer,
  nameStack: NameStack,
  nodeDistance?: number,
  scopeChain: ReadonlyArray<Transform> = [],
  labelDefault?: IRLabelDefault,
  shapes: ProviderCollection<ShapeDefinition> = resolveShapeRegistry(),
  boundaries: ProviderCollection<BoundaryDefinition> = resolveBoundaryRegistry(),
  resolveBetweenGlobal?: ResolveBetweenGlobal,
  texLowering?: TexLoweringContext,
): NodeLayout => {
  // shape preset 解析。
  const { type: shapeName, params: rawShapeParams } = resolveNodeShapePreset(node.shape);
  const shapeDef = providerDefinitionOf(shapes, shapeName, { capability: 'shape', optionName: 'shapes' });
  // 原始 params 必须 JSON-safe，字段形态由 shape schema 归一化。
  JsonObjectSchema.parse(rawShapeParams);
  const parsedShapeParams: IRJsonObject = shapeDef.paramsSchema.parse(rawShapeParams);

  // 顶层 Node.cornerRadius 只补到 rectangle 且低于 params 显式值。
  const mergedShapeParams: IRJsonObject =
    shapeName === 'rectangle' && node.cornerRadius !== undefined && !('cornerRadius' in parsedShapeParams)
      ? { ...parsedShapeParams, cornerRadius: node.cornerRadius }
      : parsedShapeParams;

  // 缩放影响节点尺寸与字体。
  // 字号取 min(sx,sy) 保 glyph 形状，避免非均匀缩放下文字被拉变形。
  const { x: sx, y: sy } = resolveAxisScale(node.scale, 1);
  const fontScale = Math.min(sx, sy);
  // shape params 随 node scale 协同缩放。
  const shapeScale = Math.sqrt(sx * sy);
  const noScale = sx === 1 && sy === 1;
  const shapeParams: IRJsonObject = noScale
    ? mergedShapeParams
    : shapeDef.scaleParams
      ? shapeDef.scaleParams(mergedShapeParams, sx, sy)
      : scaleJsonNumbers(mergedShapeParams, shapeScale);

  const baseFontSize = node.font?.size ?? DEFAULT_FONT_SIZE;
  const fontSize = baseFontSize * fontScale;
  const fontFamily = node.font?.family;
  const fontWeight = node.font?.weight;
  const fontStyle = node.font?.style;
  // spacing 受 node scale 影响。
  const padding = resolveBoxSpacing(node.padding, DEFAULT_PADDING);
  const paddingLeft = padding.left * sx;
  const paddingRight = padding.right * sx;
  const paddingTop = padding.top * sy;
  const paddingBottom = padding.bottom * sy;
  const marginSpacing = resolveBoxSpacing(node.margin, 0);
  const margin = {
    top: marginSpacing.top * sy,
    right: marginSpacing.right * sx,
    bottom: marginSpacing.bottom * sy,
    left: marginSpacing.left * sx,
  };
  const lineHeight = (node.lineHeight ?? baseFontSize * DEFAULT_LINE_HEIGHT_FACTOR) * sy;
  const align = alignToTextAnchor(node.align ?? 'center');

  // 标准化为 Array<IRLineSpec>。
  const rawLines: Array<IRLineSpec> | undefined =
    node.text === undefined ? undefined : typeof node.text === 'string' ? [node.text] : node.text;

  // 折行阈值受 x 缩放。
  const maxTextWidth = node.maxTextWidth !== undefined ? node.maxTextWidth * sx : undefined;
  // 每行解析覆盖样式并度量。
  let textWidth = 0;
  let textHeight = 0;
  let lines: Array<TextLine> | undefined;
  // 含 math run 的混排块。
  let inlineBlock: { lines: Array<{ laid: LaidLine; baselineOffset: number }> } | undefined;
  // 注入 lowerTex 时解析行内公式糖。
  const texGatingOn = texLowering?.lowerTex !== undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  if (rawLines) {
    const resolved = rawLines.map(spec => resolveLineRuns(spec, texGatingOn));
    resolved.forEach(r => {
      if (r.warn) {
        inlineWarn(
          CompileWarningCode.TextTexParseError,
          'Unbalanced `$` in node text; the trailing fragment is kept literal.',
        );
      }
    });
    const anyMixed = rawLines.some(spec => typeof spec === 'object' && 'runs' in spec);
    const anyMath = resolved.some(r => r.hasMath);
    if (anyMath || anyMixed) {
      // 混排路径逐行布局。
      const blockFont: FontSpec = { size: fontSize, family: fontFamily, weight: fontWeight, style: fontStyle };
      const ctx: LineLayoutContext = {
        measureText,
        lowerTex: texLowering?.lowerTex,
        font: blockFont,
        color: node.textColor,
        opacity: node.opacity,
        warn: inlineWarn,
      };
      let cursor = 0;
      const blockLines = resolved.map(r => {
        const laid = layoutInlineLine(r.runs, ctx);
        const slot = Math.max(lineHeight, laid.ascent + laid.descent);
        const baselineOffset = cursor + (slot - (laid.ascent + laid.descent)) / 2 + laid.ascent;
        cursor += slot;
        if (laid.width > textWidth) textWidth = laid.width;
        return { laid, baselineOffset };
      });
      inlineBlock = { lines: blockLines };
      textHeight = cursor;
    } else {
      lines = [];
      for (let li = 0; li < rawLines.length; li++) {
        const spec = rawLines[li];
        // 有效文字取已解析 text run。
        const text = resolved[li].runs.map(r => ('text' in r ? r.text : '')).join('');
        // 行对象可带行级样式。
        const lineObj = typeof spec === 'object' && !('runs' in spec) ? spec : undefined;
        const lineFont = lineObj?.font;
        const font: FontSpec = {
          size: lineFont?.size !== undefined ? lineFont.size * fontScale : fontSize,
          family: lineFont?.family ?? fontFamily,
          weight: lineFont?.weight ?? fontWeight,
          style: lineFont?.style ?? fontStyle,
        };
        // 硬换行先拆成物理行，再按 maxTextWidth 折行。
        const hardLines = text.split('\n');
        const physical = hardLines.flatMap(hardLine =>
          maxTextWidth !== undefined ? wrapText(hardLine, font, maxTextWidth, measureText) : [hardLine],
        );
        for (const ptext of physical) {
          const m = measureText(ptext, font);
          if (m.width > textWidth) textWidth = m.width;
          const out: TextLine = { text: ptext };
          // 只写出行级覆盖字段。
          if (lineObj) {
            if (lineObj.fill !== undefined) out.fill = lineObj.fill;
            if (lineObj.opacity !== undefined) out.opacity = lineObj.opacity;
            if (lineFont?.size !== undefined) out.fontSize = lineFont.size * fontScale;
            if (lineFont?.family !== undefined) out.fontFamily = lineFont.family;
            if (lineFont?.weight !== undefined) out.fontWeight = lineFont.weight;
            if (lineFont?.style !== undefined) out.fontStyle = lineFont.style;
          }
          lines.push(out);
        }
      }
      textHeight = lines.length * lineHeight;
    }
  }

  // 内框半轴：content box + padding。
  const innerHalfW = (textWidth + paddingLeft + paddingRight) / 2;
  const innerHalfH = (textHeight + paddingTop + paddingBottom) / 2;
  const paddingOffsetX = (paddingRight - paddingLeft) / 2;
  const paddingOffsetY = (paddingBottom - paddingTop) / 2;

  // 外接边界半轴由 shape.circumscribe 派生。
  const circumscribed = shapeDef.circumscribe(innerHalfW, innerHalfH, shapeParams);

  // minimumSize 作用于外接边界，且随 scale 缩放。
  const minimumSize = resolveBoxSize(node.minimumSize, 0);
  const minHalfW = (minimumSize.width * sx) / 2;
  const minHalfH = (minimumSize.height * sy) / 2;
  const boundsHalfW = Math.max(circumscribed.halfWidth, minHalfW);
  const boundsHalfH = Math.max(circumscribed.halfHeight, minHalfH);

  const rotateDeg = node.rotate ?? 0;
  const center = resolvePosition(node.position, nameStack, nodeDistance, scopeChain, resolveBetweenGlobal);
  if (!center) {
    throw new Error(
      `Cannot resolve position for node ${node.id ?? '(unnamed)'}; polar.origin / at.of / between endpoint may reference an undefined node`,
    );
  }
  // shape 可声明 AABB 中心相对 position 的偏移。
  const aabbOffset = shapeDef.circumscribeOffset?.(shapeParams);
  const rectCenterX = center[0] + paddingOffsetX + (aabbOffset?.[0] ?? 0);
  const rectCenterY = center[1] + paddingOffsetY + (aabbOffset?.[1] ?? 0);
  const contentCenter: [number, number] = [rectCenterX - paddingOffsetX, rectCenterY - paddingOffsetY];
  // 标准化 label。
  const rawLabels: Array<IRNodeLabel> | undefined =
    node.label === undefined ? undefined : Array.isArray(node.label) ? node.label : [node.label];
  const labels: Array<NodeLabelLayout> | undefined = rawLabels?.map(lab => {
    const labFont = lab.font;
    const labFontSize = (labFont?.size ?? labelDefault?.font?.size ?? baseFontSize) * fontScale;
    const labFamily = labFont?.family ?? labelDefault?.font?.family ?? fontFamily;
    const labWeight = labFont?.weight ?? labelDefault?.font?.weight ?? fontWeight;
    const labStyle = labFont?.style ?? labelDefault?.font?.style ?? fontStyle;
    // label 缺省样式来自 labelDefault 和宿主 node。
    const labTextColor = lab.textColor ?? labelDefault?.textColor ?? labelDefault?.color ?? node.textColor;
    const labOpacity = lab.opacity ?? labelDefault?.opacity;
    const labFontSpec: FontSpec = { size: labFontSize, family: labFamily, weight: labWeight, style: labStyle };
    // label 含公式时走混排布局。
    const resolved = resolveLineRuns(lab.text, texGatingOn);
    if (resolved.warn) {
      inlineWarn(
        CompileWarningCode.TextTexParseError,
        'Unbalanced `$` in node label; the trailing fragment is kept literal.',
      );
    }
    const plainText = resolved.runs.map(r => ('text' in r ? r.text : '')).join('');
    const isMixed = resolved.hasMath || typeof lab.text === 'object';
    const laid = isMixed
      ? layoutInlineLine(resolved.runs, {
          measureText,
          lowerTex: texLowering?.lowerTex,
          font: labFontSpec,
          color: labTextColor,
          opacity: labOpacity,
          warn: inlineWarn,
        })
      : undefined;
    return {
      text: plainText,
      laid,
      position: normalizeLabelPosition(lab.position),
      placement: lab.placement ?? 'outside',
      distance: lab.distance ?? DEFAULT_LABEL_DISTANCE,
      textColor: labTextColor,
      opacity: labOpacity,
      fontSize: labFontSize,
      fontFamily: labFamily,
      fontWeight: labWeight,
      fontStyle: labStyle,
      rotate: lab.rotate,
      keepUpright: lab.keepUpright,
      measuredWidth: laid ? laid.width : measureText(plainText, labFontSpec).width,
      pin: lab.pin,
    };
  });

  return {
    id: node.id,
    shapeName,
    shapeDef,
    shapeParams,
    rect: {
      // x, y 是外接 AABB 几何中心。
      x: rectCenterX,
      y: rectCenterY,
      width: 2 * boundsHalfW,
      height: 2 * boundsHalfH,
      // geometry 用弧度。
      rotate: rotateDeg * DEG_TO_RAD,
    },
    contentCenter,
    rotateDeg,
    margin,
    lines,
    inlineBlock,
    textWidth,
    textHeight,
    align,
    lineHeight,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    fill: node.fill,
    fillOpacity: node.fillOpacity,
    stroke: node.stroke,
    strokeOpacity: node.drawOpacity,
    strokeWidth: node.strokeWidth,
    dashPattern: resolveDashPattern(node.dashPattern, node.dashed, node.dotted),
    dashOffset: node.dashOffset,
    cornerRadius: node.cornerRadius,
    textColor: node.textColor,
    opacity: node.opacity,
    shadow: resolveShadow(node.shadow),
    blendMode: node.blendMode,
    labels,
    boundary: node.boundary,
    meta: node.meta,
    animations: node.animations,
    shapes,
    boundaries,
  };
};
