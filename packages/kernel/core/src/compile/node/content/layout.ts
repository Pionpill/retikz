import type { CanonicalFont, TextLineResolution } from '../../../resolve';
import { resolveTextLine } from '../../../resolve';
import type { InlineLineLayout, LineLayoutContext, TextFont, TextMeasurer } from '../../text';
import { layoutInlineLine, normalizeTextMetrics } from '../../text';
import type { NodeTextLayoutContext, NodeTextLineLayout } from '../types';
import { measureMinimumTextWidth, wrapText } from './text';

/** 节点正文布局输入 */
export type LayoutNodeContentInput = NodeTextLayoutContext & {
  /** 基准字体大小 */
  fontSize: number;
  /** 未缩放前的节点基准字号 */
  baseFontSize: number;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize: number;
  /** 行高 */
  lineHeight: number;
  /** 已按节点缩放处理的最大文本宽度 */
  maxTextWidth?: number;
  /** 是否查询 plain text 的最小可断宽度 */
  minimumTextWidth?: boolean;
};

/** 节点正文排版与完整作者行解析结果 */
export type NodeContentLayout = {
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
  /** 按作者行排列的有效文字属性 */
  resolvedLines: Array<TextLineResolution>;
  /** 内容文本宽度 */
  textWidth: number;
  /** 内容文本高度 */
  textHeight: number;
  /** 同次正文排版得到的 authored physical-line baseline offsets */
  textBaselineOffsets?: Array<number>;
};

/** 布局节点正文文本 */
export const layoutNodeContent = (input: LayoutNodeContentInput): NodeContentLayout => {
  const {
    node,
    measureText,
    texLowering,
    fontSize,
    baseFontSize,
    fontScale,
    rootFontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    lineHeight,
    maxTextWidth,
    minimumTextWidth = false,
  } = input;

  const rawLines = node.text;
  const resolvedLines: Array<TextLineResolution> = [];
  let textWidth = 0;
  let textHeight = 0;
  let lines: Array<NodeTextLineLayout> | undefined;
  let inlineBlock: { lines: Array<{ laid: InlineLineLayout; baselineOffset: number }> } | undefined;
  let textBaselineOffsets: Array<number> | undefined;

  const texGatingOn = texLowering?.lowerTex !== undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  if (rawLines) {
    const scaledBlockFont: CanonicalFont = {
      size: fontSize,
      family: fontFamily,
      weight: fontWeight,
      style: fontStyle,
    };
    const resolved = rawLines.map(spec =>
      resolveTextLine(spec, {
        rootFontSize,
        inheritedFont: scaledBlockFont,
        gatingOn: texGatingOn,
        warn: inlineWarn,
        warningMessage: 'Unbalanced `$` in node text; the trailing fragment is kept literal.',
      }),
    );
    const anyMixed = rawLines.some(spec => typeof spec === 'object' && 'segments' in spec);
    const anyMath = resolved.some(r => r.hasMath);
    if (anyMath || anyMixed) {
      const blockFont: TextFont = { size: fontSize, family: fontFamily, weight: fontWeight, style: fontStyle };
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

        resolvedLines.push(r);
        return { laid, baselineOffset };
      });
      inlineBlock = { lines: blockLines };
      textBaselineOffsets = blockLines.map(line => line.baselineOffset);
      textHeight = cursor;
    } else {
      const metricsByFont = new Map<TextFont, Map<string, ReturnType<TextMeasurer>>>();

      /** 在单次正文 layout 内复用同一 authored font/text 的真实测量结果 */
      const measurePhysicalText: TextMeasurer = (text, font) => {
        let metricsByText = metricsByFont.get(font);
        if (metricsByText === undefined) {
          metricsByText = new Map();
          metricsByFont.set(font, metricsByText);
        }

        const cached = metricsByText.get(text);
        if (cached !== undefined) return cached;

        const measured = normalizeTextMetrics(measureText(text, font));
        metricsByText.set(text, measured);

        return measured;
      };

      const plainLines = rawLines.map(spec => {
        const line = resolveTextLine(spec, {
          rootFontSize,
          inheritedFont: {
            size: baseFontSize,
            family: fontFamily,
            weight: fontWeight,
            style: fontStyle,
          },
          gatingOn: texGatingOn,
        });
        const lineStyle = line.style;
        const lineFontSize = lineStyle?.fontSize;
        const font: TextFont = {
          size: lineFontSize !== undefined ? lineFontSize * fontScale : fontSize,
          family: lineStyle?.fontFamily ?? fontFamily,
          weight: lineStyle?.fontWeight ?? fontWeight,
          style: lineStyle?.fontStyle ?? fontStyle,
        };

        resolvedLines.push(line);
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
          const m = normalizeTextMetrics(measurePhysicalText(ptext, font));
          if (m.width > textWidth) textWidth = m.width;
          firstPlainBaselineOffset ??= (lineHeight - (m.ascent + m.descent)) / 2 + m.ascent;
          textBaselineOffsets.push(firstPlainBaselineOffset + lines.length * lineHeight);
          const out: NodeTextLineLayout = { text: ptext, sourceLineIndex };
          if (lineStyle !== undefined) {
            if (lineFontSize !== undefined) out.fontSize = lineFontSize * fontScale;
            if (lineStyle.fontFamily !== undefined) out.fontFamily = lineStyle.fontFamily;
            if (lineStyle.fontWeight !== undefined) out.fontWeight = lineStyle.fontWeight;
            if (lineStyle.fontStyle !== undefined) out.fontStyle = lineStyle.fontStyle;
          }

          lines.push(out);
        }
      }

      textHeight = lines.length * lineHeight;
    }
  }

  return { lines, inlineBlock, resolvedLines, textWidth, textHeight, textBaselineOffsets };
};
