import type { IRFont } from '../../schemas';
import type {
  CanonicalInlineRun,
  ResolvedTextLineStyle,
  ResolvedTextRun,
  SourceInlineRun,
  TextLineResolution,
  TextLineResolveContext,
  TextLineSource,
} from './types';

import { resolveFont, resolveFontSize } from './font';
import { isMathRun, parseInlineRuns } from './inline';

const TEXT_TEX_PARSE_ERROR = 'TEXT_TEX_PARSE_ERROR';

/** 仅保留作者显式写出的 StyledLine 样式 */
const resolveExplicitStyle = (
  source: Exclude<TextLineSource, string | { runs: Array<SourceInlineRun> }>,
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

/** 将 Source text run 的字体确定化 */
const resolveRun = (
  run: SourceInlineRun,
  lineFont: IRFont | undefined,
  context: TextLineResolveContext,
): CanonicalInlineRun => {
  if (isMathRun(run)) return run;
  const sourceFont = run.font ?? lineFont;
  const resolved: Omit<ResolvedTextRun, 'font'> & { font: ReturnType<typeof resolveFont> } = {
    ...run,
    font: resolveFont(sourceFont, context),
  };
  return resolved;
};

/** 确定单行文字的 shorthand、样式、字体与混排形态 */
export const resolveTextLine = (source: TextLineSource, context: TextLineResolveContext): TextLineResolution => {
  const styled = typeof source === 'object' && !('runs' in source) ? source : undefined;
  const parsed =
    typeof source === 'string'
      ? parseInlineRuns(source, context.gatingOn)
      : 'runs' in source
        ? { runs: source.runs, hasMath: source.runs.some(isMathRun), warn: false }
        : parseInlineRuns(source.text, context.gatingOn);
  if (parsed.warn && context.warn !== undefined) {
    context.warn(TEXT_TEX_PARSE_ERROR, context.warningMessage ?? 'Unbalanced `$` in text.');
  }
  const foldedRuns = styled
    ? parsed.runs.map(run =>
        isMathRun(run)
          ? { ...run, fill: run.fill ?? styled.fill, opacity: run.opacity ?? styled.opacity }
          : {
              ...run,
              fill: run.fill ?? styled.fill,
              opacity: run.opacity ?? styled.opacity,
            },
      )
    : parsed.runs;
  const runs = foldedRuns.map(run => resolveRun(run, styled?.font, context));
  return {
    runs,
    plainText: runs.map(run => (isMathRun(run) ? '' : run.text)).join(''),
    hasMath: parsed.hasMath,
    mixed: parsed.hasMath || (typeof source === 'object' && 'runs' in source),
    ...(styled === undefined ? {} : { style: resolveExplicitStyle(styled, context) }),
  };
};
