import type { ThemeModeValue } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { IRPlotThemeTokenResolution } from '../../../schemas';

import { LegendSymbolFit, PlotThemeToken } from '../../../schemas';

type LegendPresetSource = Readonly<{
  titleForeground: string;
  titleFontSize: number;
  titleFontWeight: number;
  labelForeground: string;
  labelFontSize: number;
  swatchSize: number;
  swatchGap: number;
  entryGap: number;
  titleGap: number;
  rampLength: number;
  rampThickness: number;
  symbolSize: number;
  symbolScale: number;
  symbolFit: IRPlotThemeTokenResolution['legend.symbol.fit'];
}>;

type LegendStylePreset = Omit<LegendPresetSource, 'titleForeground' | 'labelForeground' | 'symbolScale' | 'symbolFit'>;
type LegendModePreset = Pick<LegendPresetSource, 'titleForeground' | 'labelForeground'>;
type LegendTokenPreset = Readonly<
  Pick<
    IRPlotThemeTokenResolution,
    | typeof PlotThemeToken.LegendTitleForeground
    | typeof PlotThemeToken.LegendTitleFontSize
    | typeof PlotThemeToken.LegendTitleFontWeight
    | typeof PlotThemeToken.LegendLabelForeground
    | typeof PlotThemeToken.LegendLabelFontSize
    | typeof PlotThemeToken.LegendSwatchSize
    | typeof PlotThemeToken.LegendSwatchGap
    | typeof PlotThemeToken.LegendEntryGap
    | typeof PlotThemeToken.LegendTitleGap
    | typeof PlotThemeToken.LegendRampLength
    | typeof PlotThemeToken.LegendRampThickness
    | typeof PlotThemeToken.LegendSymbolSize
    | typeof PlotThemeToken.LegendSymbolScale
    | typeof PlotThemeToken.LegendSymbolFit
  >
>;

const defaultStructure: LegendStylePreset = {
  titleFontSize: 12,
  titleFontWeight: 600,
  labelFontSize: 12,
  swatchSize: 14,
  swatchGap: 6,
  entryGap: 6,
  titleGap: 6,
  rampLength: 100,
  rampThickness: 12,
  symbolSize: 14,
};

const modes: Record<ThemeModeValue, LegendModePreset> = {
  [ThemeMode.Light]: {
    titleForeground: 'currentColor',
    labelForeground: 'currentColor',
  },
  [ThemeMode.Dark]: {
    titleForeground: 'currentColor',
    labelForeground: 'currentColor',
  },
};

/** 读取内建主题的 Legend preset */
export const getLegendPreset = (mode: ThemeModeValue): LegendTokenPreset => {
  const structure = defaultStructure;
  const paint = modes[mode];
  return {
    [PlotThemeToken.LegendTitleForeground]: paint.titleForeground,
    [PlotThemeToken.LegendTitleFontSize]: structure.titleFontSize,
    [PlotThemeToken.LegendTitleFontWeight]: structure.titleFontWeight,
    [PlotThemeToken.LegendLabelForeground]: paint.labelForeground,
    [PlotThemeToken.LegendLabelFontSize]: structure.labelFontSize,
    [PlotThemeToken.LegendSwatchSize]: structure.swatchSize,
    [PlotThemeToken.LegendSwatchGap]: structure.swatchGap,
    [PlotThemeToken.LegendEntryGap]: structure.entryGap,
    [PlotThemeToken.LegendTitleGap]: structure.titleGap,
    [PlotThemeToken.LegendRampLength]: structure.rampLength,
    [PlotThemeToken.LegendRampThickness]: structure.rampThickness,
    [PlotThemeToken.LegendSymbolSize]: structure.symbolSize,
    [PlotThemeToken.LegendSymbolScale]: 1,
    [PlotThemeToken.LegendSymbolFit]: LegendSymbolFit.Fit,
  };
};
