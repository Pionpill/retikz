import type { IRPlotTheme } from '@retikz/plot';

import { PlotThemeSchema } from '@retikz/plot';

import type { IRChartResolvedStyleTokens } from './types';

import { ChartStyleToken } from './constants';

type JsonObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** 合并 JSON theme：object 保留 sibling，array/scalar/false 与 discriminator change 整体替换 */
const mergeThemeValue = (base: unknown, override: unknown): unknown => {
  if (override === undefined) return structuredClone(base);
  if (!isPlainObject(base) || !isPlainObject(override)) return structuredClone(override);
  if (typeof base.kind === 'string' && typeof override.kind === 'string' && base.kind !== override.kind) {
    return structuredClone(override);
  }
  const result: JsonObject = structuredClone(base);
  for (const [key, value] of Object.entries(override)) result[key] = mergeThemeValue(result[key], value);
  return result;
};

/** 对两个合法 Plot theme 做确定性的语义 merge */
export const mergeChartPlotTheme = (base: IRPlotTheme, override: IRPlotTheme): IRPlotTheme =>
  PlotThemeSchema.parse(mergeThemeValue(base, override));

/** 把 Chart visual-language token 映射到 Plot 正式 theme contract */
export const plotThemeFromChartTokens = (tokens: IRChartResolvedStyleTokens): IRPlotTheme =>
  PlotThemeSchema.parse({
    background: tokens[ChartStyleToken.PlotSurfaceFill],
    typography: {
      font: { family: tokens[ChartStyleToken.ChartFontFamily] },
      textColor: tokens[ChartStyleToken.PlotForeground],
    },
    labelText: {
      font: {
        family: tokens[ChartStyleToken.ChartFontFamily],
        size: tokens[ChartStyleToken.PlotLabelFontSize],
      },
      textColor: tokens[ChartStyleToken.PlotLabelForeground],
    },
    axis: {
      line: tokens[ChartStyleToken.AxisLineEnabled]
        ? {
            stroke: tokens[ChartStyleToken.AxisLineStroke],
            strokeWidth: tokens[ChartStyleToken.AxisLineStrokeWidth],
            drawOpacity: tokens[ChartStyleToken.AxisLineDrawOpacity],
          }
        : false,
      ticks: { mark: tokens[ChartStyleToken.AxisTickMark] },
      tickLabels: tokens[ChartStyleToken.AxisTickLabelEnabled]
        ? {
            gap: tokens[ChartStyleToken.AxisTickLabelGap],
            font: {
              family: tokens[ChartStyleToken.ChartFontFamily],
              size: tokens[ChartStyleToken.AxisTickLabelFontSize],
            },
            textColor: tokens[ChartStyleToken.AxisTickLabelForeground],
          }
        : false,
      title: {
        font: {
          family: tokens[ChartStyleToken.ChartFontFamily],
          size: tokens[ChartStyleToken.AxisTitleFontSize],
          weight: tokens[ChartStyleToken.AxisTitleFontWeight],
        },
        textColor: tokens[ChartStyleToken.AxisTitleForeground],
      },
      grid: {
        stroke: tokens[ChartStyleToken.AxisGridStroke],
        strokeWidth: tokens[ChartStyleToken.AxisGridStrokeWidth],
        drawOpacity: tokens[ChartStyleToken.AxisGridDrawOpacity],
      },
    },
    legend: {
      title: {
        font: {
          family: tokens[ChartStyleToken.ChartFontFamily],
          size: tokens[ChartStyleToken.LegendTitleFontSize],
          weight: tokens[ChartStyleToken.LegendTitleFontWeight],
        },
        textColor: tokens[ChartStyleToken.LegendTitleForeground],
      },
      label: {
        font: {
          family: tokens[ChartStyleToken.ChartFontFamily],
          size: tokens[ChartStyleToken.LegendLabelFontSize],
        },
        textColor: tokens[ChartStyleToken.LegendLabelForeground],
      },
      swatchSize: tokens[ChartStyleToken.LegendSwatchSize],
      swatchGap: tokens[ChartStyleToken.LegendSwatchGap],
      entryGap: tokens[ChartStyleToken.LegendEntryGap],
      titleGap: tokens[ChartStyleToken.LegendTitleGap],
      rampLength: tokens[ChartStyleToken.LegendRampLength],
      rampThickness: tokens[ChartStyleToken.LegendRampThickness],
      symbolSize: tokens[ChartStyleToken.LegendSymbolSize],
      symbolScale: tokens[ChartStyleToken.LegendSymbolScale],
      symbolFit: tokens[ChartStyleToken.LegendSymbolFit],
    },
    palette: {
      categorical: tokens[ChartStyleToken.DataPaletteCategorical],
      series: tokens[ChartStyleToken.DataPaletteSeries],
      sector: tokens[ChartStyleToken.DataPaletteSector],
      sequential: tokens[ChartStyleToken.DataPaletteSequential],
      diverging: tokens[ChartStyleToken.DataPaletteDiverging],
    },
  });

/** 应用 colors shorthand 后再应用 raw Plot theme */
export const materializeChartPlotTheme = (
  tokens: IRChartResolvedStyleTokens,
  colors: ReadonlyArray<string> | undefined,
  rawTheme: IRPlotTheme | undefined,
  recipeTheme: IRPlotTheme | undefined = undefined,
): IRPlotTheme => {
  const tokenTheme = plotThemeFromChartTokens(tokens);
  const colorsTheme: IRPlotTheme =
    colors === undefined ? {} : { palette: { categorical: [...colors], series: [...colors], sector: [...colors] } };
  const withPreset = recipeTheme === undefined ? tokenTheme : mergeChartPlotTheme(recipeTheme, tokenTheme);
  const withColors = mergeChartPlotTheme(withPreset, colorsTheme);
  return rawTheme === undefined ? withColors : mergeChartPlotTheme(withColors, rawTheme);
};
