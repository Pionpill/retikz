import type { TextLine } from '../../contract';
import type { IRLineSpec, IRNode } from '../../schemas';
import type { FontSpec, LaidLine, LineLayoutContext, TextMeasurer } from '../text';
import type { TexLoweringContext } from './types';

import { CompileWarningCode } from '../constants';
import { layoutInlineLine, resolveLineRuns } from '../text';
import { wrapText } from './text';

/** 节点内容布局输入。 */
export type LayoutNodeContentInput = {
  /** 待布局节点。 */
  node: IRNode;
  /** 文本度量函数。 */
  measureText: TextMeasurer;
  /** TeX 降级上下文。 */
  texLowering?: TexLoweringContext;
  /** 基准字体大小。 */
  fontSize: number;
  /** 字体缩放。 */
  fontScale: number;
  /** 字体族。 */
  fontFamily?: string;
  /** 字重。 */
  fontWeight?: string | number;
  /** 字体样式。 */
  fontStyle?: FontSpec['style'];
  /** 行高。 */
  lineHeight: number;
  /** 已按节点缩放处理的最大文本宽度。 */
  maxTextWidth?: number;
};

/** 节点内容布局结果。 */
export type NodeContentLayout = {
  /** 普通文本行。 */
  lines?: Array<TextLine>;
  /** 行内公式混排块。 */
  inlineBlock?: { lines: Array<{ laid: LaidLine; baselineOffset: number }> };
  /** 内容文本宽度。 */
  textWidth: number;
  /** 内容文本高度。 */
  textHeight: number;
};

/** 布局节点正文文本。 */
export const layoutNodeContent = (input: LayoutNodeContentInput): NodeContentLayout => {
  const {
    node,
    measureText,
    texLowering,
    fontSize,
    fontScale,
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
    const resolved = rawLines.map(spec => resolveLineRuns(spec, texGatingOn));
    resolved.forEach(r => {
      if (r.warn) {
        inlineWarn(
          CompileWarningCode.TextTexParseError,
          'Unbalanced `$` in node text; the trailing fragment is kept literal.',
        );
      }
    });
    const anyMixed = rawLines.some(spec => typeof spec === 'object' && 'runs' in spec);
    const anyMath = resolved.some(r => r.hasMath);
    if (anyMath || anyMixed) {
      const blockFont: FontSpec = { size: fontSize, family: fontFamily, weight: fontWeight, style: fontStyle };
      const ctx: LineLayoutContext = {
        measureText,
        lowerTex: texLowering?.lowerTex,
        font: blockFont,
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
        const font: FontSpec = {
          size: lineFont?.size !== undefined ? lineFont.size * fontScale : fontSize,
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
            if (lineFont?.size !== undefined) out.fontSize = lineFont.size * fontScale;
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
