import type { IRNode, IRPath } from '@retikz/core';

import type { AxisGuide, LegendGuide, PlotTheme } from '../../schemas';

import { LegendSymbolFit } from '../../schemas';
import { DEFAULT_PLOT_COLORS, PlotColorScheme } from '../scale/shared';

type GuidePathStyle = Partial<Pick<IRPath, 'stroke' | 'strokeWidth' | 'drawOpacity' | 'dashPattern' | 'dashOffset' | 'lineCap'>>;
type GuideTextStyle = Partial<Pick<IRNode, 'font' | 'textColor' | 'opacity' | 'align' | 'lineHeight' | 'maxTextWidth' | 'rotate'>>;
type AxisTicksToken = NonNullable<AxisGuide['ticks']>;
type AxisTitleToken = Exclude<NonNullable<AxisGuide['title']>, string>;
type AxisGridToken = Exclude<NonNullable<AxisGuide['grid']>, boolean>;
type LegendStyle = NonNullable<LegendGuide['style']>;

/** Plot palette 解析结果：所有默认配色入口收敛到一个对象。 */
export type ResolvedPlotPalette = {
  /** 分类 scale 默认颜色。 */
  categorical: Array<string>;
  /** 无 color 编码的 mark / series 默认颜色。 */
  series: Array<string>;
  /** sector / pie 默认颜色。 */
  sector: Array<string>;
  /** 连续单向色阶默认 scheme。 */
  sequential: string;
  /** 发散色阶默认 scheme。 */
  diverging: string;
};

/** Plot legend 解析后的视觉 token。 */
export type ResolvedLegendGuideTokens = Required<
  Pick<
    LegendStyle,
    | 'swatchSize'
    | 'swatchGap'
    | 'entryGap'
    | 'titleGap'
    | 'rampLength'
    | 'rampThickness'
    | 'symbolSize'
    | 'symbolScale'
    | 'symbolFit'
  >
> & {
  /** Legend title 文本样式。 */
  title: GuideTextStyle;
  /** Legend label 文本样式。 */
  label: GuideTextStyle;
};

/** Plot theme 解析结果：lowering 只消费 resolved token，不直接读原始 theme。 */
export type ResolvedPlotTheme = {
  /** 可选背景填充；省略表示透明。 */
  background?: string;
  /** 全局 guide 文本默认样式。 */
  typography: GuideTextStyle;
  /** 解析后的 palette。 */
  palette: ResolvedPlotPalette;
  /** Axis 视觉默认值。 */
  axis: NonNullable<PlotTheme['axis']>;
  /** Legend 视觉默认值。 */
  legend: ResolvedLegendGuideTokens;
  /** Plot label 文本默认样式。 */
  labelText: GuideTextStyle;
};

const DEFAULT_TYPOGRAPHY: GuideTextStyle = { font: { size: 12 }, textColor: 'currentColor' };

const DEFAULT_LEGEND: ResolvedLegendGuideTokens = {
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

const mergeTextStyle = (base: GuideTextStyle | undefined, override: GuideTextStyle | undefined): GuideTextStyle => {
  if (base === undefined) return override === undefined ? {} : { ...override };
  if (override === undefined) return { ...base };
  return {
    ...base,
    ...override,
    ...(base.font !== undefined || override.font !== undefined
      ? { font: { ...(base.font ?? {}), ...(override.font ?? {}) } }
      : {}),
  };
};

const mergePathStyle = <T extends GuidePathStyle>(base: GuidePathStyle | undefined, override: T | undefined): T => {
  if (base === undefined) return override === undefined ? ({} as T) : { ...override };
  if (override === undefined) return { ...base } as T;
  return { ...base, ...override };
};

const resolvePalette = (
  palette: PlotTheme['palette'] | undefined,
  colors: ReadonlyArray<string> | undefined,
): ResolvedPlotPalette => {
  const categorical = [...(palette?.categorical ?? colors ?? DEFAULT_PLOT_COLORS)];
  return {
    categorical,
    series: [...(palette?.series ?? palette?.categorical ?? colors ?? DEFAULT_PLOT_COLORS)],
    sector: [...(palette?.sector ?? palette?.categorical ?? colors ?? DEFAULT_PLOT_COLORS)],
    sequential: palette?.sequential ?? PlotColorScheme.Viridis,
    diverging: palette?.diverging ?? PlotColorScheme.RdBu,
  };
};

/**
 * 解析 PlotSpec.theme。
 * @description 只处理视觉 token、typography、palette 和 background；domain、tick source、format 等语义字段不进入 theme。
 */
export const resolvePlotTheme = (
  theme: PlotTheme | undefined,
  colors: ReadonlyArray<string> | undefined,
): ResolvedPlotTheme => {
  const typography = mergeTextStyle(DEFAULT_TYPOGRAPHY, theme?.typography);
  const legend = theme?.legend;
  return {
    ...(theme?.background !== undefined ? { background: theme.background } : {}),
    typography,
    palette: resolvePalette(theme?.palette, colors),
    axis: theme?.axis ?? {},
    labelText: mergeTextStyle(typography, theme?.labelText),
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
      title: mergeTextStyle(typography, legend?.title),
      label: mergeTextStyle(typography, legend?.label),
    },
  };
};

const mergeAxisTicks = (
  theme: NonNullable<PlotTheme['axis']>['ticks'] | undefined,
  local: AxisGuide['ticks'],
): AxisGuide['ticks'] => {
  if (theme === undefined) return local;
  const themeMark = theme.mark;
  const lineMarkFromShorthand = (): AxisTicksToken['mark'] => {
    const themeLineMark = themeMark !== undefined && themeMark !== false && themeMark.kind === 'line' ? themeMark : undefined;
    const line =
      local?.line === false
        ? false
        : local?.line !== undefined
          ? mergePathStyle(themeLineMark?.line === false ? undefined : themeLineMark?.line, local.line)
          : themeLineMark?.line;
    return {
      ...(themeLineMark ?? { kind: 'line' as const }),
      ...(local?.length !== undefined ? { length: local.length } : {}),
      ...(line !== undefined ? { line } : {}),
    };
  };
  const usesLineShorthand = local?.mark === undefined && (local?.length !== undefined || local?.line !== undefined);
  if (usesLineShorthand) {
    const rest = { ...local };
    delete rest.length;
    delete rest.line;
    return { ...rest, mark: lineMarkFromShorthand() } satisfies AxisTicksToken;
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
      return { ...themeMark, ...local.mark, ...(line !== undefined ? { line } : {}) };
    }
    return { ...themeMark, ...local.mark };
  })();
  return {
    ...(local ?? {}),
    ...(mark !== undefined ? { mark } : {}),
  } satisfies AxisTicksToken;
};

const mergeAxisTickLabels = (
  theme: NonNullable<PlotTheme['axis']>['tickLabels'] | undefined,
  local: AxisGuide['tickLabels'],
): AxisGuide['tickLabels'] => {
  if (local === false) return false;
  if (theme === false && local === undefined) return false;
  if (theme === undefined) return local;
  if (theme === false) return local;
  return { ...theme, ...(local ?? {}), ...mergeTextStyle(theme, local) };
};

const mergeAxisTitle = (
  theme: NonNullable<PlotTheme['axis']>['title'] | undefined,
  local: AxisGuide['title'],
): AxisGuide['title'] => {
  if (local === undefined) return undefined;
  if (typeof local === 'string') return theme === undefined ? local : { text: local, ...theme };
  const themeTitle = theme === undefined ? undefined : { ...theme };
  if (local.orientation !== undefined && local.rotate === undefined && themeTitle !== undefined) {
    delete themeTitle.rotate;
  }
  return {
    ...themeTitle,
    ...local,
    ...mergeTextStyle(themeTitle, local),
  } satisfies AxisTitleToken;
};

const mergeAxisGrid = (
  theme: NonNullable<PlotTheme['axis']>['grid'] | undefined,
  local: AxisGuide['grid'],
): AxisGuide['grid'] => {
  if (local === undefined || local === false || theme === undefined) return local;
  if (local === true) return mergePathStyle(theme, undefined) satisfies AxisGridToken;
  return { ...mergePathStyle(theme, local), ...local };
};

/**
 * 合并 axis guide 的主题 token。
 * @description 只合并 line/tick line/tick label/title/grid 的视觉字段；ticks.values、ticks.count、tickLabels.format、title.text 和 grid projection 保持 local 语义。
 */
export const resolveAxisGuideTokens = (theme: ResolvedPlotTheme, guide: AxisGuide): AxisGuide => ({
  ...guide,
  ...(theme.axis.line !== undefined
    ? { line: guide.line === false ? false : guide.line === undefined ? theme.axis.line : mergePathStyle(theme.axis.line === false ? undefined : theme.axis.line, guide.line) }
    : {}),
  ...(theme.axis.ticks !== undefined || guide.ticks !== undefined ? { ticks: mergeAxisTicks(theme.axis.ticks, guide.ticks) } : {}),
  ...(theme.axis.tickLabels !== undefined || guide.tickLabels !== undefined
    ? { tickLabels: mergeAxisTickLabels(theme.axis.tickLabels, guide.tickLabels) }
    : {}),
  ...(theme.axis.title !== undefined || guide.title !== undefined ? { title: mergeAxisTitle(theme.axis.title, guide.title) } : {}),
  ...(theme.axis.grid !== undefined || guide.grid !== undefined ? { grid: mergeAxisGrid(theme.axis.grid, guide.grid) } : {}),
});

/**
 * 合并 legend guide 的主题 token。
 * @description position、orient、channel、scale、ticks、tickLabels.format 等语义字段不参与合并。
 */
export const resolveLegendGuideTokens = (
  theme: ResolvedPlotTheme,
  local: LegendStyle | undefined,
): ResolvedLegendGuideTokens => ({
  swatchSize: local?.swatchSize ?? theme.legend.swatchSize,
  swatchGap: local?.swatchGap ?? theme.legend.swatchGap,
  entryGap: local?.entryGap ?? theme.legend.entryGap,
  titleGap: local?.titleGap ?? theme.legend.titleGap,
  rampLength: local?.rampLength ?? theme.legend.rampLength,
  rampThickness: local?.rampThickness ?? theme.legend.rampThickness,
  symbolSize: local?.symbolSize ?? local?.swatchSize ?? theme.legend.symbolSize,
  symbolScale: local?.symbolScale ?? theme.legend.symbolScale,
  symbolFit: local?.symbolFit ?? theme.legend.symbolFit,
  title: mergeTextStyle(theme.legend.title, local?.title),
  label: mergeTextStyle(theme.legend.label, local?.label),
});
