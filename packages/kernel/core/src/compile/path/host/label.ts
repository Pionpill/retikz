import type { CurveSegmentSample } from '@retikz/math';

import type { GroupPrim, ScenePrimitive, TextPrim } from '../../../contract';
import type { CanonicalFont, CanonicalGeometryLabel } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { LineLayoutContext, LowerTex, TextMeasurer } from '../../text';
import type { CompileWarningCodeValue } from '../../warning';

import { resolveFont, resolveTextLine } from '../../../resolve';
import { RAD_TO_DEG } from '../../../shared/geometry';
import { DEFAULT_FONT_SIZE } from '../../constants';
import { combineOpacity, layoutInlineLine, normalizeTextMetrics, toAlphabeticBaselineY } from '../../text';

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
  sample: CurveSegmentSample,
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
  const font: CanonicalFont = resolveFont(label.font, {
    rootFontSize,
    inheritedFont: { size: rootFontSize },
  });
  const fontSize = font.size;
  const fontFamily = font.family;
  const fontWeight = font.weight;
  const fontStyle = font.style;
  const side = label.side;
  const sloped = label.sloped === true;
  const sideDistance = label.distance;
  const boundaryOffset = placementCtx?.boundaryOffset ?? 0;
  const sideOffset =
    label.placement === 'inside' ? Math.max(0, boundaryOffset - sideDistance) : boundaryOffset + sideDistance;
  const labelOpacity = combineOpacity(label.opacity, hostOpacity);

  const gatingOn = texCtx?.gatingOn ?? false;
  const sourceLines = Array.isArray(label.text)
    ? label.text
    : typeof label.text === 'string'
      ? label.text.split('\n')
      : [label.text];
  const resolvedLines = sourceLines.map(text =>
    resolveTextLine(text, {
      rootFontSize,
      inheritedFont: font,
      gatingOn,
      warn: texCtx?.warn ?? ((): void => {}),
      warningMessage: 'Unbalanced `$` in edge label; the trailing fragment is kept literal.',
    }),
  );

  // 单行纯文本沿用既有 TextPrim 输出；其它内容统一按一个文本块布局。
  if (sourceLines.length > 1 || resolvedLines[0].mixed) {
    const ctx: LineLayoutContext = {
      measureText,
      lowerTex: texCtx?.lowerTex,
      font,
      color: label.textColor,
      opacity: labelOpacity,
      warn: texCtx?.warn ?? ((): void => {}),
    };
    const laidLines = resolvedLines.map(line => layoutInlineLine(line.runs, ctx));
    const slots = laidLines.map(line => Math.max(fontSize * LABEL_LINE_HEIGHT_FACTOR, line.ascent + line.descent));
    const blockWidth = Math.max(...laidLines.map(line => line.width));
    const blockHeight = slots.reduce((height, slot) => height + slot, 0);
    const ax = sample.point[0];
    const ay = sample.point[1];
    let left: number;
    let top: number;
    if (side === 'bottom') {
      left = ax - blockWidth / 2;
      top = ay + sideOffset;
    } else if (side === 'left') {
      left = ax - sideOffset - blockWidth;
      top = ay - blockHeight / 2;
    } else if (side === 'right') {
      left = ax + sideOffset;
      top = ay - blockHeight / 2;
    } else if (side === 'center') {
      left = ax - blockWidth / 2;
      top = ay - blockHeight / 2;
    } else {
      left = ax - blockWidth / 2;
      top = ay - sideOffset - blockHeight;
    }
    let verticalOffset = 0;
    const children = laidLines.flatMap((laid, index) => {
      const slot = slots[index];
      const naturalHeight = laid.ascent + laid.descent;
      const baselineY = top + verticalOffset + (slot - naturalHeight) / 2 + laid.ascent;
      verticalOffset += slot;
      return laid.emit(left + (blockWidth - laid.width) / 2, baselineY, round);
    });
    const group: GroupPrim = { type: 'group', children };
    const right = left + blockWidth;
    const bottom = top + blockHeight;

    if (sloped) {
      const angleDeg = Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
      const rotated: GroupPrim = {
        type: 'group',
        transforms: [{ kind: 'rotate', degrees: round(angleDeg), cx: round(ax), cy: round(ay) }],
        children: [group],
      };
      const angleRad = angleDeg / RAD_TO_DEG;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const boundsPoints = [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom],
      ].map(([x, y]): IRPosition => [ax + (x - ax) * cos - (y - ay) * sin, ay + (x - ax) * sin + (y - ay) * cos]);
      return {
        primitive: rotated,
        boundsPoints,
      };
    }
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
  const resolved = resolvedLines[0];
  const text = resolved.plainText;
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
