import type { BoundaryDefinition } from '../../contract';
import type { TextLine, Transform } from '../../contract';
import type { ShapeDefinition } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type {
  IRJsonObject,
  IRLabelDefault,
  IRLineSpec,
  IRNode,
  IRNodeLabel,
  IRShapeRef,
  JsonValue,
} from '../../schemas';
import type { NameStack } from '../name-stack';
import type { ResolveBetweenGlobal } from '../position';
import type { LaidLine, LineLayoutContext } from '../text-layout';
import type { FontSpec, TextMeasurer } from '../text-metrics';
import type { NodeLabelLayout, NodeLayout, TexLoweringContext } from './types';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { providerDefinitionOf } from '../../providers/registry';
import { resolveShapeRegistry } from '../../providers/shape';
import { JsonObjectSchema } from '../../schemas';
import { CompileWarningCode } from '../constant';
import { resolveShadow } from '../effects';
import { resolvePosition } from '../position';
import { layoutInlineLine, resolveLineRuns } from '../text-layout';
import { DEFAULT_LABEL_DISTANCE, normalizeLabelPosition } from './labels';
import { alignToTextAnchor, DEFAULT_FONT_SIZE, DEFAULT_LINE_HEIGHT_FACTOR, resolveDashPattern, wrapText } from './text';

const DEFAULT_PADDING = 8;
/**
 * 规范化 `Node.shape` 为 `{ type, params }`
 * @description 裸 string → `{ type, params: {} }`；`{ type, params? }` → params 缺省补 `{}`；
 *   缺省（undefined）→ `{ type: 'rectangle', params: {} }`。`'circle'`（裸 string）消解为
 *   `{ type: 'ellipse', params: { circumscribe: 'equal' } }`——circle 无独立几何，是 ellipse 等轴 preset 别名。
 *   `'diamond'`（裸 string）消解为 `{ type: 'polygon', params: { sides: 4, rotate: 0 } }`——diamond 无独立几何，
 *   是 polygon 4 边形 preset 别名。仅做形态归一，不查表 / 不校验。
 */
const normalizeShape = (shape: IRNode['shape']): { type: string; params: IRJsonObject } => {
  if (shape === undefined) return { type: 'rectangle', params: {} };
  if (shape === 'circle') return { type: 'ellipse', params: { circumscribe: 'equal' } };
  if (shape === 'diamond') return { type: 'polygon', params: { sides: 4, rotate: 0 } };
  if (typeof shape === 'string') return { type: shape, params: {} };
  const ref: IRShapeRef = shape;
  return { type: ref.type, params: ref.params ?? {} };
};

/**
 * 递归把 JSON 值里所有数值叶子乘以 factor（数组 / 对象深入，string / boolean / null 原样）
 * @description 用于 shape params 随 node scale 协同缩放；输入已是 JSON-safe（双护栏过），输出仍 JSON-safe。
 */
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
const DEG_TO_RAD = Math.PI / 180;

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
  // shape 解析（入口立即报错）：裸 string → { type, params:{} }，对象原样；按 type 查表，未注册抛错列出可用名
  const { type: shapeName, params: rawShapeParams } = normalizeShape(node.shape);
  // own-property 校验：既得到 `ShapeDefinition | undefined` 类型（让未注册分支成立），又避开
  // `'toString'` 等原型链 key 被 Record 索引误命中（开放字符串 shape 名的边界安全）
  const shapeDef = providerDefinitionOf(shapes, shapeName, { capability: 'shape', optionName: 'shapes' });
  // 双护栏（抄 path generator）：① paramsSchema.parse 校验形状字段；② JsonObjectSchema.parse 守 JSON-safe。
  // JSON-safe 这道跑在**原始 params** 上——宽松 schema（如 `z.object({}).passthrough()`）会在 parse 时
  // 静默剥掉 `undefined` 值的键，若只校验其输出就漏过非 JSON 输入；校验原始入参才能稳拦 function / undefined。
  // 字段形态仍以 paramsSchema 输出为准，透传给 circumscribe / boundaryPoint / anchor / emit。
  JsonObjectSchema.parse(rawShapeParams);
  const parsedShapeParams: IRJsonObject = shapeDef.paramsSchema.parse(rawShapeParams);

  // 顶层 Node.cornerRadius 是 rectangle-only 迁移语义：仅对默认 / rectangle 形状、且 params 未显式给
  // cornerRadius 时合进 params，使 emit 与 boundary（都读 params.cornerRadius）一致；params 显式给则优先。
  // 其余形状（polygon / star / sector）只认自身 params，不受顶层影响，避免 boundary 圆而 emit 不圆。
  const mergedShapeParams: IRJsonObject =
    shapeName === 'rectangle' && node.cornerRadius !== undefined && !('cornerRadius' in parsedShapeParams)
      ? { ...parsedShapeParams, cornerRadius: node.cornerRadius }
      : parsedShapeParams;

  // 缩放：xScale/yScale 优先于 scale 别名，默认 1；乘进所有尺寸让 path 贴缩放后边界。
  // 字号取 min(sx,sy) 保 glyph 形状，避免非均匀缩放下文字被拉变形。
  const sx = node.xScale ?? node.scale ?? 1;
  const sy = node.yScale ?? node.scale ?? 1;
  const fontScale = Math.min(sx, sy);
  // shape params 是形状内在长度（半径 / 内外径 等），随 node scale 协同缩放。
  // shapeDef.scaleParams 给定时由形状自定缩放语义（如 sector / arc 只缩半径、不缩角度）；
  // 缺省时沿用默认——用 uniform 因子（sx·sy 的几何均值；均匀缩放时即 scale）乘所有 JSON 数值叶子。
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
  // 内/外边距优先级：axis-specific (innerXSep/innerYSep/outerSep) → symmetric alias (padding/margin) → 默认；sep 受 scale 影响
  const xSep = (node.innerXSep ?? node.padding ?? DEFAULT_PADDING) * sx;
  const ySep = (node.innerYSep ?? node.padding ?? DEFAULT_PADDING) * sy;
  const outerSep = (node.outerSep ?? node.margin ?? 0) * Math.max(sx, sy);
  const lineHeight = (node.lineHeight ?? baseFontSize * DEFAULT_LINE_HEIGHT_FACTOR) * sy;
  const align = alignToTextAnchor(node.align ?? 'center');

  // 标准化为 Array<IRLineSpec>：单字符串 → 单元素（空数组 schema 已拒）
  const rawLines: Array<IRLineSpec> | undefined =
    node.text === undefined ? undefined : typeof node.text === 'string' ? [node.text] : node.text;

  // 折行阈值（user units，受 x 缩放）；未给 = 不折行
  const maxTextWidth = node.maxTextWidth !== undefined ? node.maxTextWidth * sx : undefined;
  // 每行解析覆盖样式 + 度量；maxTextWidth 给定时按词 / 字贪心折行（折出物理行继承该逻辑行样式）
  let textWidth = 0;
  let textHeight = 0;
  let lines: Array<TextLine> | undefined;
  // 含 math run 的混排块（取代 lines；逐行 emit TextPrim / glyph group）
  let inlineBlock: { lines: Array<{ laid: LaidLine; baselineOffset: number }> } | undefined;
  // `$...$` 行内公式糖仅在注入 lowerTex 时解析（未注入 → 字符串字面，含 `$` 旧文本零回归）
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
      // 混排路径：逐行布局；node 尺寸由各行盒撑出（单 `$$..$$` 行即按公式 glyph bbox 定尺寸）
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
        // 有效文字：注入 lowerTex 时用解析结果（`\$` 已反转义）；否则原字符串（零回归）
        const text = resolved[li].runs.map(r => ('text' in r ? r.text : '')).join('');
        // 行对象（非字符串、非 MixedLine）才有行级样式；MixedLine 不会落到本分支
        const lineObj = typeof spec === 'object' && !('runs' in spec) ? spec : undefined;
        const lineFont = lineObj?.font;
        const font: FontSpec = {
          size: lineFont?.size !== undefined ? lineFont.size * fontScale : fontSize,
          family: lineFont?.family ?? fontFamily,
          weight: lineFont?.weight ?? fontWeight,
          style: lineFont?.style ?? fontStyle,
        };
        // '\n' 是硬换行：先把本逻辑行里的 '\n' 拆成多行（对齐 react children 拆行与直写 IR），
        // 硬拆出的物理行继承本逻辑行样式，再各自按 maxTextWidth 折行
        const hardLines = text.split('\n');
        const physical = hardLines.flatMap(hardLine =>
          maxTextWidth !== undefined ? wrapText(hardLine, font, maxTextWidth, measureText) : [hardLine],
        );
        for (const ptext of physical) {
          const m = measureText(ptext, font);
          if (m.width > textWidth) textWidth = m.width;
          const out: TextLine = { text: ptext };
          // 行级与块级不同时才写出（精简 emit JSON，明确下游兜底）
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

  // 内框半轴：text 半宽 + sep（保证至少 sep 大小，空文本节点也有最小尺寸）。minimum 不进内框——见下方对外接框 floor。
  const innerHalfW = Math.max(textWidth / 2 + xSep, xSep);
  const innerHalfH = Math.max(textHeight / 2 + ySep, ySep);

  // 外接边界（bounding rect）半轴：内框半轴经 shape.circumscribe 派生
  const circumscribed = shapeDef.circumscribe(innerHalfW, innerHalfH, shapeParams);

  // minimum 尺寸（TikZ 语义）：floor 外接框（bounding box）而非内框，且随 scale 缩（与 sep / text / fontSize 同口径，
  // minimumWidth→sx、minimumHeight→sy）。minimumWidth/Height 覆盖 minimumSize（对称别名）。inner-driven shape
  // （rectangle/ellipse/polygon）emit 按 floor 后的 rect 重建、恰好填满；params-radius-driven shape（sector/star/arc）
  // glyph 由半径定、minimum 仅预留 bbox 空间不缩放 glyph。
  const minHalfW = ((node.minimumWidth ?? node.minimumSize ?? 0) * sx) / 2;
  const minHalfH = ((node.minimumHeight ?? node.minimumSize ?? 0) * sy) / 2;
  const boundsHalfW = Math.max(circumscribed.halfWidth, minHalfW);
  const boundsHalfH = Math.max(circumscribed.halfHeight, minHalfH);

  const rotateDeg = node.rotate ?? 0;
  const center = resolvePosition(node.position, nameStack, nodeDistance, scopeChain, resolveBetweenGlobal);
  if (!center) {
    throw new Error(
      `Cannot resolve position for node ${node.id ?? '(unnamed)'}; polar.origin / at.of / between endpoint may reference an undefined node`,
    );
  }
  // shape 可声明 AABB 中心相对 position 的偏移（如 sector：position=圆心 apex，AABB 中心偏在一侧）；
  // rect 中心 = position + 偏移，使 bbox 罩住完整形状、anchor 以 AABB 中心 rect 计算时 apex 落回 position。
  const aabbOffset = shapeDef.circumscribeOffset?.(shapeParams);
  const rectCenterX = center[0] + (aabbOffset?.[0] ?? 0);
  const rectCenterY = center[1] + (aabbOffset?.[1] ?? 0);
  // 标准化 label：单对象 → 单元素数组；继承 Node 的 font/textColor
  const rawLabels: Array<IRNodeLabel> | undefined =
    node.label === undefined ? undefined : Array.isArray(node.label) ? node.label : [node.label];
  const labels: Array<NodeLabelLayout> | undefined = rawLabels?.map(lab => {
    const labFont = lab.font;
    const labFontSize = (labFont?.size ?? labelDefault?.font?.size ?? baseFontSize) * fontScale;
    const labFamily = labFont?.family ?? labelDefault?.font?.family ?? fontFamily;
    const labWeight = labFont?.weight ?? labelDefault?.font?.weight ?? fontWeight;
    const labStyle = labFont?.style ?? labelDefault?.font?.style ?? fontStyle;
    // 继承顺序：label 显式 > scope.labelDefault (textColor → color) > 宿主 node 主色（已解析进 node.textColor） > currentColor
    const labTextColor = lab.textColor ?? labelDefault?.textColor ?? labelDefault?.color ?? node.textColor;
    const labOpacity = lab.opacity ?? labelDefault?.opacity;
    const labFontSpec: FontSpec = { size: labFontSize, family: labFamily, weight: labWeight, style: labStyle };
    // 解析 `$...$`（gating on）/ 显式 runs；含公式 → 混排布局，纯文本 → 既有 TextPrim
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
      // x, y 是外接 AABB 几何中心（= position + shape circumscribeOffset）
      x: rectCenterX,
      y: rectCenterY,
      width: 2 * boundsHalfW,
      height: 2 * boundsHalfH,
      // IR 用度数，geometry 用弧度
      rotate: rotateDeg * DEG_TO_RAD,
    },
    rotateDeg,
    margin: outerSep,
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
