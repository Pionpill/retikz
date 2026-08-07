import type { IRPlotResolvedStyleTokens, IRPlotTheme, PlotStyleTokenValue } from '../../schemas';

import { PlotStyleToken, PlotThemeSchema } from '../../schemas';

type JsonObject = Record<string, unknown>;

/** 原生 Plot theme 覆盖到 canonical token 时的来源记录 */
export type PlotThemeTokenOverride = Readonly<{
  /** 被覆盖的 canonical token */
  token: PlotStyleTokenValue;
  /** 原生 Plot theme 中的 authored path */
  path: string;
}>;

const isPlainObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * 合并两个合法 Plot theme
 * @description array、scalar、false 与 discriminator change 整体替换；同 kind 的闭合 object 逐字段合并
 */
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

/** 对两个合法 Plot theme 做确定性的原子 merge */
export const mergePlotTheme = (base: IRPlotTheme, override: IRPlotTheme): IRPlotTheme =>
  PlotThemeSchema.parse(mergeThemeValue(base, override));

/** 把完整 Plot token map 映射为正式原生 Plot theme */
export const plotThemeFromTokens = (tokens: IRPlotResolvedStyleTokens): IRPlotTheme =>
  PlotThemeSchema.parse({
    background: tokens[PlotStyleToken.PlotSurfaceFill],
    typography: {
      font: {
        family: tokens[PlotStyleToken.PlotTypographyFontFamily],
        size: tokens[PlotStyleToken.PlotTypographyFontSize],
      },
      textColor: tokens[PlotStyleToken.PlotTypographyForeground],
    },
    labelText: {
      font: { size: tokens[PlotStyleToken.PlotLabelFontSize] },
      textColor: tokens[PlotStyleToken.PlotLabelForeground],
    },
    axis: {
      line: tokens[PlotStyleToken.AxisLineEnabled]
        ? {
            stroke: tokens[PlotStyleToken.AxisLineStroke],
            strokeWidth: tokens[PlotStyleToken.AxisLineStrokeWidth],
            drawOpacity: tokens[PlotStyleToken.AxisLineDrawOpacity],
          }
        : false,
      ticks: { mark: tokens[PlotStyleToken.AxisTickMark] },
      tickLabels: tokens[PlotStyleToken.AxisTickLabelEnabled]
        ? {
            gap: tokens[PlotStyleToken.AxisTickLabelGap],
            font: { size: tokens[PlotStyleToken.AxisTickLabelFontSize] },
            textColor: tokens[PlotStyleToken.AxisTickLabelForeground],
          }
        : false,
      title: {
        font: {
          size: tokens[PlotStyleToken.AxisTitleFontSize],
          weight: tokens[PlotStyleToken.AxisTitleFontWeight],
        },
        textColor: tokens[PlotStyleToken.AxisTitleForeground],
      },
      grid: {
        stroke: tokens[PlotStyleToken.AxisGridStroke],
        strokeWidth: tokens[PlotStyleToken.AxisGridStrokeWidth],
        drawOpacity: tokens[PlotStyleToken.AxisGridDrawOpacity],
      },
    },
    legend: {
      title: {
        font: {
          size: tokens[PlotStyleToken.LegendTitleFontSize],
          weight: tokens[PlotStyleToken.LegendTitleFontWeight],
        },
        textColor: tokens[PlotStyleToken.LegendTitleForeground],
      },
      label: {
        font: { size: tokens[PlotStyleToken.LegendLabelFontSize] },
        textColor: tokens[PlotStyleToken.LegendLabelForeground],
      },
      swatchSize: tokens[PlotStyleToken.LegendSwatchSize],
      swatchGap: tokens[PlotStyleToken.LegendSwatchGap],
      entryGap: tokens[PlotStyleToken.LegendEntryGap],
      titleGap: tokens[PlotStyleToken.LegendTitleGap],
      rampLength: tokens[PlotStyleToken.LegendRampLength],
      rampThickness: tokens[PlotStyleToken.LegendRampThickness],
      symbolSize: tokens[PlotStyleToken.LegendSymbolSize],
      symbolScale: tokens[PlotStyleToken.LegendSymbolScale],
      symbolFit: tokens[PlotStyleToken.LegendSymbolFit],
    },
    palette: {
      categorical: tokens[PlotStyleToken.PlotPaletteCategorical],
      series: tokens[PlotStyleToken.PlotPaletteSeries],
      sector: tokens[PlotStyleToken.PlotPaletteSector],
      sequential: tokens[PlotStyleToken.PlotPaletteSequential],
      diverging: tokens[PlotStyleToken.PlotPaletteDiverging],
    },
  });

type MutablePlotTokens = { -readonly [K in keyof IRPlotResolvedStyleTokens]: IRPlotResolvedStyleTokens[K] };

/**
 * 把原生 Plot theme 中可映射的 authored 值投影回 complete token map
 * @description 原生 theme 额外字段保留在最终 theme 中，不伪造并不存在的 canonical token
 */
export const applyPlotThemeToTokens = (
  baseTokens: IRPlotResolvedStyleTokens,
  resolvedTheme: IRPlotTheme,
  authoredTheme: IRPlotTheme,
): Readonly<{ tokens: IRPlotResolvedStyleTokens; overrides: Array<PlotThemeTokenOverride> }> => {
  const tokens: MutablePlotTokens = structuredClone(baseTokens);
  const overrides: Array<PlotThemeTokenOverride> = [];
  const set = <TToken extends PlotStyleTokenValue>(token: TToken, value: MutablePlotTokens[TToken], path: string) => {
    tokens[token] = structuredClone(value);
    overrides.push({ token, path });
  };
  const has = (value: object, key: PropertyKey): boolean => Object.hasOwn(value, key);

  if (has(authoredTheme, 'background')) {
    set(PlotStyleToken.PlotSurfaceFill, resolvedTheme.background!, '$spec/theme/background');
  }
  if (authoredTheme.typography !== undefined) {
    if (has(authoredTheme.typography, 'textColor')) {
      set(
        PlotStyleToken.PlotTypographyForeground,
        resolvedTheme.typography!.textColor!,
        '$spec/theme/typography/textColor',
      );
    }
    if (authoredTheme.typography.font !== undefined) {
      if (has(authoredTheme.typography.font, 'family')) {
        set(
          PlotStyleToken.PlotTypographyFontFamily,
          resolvedTheme.typography!.font!.family!,
          '$spec/theme/typography/font/family',
        );
      }
      if (has(authoredTheme.typography.font, 'size')) {
        set(
          PlotStyleToken.PlotTypographyFontSize,
          resolvedTheme.typography!.font!.size!,
          '$spec/theme/typography/font/size',
        );
      }
    }
  }
  if (authoredTheme.labelText !== undefined) {
    if (has(authoredTheme.labelText, 'textColor')) {
      set(PlotStyleToken.PlotLabelForeground, resolvedTheme.labelText!.textColor!, '$spec/theme/labelText/textColor');
    }
    if (authoredTheme.labelText.font !== undefined && has(authoredTheme.labelText.font, 'size')) {
      set(PlotStyleToken.PlotLabelFontSize, resolvedTheme.labelText!.font!.size!, '$spec/theme/labelText/font/size');
    }
  }

  const authoredAxis = authoredTheme.axis;
  const axis = resolvedTheme.axis;
  if (authoredAxis !== undefined && axis !== undefined) {
    if (has(authoredAxis, 'line')) {
      if (authoredAxis.line === false) {
        set(PlotStyleToken.AxisLineEnabled, false, '$spec/theme/axis/line');
      } else if (authoredAxis.line !== undefined && axis.line !== false && axis.line !== undefined) {
        set(PlotStyleToken.AxisLineEnabled, true, '$spec/theme/axis/line');
        if (has(authoredAxis.line, 'stroke')) {
          set(PlotStyleToken.AxisLineStroke, axis.line.stroke!, '$spec/theme/axis/line/stroke');
        }
        if (has(authoredAxis.line, 'strokeWidth')) {
          set(PlotStyleToken.AxisLineStrokeWidth, axis.line.strokeWidth!, '$spec/theme/axis/line/strokeWidth');
        }
        if (has(authoredAxis.line, 'drawOpacity')) {
          set(PlotStyleToken.AxisLineDrawOpacity, axis.line.drawOpacity!, '$spec/theme/axis/line/drawOpacity');
        }
      }
    }
    if (authoredAxis.ticks !== undefined && has(authoredAxis.ticks, 'mark')) {
      set(PlotStyleToken.AxisTickMark, axis.ticks!.mark!, '$spec/theme/axis/ticks/mark');
    }
    if (has(authoredAxis, 'tickLabels')) {
      if (authoredAxis.tickLabels === false) {
        set(PlotStyleToken.AxisTickLabelEnabled, false, '$spec/theme/axis/tickLabels');
      } else if (authoredAxis.tickLabels !== undefined && axis.tickLabels !== false && axis.tickLabels !== undefined) {
        set(PlotStyleToken.AxisTickLabelEnabled, true, '$spec/theme/axis/tickLabels');
        if (has(authoredAxis.tickLabels, 'textColor')) {
          set(
            PlotStyleToken.AxisTickLabelForeground,
            axis.tickLabels.textColor!,
            '$spec/theme/axis/tickLabels/textColor',
          );
        }
        if (has(authoredAxis.tickLabels, 'gap')) {
          set(PlotStyleToken.AxisTickLabelGap, axis.tickLabels.gap!, '$spec/theme/axis/tickLabels/gap');
        }
        if (authoredAxis.tickLabels.font !== undefined && has(authoredAxis.tickLabels.font, 'size')) {
          set(
            PlotStyleToken.AxisTickLabelFontSize,
            axis.tickLabels.font!.size!,
            '$spec/theme/axis/tickLabels/font/size',
          );
        }
      }
    }
    if (authoredAxis.title !== undefined && axis.title !== undefined) {
      if (has(authoredAxis.title, 'textColor')) {
        set(PlotStyleToken.AxisTitleForeground, axis.title.textColor!, '$spec/theme/axis/title/textColor');
      }
      if (authoredAxis.title.font !== undefined) {
        if (has(authoredAxis.title.font, 'size')) {
          set(PlotStyleToken.AxisTitleFontSize, axis.title.font!.size!, '$spec/theme/axis/title/font/size');
        }
        if (has(authoredAxis.title.font, 'weight')) {
          set(PlotStyleToken.AxisTitleFontWeight, axis.title.font!.weight!, '$spec/theme/axis/title/font/weight');
        }
      }
    }
    if (authoredAxis.grid !== undefined && axis.grid !== undefined) {
      if (has(authoredAxis.grid, 'stroke')) {
        set(PlotStyleToken.AxisGridStroke, axis.grid.stroke!, '$spec/theme/axis/grid/stroke');
      }
      if (has(authoredAxis.grid, 'strokeWidth')) {
        set(PlotStyleToken.AxisGridStrokeWidth, axis.grid.strokeWidth!, '$spec/theme/axis/grid/strokeWidth');
      }
      if (has(authoredAxis.grid, 'drawOpacity')) {
        set(PlotStyleToken.AxisGridDrawOpacity, axis.grid.drawOpacity!, '$spec/theme/axis/grid/drawOpacity');
      }
    }
  }

  const authoredLegend = authoredTheme.legend;
  const legend = resolvedTheme.legend;
  if (authoredLegend !== undefined && legend !== undefined) {
    if (authoredLegend.title !== undefined && legend.title !== undefined) {
      if (has(authoredLegend.title, 'textColor')) {
        set(PlotStyleToken.LegendTitleForeground, legend.title.textColor!, '$spec/theme/legend/title/textColor');
      }
      if (authoredLegend.title.font !== undefined) {
        if (has(authoredLegend.title.font, 'size')) {
          set(PlotStyleToken.LegendTitleFontSize, legend.title.font!.size!, '$spec/theme/legend/title/font/size');
        }
        if (has(authoredLegend.title.font, 'weight')) {
          set(PlotStyleToken.LegendTitleFontWeight, legend.title.font!.weight!, '$spec/theme/legend/title/font/weight');
        }
      }
    }
    if (authoredLegend.label !== undefined && legend.label !== undefined) {
      if (has(authoredLegend.label, 'textColor')) {
        set(PlotStyleToken.LegendLabelForeground, legend.label.textColor!, '$spec/theme/legend/label/textColor');
      }
      if (authoredLegend.label.font !== undefined && has(authoredLegend.label.font, 'size')) {
        set(PlotStyleToken.LegendLabelFontSize, legend.label.font!.size!, '$spec/theme/legend/label/font/size');
      }
    }
    const legendTokens = [
      [PlotStyleToken.LegendSwatchSize, 'swatchSize'],
      [PlotStyleToken.LegendSwatchGap, 'swatchGap'],
      [PlotStyleToken.LegendEntryGap, 'entryGap'],
      [PlotStyleToken.LegendTitleGap, 'titleGap'],
      [PlotStyleToken.LegendRampLength, 'rampLength'],
      [PlotStyleToken.LegendRampThickness, 'rampThickness'],
      [PlotStyleToken.LegendSymbolSize, 'symbolSize'],
      [PlotStyleToken.LegendSymbolScale, 'symbolScale'],
      [PlotStyleToken.LegendSymbolFit, 'symbolFit'],
    ] as const;
    for (const [token, field] of legendTokens) {
      if (has(authoredLegend, field)) set(token, legend[field]!, `$spec/theme/legend/${field}`);
    }
  }

  const authoredPalette = authoredTheme.palette;
  const palette = resolvedTheme.palette;
  if (authoredPalette !== undefined && palette !== undefined) {
    const paletteTokens = [
      [PlotStyleToken.PlotPaletteCategorical, 'categorical'],
      [PlotStyleToken.PlotPaletteSeries, 'series'],
      [PlotStyleToken.PlotPaletteSector, 'sector'],
      [PlotStyleToken.PlotPaletteSequential, 'sequential'],
      [PlotStyleToken.PlotPaletteDiverging, 'diverging'],
    ] as const;
    for (const [token, field] of paletteTokens) {
      if (has(authoredPalette, field)) set(token, palette[field]!, `$spec/theme/palette/${field}`);
    }
  }

  return { tokens, overrides };
};
