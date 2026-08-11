import type { ThemeModeValue } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

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
  titleEnabled: boolean;
  titleForeground: string;
  titleFontSize: number;
  titleFontWeight: number;
  titlePadding: number;
  gridEnabled: boolean;
  gridStroke: string;
  gridIncludeDomain: boolean;
}>;

type AxisStylePreset = Pick<
  AxisPresetSource,
  | 'lineEnabled'
  | 'tickMark'
  | 'tickLabelFontSize'
  | 'tickLabelGap'
  | 'titleEnabled'
  | 'titleFontSize'
  | 'titlePadding'
  | 'gridEnabled'
  | 'gridIncludeDomain'
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
    | typeof PlotThemeToken.AxisTitleEnabled
    | typeof PlotThemeToken.AxisTitleForeground
    | typeof PlotThemeToken.AxisTitleFontSize
    | typeof PlotThemeToken.AxisTitleFontWeight
    | typeof PlotThemeToken.AxisTitlePadding
    | typeof PlotThemeToken.AxisGridEnabled
    | typeof PlotThemeToken.AxisGridStroke
    | typeof PlotThemeToken.AxisGridStrokeWidth
    | typeof PlotThemeToken.AxisGridDrawOpacity
    | typeof PlotThemeToken.AxisGridIncludeDomain
  >
>;

const defaultStructure: AxisStylePreset = {
  lineEnabled: true,
  tickMark: { kind: 'line', length: 6 },
  tickLabelFontSize: 12,
  tickLabelGap: 4,
  titleEnabled: true,
  titleFontSize: 12,
  titlePadding: 12,
  gridEnabled: false,
  gridIncludeDomain: false,
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
export const getAxisPreset = (mode: ThemeModeValue): AxisTokenPreset => {
  const structure = defaultStructure;
  const paint = modes[mode];
  const gridStroke = 'currentColor';
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
    [PlotThemeToken.AxisTitleEnabled]: structure.titleEnabled,
    [PlotThemeToken.AxisTitleForeground]: paint.titleForeground,
    [PlotThemeToken.AxisTitleFontSize]: structure.titleFontSize,
    [PlotThemeToken.AxisTitleFontWeight]: 600,
    [PlotThemeToken.AxisTitlePadding]: structure.titlePadding,
    [PlotThemeToken.AxisGridEnabled]: structure.gridEnabled,
    [PlotThemeToken.AxisGridStroke]: gridStroke,
    [PlotThemeToken.AxisGridStrokeWidth]: 1,
    [PlotThemeToken.AxisGridDrawOpacity]: 0.15,
    [PlotThemeToken.AxisGridIncludeDomain]: structure.gridIncludeDomain,
  };
};

/** 读取内建主题的 Axis dimension 规则 */
export const getAxisTokenRules = (): IRPlotAxisThemeTokenRules => [
  {
    select: { dimension: ['x', 'y'] },
    tokens: {
      [PlotThemeToken.AxisGridEnabled]: true,
      [PlotThemeToken.AxisGridIncludeDomain]: true,
    },
  },
];
