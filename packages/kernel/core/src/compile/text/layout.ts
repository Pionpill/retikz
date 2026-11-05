import type { Position } from '@retikz/math';

import type { TextContentLine } from '../../contract';
import { resolveTextMetrics } from '../../resolve';
import {
  ASCENT_FACTOR,
  DESCENT_FACTOR,
  calculateLabelProjectedHalfExtent,
  calculateLabelRotation,
  tokenizeText,
} from './helpers';
import { lowerTexSegment } from './tex';
import type {
  CompiledTextBlockLayout,
  CompiledTextBlockLine,
  InlineLineLayout,
  InputInlineSegmentLayout,
  InputLabelBox,
  LineLayoutContext,
  TextBlockLayoutOptions,
} from './types';

/** 度量一行 inline segment，并返回可 emit 的行布局 */
export const layoutTextLine = (
  segments: Array<InputInlineSegmentLayout>,
  context: LineLayoutContext,
): InlineLineLayout => {
  let x = 0;
  let ascent = 0;
  let descent = 0;
  const pieces: InlineLineLayout['pieces'] = [];

  for (const [segmentIndex, segment] of segments.entries()) {
    if ('tex' in segment) {
      const lowered = lowerTexSegment(
        { tex: segment.tex, displayMode: segment.displayMode },
        segment.fontSize,
        context,
      );
      if (lowered === undefined) continue;

      const above = lowered.height - lowered.depth;
      ascent = Math.max(ascent, above);
      descent = Math.max(descent, lowered.depth);
      pieces.push({
        kind: 'math',
        segmentIndex,
        x,
        paths: lowered.paths,
        width: lowered.width,
        height: lowered.height,
        depth: lowered.depth,
      });
      x += lowered.width;
    } else {
      const font = segment.font;
      const m = resolveTextMetrics(context.measureText(segment.text, font));
      ascent = Math.max(ascent, m.ascent);
      descent = Math.max(descent, m.descent);
      pieces.push({
        kind: 'text',
        segmentIndex,
        x,
        text: segment.text,
        font,
        width: m.width,
        measuredHeight: m.height,
      });
      x += m.width;
    }
  }

  // 全部 segment 被跳过 / 空行：给一个 fontSize 高度的空盒，避免 0 高行
  if (ascent === 0 && descent === 0) {
    ascent = context.font.size * ASCENT_FACTOR;
    descent = context.font.size * DESCENT_FACTOR;
  }

  const isPlain = pieces.every(p => p.kind === 'text');

  return {
    width: x,
    ascent,
    descent,
    isPlain,
    pieces,
  };
};

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
        const empty = layoutTextLine([], {
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
          laid = layoutTextLine([segment], context);
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

/** 用既有 tokenization 与文本测量器返回最宽不可断单元 */
export const measureMinimumTextWidth = (
  text: string,
  context: Pick<LineLayoutContext, 'font' | 'measureText'>,
): number => {
  const { font, measureText } = context;
  return tokenizeText(text).reduce(
    (width, unit) => (unit === ' ' ? width : Math.max(width, measureText(unit, font).width)),
    0,
  );
};

/** 将已测量文字框放在边界内外，位置和旋转独立计算 */
export const placeLabelBox = ({
  label,
  point,
  outward,
  tangent,
  width,
  height,
  distance,
}: InputLabelBox): { center: Position; rotateDeg: number } => {
  const rotateDeg = calculateLabelRotation(label.rotate, label.keepUpright, outward);
  const extent = calculateLabelProjectedHalfExtent(outward, width, height, rotateDeg);
  const offset = (label.placement === 'inside' ? -1 : 1) * (distance + extent);
  const alignment =
    (label.align === 'start' ? 1 : label.align === 'end' ? -1 : 0) *
    calculateLabelProjectedHalfExtent(tangent, width, height, rotateDeg);

  return {
    center: [
      point[0] + outward[0] * offset + tangent[0] * alignment,
      point[1] + outward[1] * offset + tangent[1] * alignment,
    ],
    rotateDeg,
  };
};
