import type { IRPlotAxisTheme, IRPlotResolvedThemeTokens, IRPlotTheme, PlotThemeTokenValue } from '../../schemas';

import { PlotThemeSchema, PlotThemeToken } from '../../schemas';

type JsonObject = Record<string, unknown>;

/** 原生 Plot theme 覆盖到 canonical token 时的来源记录 */
export type PlotThemeTokenOverride = Readonly<{
  /** 被覆盖的 canonical token */
  token: PlotThemeTokenValue;
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
  for (const [key, value] of Object.entries(override)) {
    result[key] = mergeThemeValue(result[key], value);
  }
  return result;
};

/** 对两个合法 Plot theme 做确定性的原子 merge */
export const mergePlotTheme = (base: IRPlotTheme, override: IRPlotTheme): IRPlotTheme =>
  PlotThemeSchema.parse(mergeThemeValue(base, override));

/** 把完整 Plot token map 中的 Axis token 映射为原生 Axis theme */
export const plotAxisThemeFromTokens = (tokens: IRPlotResolvedThemeTokens): IRPlotAxisTheme => ({
  line: tokens[PlotThemeToken.AxisLineEnabled]
    ? {
        stroke: tokens[PlotThemeToken.AxisLineStroke],
        strokeWidth: tokens[PlotThemeToken.AxisLineStrokeWidth],
        drawOpacity: tokens[PlotThemeToken.AxisLineDrawOpacity],
      }
    : false,
  ticks: { mark: tokens[PlotThemeToken.AxisTickMark] },
  tickLabels: tokens[PlotThemeToken.AxisTickLabelEnabled]
    ? {
        gap: tokens[PlotThemeToken.AxisTickLabelGap],
        font: { size: tokens[PlotThemeToken.AxisTickLabelFontSize] },
        textColor: tokens[PlotThemeToken.AxisTickLabelForeground],
      }
    : false,
  title: tokens[PlotThemeToken.AxisTitleEnabled]
    ? {
        padding: tokens[PlotThemeToken.AxisTitlePadding],
        font: {
          size: tokens[PlotThemeToken.AxisTitleFontSize],
          weight: tokens[PlotThemeToken.AxisTitleFontWeight],
        },
        textColor: tokens[PlotThemeToken.AxisTitleForeground],
      }
    : false,
  grid: tokens[PlotThemeToken.AxisGridEnabled]
    ? {
        stroke: tokens[PlotThemeToken.AxisGridStroke],
        strokeWidth: tokens[PlotThemeToken.AxisGridStrokeWidth],
        drawOpacity: tokens[PlotThemeToken.AxisGridDrawOpacity],
        includeDomain: tokens[PlotThemeToken.AxisGridIncludeDomain],
      }
    : false,
});

/** 把完整 Plot token map 映射为正式原生 Plot theme */
export const plotThemeFromTokens = (tokens: IRPlotResolvedThemeTokens): IRPlotTheme =>
  PlotThemeSchema.parse({
    plotArea: { fill: tokens[PlotThemeToken.PlotAreaFill] },
    typography: {
      font: {
        family: tokens[PlotThemeToken.PlotTypographyFontFamily],
        size: tokens[PlotThemeToken.PlotTypographyFontSize],
      },
      textColor: tokens[PlotThemeToken.PlotTypographyForeground],
    },
    axis: plotAxisThemeFromTokens(tokens),
    legend: {
      title: {
        font: {
          size: tokens[PlotThemeToken.LegendTitleFontSize],
          weight: tokens[PlotThemeToken.LegendTitleFontWeight],
        },
        textColor: tokens[PlotThemeToken.LegendTitleForeground],
      },
      label: {
        font: { size: tokens[PlotThemeToken.LegendLabelFontSize] },
        textColor: tokens[PlotThemeToken.LegendLabelForeground],
      },
      swatchSize: tokens[PlotThemeToken.LegendSwatchSize],
      swatchGap: tokens[PlotThemeToken.LegendSwatchGap],
      entryGap: tokens[PlotThemeToken.LegendEntryGap],
      titleGap: tokens[PlotThemeToken.LegendTitleGap],
      rampLength: tokens[PlotThemeToken.LegendRampLength],
      rampThickness: tokens[PlotThemeToken.LegendRampThickness],
      symbolSize: tokens[PlotThemeToken.LegendSymbolSize],
      symbolScale: tokens[PlotThemeToken.LegendSymbolScale],
      symbolFit: tokens[PlotThemeToken.LegendSymbolFit],
    },
    palette: {
      categorical: tokens[PlotThemeToken.PlotPaletteCategorical],
      series: tokens[PlotThemeToken.PlotPaletteSeries],
      sector: tokens[PlotThemeToken.PlotPaletteSector],
      sequential: tokens[PlotThemeToken.PlotPaletteSequential],
      diverging: tokens[PlotThemeToken.PlotPaletteDiverging],
    },
  });

type MutablePlotTokens = { -readonly [K in keyof IRPlotResolvedThemeTokens]: IRPlotResolvedThemeTokens[K] };

/**
 * 把原生 Plot theme 中可映射的 authored 值投影回 complete token map
 * @description 原生 theme 额外字段保留在最终 theme 中，不伪造并不存在的 canonical token
 */
export const applyPlotThemeToTokens = (
  baseTokens: IRPlotResolvedThemeTokens,
  resolvedTheme: IRPlotTheme,
  authoredTheme: IRPlotTheme,
): Readonly<{ tokens: IRPlotResolvedThemeTokens; overrides: Array<PlotThemeTokenOverride> }> => {
  const tokens: MutablePlotTokens = structuredClone(baseTokens);
  const overrides: Array<PlotThemeTokenOverride> = [];
  const set = <TToken extends PlotThemeTokenValue>(token: TToken, value: MutablePlotTokens[TToken], path: string) => {
    tokens[token] = structuredClone(value);
    overrides.push({ token, path });
  };
  const has = (value: object, key: PropertyKey): boolean => Object.hasOwn(value, key);

  if (authoredTheme.plotArea !== undefined && has(authoredTheme.plotArea, 'fill')) {
    set(PlotThemeToken.PlotAreaFill, resolvedTheme.plotArea!.fill!, '$spec/plotTheme/plotArea/fill');
  }
  if (authoredTheme.typography !== undefined) {
    if (has(authoredTheme.typography, 'textColor')) {
      set(
        PlotThemeToken.PlotTypographyForeground,
        resolvedTheme.typography!.textColor!,
        '$spec/plotTheme/typography/textColor',
      );
    }
    if (authoredTheme.typography.font !== undefined) {
      if (has(authoredTheme.typography.font, 'family')) {
        set(
          PlotThemeToken.PlotTypographyFontFamily,
          resolvedTheme.typography!.font!.family!,
          '$spec/plotTheme/typography/font/family',
        );
      }
      if (has(authoredTheme.typography.font, 'size')) {
        set(
          PlotThemeToken.PlotTypographyFontSize,
          resolvedTheme.typography!.font!.size!,
          '$spec/plotTheme/typography/font/size',
        );
      }
    }
  }
  const authoredAxis = authoredTheme.axis;
  const axis = resolvedTheme.axis;
  if (authoredAxis !== undefined && axis !== undefined) {
    if (has(authoredAxis, 'line')) {
      if (authoredAxis.line === false) {
        set(PlotThemeToken.AxisLineEnabled, false, '$spec/plotTheme/axis/line');
      } else if (authoredAxis.line !== undefined && axis.line !== false && axis.line !== undefined) {
        set(PlotThemeToken.AxisLineEnabled, true, '$spec/plotTheme/axis/line');
        if (has(authoredAxis.line, 'stroke')) {
          set(PlotThemeToken.AxisLineStroke, axis.line.stroke!, '$spec/plotTheme/axis/line/stroke');
        }
        if (has(authoredAxis.line, 'strokeWidth')) {
          set(PlotThemeToken.AxisLineStrokeWidth, axis.line.strokeWidth!, '$spec/plotTheme/axis/line/strokeWidth');
        }
        if (has(authoredAxis.line, 'drawOpacity')) {
          set(PlotThemeToken.AxisLineDrawOpacity, axis.line.drawOpacity!, '$spec/plotTheme/axis/line/drawOpacity');
        }
      }
    }
    if (authoredAxis.ticks !== undefined && has(authoredAxis.ticks, 'mark')) {
      set(PlotThemeToken.AxisTickMark, axis.ticks!.mark!, '$spec/plotTheme/axis/ticks/mark');
    }
    if (has(authoredAxis, 'tickLabels')) {
      if (authoredAxis.tickLabels === false) {
        set(PlotThemeToken.AxisTickLabelEnabled, false, '$spec/plotTheme/axis/tickLabels');
      } else if (authoredAxis.tickLabels !== undefined && axis.tickLabels !== false && axis.tickLabels !== undefined) {
        set(PlotThemeToken.AxisTickLabelEnabled, true, '$spec/plotTheme/axis/tickLabels');
        if (has(authoredAxis.tickLabels, 'textColor')) {
          set(
            PlotThemeToken.AxisTickLabelForeground,
            axis.tickLabels.textColor!,
            '$spec/plotTheme/axis/tickLabels/textColor',
          );
        }
        if (has(authoredAxis.tickLabels, 'gap')) {
          set(PlotThemeToken.AxisTickLabelGap, axis.tickLabels.gap!, '$spec/plotTheme/axis/tickLabels/gap');
        }
        if (authoredAxis.tickLabels.font !== undefined && has(authoredAxis.tickLabels.font, 'size')) {
          set(
            PlotThemeToken.AxisTickLabelFontSize,
            axis.tickLabels.font!.size!,
            '$spec/plotTheme/axis/tickLabels/font/size',
          );
        }
      }
    }
    if (has(authoredAxis, 'title')) {
      if (authoredAxis.title === false) {
        set(PlotThemeToken.AxisTitleEnabled, false, '$spec/plotTheme/axis/title');
      } else if (authoredAxis.title !== undefined && axis.title !== false && axis.title !== undefined) {
        set(PlotThemeToken.AxisTitleEnabled, true, '$spec/plotTheme/axis/title');
        if (has(authoredAxis.title, 'padding')) {
          set(PlotThemeToken.AxisTitlePadding, axis.title.padding!, '$spec/plotTheme/axis/title/padding');
        }
        if (has(authoredAxis.title, 'textColor')) {
          set(PlotThemeToken.AxisTitleForeground, axis.title.textColor!, '$spec/plotTheme/axis/title/textColor');
        }
        if (authoredAxis.title.font !== undefined) {
          if (has(authoredAxis.title.font, 'size')) {
            set(PlotThemeToken.AxisTitleFontSize, axis.title.font!.size!, '$spec/plotTheme/axis/title/font/size');
          }
          if (has(authoredAxis.title.font, 'weight')) {
            set(PlotThemeToken.AxisTitleFontWeight, axis.title.font!.weight!, '$spec/plotTheme/axis/title/font/weight');
          }
        }
      }
    }
    if (authoredAxis.grid !== undefined && axis.grid !== undefined) {
      if (authoredAxis.grid === false) {
        set(PlotThemeToken.AxisGridEnabled, false, '$spec/plotTheme/axis/grid');
      } else if (axis.grid !== false) {
        set(PlotThemeToken.AxisGridEnabled, true, '$spec/plotTheme/axis/grid');
        if (has(authoredAxis.grid, 'stroke')) {
          set(PlotThemeToken.AxisGridStroke, axis.grid.stroke!, '$spec/plotTheme/axis/grid/stroke');
        }
        if (has(authoredAxis.grid, 'strokeWidth')) {
          set(PlotThemeToken.AxisGridStrokeWidth, axis.grid.strokeWidth!, '$spec/plotTheme/axis/grid/strokeWidth');
        }
        if (has(authoredAxis.grid, 'drawOpacity')) {
          set(PlotThemeToken.AxisGridDrawOpacity, axis.grid.drawOpacity!, '$spec/plotTheme/axis/grid/drawOpacity');
        }
        if (has(authoredAxis.grid, 'includeDomain')) {
          set(
            PlotThemeToken.AxisGridIncludeDomain,
            axis.grid.includeDomain!,
            '$spec/plotTheme/axis/grid/includeDomain',
          );
        }
      }
    }
  }

  const authoredLegend = authoredTheme.legend;
  const legend = resolvedTheme.legend;
  if (authoredLegend !== undefined && legend !== undefined) {
    if (authoredLegend.title !== undefined && legend.title !== undefined) {
      if (has(authoredLegend.title, 'textColor')) {
        set(PlotThemeToken.LegendTitleForeground, legend.title.textColor!, '$spec/plotTheme/legend/title/textColor');
      }
      if (authoredLegend.title.font !== undefined) {
        if (has(authoredLegend.title.font, 'size')) {
          set(PlotThemeToken.LegendTitleFontSize, legend.title.font!.size!, '$spec/plotTheme/legend/title/font/size');
        }
        if (has(authoredLegend.title.font, 'weight')) {
          set(
            PlotThemeToken.LegendTitleFontWeight,
            legend.title.font!.weight!,
            '$spec/plotTheme/legend/title/font/weight',
          );
        }
      }
    }
    if (authoredLegend.label !== undefined && legend.label !== undefined) {
      if (has(authoredLegend.label, 'textColor')) {
        set(PlotThemeToken.LegendLabelForeground, legend.label.textColor!, '$spec/plotTheme/legend/label/textColor');
      }
      if (authoredLegend.label.font !== undefined && has(authoredLegend.label.font, 'size')) {
        set(PlotThemeToken.LegendLabelFontSize, legend.label.font!.size!, '$spec/plotTheme/legend/label/font/size');
      }
    }
    const legendTokens = [
      [PlotThemeToken.LegendSwatchSize, 'swatchSize'],
      [PlotThemeToken.LegendSwatchGap, 'swatchGap'],
      [PlotThemeToken.LegendEntryGap, 'entryGap'],
      [PlotThemeToken.LegendTitleGap, 'titleGap'],
      [PlotThemeToken.LegendRampLength, 'rampLength'],
      [PlotThemeToken.LegendRampThickness, 'rampThickness'],
      [PlotThemeToken.LegendSymbolSize, 'symbolSize'],
      [PlotThemeToken.LegendSymbolScale, 'symbolScale'],
      [PlotThemeToken.LegendSymbolFit, 'symbolFit'],
    ] as const;
    for (const [token, field] of legendTokens) {
      if (has(authoredLegend, field)) set(token, legend[field]!, `$spec/plotTheme/legend/${field}`);
    }
  }

  const authoredPalette = authoredTheme.palette;
  const palette = resolvedTheme.palette;
  if (authoredPalette !== undefined && palette !== undefined) {
    const paletteTokens = [
      [PlotThemeToken.PlotPaletteCategorical, 'categorical'],
      [PlotThemeToken.PlotPaletteSeries, 'series'],
      [PlotThemeToken.PlotPaletteSector, 'sector'],
      [PlotThemeToken.PlotPaletteSequential, 'sequential'],
      [PlotThemeToken.PlotPaletteDiverging, 'diverging'],
    ] as const;
    for (const [token, field] of paletteTokens) {
      if (has(authoredPalette, field)) set(token, palette[field]!, `$spec/plotTheme/palette/${field}`);
    }
  }

  return { tokens, overrides };
};
