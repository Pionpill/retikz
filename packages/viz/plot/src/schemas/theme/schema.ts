import { z } from 'zod';

import {
  AxisLineStyleSchema,
  AxisTickLabelLayoutSchema,
  AxisTickMarkSchema,
  GuideLineStyleSchema,
  GuideTextStyleSchema,
  LegendGuideStyleSchema,
} from '../guide';

const ThemeAxisTicksSchema = z
  .object({
    mark: AxisTickMarkSchema.optional().describe('Axis tick mark visual default'),
  })
  .strict()
  .describe('Theme defaults for axis tick marks. Tick source and density are guide semantics and are not accepted here');

const ThemeAxisTickLabelsSchema = z
  .union([
    z.literal(false),
    z
      .object({
        gap: z.number().nonnegative().optional().describe('Default gap between tick end and tick label center'),
        rotate: z.number().optional().describe('Default tick label rotation in degrees around the label center'),
        anchor: z.string().min(1).optional().describe('Default semantic anchor hint for tick labels'),
        layout: AxisTickLabelLayoutSchema.optional().describe('Default tick label adaptive layout strategy'),
        ...GuideTextStyleSchema.shape,
      })
      .strict(),
  ])
  .describe('Theme defaults for axis tick labels. Tick label format is guide semantics and is not accepted here');

const ThemeAxisTitleSchema = z
  .object({
    gap: z.number().nonnegative().optional().describe('Default gap from tick labels to axis title center'),
    rotate: z.number().optional().describe('Default axis title rotation in degrees around the title center'),
    anchor: z.string().min(1).optional().describe('Default semantic anchor hint for axis titles'),
    ...GuideTextStyleSchema.shape,
  })
  .strict()
  .describe('Theme defaults for axis title style. Title text stays on the axis guide root');

export const PlotAxisThemeSchema = z
  .object({
    line: z
      .union([z.literal(false), AxisLineStyleSchema])
      .optional()
      .describe('Axis baseline default style; false hides baselines by default'),
    ticks: ThemeAxisTicksSchema.optional().describe('Axis tick mark default style'),
    tickLabels: ThemeAxisTickLabelsSchema.optional().describe('Axis tick label default style'),
    title: ThemeAxisTitleSchema.optional().describe('Axis title default style'),
    grid: GuideLineStyleSchema.optional().describe('Axis grid line default style. It does not enable grid by itself'),
  })
  .strict()
  .describe('Plot theme defaults for axis visual tokens');

export const PlotPaletteThemeSchema = z
  .object({
    categorical: z.array(z.string().min(1)).min(1).optional().describe('Default categorical color palette'),
    series: z.array(z.string().min(1)).min(1).optional().describe('Default mark-series color palette'),
    sector: z.array(z.string().min(1)).min(1).optional().describe('Default sector color palette'),
    sequential: z.string().min(1).optional().describe('Default sequential color scheme name'),
    diverging: z.string().min(1).optional().describe('Default diverging color scheme name'),
  })
  .strict()
  .describe('Plot palette defaults. Explicit scale range or scheme still has higher priority');

export const PlotThemeSchema = z
  .object({
    background: z.string().min(1).optional().describe('Plot panel background fill. Omit to keep the panel transparent'),
    typography: GuideTextStyleSchema.optional().describe('Global guide text defaults'),
    axis: PlotAxisThemeSchema.optional().describe('Axis visual defaults'),
    legend: LegendGuideStyleSchema.optional().describe('Legend visual defaults'),
    palette: PlotPaletteThemeSchema.optional().describe('Plot color palette defaults'),
  })
  .strict()
  .describe('JSON-safe plot theme consumed during plot lowering');
