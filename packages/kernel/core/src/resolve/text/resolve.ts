import { resolveFont, resolveFontSize } from './font';
import { isMathSegment, parseInlineSegments } from './inline';
import type {
  CanonicalInlineSegment,
  CanonicalFont,
  CanonicalTextLineStyle,
  TextSegmentColorSource,
  InlineSegmentColorSource,
  TextLineResolution,
  TextLineResolveContext,
  TextLineSource,
} from './types';

const TEXT_TEX_PARSE_ERROR = 'TEXT_TEX_PARSE_ERROR';

/** 提取行级显式样式并换算字号，未声明的字段不补入继承值 */
const resolveExplicitStyle = (
  source: Exclude<TextLineSource, string>,
  context: TextLineResolveContext,
): CanonicalTextLineStyle => ({
  fill: source.fill,
  opacity: source.opacity,
  fontSize:
    source.font?.size === undefined
      ? undefined
      : resolveFontSize(source.font.size, {
          rootFontSize: context.rootFontSize,
          inheritedFontSize: context.inheritedFont.size,
        }),
  fontFamily: source.font?.family,
  fontWeight: source.font?.weight,
  fontStyle: source.font?.style,
});

/** 让文字或公式片段继承行级字体，并将字号换算为数值 */
const resolveSegment = (
  segment: InlineSegmentColorSource,
  inheritedFont: CanonicalFont,
  context: TextLineResolveContext,
): CanonicalInlineSegment => {
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

/** 解析单行文字与公式片段，补齐片段字体和行级外观，并保留纯文本内容与混排标记 */
export const resolveTextLine = (source: TextLineSource, context: TextLineResolveContext): TextLineResolution => {
  const styled = typeof source === 'object' ? source : undefined;
  const parsed =
    typeof source === 'string'
      ? parseInlineSegments(source, context.gatingOn)
      : 'segments' in source
        ? { segments: source.segments, hasMath: source.segments.some(isMathSegment), warn: false }
        : parseInlineSegments(source.text, context.gatingOn);
  if (parsed.warn && context.warn !== undefined) {
    context.warn(TEXT_TEX_PARSE_ERROR, context.warningMessage ?? 'Unbalanced `$` in text.');
  }

  const segments: Array<CanonicalInlineSegment> = [];
  let plainText = '';
  if (parsed.segments.length > 0) {
    const inheritedFont = resolveFont(styled?.font, context);
    for (const segment of parsed.segments) {
      const resolved = resolveSegment(segment, inheritedFont, context);
      if (styled !== undefined) {
        resolved.fill = segment.fill ?? styled.fill;
        resolved.opacity = segment.opacity ?? styled.opacity;
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
