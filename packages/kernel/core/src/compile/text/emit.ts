import type { ScenePrimitive, TextContentLine, TextPrimitive } from '../../contract';
import { combineOpacity } from '../../resolve';
import { emitTexPrimitive } from './tex';
import type { CompiledTextBlockLayout, InlineLineLayout, InlineLinePaint } from './types';

/** 行高近似系数 */
const LINE_HEIGHT_FACTOR = 1.2;

/** 用当前外观绘制既有布局，不调用测量或公式降解服务 */
export const emitInlineLine = (
  layout: InlineLineLayout,
  paint: InlineLinePaint,
  originX: number,
  baselineY: number,
  round: (value: number) => number,
): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];

  for (const p of layout.pieces) {
    const segmentPaint = paint.segments[p.segmentIndex];
    if (p.kind === 'text') {
      const tp: TextPrimitive = {
        type: 'text',
        x: round(originX + p.x),
        y: round(baselineY),
        lines: [{ text: p.text }],
        fontSize: p.font.size,
        align: 'start',
        baseline: 'alphabetic',
        lineHeight: round(p.font.size * LINE_HEIGHT_FACTOR),
        measuredWidth: round(p.width),
        measuredHeight: round(p.measuredHeight),
        fill: segmentPaint.fill ?? paint.color ?? 'currentColor',
      };
      if (p.font.family !== undefined) tp.fontFamily = p.font.family;
      if (p.font.weight !== undefined) tp.fontWeight = p.font.weight;
      if (p.font.style !== undefined) tp.fontStyle = p.font.style;
      const op = combineOpacity(segmentPaint.opacity, paint.opacity);
      if (op !== undefined) tp.opacity = op;
      out.push(tp);
    } else {
      out.push(
        emitTexPrimitive(
          p,
          { color: segmentPaint.fill ?? paint.color, opacity: combineOpacity(segmentPaint.opacity, paint.opacity) },
          originX + p.x,
          baselineY,
          round,
        ),
      );
    }
  }

  return out;
};

/** 使用已完成的物理行布局和当前文本外观绘制文本块 */
export const emitTextBlock = (
  layout: CompiledTextBlockLayout,
  paint: {
    /** 当前作者行及片段外观 */
    lines: ReadonlyArray<TextContentLine>;
    /** 块文字主色 */
    color?: string;
    /** 已合成宿主因子的块透明度 */
    opacity?: number;
    /** 块内行对齐方式 */
    textAlign: 'start' | 'middle' | 'end';
  },
  left: number,
  top: number,
  round: (value: number) => number,
): Array<ScenePrimitive> =>
  layout.lines.flatMap(({ laid, sourceLineIndex, baselineOffset }) => {
    const offset = paint.textAlign === 'start' ? 0 : (layout.width - laid.width) / (paint.textAlign === 'end' ? 1 : 2);
    const primitives = emitInlineLine(
      laid,
      {
        color: paint.color,
        opacity: paint.opacity,
        segments: paint.lines[sourceLineIndex].segments,
      },
      left + offset,
      top + baselineOffset,
      round,
    );
    // 单片段行直接使用块对齐，保持图元锚点与作者的行对齐一致
    if (primitives.length === 1 && primitives[0].type === 'text') {
      const primitive = primitives[0];
      primitive.align = paint.textAlign;
      primitive.x = round(
        left + (paint.textAlign === 'start' ? 0 : layout.width / (paint.textAlign === 'end' ? 1 : 2)),
      );
    }
    return primitives;
  });
