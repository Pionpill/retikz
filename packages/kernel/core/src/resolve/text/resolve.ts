import type { IRFont } from '../../schemas';
import { resolveFont, resolveFontSize } from './font';
import { isMathSegment, parseInlineSegments } from './inline';
import type {
  CanonicalInlineSegment,
  ResolvedTextLineStyle,
  ResolvedTextSegment,
  SourceInlineSegment,
  TextLineResolution,
  TextLineResolveContext,
  TextLineSource,
} from './types';

const TEXT_TEX_PARSE_ERROR = 'TEXT_TEX_PARSE_ERROR';

/** 仅保留作者显式写出的 TextLine 样式 */
const resolveExplicitStyle = (
  source: Exclude<TextLineSource, string>,
  context: TextLineResolveContext,
): ResolvedTextLineStyle => ({
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

/** 将 Source text segment 的字体确定化 */
const resolveSegment = (
  segment: SourceInlineSegment,
  lineFont: IRFont | undefined,
  context: TextLineResolveContext,
): CanonicalInlineSegment => {
  const inheritedFont = resolveFont(lineFont, context);
  if (isMathSegment(segment))
    return {
      ...segment,
      fontSize: resolveFontSize(segment.fontSize, {
        rootFontSize: context.rootFontSize,
        inheritedFontSize: inheritedFont.size,
      }),
    };

  const sourceFont = segment.font;
  const resolved: Omit<ResolvedTextSegment, 'font'> & { font: ReturnType<typeof resolveFont> } = {
    ...segment,
    font: resolveFont(sourceFont, { ...context, inheritedFont }),
  };

  return resolved;
};

/** 确定单行文字的 shorthand、样式、字体与混排形态 */
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

  const foldedSegments = styled
    ? parsed.segments.map(segment =>
        isMathSegment(segment)
          ? { ...segment, fill: segment.fill ?? styled.fill, opacity: segment.opacity ?? styled.opacity }
          : {
              ...segment,
              fill: segment.fill ?? styled.fill,
              opacity: segment.opacity ?? styled.opacity,
            },
      )
    : parsed.segments;
  const segments = foldedSegments.map(segment => resolveSegment(segment, styled?.font, context));

  return {
    segments,
    plainText: segments.map(segment => (isMathSegment(segment) ? '' : segment.text)).join(''),
    hasMath: parsed.hasMath,
    mixed: parsed.hasMath || (typeof source === 'object' && 'segments' in source),
    ...(styled === undefined ? {} : { style: resolveExplicitStyle(styled, context) }),
  };
};
