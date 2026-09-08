import type { IRPath } from '@retikz/core';

import type {
  IRPlotAxisDefaults,
  IRPlotAxisGuide,
  IRPlotDefaults,
  IRPlotLegendGuide,
  IRPlotThemeResolution,
} from '../../schemas';
import type { EffectiveLegendGuideTokens, EffectivePlotGuideTheme, EffectivePlotPalette } from './types';

import { LegendSymbolFit } from '../../schemas';
import { mergeGuideTextStyle } from './mapping';
import { resolvePlotAxisDefaults } from './token-rule';

type GuidePathStyle = Partial<
  Pick<
    NonNullable<IRPath['style']>,
    'stroke' | 'strokeWidth' | 'strokeOpacity' | 'dashPattern' | 'dashOffset' | 'lineCap'
  >
> & {
  drawOpacity?: number;
};
type PlotTypographyStyle = NonNullable<IRPlotDefaults['typography']>;
type AxisTicksDefaults = NonNullable<IRPlotAxisDefaults['ticks']>;
type AxisTitleDefaults = Exclude<NonNullable<IRPlotAxisDefaults['title']>, false>;
type LegendStyle = NonNullable<IRPlotLegendGuide['style']>;

const DEFAULT_TYPOGRAPHY: PlotTypographyStyle = {
  font: { family: 'sans-serif', size: 12 },
  textColor: 'currentColor',
};

const DEFAULT_LEGEND: EffectiveLegendGuideTokens = {
  swatchSize: 14,
  swatchGap: 6,
  entryGap: 6,
  titleGap: 6,
  rampLength: 100,
  rampThickness: 12,
  symbolSize: 14,
  symbolScale: 1,
  symbolFit: LegendSymbolFit.Fit,
  title: DEFAULT_TYPOGRAPHY,
  label: DEFAULT_TYPOGRAPHY,
};

const mergePathStyle = <T extends GuidePathStyle>(base: GuidePathStyle | undefined, override: T | undefined): T => {
  if (base === undefined) return override === undefined ? ({} as T) : { ...override };
  if (override === undefined) return { ...base } as T;
  return { ...base, ...override };
};

const guideThemeFromDefaults = (defaults: IRPlotDefaults, palette: EffectivePlotPalette): EffectivePlotGuideTheme => {
  const typography = mergeGuideTextStyle(DEFAULT_TYPOGRAPHY, defaults.typography);
  const legend = defaults.legend;
  return {
    ...(defaults.plotArea === undefined ? {} : { plotArea: structuredClone(defaults.plotArea) }),
    typography,
    palette: structuredClone(palette),
    axis: defaults.axis ?? {},
    legend: {
      swatchSize: legend?.swatchSize ?? DEFAULT_LEGEND.swatchSize,
      swatchGap: legend?.swatchGap ?? DEFAULT_LEGEND.swatchGap,
      entryGap: legend?.entryGap ?? DEFAULT_LEGEND.entryGap,
      titleGap: legend?.titleGap ?? DEFAULT_LEGEND.titleGap,
      rampLength: legend?.rampLength ?? DEFAULT_LEGEND.rampLength,
      rampThickness: legend?.rampThickness ?? DEFAULT_LEGEND.rampThickness,
      symbolSize: legend?.symbolSize ?? legend?.swatchSize ?? DEFAULT_LEGEND.symbolSize,
      symbolScale: legend?.symbolScale ?? DEFAULT_LEGEND.symbolScale,
      symbolFit: legend?.symbolFit ?? DEFAULT_LEGEND.symbolFit,
      title: mergeGuideTextStyle(typography, legend?.title),
      label: mergeGuideTextStyle(typography, legend?.label),
    },
  };
};

/** 把解析完成的 Plot defaults 转成 guide lowering 消费态 */
export const resolvePlotGuideTheme = (resolution: IRPlotThemeResolution): EffectivePlotGuideTheme =>
  guideThemeFromDefaults(resolution.defaults, resolution.palette);

/** 为一个既有 Axis dimension 解析其匹配规则后的 guide 默认值 */
export const resolvePlotAxisGuideTheme = (
  resolution: IRPlotThemeResolution,
  dimension: string,
): EffectivePlotGuideTheme =>
  guideThemeFromDefaults(resolvePlotAxisDefaults(resolution, dimension), resolution.palette);

const mergeAxisTicks = (
  theme: IRPlotAxisDefaults['ticks'] | undefined,
  local: IRPlotAxisGuide['ticks'],
): IRPlotAxisGuide['ticks'] => {
  if (theme === undefined) return local;
  const themeMark = theme.mark;
  const lineMarkFromShorthand = (): AxisTicksDefaults['mark'] => {
    const themeLineMark =
      themeMark !== undefined && themeMark !== false && themeMark.kind === 'line' ? themeMark : undefined;
    const line =
      local?.line === false
        ? false
        : local?.line !== undefined
          ? mergePathStyle(themeLineMark?.line === false ? undefined : themeLineMark?.line, local.line)
          : themeLineMark?.line;
    return {
      ...(themeLineMark ?? { kind: 'line' as const }),
      ...(local?.length === undefined ? {} : { length: local.length }),
      ...(line === undefined ? {} : { line }),
    };
  };
  const usesLineShorthand = local?.mark === undefined && (local?.length !== undefined || local?.line !== undefined);
  if (usesLineShorthand) {
    const rest = { ...local };
    delete rest.length;
    delete rest.line;
    return { ...rest, mark: lineMarkFromShorthand() } satisfies NonNullable<IRPlotAxisGuide['ticks']>;
  }
  const mark = (() => {
    if (local?.mark === false) return false;
    if (local?.mark === undefined) return themeMark;
    if (themeMark === undefined || themeMark === false || themeMark.kind !== local.mark.kind) return local.mark;
    if (local.mark.kind === 'line') {
      if (themeMark.kind !== 'line') return local.mark;
      const line =
        local.mark.line === false
          ? false
          : local.mark.line !== undefined
            ? mergePathStyle(themeMark.line === false ? undefined : themeMark.line, local.mark.line)
            : themeMark.line;
      return { ...themeMark, ...local.mark, ...(line === undefined ? {} : { line }) };
    }
    return { ...themeMark, ...local.mark };
  })();
  return {
    ...(local ?? {}),
    ...(mark === undefined ? {} : { mark }),
  } satisfies NonNullable<IRPlotAxisGuide['ticks']>;
};

const mergeAxisTickLabels = (
  theme: IRPlotAxisDefaults['tickLabels'] | undefined,
  local: IRPlotAxisGuide['tickLabels'],
): IRPlotAxisGuide['tickLabels'] => {
  if (local === false) return false;
  if (theme === false && local === undefined) return false;
  if (theme === undefined) return local;
  if (theme === false) return local;
  return { ...theme, ...(local ?? {}), ...mergeGuideTextStyle(theme, local) };
};

const mergeAxisTitle = (
  theme: IRPlotAxisDefaults['title'] | undefined,
  local: IRPlotAxisGuide['title'],
): IRPlotAxisGuide['title'] => {
  if (local === undefined) return undefined;
  if (typeof local === 'string') return theme === undefined || theme === false ? local : { text: local, ...theme };
  const themeTitle: AxisTitleDefaults | undefined = theme === undefined || theme === false ? undefined : { ...theme };
  if (local.orientation !== undefined && local.rotate === undefined && themeTitle !== undefined) {
    delete themeTitle.rotate;
  }
  return {
    ...themeTitle,
    ...local,
    ...mergeGuideTextStyle(themeTitle, local),
  } satisfies Exclude<NonNullable<IRPlotAxisGuide['title']>, string>;
};

const mergeAxisGrid = (
  theme: IRPlotAxisDefaults['grid'] | undefined,
  local: IRPlotAxisGuide['grid'],
): IRPlotAxisGuide['grid'] => {
  if (local === false) return false;
  if (theme === undefined) return local;
  if (theme === false) return local ?? false;
  if (local === undefined || local === true) return { ...theme };
  return { ...mergePathStyle(theme, local), ...local };
};

/**
 * 合并 axis guide 的 Plot defaults。
 * @description 合并 line/tick line/tick label/title 的视觉字段，以及 grid 视觉与 domain endpoint 默认；ticks.values、ticks.count、tickLabels.format、title.text 和 grid projection 保持 local 语义
 */
export const resolveAxisGuideTokens = (theme: EffectivePlotGuideTheme, guide: IRPlotAxisGuide): IRPlotAxisGuide => ({
  ...guide,
  ...(theme.axis.line === undefined
    ? {}
    : {
        line:
          guide.line === false
            ? false
            : guide.line === undefined
              ? theme.axis.line
              : mergePathStyle(theme.axis.line === false ? undefined : theme.axis.line, guide.line),
      }),
  ...(theme.axis.ticks === undefined && guide.ticks === undefined
    ? {}
    : { ticks: mergeAxisTicks(theme.axis.ticks, guide.ticks) }),
  tickLabels: mergeAxisTickLabels(
    theme.axis.tickLabels === false
      ? false
      : {
          ...(theme.axis.tickLabels ?? {}),
          ...mergeGuideTextStyle(theme.typography, theme.axis.tickLabels),
        },
    guide.tickLabels,
  ),
  ...(guide.title === undefined
    ? {}
    : {
        title: mergeAxisTitle(
          theme.axis.title === false
            ? false
            : {
                ...(theme.axis.title ?? {}),
                ...mergeGuideTextStyle(theme.typography, theme.axis.title),
              },
          guide.title,
        ),
      }),
  ...(theme.axis.grid === undefined && guide.grid === undefined
    ? {}
    : { grid: mergeAxisGrid(theme.axis.grid, guide.grid) }),
});

/**
 * 合并 legend guide 的 Plot defaults。
 * @description position、orient、channel、scale、ticks、tickLabels.format 等语义字段不参与合并
 */
export const resolveLegendGuideTokens = (
  theme: EffectivePlotGuideTheme,
  local: LegendStyle | undefined,
): EffectiveLegendGuideTokens => ({
  swatchSize: local?.swatchSize ?? theme.legend.swatchSize,
  swatchGap: local?.swatchGap ?? theme.legend.swatchGap,
  entryGap: local?.entryGap ?? theme.legend.entryGap,
  titleGap: local?.titleGap ?? theme.legend.titleGap,
  rampLength: local?.rampLength ?? theme.legend.rampLength,
  rampThickness: local?.rampThickness ?? theme.legend.rampThickness,
  symbolSize: local?.symbolSize ?? local?.swatchSize ?? theme.legend.symbolSize,
  symbolScale: local?.symbolScale ?? theme.legend.symbolScale,
  symbolFit: local?.symbolFit ?? theme.legend.symbolFit,
  title: mergeGuideTextStyle(theme.legend.title, local?.title),
  label: mergeGuideTextStyle(theme.legend.label, local?.label),
});
