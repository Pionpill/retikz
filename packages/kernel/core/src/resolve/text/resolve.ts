import type { TextInlineSegment, TextFont, TextContentLineStyle } from '../../contract';
import { combineOpacity } from '../style';
import { resolveFont, resolveFontSize, resolveFontWeight, resolveTextLineHeight } from './font';
import { isMathSegment, parseInlineSegments } from './inline';
import type {
  ParsedInlineSegments,
  TextSegmentColorSource,
  InlineSegmentColorSource,
  CanonicalTextLine,
  TextLineResolveContext,
  ColorResolvedTextLine,
  CanonicalTextBlock,
  InputTextBlockResolution,
  TextBlockResolveContext,
} from './types';

/** 统一解析文本块的作者行，硬换行保留到共享布局阶段 */
export const resolveTextBlock = (
  source: InputTextBlockResolution,
  context: TextBlockResolveContext,
): CanonicalTextBlock => {
  const { text, font: sourceFont, textColor, textAlign, lineHeight, maxTextWidth } = source;
  const { scale = { x: 1, y: 1 } } = context;
  const inheritedFont = resolveFont(sourceFont, context);
  const fontScale = Math.min(scale.x, scale.y);
  const font = { ...inheritedFont, size: inheritedFont.size * fontScale };
  const lines = (typeof text === 'string' ? [text] : text).map(line => {
    const resolved = resolveTextLine(line, { ...context, inheritedFont });
    // ⚡单位字号缩放直接使用本次解析新建的行与片段，避免再次复制字体和片段
    if (fontScale === 1) return resolved;
    return {
      ...resolved,
      segments: resolved.segments.map(segment =>
        isMathSegment(segment)
          ? { ...segment, fontSize: segment.fontSize * fontScale }
          : { ...segment, font: { ...segment.font, size: segment.font.size * fontScale } },
      ),
      ...(resolved.style?.font?.size === undefined
        ? {}
        : {
            style: { ...resolved.style, font: { ...resolved.style.font, size: resolved.style.font.size * fontScale } },
          }),
    };
  });
  return {
    font,
    lines,
    color: textColor,
    textAlign: textAlign ?? 'middle',
    lineHeight: lineHeight === undefined ? resolveTextLineHeight(undefined, font.size) : lineHeight * scale.y,
    maxTextWidth: maxTextWidth === undefined ? undefined : maxTextWidth * scale.x,
  };
};

const TEXT_TEX_PARSE_ERROR = 'TEXT_TEX_PARSE_ERROR';

/** 提取行级显式样式并换算字号，未声明的字段不补入继承值 */
const resolveExplicitStyle = (
  source: Exclude<ColorResolvedTextLine, string>,
  context: TextLineResolveContext,
): TextContentLineStyle => ({
  fill: source.fill,
  opacity: source.opacity,
  font:
    source.font === undefined
      ? undefined
      : {
          ...source.font,
          weight: resolveFontWeight(source.font.weight),
          size:
            source.font.size === undefined
              ? undefined
              : resolveFontSize(source.font.size, {
                  rootFontSize: context.rootFontSize,
                  inheritedFontSize: context.inheritedFont.size,
                }),
        },
});

/** 让文字或公式片段继承行级字体，并将字号换算为数值 */
const resolveSegment = (
  segment: InlineSegmentColorSource,
  inheritedFont: TextFont,
  context: TextLineResolveContext,
): TextInlineSegment => {
  if (isMathSegment(segment))
    return {
      ...segment,
      fontSize: resolveFontSize(segment.fontSize, {
        rootFontSize: context.rootFontSize,
        inheritedFontSize: inheritedFont.size,
      }),
    };

  const sourceFont = segment.font;
  const resolved: Omit<TextSegmentColorSource, 'font'> & { font: ReturnType<typeof resolveFont> } = {
    ...segment,
    font: resolveFont(sourceFont, { ...context, inheritedFont }),
  };

  return resolved;
};

/**
 * 解析单行文字与公式片段，补齐片段字体和行级外观，并保留纯文本内容与混排标记
 * @param parsed 调用方为确定块级字体策略已完成的分段结果；省略时在本函数内分段
 */
const resolveTextLine = (
  source: ColorResolvedTextLine,
  context: TextLineResolveContext,
  parsed: ParsedInlineSegments = typeof source === 'string'
    ? parseInlineSegments(source, context.gatingOn)
    : 'segments' in source
      ? { segments: source.segments, hasMath: source.segments.some(isMathSegment), warn: false }
      : parseInlineSegments(source.text, context.gatingOn),
): CanonicalTextLine => {
  const styled = typeof source === 'object' ? source : undefined;
  if (parsed.warn && context.warn !== undefined) {
    context.warn(TEXT_TEX_PARSE_ERROR, context.warningMessage ?? 'Unbalanced `$` in text.');
  }

  const segments: Array<TextInlineSegment> = [];
  let plainText = '';
  if (parsed.segments.length > 0) {
    const inheritedFont = resolveFont(styled?.font, context);
    for (const segment of parsed.segments) {
      const resolved = resolveSegment(segment, inheritedFont, context);
      if (styled !== undefined) {
        resolved.fill = segment.fill ?? styled.fill;
        resolved.opacity = combineOpacity(segment.opacity, styled.opacity);
      }
      segments.push(resolved);
      if (!isMathSegment(resolved)) plainText += resolved.text;
    }
  }

  return {
    segments,
    plainText,
    hasMath: parsed.hasMath,
    mixed: parsed.hasMath || (typeof source === 'object' && 'segments' in source),
    ...(styled === undefined ? {} : { style: resolveExplicitStyle(styled, context) }),
  };
};
