import type { TextLine } from '../../../contract';
import type { IRLineSpec } from '../../../schemas';
import type { FontSpec, LaidLine, LineLayoutContext } from '../../text';
import type { NodeTextLayoutContext } from '../types';

import { layoutInlineLine, resolveFontSize, resolveLineRunsWithWarning } from '../../text';
import { wrapText } from './text';

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
};

/** 节点正文布局结果 */
export type NodeContentLayout = {
  /** 普通文本行 */
  lines?: Array<TextLine>;
  /** 行内公式混排块 */
  inlineBlock?: { lines: Array<{ laid: LaidLine; baselineOffset: number }> };
  /** 内容文本宽度 */
  textWidth: number;
  /** 内容文本高度 */
  textHeight: number;
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
  } = input;
  const rawLines: Array<IRLineSpec> | undefined =
    node.text === undefined ? undefined : typeof node.text === 'string' ? [node.text] : node.text;
  let textWidth = 0;
  let textHeight = 0;
  let lines: Array<TextLine> | undefined;
  let inlineBlock: { lines: Array<{ laid: LaidLine; baselineOffset: number }> } | undefined;
  const texGatingOn = texLowering?.lowerTex !== undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  if (rawLines) {
    const resolved = rawLines.map(spec =>
      resolveLineRunsWithWarning(spec, {
        gatingOn: texGatingOn,
        warn: inlineWarn,
        warningMessage: 'Unbalanced `$` in node text; the trailing fragment is kept literal.',
      }),
    );
    const anyMixed = rawLines.some(spec => typeof spec === 'object' && 'runs' in spec);
    const anyMath = resolved.some(r => r.hasMath);
    if (anyMath || anyMixed) {
      const blockFont: FontSpec = { size: fontSize, family: fontFamily, weight: fontWeight, style: fontStyle };
      const ctx: LineLayoutContext = {
        measureText,
        lowerTex: texLowering?.lowerTex,
        font: blockFont,
        rootFontSize,
        color: node.textColor,
        opacity: node.opacity,
        warn: inlineWarn,
      };
      let cursor = 0;
      const blockLines = resolved.map(r => {
        const laid = layoutInlineLine(r.runs, ctx);
        const slot = Math.max(lineHeight, laid.ascent + laid.descent);
        const baselineOffset = cursor + (slot - (laid.ascent + laid.descent)) / 2 + laid.ascent;
        cursor += slot;
        if (laid.width > textWidth) textWidth = laid.width;
        return { laid, baselineOffset };
      });
      inlineBlock = { lines: blockLines };
      textHeight = cursor;
    } else {
      lines = [];
      for (let li = 0; li < rawLines.length; li++) {
        const spec = rawLines[li];
        const text = resolved[li].runs.map(r => ('text' in r ? r.text : '')).join('');
        const lineObj = typeof spec === 'object' && !('runs' in spec) ? spec : undefined;
        const lineFont = lineObj?.font;
        const lineFontSize =
          lineFont?.size !== undefined
            ? resolveFontSize(lineFont.size, { rootFontSize, inheritedFontSize: baseFontSize })
            : undefined;
        const font: FontSpec = {
          size: lineFontSize !== undefined ? lineFontSize * fontScale : fontSize,
          family: lineFont?.family ?? fontFamily,
          weight: lineFont?.weight ?? fontWeight,
          style: lineFont?.style ?? fontStyle,
        };
        const hardLines = text.split('\n');
        const physical = hardLines.flatMap(hardLine =>
          maxTextWidth !== undefined ? wrapText(hardLine, { font, maxWidth: maxTextWidth, measureText }) : [hardLine],
        );
        for (const ptext of physical) {
          const m = measureText(ptext, font);
          if (m.width > textWidth) textWidth = m.width;
          const out: TextLine = { text: ptext };
          if (lineObj) {
            if (lineObj.fill !== undefined) out.fill = lineObj.fill;
            if (lineObj.opacity !== undefined) out.opacity = lineObj.opacity;
            if (lineFontSize !== undefined) out.fontSize = lineFontSize * fontScale;
            if (lineFont?.family !== undefined) out.fontFamily = lineFont.family;
            if (lineFont?.weight !== undefined) out.fontWeight = lineFont.weight;
            if (lineFont?.style !== undefined) out.fontStyle = lineFont.style;
          }
          lines.push(out);
        }
      }
      textHeight = lines.length * lineHeight;
    }
  }
  return { lines, inlineBlock, textWidth, textHeight };
};
