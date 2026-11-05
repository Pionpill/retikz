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
  CompiledTextLineLayout,
  InputInlineSegmentLayout,
  InputLabelBox,
  TextLayoutContext,
  TextBlockLayoutOptions,
} from './types';

/** 度量一行 inline segment，并返回可 emit 的行布局 */
export const layoutTextLine = (
  segments: Array<InputInlineSegmentLayout>,
  context: TextLayoutContext,
): CompiledTextLineLayout => {
  let x = 0;
  let ascent = 0;
  let descent = 0;
  const pieces: CompiledTextLineLayout['pieces'] = [];

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
      const metrics = resolveTextMetrics(context.measureText(segment.text, font));
      ascent = Math.max(ascent, metrics.ascent);
      descent = Math.max(descent, metrics.descent);
      pieces.push({
        kind: 'text',
        segmentIndex,
        x,
        text: segment.text,
        font,
        width: metrics.width,
        measuredHeight: metrics.height,
      });
      x += metrics.width;
    }
  }

  // 全部 segment 被跳过 / 空行：给一个 fontSize 高度的空盒，避免 0 高行
  if (ascent === 0 && descent === 0) {
    ascent = context.font.size * ASCENT_FACTOR;
    descent = context.font.size * DESCENT_FACTOR;
  }

  return {
    width: x,
    ascent,
    descent,
    pieces,
  };
};

/** 按同一规则布局普通文字与公式混排，并保留折行前的外观索引 */
export const layoutTextBlock = (
  sourceLines: ReadonlyArray<TextContentLine>,
  options: TextBlockLayoutOptions,
  context: TextLayoutContext,
): CompiledTextBlockLayout => {
  const { lineHeight, maxTextWidth } = options;
  const lines: Array<CompiledTextBlockLine> = [];
  let width = 0;
  let height = 0;
  const words = new Intl.Segmenter(undefined, { granularity: 'word' });
  const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  for (const [sourceLineIndex, source] of sourceLines.entries()) {
    let pieces: CompiledTextLineLayout['pieces'] = [];
    let lineWidth = 0;
    let ascent = 0;
    let descent = 0;

    /** 保存当前物理行并重置下一行的尺寸累积 */
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
        lineLayout: { pieces, width: lineWidth, ascent, descent },
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
    /** 当前作者行按片段索引缓存公式布局，避免折行候选重复降解 */
    const texLayoutCache = new Map<number, CompiledTextLineLayout>();
    /** 布局作者行的指定范围，复用本行已降解的公式 */
    const measureRange = (start: number, end: number): CompiledTextLineLayout => {
      const result: CompiledTextLineLayout = { pieces: [], width: 0, ascent: 0, descent: 0 };
      for (const span of spans) {
        if (span.end <= start || span.start >= end) continue;
        const segment =
          'tex' in span.segment
            ? span.segment
            : {
                ...span.segment,
                text: sourceText.slice(Math.max(start, span.start), Math.min(end, span.end)),
              };
        let lineLayout = 'tex' in segment ? texLayoutCache.get(span.segmentIndex) : undefined;
        if (lineLayout === undefined) {
          lineLayout = layoutTextLine([segment], context);
          if ('tex' in segment) texLayoutCache.set(span.segmentIndex, lineLayout);
        }
        for (const piece of lineLayout.pieces)
          result.pieces.push({ ...piece, segmentIndex: span.segmentIndex, x: piece.x + result.width });
        result.width += lineLayout.width;
        result.ascent = Math.max(result.ascent, lineLayout.ascent);
        result.descent = Math.max(result.descent, lineLayout.descent);
      }
      return result;
    };
    let lineStart = 0;
    let lineEnd = 0;
    /** 用指定范围替换当前物理行布局 */
    const setRange = (start: number, end: number) => {
      lineStart = start;
      lineEnd = end;
      const lineLayout = measureRange(start, end);
      pieces = lineLayout.pieces;
      lineWidth = lineLayout.width;
      ascent = lineLayout.ascent;
      descent = lineLayout.descent;
    };
    /** 尝试追加文本范围，超出宽度时先提交上一行 */
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
        const lineLayout = measureRange(offset, offset + token.segment.length);
        if (maxTextWidth !== undefined && lineLayout.width > maxTextWidth) {
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

/** 测量按空白和 CJK 字符切分后的最宽文本单元，不代表字素折行的最小宽度 */
export const measureMaxTextTokenWidth = (
  text: string,
  context: Pick<TextLayoutContext, 'font' | 'measureText'>,
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
