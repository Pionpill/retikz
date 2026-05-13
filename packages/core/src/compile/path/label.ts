import type { SegmentSample } from '../../geometry/segment';
import type { IRPosition, IRStepLabel } from '../../ir';
import type { ScenePrimitive, TextPrim } from '../../primitive';
import type { TextMeasurer } from '../text-metrics';

/** 边标注默认字号 / 偏移量 */
const LABEL_FONT_SIZE = 14;
const LABEL_LINE_HEIGHT_FACTOR = 1.2;
const LABEL_SIDE_OFFSET = 4;
const RAD_TO_DEG = 180 / Math.PI;

/** keyword → t 数值映射；含旧 3 keyword（midway/near-start/near-end）+ 新 4 keyword */
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
 * @description 数值原样返回（schema 已 clamp 0..1）；keyword 走 KEYWORD_TO_T 映射；undefined 退默认 midway (0.5)
 */
export const tForLabelPosition = (pos: IRStepLabel['position']): number => {
  if (typeof pos === 'number') return pos;
  if (typeof pos === 'string' && pos in KEYWORD_TO_T) return KEYWORD_TO_T[pos];
  return 0.5;
};

/**
 * step.label + 段采样 → TextPrim（sloped 时裹一层 group 旋转）
 * @description 默认 side='above'/position='midway'：above/below 锚点 y±offset、align=middle、baseline=bottom/top；left/right x±offset、align=end/start、baseline=middle；sloped 不偏移裹 group rotate(angle, cx, cy) 由切线 atan2 算（SVG y-down CW 正）。返回 primitive + viewBox 外接点
 */
export const emitLabelPrimitive = (
  label: IRStepLabel,
  sample: SegmentSample,
  measureText: TextMeasurer,
  round: (n: number) => number,
): { primitive: ScenePrimitive; points: Array<IRPosition> } => {
  const fontSize = LABEL_FONT_SIZE;
  const lineHeight = fontSize * LABEL_LINE_HEIGHT_FACTOR;
  const m = measureText(label.text, { size: fontSize });
  const measuredWidth = m.width;
  const measuredHeight = m.height || lineHeight;
  const side = label.side ?? 'above';

  let x = sample.point[0];
  let y = sample.point[1];
  let align: 'start' | 'middle' | 'end' = 'middle';
  let baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' = 'middle';

  if (side === 'above') {
    y -= LABEL_SIDE_OFFSET;
    baseline = 'bottom';
  } else if (side === 'below') {
    y += LABEL_SIDE_OFFSET;
    baseline = 'top';
  } else if (side === 'left') {
    x -= LABEL_SIDE_OFFSET;
    align = 'end';
  } else if (side === 'right') {
    x += LABEL_SIDE_OFFSET;
    align = 'start';
  } else {
    // sloped：锚点不偏移；baseline=bottom 视觉上"在线上方"
    baseline = 'bottom';
  }

  const text: TextPrim = {
    type: 'text',
    x: round(x),
    y: round(y),
    lines: [{ text: label.text }],
    fontSize,
    align,
    baseline,
    lineHeight: round(lineHeight),
    measuredWidth: round(measuredWidth),
    measuredHeight: round(measuredHeight),
    fill: 'currentColor',
  };

  if (side === 'sloped') {
    const angleDeg = Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
    const groupPrim: ScenePrimitive = {
      type: 'group',
      transforms: [
        { kind: 'rotate', degrees: round(angleDeg), cx: round(x), cy: round(y) },
      ],
      children: [text],
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

  // 非 sloped：锚点 + 文本块四角加进 bbox 候选（保守，避免裁掉）
  const halfW = measuredWidth / 2;
  const halfH = measuredHeight / 2;
  return {
    primitive: text,
    points: [
      [x - halfW, y - halfH],
      [x + halfW, y - halfH],
      [x - halfW, y + halfH],
      [x + halfW, y + halfH],
    ],
  };
};
