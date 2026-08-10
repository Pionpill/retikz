import type { BuiltinThemeStyleValue, ThemeModeValue } from '@retikz/core';

import { ThemeMode, ThemeStyle } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../../schemas';

import { LegendSymbolFit } from '../../../schemas';

type LegendPreset = Readonly<{
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
  symbolFit: IRPlotResolvedThemeTokens['legend.symbol.fit'];
}>;

type LegendStylePreset = Omit<LegendPreset, 'titleForeground' | 'labelForeground' | 'symbolScale' | 'symbolFit'>;
type LegendModePreset = Pick<LegendPreset, 'titleForeground' | 'labelForeground'>;

const styles: Record<BuiltinThemeStyleValue, LegendStylePreset> = {
  [ThemeStyle.Neutral]: {
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
  },
  [ThemeStyle.Academic]: {
    titleFontSize: 12,
    titleFontWeight: 600,
    labelFontSize: 11,
    swatchSize: 12,
    swatchGap: 6,
    entryGap: 6,
    titleGap: 6,
    rampLength: 100,
    rampThickness: 10,
    symbolSize: 12,
  },
  [ThemeStyle.Vibrant]: {
    titleFontSize: 13,
    titleFontWeight: 700,
    labelFontSize: 12,
    swatchSize: 14,
    swatchGap: 7,
    entryGap: 8,
    titleGap: 8,
    rampLength: 112,
    rampThickness: 14,
    symbolSize: 14,
  },
  [ThemeStyle.Clean]: {
    titleFontSize: 12,
    titleFontWeight: 600,
    labelFontSize: 11,
    swatchSize: 12,
    swatchGap: 6,
    entryGap: 6,
    titleGap: 6,
    rampLength: 96,
    rampThickness: 10,
    symbolSize: 12,
  },
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
export const getLegendPreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): LegendPreset => ({
  ...styles[style],
  ...modes[mode],
  symbolScale: 1,
  symbolFit: LegendSymbolFit.Fit,
});
