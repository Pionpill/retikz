import type { ScenePrimitive, TextContentLine, TextPrimitive } from '../../contract';
import { combineOpacity } from '../../resolve';
import { emitTexPrimitive } from './tex';
import type { CompiledTextBlockLayout, CompiledTextLineLayout, TextLinePaint } from './types';

/** 行高近似系数 */
const LINE_HEIGHT_FACTOR = 1.2;

/** 用当前外观绘制既有布局，不调用测量或公式降解服务 */
export const emitTextLine = (
  layout: CompiledTextLineLayout,
  paint: TextLinePaint,
  originX: number,
  baselineY: number,
  round: (value: number) => number,
): Array<ScenePrimitive> => {
  const primitives: Array<ScenePrimitive> = [];

  for (const piece of layout.pieces) {
    const segmentPaint = paint.segments[piece.segmentIndex];
    if (piece.kind === 'text') {
      const textPrimitive: TextPrimitive = {
        type: 'text',
        x: round(originX + piece.x),
        y: round(baselineY),
        lines: [{ text: piece.text }],
        fontSize: piece.font.size,
        align: 'start',
        baseline: 'alphabetic',
        lineHeight: round(piece.font.size * LINE_HEIGHT_FACTOR),
        measuredWidth: round(piece.width),
        measuredHeight: round(piece.measuredHeight),
        fill: segmentPaint.fill ?? paint.color ?? 'currentColor',
      };
      if (piece.font.family !== undefined) textPrimitive.fontFamily = piece.font.family;
      if (piece.font.weight !== undefined) textPrimitive.fontWeight = piece.font.weight;
      if (piece.font.style !== undefined) textPrimitive.fontStyle = piece.font.style;
      const opacity = combineOpacity(segmentPaint.opacity, paint.opacity);
      if (opacity !== undefined) textPrimitive.opacity = opacity;
      primitives.push(textPrimitive);
    } else {
      primitives.push(
        emitTexPrimitive(
          piece,
          { color: segmentPaint.fill ?? paint.color, opacity: combineOpacity(segmentPaint.opacity, paint.opacity) },
          originX + piece.x,
          baselineY,
          round,
        ),
      );
    }
  }

  return primitives;
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
  layout.lines.flatMap(({ lineLayout, sourceLineIndex, baselineOffset }) => {
    const offset =
      paint.textAlign === 'start' ? 0 : (layout.width - lineLayout.width) / (paint.textAlign === 'end' ? 1 : 2);
    const primitives = emitTextLine(
      lineLayout,
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
