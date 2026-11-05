import type { CanonicalTextBlock } from '../../../resolve';
import type { InlineLineLayout } from '../../text';
import { layoutTextBlock } from '../../text';
import type { CompiledNodeTextLineLayout, NodeTextLayoutContext } from '../types';
import { measureMinimumTextWidth } from './text';

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
  lines?: Array<CompiledNodeTextLineLayout>;
  /** 行内公式混排块 */
  inlineBlock?: {
    /** 按正文顺序排列的混排行及其基线位置 */
    lines: Array<{
      /** 该行的测量与片段布局 */
      laid: InlineLineLayout;
      /** 折行前的作者行索引 */
      sourceLineIndex: number;
      /** 相对正文块顶部的基线垂直偏移 */
      baselineOffset: number;
    }>;
  };
  /** 内容文本宽度 */
  textWidth: number;
  /** 内容文本高度 */
  textHeight: number;
  /** 同次排版得到的物理行基线偏移 */
  textBaselineOffsets?: Array<number>;
};

/** 混排按实际片段度量确定行槽与基线 */
const layoutInlineContent = (canon: CanonicalTextBlock, input: InputNodeContentLayout): NodeContentLayout => {
  const { measureText, tex, lineHeight, maxTextWidth } = input;
  const block = layoutTextBlock(
    canon.lines,
    { lineHeight, maxTextWidth },
    {
      font: canon.font,
      measureText,
      lowerTex: tex?.lowerTex,
      warn: tex?.warn ?? (() => {}),
    },
  );
  return {
    inlineBlock: { lines: block.lines },
    textBaselineOffsets: block.lines.map(line => line.baselineOffset),
    textWidth: block.width,
    textHeight: block.height,
  };
};

/** 普通正文按硬换行与宽度预算生成物理行 */
const layoutPlainContent = (canon: CanonicalTextBlock, input: InputNodeContentLayout): NodeContentLayout => {
  const { measureText, lineHeight, maxTextWidth, minimumTextWidth = false } = input;
  const intrinsicWidth = minimumTextWidth
    ? canon.lines.reduce((width, line) => {
        const font = { ...canon.font, ...line.style?.font };
        return Math.max(width, measureMinimumTextWidth(line.plainText, { font, measureText }));
      }, 0)
    : undefined;
  const budget = intrinsicWidth === undefined ? maxTextWidth : Math.min(intrinsicWidth, maxTextWidth ?? Infinity);
  const block = layoutTextBlock(
    canon.lines,
    { lineHeight, maxTextWidth: budget },
    {
      font: canon.font,
      measureText,
      warn: () => {},
    },
  );
  return {
    lines: block.lines.map(({ laid, sourceLineIndex }) => {
      const font = canon.lines[sourceLineIndex].style?.font;
      return {
        text: laid.pieces.map(piece => (piece.kind === 'text' ? piece.text : '')).join(''),
        sourceLineIndex,
        measuredHeight: laid.ascent + laid.descent,
        fontSize: font?.size,
        fontFamily: font?.family,
        fontWeight: font?.weight,
        fontStyle: font?.style,
      };
    }),
    textWidth: block.width,
    textHeight: block.height,
    textBaselineOffsets: block.lines.map(line => line.baselineOffset),
  };
};

/** 布局节点正文，无正文时直接返回空内容尺寸 */
export const layoutNodeContent = (input: InputNodeContentLayout): NodeContentLayout => {
  const { text } = input.canon;
  if (text === undefined) return { textWidth: 0, textHeight: 0 };
  return text.lines.some(line => line.mixed) ? layoutInlineContent(text, input) : layoutPlainContent(text, input);
};
