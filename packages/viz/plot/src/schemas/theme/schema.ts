import { PaintValueSchema } from '@retikz/core';
import { z } from 'zod';

import {
  AxisGridLineStyleSchema,
  AxisLineStyleSchema,
  AxisTickLabelLayoutSchema,
  AxisTickMarkSchema,
  GuideTextStyleSchema,
  LegendGuideStyleSchema,
} from '../guide';
import { ColorSchemeNameSchema } from '../scale';
import { PlotColorPaletteSchema } from './style';

const ThemeAxisTicksSchema = z
  .strictObject({
    mark: AxisTickMarkSchema.optional().describe('Axis tick mark visual default'),
  })
  .describe(
    'Theme defaults for axis tick marks. Tick source and density are guide semantics and are not accepted here',
  );

const ThemeAxisTickLabelsSchema = z
  .union([
    z.literal(false),
    z.strictObject({
      gap: z.number().nonnegative().optional().describe('Default gap between tick end and tick label center'),
      rotate: z.number().optional().describe('Default tick label rotation in degrees around the label center'),
      anchor: z.string().min(1).optional().describe('Default semantic anchor hint for tick labels'),
      layout: AxisTickLabelLayoutSchema.optional().describe('Default tick label adaptive layout strategy'),
      ...GuideTextStyleSchema.shape,
    }),
  ])
  .describe('Theme defaults for axis tick labels. Tick label format is guide semantics and is not accepted here');

const ThemeAxisTitleSchema = z
  .strictObject({
    padding: z.number().nonnegative().optional().describe('Default padding from tick labels to axis title center'),
    rotate: z.number().optional().describe('Default axis title rotation in degrees around the title center'),
    ...GuideTextStyleSchema.shape,
  })
  .describe('Theme defaults for axis title style. Title text stays on the axis guide root');

export const PlotAxisThemeSchema = z
  .strictObject({
    line: z
      .union([z.literal(false), AxisLineStyleSchema])
      .optional()
      .describe('Axis baseline default style; false hides baselines by default'),
    ticks: ThemeAxisTicksSchema.optional().describe('Axis tick mark default style'),
    tickLabels: ThemeAxisTickLabelsSchema.optional().describe('Axis tick label default style'),
    title: ThemeAxisTitleSchema.optional().describe('Axis title default style'),
    grid: AxisGridLineStyleSchema.optional().describe(
      'Axis grid line default style. It does not enable grid by itself',
    ),
  })
  .describe('Plot theme defaults for axis visual tokens');

export const PlotPaletteThemeSchema = z
  .strictObject({
    categorical: PlotColorPaletteSchema.optional().describe('Default categorical color palette'),
    series: PlotColorPaletteSchema.optional().describe('Default mark-series color palette'),
    sector: PlotColorPaletteSchema.optional().describe('Default sector color palette'),
    sequential: ColorSchemeNameSchema.optional().describe('Default sequential color scheme name'),
    diverging: ColorSchemeNameSchema.optional().describe('Default diverging color scheme name'),
  })
  .describe('Plot palette defaults. Explicit scale range or scheme still has higher priority');

export const PlotAreaThemeSchema = z
  .strictObject({
    fill: PaintValueSchema.optional().describe('Plot area background fill'),
  })
  .describe('Plot area visual defaults');

export const PlotThemeSchema = z
  .strictObject({
    plotArea: PlotAreaThemeSchema.optional().describe('Plot area visual defaults'),
    typography: GuideTextStyleSchema.optional().describe('Global guide text defaults'),
    axis: PlotAxisThemeSchema.optional().describe('Axis visual defaults'),
    legend: LegendGuideStyleSchema.optional().describe('Legend visual defaults'),
    palette: PlotPaletteThemeSchema.optional().describe('Plot color palette defaults'),
  })
  .describe('JSON-safe plot theme consumed during plot lowering');
