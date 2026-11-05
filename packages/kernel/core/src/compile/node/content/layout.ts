import { RAD_TO_DEG } from '@retikz/math';

import type { LayoutAlignmentGuide } from '../../../contract';
import { BuiltinLayoutAlignmentGuideName, LayoutAlignmentGuideDimension } from '../../../contract';
import type { CanonicalNode, CanonicalTextBlock } from '../../../resolve';
import type { CompiledTextBlockLine } from '../../text';
import { layoutTextBlock, measureMaxTextTokenWidth } from '../../text';
import type { CompiledNodeLayout, CompiledNodeTextLineLayout, NodeCompileContext } from '../types';

/** 节点正文布局输入 */
type InputNodeContentLayout = Pick<NodeCompileContext, 'measureText' | 'texLowering'> & {
  /** 待布局节点 */
  canon: CanonicalNode;
  /** 已确定的行高 */
  lineHeight: number;
  /** 已按节点缩放处理的最大文本宽度 */
  maxTextWidth?: number;
  /** 是否查询 plain text 的最小可断宽度 */
  minimumTextWidth?: boolean;
};

/** 节点正文排版与完整作者行解析结果 */
export type NodeContentLayout = {
  /** 本次排版采用的正文宽度预算；供独立形状求解重放 */
  widthBudget?: number;
  /** 普通文本行 */
  lines?: Array<CompiledNodeTextLineLayout>;
  /** 行内公式混排块 */
  inlineBlock?: {
    /** 按正文顺序排列的混排行及其基线位置 */
    lines: Array<CompiledTextBlockLine>;
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
  const { measureText, texLowering, lineHeight, maxTextWidth } = input;
  const block = layoutTextBlock(
    canon.lines,
    { lineHeight, maxTextWidth },
    {
      font: canon.font,
      measureText,
      lowerTex: texLowering?.lowerTex,
      warn: texLowering?.warn ?? (() => {}),
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
        return Math.max(width, measureMaxTextTokenWidth(line.plainText, { font, measureText }));
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
    lines: block.lines.map(({ lineLayout, sourceLineIndex }) => {
      const font = canon.lines[sourceLineIndex].style?.font;
      return {
        text: lineLayout.pieces.map(piece => (piece.kind === 'text' ? piece.text : '')).join(''),
        sourceLineIndex,
        measuredHeight: lineLayout.ascent + lineLayout.descent,
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
  if (text === undefined) return { textWidth: 0, textHeight: 0, widthBudget: input.maxTextWidth };
  const content = text.lines.some(line => line.mixed)
    ? layoutInlineContent(text, input)
    : layoutPlainContent(text, input);
  return { ...content, widthBudget: input.maxTextWidth };
};

const isEffectiveIdentityRotation = (degrees: number): boolean => Object.is(degrees % 360, -0) || degrees % 360 === 0;

/** 从同次 Node 正文排版结果投影 child-local baseline guides */
export const alignmentGuidesOfNode = (
  layout: CompiledNodeLayout,
  round: (value: number) => number,
): Array<LayoutAlignmentGuide> | undefined => {
  const text = layout.text;
  const offsets = text?.baselineOffsets;
  if (
    text === undefined ||
    offsets === undefined ||
    offsets.length === 0 ||
    !isEffectiveIdentityRotation((layout.geometry.rect.rotate ?? 0) * RAD_TO_DEG)
  ) {
    return undefined;
  }

  const blockTop = layout.geometry.contentCenter[1] - layout.geometry.contentSize.height / 2;
  const firstBaseline = round(blockTop + offsets[0]);
  if (
    text.kind === 'inline' ||
    !offsets.every((offset, index) => Math.abs(offset - offsets[0] - index * text.lineHeight) < 1e-8)
  ) {
    return [
      {
        name: BuiltinLayoutAlignmentGuideName.FirstBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: firstBaseline,
      },
      {
        name: BuiltinLayoutAlignmentGuideName.LastBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: round(blockTop + offsets[offsets.length - 1]),
      },
    ];
  }

  const emittedLineHeight = round(text.lineHeight);

  return [
    {
      name: BuiltinLayoutAlignmentGuideName.FirstBaseline,
      dimension: LayoutAlignmentGuideDimension.Y,
      position: firstBaseline,
    },
    {
      name: BuiltinLayoutAlignmentGuideName.LastBaseline,
      dimension: LayoutAlignmentGuideDimension.Y,
      position: firstBaseline + (offsets.length - 1) * emittedLineHeight,
    },
  ];
};
