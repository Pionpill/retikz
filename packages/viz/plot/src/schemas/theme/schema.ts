import { PaintValueSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import {
  AxisGridLineStyleSchema,
  AxisLineStyleSchema,
  AxisTickLabelLayoutSchema,
  AxisTickMarkSchema,
  AxisTitlePaddingSchema,
  GuideTextStyleSchema,
  LegendGuideStyleSchema,
} from '../guide';
import { ColorSchemeNameSchema } from '../scale';
import { PlotColorPaletteSchema, PlotShapePaletteSchema } from './style';

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
      gap: NonNegativeNumberSchema.optional().describe('Default gap between tick end and tick label center'),
      rotate: z.number().optional().describe('Default tick label rotation in degrees around the label center'),
      anchor: NonBlankStringSchema.optional().describe('Default semantic anchor hint for tick labels'),
      layout: AxisTickLabelLayoutSchema.optional().describe('Default tick label adaptive layout strategy'),
      ...GuideTextStyleSchema.shape,
    }),
  ])
  .describe('Theme defaults for axis tick labels. Tick label format is guide semantics and is not accepted here');

const ThemeAxisTitleSchema = z
  .union([
    z.literal(false),
    z.strictObject({
      padding: AxisTitlePaddingSchema.optional().describe('Default padding from tick labels to axis title center'),
      rotate: z.number().optional().describe('Default axis title rotation in degrees around the title center'),
      ...GuideTextStyleSchema.shape,
    }),
  ])
  .describe('Theme defaults for axis title visibility and style. Title text stays on the axis guide root');

const ThemeAxisGridSchema = z
  .strictObject({
    ...AxisGridLineStyleSchema.shape,
    includeDomain: z
      .boolean()
      .optional()
      .describe('Whether enabled major grid lines include effective scale-domain endpoints'),
  })
  .superRefine((grid, context) => {
    if (Object.hasOwn(grid, 'includeDomain') && grid.includeDomain === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['includeDomain'],
        message: 'Axis grid theme fields must omit unset values instead of using undefined',
        input: grid,
      });
    }
  })
  .describe('Theme defaults for major axis grid visibility, line style, and domain endpoint inclusion');

export const PlotAxisThemeSchema = z
  .strictObject({
    line: z
      .union([z.literal(false), AxisLineStyleSchema])
      .optional()
      .describe('Axis baseline default style; false hides baselines by default'),
    ticks: ThemeAxisTicksSchema.optional().describe('Axis tick mark default style'),
    tickLabels: ThemeAxisTickLabelsSchema.optional().describe('Axis tick label default style'),
    title: ThemeAxisTitleSchema.optional().describe('Axis title visibility and default style'),
    grid: z
      .union([z.literal(false), ThemeAxisGridSchema])
      .optional()
      .describe('Axis grid visibility, shared major line style, and domain endpoint defaults'),
  })
  .describe('Plot theme defaults for axis visual tokens');

export const PlotPaletteThemeSchema = z
  .strictObject({
    categorical: PlotColorPaletteSchema.optional().describe('Default categorical color palette'),
    series: PlotColorPaletteSchema.optional().describe('Default mark-series color palette'),
    sector: PlotColorPaletteSchema.optional().describe('Default sector color palette'),
    sequential: ColorSchemeNameSchema.optional().describe('Default sequential color scheme name'),
    diverging: ColorSchemeNameSchema.optional().describe('Default diverging color scheme name'),
    shape: PlotShapePaletteSchema.optional().describe('Default categorical shape palette'),
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
    palette: PlotPaletteThemeSchema.optional().describe('Plot color and shape palette defaults'),
  })
  .describe('JSON-safe plot theme consumed during plot lowering');
