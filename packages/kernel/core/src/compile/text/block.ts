import type { ScenePrimitive, TextContentLine } from '../../contract';
import type { InlineLineLayout, LineLayoutContext } from './layout';
import { emitInlineLine, layoutInlineLine } from './layout';

/** 文本块物理行及其作者来源 */
export type CompiledTextBlockLine = {
  /** 作者行索引，供绘制读取当前外观 */
  sourceLineIndex: number;
  /** 已测量的片段及其原始片段索引 */
  laid: InlineLineLayout;
  /** 相对块顶部的基线 */
  baselineOffset: number;
};

/** 与绘制外观分离的文本块布局结果 */
export type CompiledTextBlockLayout = {
  /** 最宽物理行的宽度 */
  width: number;
  /** 全部物理行的行槽总高度 */
  height: number;
  /** 按阅读顺序排列的物理行 */
  lines: Array<CompiledTextBlockLine>;
};

/** 文本块有效行高与宿主提供的宽度预算 */
export type TextBlockLayoutOptions = {
  /** 已确定并缩放的行高 */
  lineHeight: number;
  /** 自动折行预算，省略时只处理硬换行 */
  maxTextWidth?: number;
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

/** 按同一规则布局普通文字与公式混排，并保留折行前的外观索引 */
export const layoutTextBlock = (
  sourceLines: ReadonlyArray<TextContentLine>,
  options: TextBlockLayoutOptions,
  context: LineLayoutContext,
): CompiledTextBlockLayout => {
  const { lineHeight, maxTextWidth } = options;
  const lines: Array<CompiledTextBlockLine> = [];
  let width = 0;
  let height = 0;
  const words = new Intl.Segmenter(undefined, { granularity: 'word' });
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  for (const [sourceLineIndex, source] of sourceLines.entries()) {
    let pieces: InlineLineLayout['pieces'] = [];
    let lineWidth = 0;
    let ascent = 0;
    let descent = 0;

    const flushLine = () => {
      if (pieces.length === 0) {
        const empty = layoutInlineLine([], {
          ...context,
          font: { ...context.font, size: source.style?.font?.size ?? context.font.size },
        });
        ascent = empty.ascent;
        descent = empty.descent;
      }
      const slot = Math.max(lineHeight, ascent + descent);
      lines.push({
        sourceLineIndex,
        laid: { pieces, width: lineWidth, ascent, descent, isPlain: pieces.every(piece => piece.kind === 'text') },
        baselineOffset: height + (slot - ascent - descent) / 2 + ascent,
      });
      width = Math.max(width, lineWidth);
      height += slot;
      pieces = [];
      lineWidth = 0;
      ascent = 0;
      descent = 0;
    };

    // 在完整作者行上确定断点，样式片段边界不产生额外断词位置
    let sourceText = '';
    const spans = source.segments.map((segment, segmentIndex) => {
      const start = sourceText.length;
      sourceText += 'tex' in segment ? '\ufffc' : segment.text;
      return { segment, segmentIndex, start, end: sourceText.length };
    });
    const formulas = new Map<number, InlineLineLayout>();
    const measureRange = (start: number, end: number): InlineLineLayout => {
      const result: InlineLineLayout = { pieces: [], width: 0, ascent: 0, descent: 0, isPlain: true };
      for (const span of spans) {
        if (span.end <= start || span.start >= end) continue;
        const segment =
          'tex' in span.segment
            ? span.segment
            : {
                ...span.segment,
                text: sourceText.slice(Math.max(start, span.start), Math.min(end, span.end)),
              };
        let laid = 'tex' in segment ? formulas.get(span.segmentIndex) : undefined;
        if (laid === undefined) {
          laid = layoutInlineLine([segment], context);
          if ('tex' in segment) formulas.set(span.segmentIndex, laid);
        }
        for (const piece of laid.pieces)
          result.pieces.push({ ...piece, segmentIndex: span.segmentIndex, x: piece.x + result.width });
        result.width += laid.width;
        result.ascent = Math.max(result.ascent, laid.ascent);
        result.descent = Math.max(result.descent, laid.descent);
        result.isPlain &&= laid.isPlain;
      }
      return result;
    };
    let lineStart = 0;
    let lineEnd = 0;
    const setRange = (start: number, end: number) => {
      lineStart = start;
      lineEnd = end;
      const laid = measureRange(start, end);
      pieces = laid.pieces;
      lineWidth = laid.width;
      ascent = laid.ascent;
      descent = laid.descent;
    };
    const appendRange = (start: number, end: number) => {
      const candidate = measureRange(pieces.length === 0 ? start : lineStart, end);
      if (
        maxTextWidth !== undefined &&
        pieces.length > 0 &&
        candidate.width > maxTextWidth &&
        /\S/u.test(sourceText.slice(start, end))
      ) {
        const trimmedEnd = sourceText.slice(lineStart, lineEnd).trimEnd().length + lineStart;
        setRange(lineStart, trimmedEnd);
        flushLine();
        lineStart = start;
        while (lineStart < end && /[^\S\r\n]/u.test(sourceText[lineStart])) lineStart++;
        if (lineStart === end) return;
      } else if (pieces.length === 0) lineStart = start;
      setRange(lineStart, end);
    };
    for (const match of sourceText.matchAll(/\r\n|[\r\n]|\ufffc|[^\r\n\ufffc]+/g)) {
      const text = match[0];
      const start = match.index;
      if (/^[\r\n]/.test(text)) {
        flushLine();
        lineStart = start + text.length;
        lineEnd = lineStart;
        continue;
      }
      if (text === '\ufffc') {
        appendRange(start, start + 1);
        continue;
      }
      const tokens = maxTextWidth === undefined ? [{ segment: text, index: 0 }] : words.segment(text);
      for (const token of tokens) {
        const offset = start + token.index;
        const laid = measureRange(offset, offset + token.segment.length);
        if (maxTextWidth !== undefined && laid.width > maxTextWidth) {
          for (const grapheme of graphemes.segment(token.segment)) {
            appendRange(offset + grapheme.index, offset + grapheme.index + grapheme.segment.length);
          }
        } else appendRange(offset, offset + token.segment.length);
      }
    }
    flushLine();
  }
  return { width, height, lines };
};
