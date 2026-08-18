import type { GroupPrim, ScenePrimitive, TextPrim } from '../../../contract';
import type { CanonicalGeometryLabel } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { SegmentSample } from '../../../shared/geometry';
import type { LineLayoutContext, LowerTex, TextFont, TextMeasurer } from '../../text';
import type { CompileWarningCodeValue } from '../../warning';

import { RAD_TO_DEG } from '../../../shared/geometry';
import { DEFAULT_FONT_SIZE } from '../../constants';
import {
  combineOpacity,
  layoutInlineLine,
  normalizeTextMetrics,
  resolveFontSize,
  resolveLineRunsWithWarning,
  toAlphabeticBaselineY,
} from '../../text';

/** 边标注默认行高 */
const LABEL_LINE_HEIGHT_FACTOR = 1.2;

/** 边标注公式上下文 */
export type LabelTexContext = {
  /** 注入的 TeX 降解能力 */
  lowerTex?: LowerTex;
  /** `$...$` 解析门控 */
  gatingOn: boolean;
  warn: (code: CompileWarningCodeValue, message: string) => void;
};

/** step label 放置时额外需要的宿主几何信息 */
export type LabelPlacementContext = {
  /**
   * 面状宿主在采样点处从中心线到边界的半宽
   * @default 0
   */
  boundaryOffset?: number;
};

/** step label emit 所需上下文 */
export type EmitLabelPrimitiveContext = {
  measureText: TextMeasurer;
  round: (n: number) => number;
  rootFontSize?: number;
  hostOpacity?: number;
  tex?: LabelTexContext;
  placement?: LabelPlacementContext;
};

/**
 * step.label + 段采样 → 单行 primitive
 * @description 返回 label primitive 及其 bbox 外接点
 */
export const emitLabelPrimitive = (
  label: CanonicalGeometryLabel,
  sample: SegmentSample,
  context: EmitLabelPrimitiveContext,
): { primitive: ScenePrimitive; boundsPoints: Array<IRPosition> } => {
  const {
    measureText,
    round,
    rootFontSize = DEFAULT_FONT_SIZE,
    hostOpacity,
    tex: texCtx,
    placement: placementCtx,
  } = context;
  // label.font / textColor / opacity 已由 resolve/style 解析（fold scope labelDefault + 宿主 path 主色）
  const fontSize = resolveFontSize(label.font?.size, {
    rootFontSize,
    inheritedFontSize: rootFontSize,
  });
  const fontFamily = label.font?.family;
  const fontWeight = label.font?.weight;
  const fontStyle = label.font?.style;
  const font: TextFont = { size: fontSize, family: fontFamily, weight: fontWeight, style: fontStyle };
  const side = label.side;
  const sloped = label.sloped === true;
  const sideDistance = label.distance;
  const boundaryOffset = placementCtx?.boundaryOffset ?? 0;
  const sideOffset =
    label.placement === 'inside' ? Math.max(0, boundaryOffset - sideDistance) : boundaryOffset + sideDistance;
  const labelOpacity = combineOpacity(label.opacity, hostOpacity);

  const gatingOn = texCtx?.gatingOn ?? false;
  const resolved = resolveLineRunsWithWarning(label.text, {
    gatingOn,
    warn: texCtx?.warn ?? ((): void => {}),
    warningMessage: 'Unbalanced `$` in edge label; the trailing fragment is kept literal.',
  });
  const isMixed = resolved.hasMath || typeof label.text === 'object';

  // 含公式：走混排布局（逐 run TextPrim / glyph group），按 side 求行起点与基线
  if (isMixed) {
    const ctx: LineLayoutContext = {
      measureText,
      lowerTex: texCtx?.lowerTex,
      font,
      rootFontSize,
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
        boundsPoints: [
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
      boundsPoints: [
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
  const m = normalizeTextMetrics(measureText(text, font));
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
    y: round(toAlphabeticBaselineY({ y, baseline, lineCount: 1, lineHeight: emittedLineHeight, fontSize })),
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
      boundsPoints: [
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
    boundsPoints: [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
    ],
  };
};
