import type { TextFont } from '../../../contract';
import { resolveTextMetrics } from '../../../resolve';
import type { CanonicalFont } from '../../../resolve';
import type { InlineLineLayout, LineLayoutContext } from '../../text';
import { layoutInlineLine } from '../../text';
import type { NodeTextLineLayout, NodeTextLayoutContext } from '../types';
import { measureMinimumTextWidth, wrapText } from './text';

/** 节点正文布局输入 */
type InputNodeContentLayout = NodeTextLayoutContext & {
  /** 已确定的行高 */
  lineHeight: number;
  /** 已按节点缩放处理的最大文本宽度 */
  maxTextWidth?: number;
  /** 是否查询 plain text 的最小可断宽度 */
  minimumTextWidth?: boolean;
};

/** 节点正文排版与完整作者行解析结果 */
type NodeContentLayout = {
  /** 普通文本行 */
  lines?: Array<NodeTextLineLayout>;
  /** 行内公式混排块 */
  inlineBlock?: {
    /** 按正文顺序排列的混排行及其基线位置 */
    lines: Array<{
      /** 该行的测量与片段布局 */
      laid: InlineLineLayout;
      /** 相对正文块顶部的基线垂直偏移 */
      baselineOffset: number;
    }>;
  };
  /** 内容文本宽度 */
  textWidth: number;
  /** 内容文本高度 */
  textHeight: number;
  /** 同次正文排版得到的 authored physical-line baseline offsets */
  textBaselineOffsets?: Array<number>;
};

/** 布局节点正文文本 */
export const layoutNodeContent = (input: InputNodeContentLayout): NodeContentLayout => {
  const { node, measureText, tex: texLowering, lineHeight, maxTextWidth, minimumTextWidth = false } = input;
  const { text: resolved, font: blockFont } = node;
  const { size: fontSize, family: fontFamily, weight: fontWeight, style: fontStyle } = blockFont;
  let textWidth = 0;
  let textHeight = 0;
  let lines: Array<NodeTextLineLayout> | undefined;
  let inlineBlock: { lines: Array<{ laid: InlineLineLayout; baselineOffset: number }> } | undefined;
  let textBaselineOffsets: Array<number> | undefined;

  const inlineWarn = texLowering?.warn ?? ((): void => {});
  if (resolved) {
    if (resolved.some(line => line.mixed)) {
      const ctx: LineLayoutContext = {
        measureText,
        lowerTex: texLowering?.lowerTex,
        font: blockFont,
        warn: inlineWarn,
      };
      let cursor = 0;
      const blockLines = resolved.map(r => {
        const laid = layoutInlineLine(r.segments, ctx);
        const slot = Math.max(lineHeight, laid.ascent + laid.descent);
        const baselineOffset = cursor + (slot - (laid.ascent + laid.descent)) / 2 + laid.ascent;
        cursor += slot;
        if (laid.width > textWidth) textWidth = laid.width;

        return { laid, baselineOffset };
      });
      inlineBlock = { lines: blockLines };
      textBaselineOffsets = blockLines.map(line => line.baselineOffset);
      textHeight = cursor;
    } else {
      const metricsByFont = new Map<TextFont, Map<string, ReturnType<typeof resolveTextMetrics>>>();

      /** 在单次正文 layout 内复用同一 authored font/text 的真实测量结果 */
      const measurePhysicalText = (text: string, font: TextFont): ReturnType<typeof resolveTextMetrics> => {
        let metricsByText = metricsByFont.get(font);
        if (metricsByText === undefined) {
          metricsByText = new Map();
          metricsByFont.set(font, metricsByText);
        }

        const cached = metricsByText.get(text);
        if (cached !== undefined) return cached;

        const measured = resolveTextMetrics(measureText(text, font));
        metricsByText.set(text, measured);

        return measured;
      };

      const plainLines = resolved.map(line => {
        const lineStyle = line.style;
        const lineFontSize = lineStyle?.font?.size;
        const font: CanonicalFont = {
          size: lineFontSize ?? fontSize,
          family: lineStyle?.font?.family ?? fontFamily,
          weight: lineStyle?.font?.weight ?? fontWeight,
          style: lineStyle?.font?.style ?? fontStyle,
        };

        return { text: line.plainText, lineStyle, lineFontSize, font };
      });

      const intrinsicMinimumWidth = minimumTextWidth
        ? plainLines.reduce(
            (width, line) =>
              line.text
                .split('\n')
                .reduce(
                  (lineWidth, hardLine) =>
                    Math.max(
                      lineWidth,
                      measureMinimumTextWidth(hardLine, { font: line.font, measureText: measurePhysicalText }),
                    ),
                  width,
                ),
            0,
          )
        : undefined;

      const wrappingWidth =
        intrinsicMinimumWidth === undefined
          ? maxTextWidth
          : maxTextWidth === undefined
            ? intrinsicMinimumWidth
            : Math.min(intrinsicMinimumWidth, maxTextWidth);

      lines = [];
      textBaselineOffsets = [];
      let firstPlainBaselineOffset: number | undefined;

      for (const [sourceLineIndex, { text, lineStyle, lineFontSize, font }] of plainLines.entries()) {
        const hardLines = text.split('\n');
        const physical = hardLines.flatMap(hardLine =>
          wrappingWidth !== undefined
            ? wrapText(hardLine, { font, maxWidth: wrappingWidth, measureText: measurePhysicalText })
            : [hardLine],
        );

        for (const ptext of physical) {
          const m = measurePhysicalText(ptext, font);
          if (m.width > textWidth) textWidth = m.width;
          firstPlainBaselineOffset ??= (lineHeight - (m.ascent + m.descent)) / 2 + m.ascent;
          textBaselineOffsets.push(firstPlainBaselineOffset + lines.length * lineHeight);
          const out: NodeTextLineLayout = { text: ptext, sourceLineIndex };
          if (lineStyle !== undefined) {
            if (lineFontSize !== undefined) out.fontSize = lineFontSize;
            if (lineStyle.font?.family !== undefined) out.fontFamily = lineStyle.font.family;
            if (lineStyle.font?.weight !== undefined) out.fontWeight = lineStyle.font.weight;
            if (lineStyle.font?.style !== undefined) out.fontStyle = lineStyle.font.style;
          }

          lines.push(out);
        }
      }

      textHeight = lines.length * lineHeight;
    }
  }

  return { lines, inlineBlock, textWidth, textHeight, textBaselineOffsets };
};
