import type { GroupPrim, ScenePrimitive, TextPrim } from '../../contract';
import type { GeometryLabelSideValue, IRPosition, IRStepLabel } from '../../schemas';
import type { SegmentSample } from '../../shared/geometry';
import type { CompileWarningCodeValue } from '../constant';
import type { FontSpec, LineLayoutContext, LowerTex, TextMeasurer } from '../text';

import { RAD_TO_DEG } from '../../shared/geometry';
import { CompileWarningCode } from '../constant';
import { layoutInlineLine, resolveLineRuns, toAlphabeticBaselineY } from '../text';

/** 边标注字号与偏移量。 */
const LABEL_FONT_SIZE = 14;
const LABEL_LINE_HEIGHT_FACTOR = 1.2;
const LABEL_SIDE_OFFSET = 4;
type LabelSide = GeometryLabelSideValue | 'center';

/** 边标注公式上下文。 */
export type LabelTexContext = {
  /**
   * 注入的 TeX 降解能力。
   * @default undefined
   */
  lowerTex?: LowerTex;
  /** `$...$` 解析门控。 */
  gatingOn: boolean;
  warn: (code: CompileWarningCodeValue, message: string) => void;
};

/** step label 放置时额外需要的宿主几何信息。 */
export type LabelPlacementContext = {
  /**
   * 面状宿主在采样点处从中心线到边界的半宽。
   * @default 0
   */
  boundaryOffset?: number;
};

/** keyword → t 数值映射。 */
const KEYWORD_TO_T: Record<string, number> = {
  'at-start': 0,
  'very-near-start': 0.125,
  'near-start': 0.25,
  midway: 0.5,
  'near-end': 0.75,
  'very-near-end': 0.875,
  'at-end': 1,
};

/**
 * label.position → 段参数 t∈[0,1]
 * @description 数值原样返回；keyword 走 KEYWORD_TO_T 映射。
 */
export const tForLabelPosition = (pos: IRStepLabel['position']): number => {
  if (typeof pos === 'number') return pos;
  if (typeof pos === 'string' && pos in KEYWORD_TO_T) return KEYWORD_TO_T[pos];
  return 0.5;
};

/** label-only opacity 与宿主 path opacity 相乘（元素内轴）；label 缺省则跟随宿主 */
const resolveLabelOpacity = (labelOpacity?: number, hostOpacity?: number): number | undefined =>
  labelOpacity !== undefined ? (hostOpacity !== undefined ? labelOpacity * hostOpacity : labelOpacity) : hostOpacity;

/**
 * step.label + 段采样 → 单行 primitive。
 * @description 返回 label primitive 及其 bbox 外接点。
 */
export const emitLabelPrimitive = (
  label: IRStepLabel,
  sample: SegmentSample,
  measureText: TextMeasurer,
  round: (n: number) => number,
  hostOpacity?: number,
  texCtx?: LabelTexContext,
  placementCtx?: LabelPlacementContext,
): { primitive: ScenePrimitive; points: Array<IRPosition> } => {
  // label.font / textColor / opacity 已由 compile/style 解析（fold scope labelDefault + 宿主 path 主色）
  const fontSize = label.font?.size ?? LABEL_FONT_SIZE;
  const fontFamily = label.font?.family;
  const fontWeight = label.font?.weight;
  const fontStyle = label.font?.style;
  const font: FontSpec = { size: fontSize, family: fontFamily, weight: fontWeight, style: fontStyle };
  const side: LabelSide =
    label.side === undefined
      ? label.sloped === true || label.placement === 'inside'
        ? 'center'
        : 'top'
      : label.side;
  const sloped = label.sloped === true;
  const sideDistance = label.distance ?? LABEL_SIDE_OFFSET;
  const boundaryOffset = placementCtx?.boundaryOffset ?? 0;
  const sideOffset =
    label.placement === 'inside' ? Math.max(0, boundaryOffset - sideDistance) : boundaryOffset + sideDistance;
  const labelOpacity = resolveLabelOpacity(label.opacity, hostOpacity);

  const gatingOn = texCtx?.gatingOn ?? false;
  const resolved = resolveLineRuns(label.text, gatingOn);
  if (resolved.warn) {
    texCtx?.warn(
      CompileWarningCode.TextTexParseError,
      'Unbalanced `$` in edge label; the trailing fragment is kept literal.',
    );
  }
  const isMixed = resolved.hasMath || typeof label.text === 'object';

  // 含公式：走混排布局（逐 run TextPrim / glyph group），按 side 求行起点与基线
  if (isMixed) {
    const ctx: LineLayoutContext = {
      measureText,
      lowerTex: texCtx?.lowerTex,
      font,
      color: label.textColor,
      opacity: labelOpacity,
      warn: texCtx?.warn ?? ((): void => {}),
    };
    const laid = layoutInlineLine(resolved.runs, ctx);
    const ax = sample.point[0];
    const ay = sample.point[1];
    let originX: number;
    let baselineY: number;
    if (side === 'bottom') {
      originX = ax - laid.width / 2;
      baselineY = ay + sideOffset + laid.ascent;
    } else if (side === 'left') {
      originX = ax - sideOffset - laid.width;
      baselineY = ay + (laid.ascent - laid.descent) / 2;
    } else if (side === 'right') {
      originX = ax + sideOffset;
      baselineY = ay + (laid.ascent - laid.descent) / 2;
    } else if (side === 'center') {
      originX = ax - laid.width / 2;
      baselineY = ay + (laid.ascent - laid.descent) / 2;
    } else {
      // top：水平居中，按 sideOffset 放到采样点上方。
      originX = ax - laid.width / 2;
      baselineY = ay - sideOffset - laid.descent;
    }
    const children = laid.emit(originX, baselineY, round);
    const group: GroupPrim = { type: 'group', children };

    if (sloped) {
      const angleDeg = Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
      const rotated: GroupPrim = {
        type: 'group',
        transforms: [{ kind: 'rotate', degrees: round(angleDeg), cx: round(ax), cy: round(ay) }],
        children: [group],
      };
      const r = Math.max(laid.width / 2, (laid.ascent + laid.descent) / 2);
      return {
        primitive: rotated,
        points: [
          [ax - r, ay - r],
          [ax + r, ay - r],
          [ax - r, ay + r],
          [ax + r, ay + r],
        ],
      };
    }
    const left = originX;
    const right = originX + laid.width;
    const top = baselineY - laid.ascent;
    const bottom = baselineY + laid.descent;
    return {
      primitive: group,
      points: [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom],
      ],
    };
  }

  // 纯文本：维持既有 TextPrim 路径（gating 时用反转义后的文字，否则原字符串、零回归）
  const text = resolved.runs.map(r => ('text' in r ? r.text : '')).join('');
  const lineHeight = fontSize * LABEL_LINE_HEIGHT_FACTOR;
  const m = measureText(text, font);
  const measuredWidth = m.width;
  const measuredHeight = m.height || lineHeight;

  let x = sample.point[0];
  let y = sample.point[1];
  let align: 'start' | 'middle' | 'end' = 'middle';
  let baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' = 'middle';

  if (side === 'top') {
    y -= sideOffset;
    baseline = 'bottom';
  } else if (side === 'bottom') {
    y += sideOffset;
    baseline = 'top';
  } else if (side === 'left') {
    x -= sideOffset;
    align = 'end';
  } else if (side === 'right') {
    x += sideOffset;
    align = 'start';
  } else {
    baseline = 'middle';
  }

  const emittedLineHeight = round(lineHeight);
  const textPrim: TextPrim = {
    type: 'text',
    x: round(x),
    y: round(toAlphabeticBaselineY(y, baseline, 1, emittedLineHeight, fontSize)),
    lines: [{ text }],
    fontSize,
    align,
    baseline: 'alphabetic',
    lineHeight: emittedLineHeight,
    measuredWidth: round(measuredWidth),
    measuredHeight: round(measuredHeight),
    fill: label.textColor ?? 'currentColor',
  };
  if (fontFamily !== undefined) textPrim.fontFamily = fontFamily;
  if (fontWeight !== undefined) textPrim.fontWeight = fontWeight;
  if (fontStyle !== undefined) textPrim.fontStyle = fontStyle;
  if (labelOpacity !== undefined) textPrim.opacity = labelOpacity;

  if (sloped) {
    const angleDeg = Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
    const groupPrim: ScenePrimitive = {
      type: 'group',
      transforms: [
        {
          kind: 'rotate',
          degrees: round(angleDeg),
          cx: round(sample.point[0]),
          cy: round(sample.point[1]),
        },
      ],
      children: [textPrim],
    };
    // sloped 旋转后用半径外接近似四角点
    const r = Math.max(measuredWidth / 2, measuredHeight / 2);
    return {
      primitive: groupPrim,
      points: [
        [x - r, y - r],
        [x + r, y - r],
        [x - r, y + r],
        [x + r, y + r],
      ],
    };
  }

  // 非 sloped：按 align / baseline 求文本块的真实左右 / 上下边，再取四角加进 bbox 候选。
  // 锚点居中对称取角会少覆盖半个宽 / 高——side='left'（align=end）文本完全在锚点左侧、
  // side='top'（baseline=bottom）文本完全在锚点上方，长 label 会超出自动 viewBox 被裁。
  const halfW = measuredWidth / 2;
  const halfH = measuredHeight / 2;
  const left = align === 'start' ? x : align === 'end' ? x - measuredWidth : x - halfW;
  const right = align === 'start' ? x + measuredWidth : align === 'end' ? x : x + halfW;
  const top = baseline === 'top' ? y : baseline === 'bottom' ? y - measuredHeight : y - halfH;
  const bottom = baseline === 'top' ? y + measuredHeight : baseline === 'bottom' ? y : y + halfH;
  return {
    primitive: textPrim,
    points: [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
    ],
  };
};
