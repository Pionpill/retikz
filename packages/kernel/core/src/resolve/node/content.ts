import type { IRFont } from '../../schemas';
import { isMathSegment, parseInlineSegments, resolveFont, resolveTextLine, resolveTextLineHeight } from '../text';
import type { ColorResolvedTextLine, TextLineResolution } from '../text';
import type { NodeLabelColorSource, NodeResolveContext } from './types';

/** 节点字体和已确定颜色的正文、标签输入 */
type InputNodeContent = {
  /** 节点作者字体 */
  font?: IRFont;
  /** 作者显式行高 */
  lineHeight?: number;
  /** 节点轴向缩放 */
  scale: { x: number; y: number };
  /** 已解析颜色的正文行 */
  text?: Array<ColorResolvedTextLine>;
  /** 已解析颜色的标签 */
  label?: Array<NodeLabelColorSource>;
  /** 节点文字主色 */
  textColor?: string;
};

/** 解析节点正文与标签的字体和分段，保留普通正文与混排各自的缩放语义 */
export const resolveNodeContent = (
  input: InputNodeContent,
  context: Pick<NodeResolveContext, 'rootFontSize' | 'gatingOn' | 'warn'>,
) => {
  const { font: sourceFont, lineHeight, scale, text, label, textColor } = input;
  const { rootFontSize, gatingOn, warn } = context;
  const fontScale = Math.min(scale.x, scale.y);
  const baseFont = resolveFont(sourceFont, { rootFontSize, inheritedFont: { size: rootFontSize } });
  const font = { ...baseFont, size: baseFont.size * fontScale };

  // 先分段以确定整个正文块的布局方式，每行只解析一次字体和样式
  const parsedLines = text?.map(source => {
    const parsed =
      typeof source === 'string'
        ? parseInlineSegments(source, gatingOn)
        : 'segments' in source
          ? { segments: source.segments, hasMath: source.segments.some(isMathSegment), warn: false }
          : parseInlineSegments(source.text, gatingOn);
    return { source, parsed };
  });
  const mixed = parsedLines?.some(
    ({ source, parsed }) => parsed.hasMath || (typeof source === 'object' && 'segments' in source),
  );
  const resolvedText = parsedLines?.map(({ source, parsed }): TextLineResolution => {
    const line = resolveTextLine(
      source,
      {
        rootFontSize,
        inheritedFont: mixed ? font : baseFont,
        gatingOn,
        warn,
        warningMessage: 'Unbalanced `$` in node text; the trailing fragment is kept literal.',
      },
      parsed,
    );
    if (mixed) return line;

    return {
      ...line,
      segments: line.segments.map(segment =>
        isMathSegment(segment)
          ? segment
          : { ...segment, font: { ...segment.font, size: segment.font.size * fontScale } },
      ),
      ...(line.style?.font?.size === undefined
        ? {}
        : { style: { ...line.style, font: { ...line.style.font, size: line.style.font.size * fontScale } } }),
    };
  });
  const resolvedLabels = label?.map(source => {
    const resolvedFont = resolveFont(source.font, { rootFontSize, inheritedFont: baseFont });
    const labelFont = { ...resolvedFont, size: resolvedFont.size * fontScale };
    const lines = typeof source.text === 'string' ? source.text.split('\n') : source.text;
    return {
      ...source,
      font: labelFont,
      textColor: source.textColor ?? textColor,
      text: lines.map(line =>
        resolveTextLine(line, {
          rootFontSize,
          inheritedFont: labelFont,
          gatingOn,
          warn,
          warningMessage: 'Unbalanced `$` in node label; the trailing fragment is kept literal.',
        }),
      ),
    };
  });

  return {
    font,
    text: resolvedText,
    label: resolvedLabels,
    lineHeight: resolveTextLineHeight(lineHeight, baseFont.size) * scale.y,
  };
};
