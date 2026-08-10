import type { BuiltinThemeStyleValue, ThemeModeValue } from '@retikz/core';

import { ThemeMode, ThemeStyle } from '@retikz/core';

import type { IRPlotAxisThemeTokenRules, IRPlotResolvedThemeTokens } from '../../../schemas';

import { PlotThemeToken } from '../../../schemas';

type AxisPresetSource = Readonly<{
  lineEnabled: boolean;
  lineStroke: string;
  lineStrokeWidth: number;
  lineDrawOpacity: number;
  tickMark: IRPlotResolvedThemeTokens['axis.tick.mark'];
  tickLabelEnabled: boolean;
  tickLabelForeground: string;
  tickLabelFontSize: number;
  tickLabelGap: number;
  titleForeground: string;
  titleFontSize: number;
  titleFontWeight: number;
  gridEnabled: boolean;
  gridStroke: string;
}>;

type AxisStylePreset = Pick<
  AxisPresetSource,
  'lineEnabled' | 'tickMark' | 'tickLabelFontSize' | 'tickLabelGap' | 'titleFontSize' | 'gridEnabled'
>;

type AxisModePreset = Pick<AxisPresetSource, 'lineStroke' | 'tickLabelForeground' | 'titleForeground' | 'gridStroke'>;
type AxisTokenPreset = Readonly<
  Pick<
    IRPlotResolvedThemeTokens,
    | typeof PlotThemeToken.AxisLineEnabled
    | typeof PlotThemeToken.AxisLineStroke
    | typeof PlotThemeToken.AxisLineStrokeWidth
    | typeof PlotThemeToken.AxisLineDrawOpacity
    | typeof PlotThemeToken.AxisTickMark
    | typeof PlotThemeToken.AxisTickLabelEnabled
    | typeof PlotThemeToken.AxisTickLabelForeground
    | typeof PlotThemeToken.AxisTickLabelFontSize
    | typeof PlotThemeToken.AxisTickLabelGap
    | typeof PlotThemeToken.AxisTitleForeground
    | typeof PlotThemeToken.AxisTitleFontSize
    | typeof PlotThemeToken.AxisTitleFontWeight
    | typeof PlotThemeToken.AxisGridEnabled
    | typeof PlotThemeToken.AxisGridStroke
    | typeof PlotThemeToken.AxisGridStrokeWidth
    | typeof PlotThemeToken.AxisGridDrawOpacity
  >
>;

const styles: Record<BuiltinThemeStyleValue, AxisStylePreset> = {
  [ThemeStyle.Neutral]: {
    lineEnabled: true,
    tickMark: { kind: 'line', length: 6 },
    tickLabelFontSize: 12,
    tickLabelGap: 4,
    titleFontSize: 12,
    gridEnabled: false,
  },
  [ThemeStyle.Academic]: {
    lineEnabled: true,
    tickMark: { kind: 'line', length: 4 },
    tickLabelFontSize: 11,
    tickLabelGap: 5,
    titleFontSize: 12,
    gridEnabled: false,
  },
  [ThemeStyle.Vibrant]: {
    lineEnabled: false,
    tickMark: false,
    tickLabelFontSize: 12,
    tickLabelGap: 6,
    titleFontSize: 13,
    gridEnabled: false,
  },
  [ThemeStyle.Clean]: {
    lineEnabled: false,
    tickMark: false,
    tickLabelFontSize: 11,
    tickLabelGap: 5,
    titleFontSize: 12,
    gridEnabled: false,
  },
};

const modes: Record<ThemeModeValue, AxisModePreset> = {
  [ThemeMode.Light]: {
    lineStroke: 'currentColor',
    tickLabelForeground: 'currentColor',
    titleForeground: 'currentColor',
    gridStroke: '#FFFFFF',
  },
  [ThemeMode.Dark]: {
    lineStroke: 'currentColor',
    tickLabelForeground: 'currentColor',
    titleForeground: 'currentColor',
    gridStroke: '#000000',
  },
};

/** 读取内建主题的 Axis preset，并把 line tick 绑定到有效轴线颜色 */
export const getAxisPreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): AxisTokenPreset => {
  const structure = styles[style];
  const paint = modes[mode];
  const gridStroke = style === ThemeStyle.Vibrant ? paint.gridStroke : 'currentColor';
  const tickMark =
    structure.tickMark !== false && structure.tickMark.kind === 'line'
      ? {
          ...structure.tickMark,
          line: { ...(structure.tickMark.line === false ? {} : structure.tickMark.line), stroke: paint.lineStroke },
        }
      : structure.tickMark;

  return {
    [PlotThemeToken.AxisLineEnabled]: structure.lineEnabled,
    [PlotThemeToken.AxisLineStroke]: paint.lineStroke,
    [PlotThemeToken.AxisLineStrokeWidth]: 1,
    [PlotThemeToken.AxisLineDrawOpacity]: 1,
    [PlotThemeToken.AxisTickMark]: tickMark,
    [PlotThemeToken.AxisTickLabelEnabled]: true,
    [PlotThemeToken.AxisTickLabelForeground]: paint.tickLabelForeground,
    [PlotThemeToken.AxisTickLabelFontSize]: structure.tickLabelFontSize,
    [PlotThemeToken.AxisTickLabelGap]: structure.tickLabelGap,
    [PlotThemeToken.AxisTitleForeground]: paint.titleForeground,
    [PlotThemeToken.AxisTitleFontSize]: structure.titleFontSize,
    [PlotThemeToken.AxisTitleFontWeight]: 600,
    [PlotThemeToken.AxisGridEnabled]: structure.gridEnabled,
    [PlotThemeToken.AxisGridStroke]: gridStroke,
    [PlotThemeToken.AxisGridStrokeWidth]: 1,
    [PlotThemeToken.AxisGridDrawOpacity]: 0.15,
  };
};

/** 读取内建主题的 Axis dimension 规则 */
export const getAxisTokenRules = (style: BuiltinThemeStyleValue): IRPlotAxisThemeTokenRules => {
  switch (style) {
    case ThemeStyle.Neutral:
      return [
        {
          select: { dimension: 'y' },
          tokens: { [PlotThemeToken.AxisGridEnabled]: true },
        },
      ];
    case ThemeStyle.Vibrant:
      return [
        {
          select: { dimension: ['x', 'y'] },
          tokens: { [PlotThemeToken.AxisGridEnabled]: true },
        },
      ];
    case ThemeStyle.Academic:
    case ThemeStyle.Clean:
      return [];
  }
};
