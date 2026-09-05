import { CssColorSchema, PaintValueSchema, ShapeValueSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { array, boolean, literal, number, strictObject, union } from 'zod';

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

/** Plot 数据颜色使用的非空有序 CSS color palette */
export const PlotColorPaletteSchema = array(CssColorSchema).min(1).describe('Non-empty ordered Plot color palette');

/** Plot shape 分类通道使用的非空有序 shape palette */
export const PlotShapePaletteSchema = array(ShapeValueSchema).min(1).describe('Non-empty ordered Plot shape palette');

const PlotAxisTicksDefaultsSchema = strictObject({
  mark: AxisTickMarkSchema.optional().describe('Axis tick mark visual default'),
}).describe(
  'Plot Source defaults for axis tick marks. Tick source and density are guide semantics and are not accepted here',
);

const PlotAxisTickLabelsDefaultsSchema = union([
  literal(false),
  strictObject({
    gap: NonNegativeNumberSchema.optional().describe('Default gap between tick end and tick label center'),
    rotate: number().optional().describe('Default tick label rotation in degrees around the label center'),
    anchor: NonBlankStringSchema.optional().describe('Default semantic anchor hint for tick labels'),
    layout: AxisTickLabelLayoutSchema.optional().describe('Default tick label adaptive layout strategy'),
    ...GuideTextStyleSchema.shape,
  }),
]).describe('Plot Source defaults for axis tick labels. Tick label format is guide semantics and is not accepted here');

const PlotAxisTitleDefaultsSchema = union([
  literal(false),
  strictObject({
    padding: AxisTitlePaddingSchema.optional().describe('Default padding from tick labels to axis title center'),
    rotate: number().optional().describe('Default axis title rotation in degrees around the title center'),
    ...GuideTextStyleSchema.shape,
  }),
]).describe('Plot Source defaults for axis title visibility and visual style. Title text stays on the axis guide root');

const PlotAxisGridDefaultsSchema = strictObject({
  ...AxisGridLineStyleSchema.shape,
  includeDomain: boolean()
    .optional()
    .describe('Whether enabled major grid lines include effective scale-domain endpoints'),
}).describe('Plot Source defaults for major axis grid visibility, line style, and domain endpoint inclusion');

/** Plot Source 的 Axis 视觉默认片段 */
export const PlotAxisDefaultsSchema = strictObject({
  line: union([literal(false), AxisLineStyleSchema])
    .optional()
    .describe('Default style for existing axis baselines; false hides them by default'),
  ticks: PlotAxisTicksDefaultsSchema.optional().describe('Default visual style for existing axis tick marks'),
  tickLabels: PlotAxisTickLabelsDefaultsSchema.optional().describe(
    'Default visual style for existing axis tick labels',
  ),
  title: PlotAxisTitleDefaultsSchema.optional().describe(
    'Default visibility and visual style for existing axis titles',
  ),
  grid: union([literal(false), PlotAxisGridDefaultsSchema])
    .optional()
    .describe('Default visibility and visual style for existing axis grids'),
}).describe('Sparse Plot Source defaults for existing Axis visuals');

/** Plot Source 的 palette 视觉默认片段，不包含未被 Plot 消费的 sector palette */
export const PlotPaletteDefaultsSchema = strictObject({
  categorical: PlotColorPaletteSchema.optional().describe('Default categorical color palette'),
  series: PlotColorPaletteSchema.optional().describe('Default mark-series color palette'),
  sequential: ColorSchemeNameSchema.optional().describe('Default sequential color scheme name'),
  diverging: ColorSchemeNameSchema.optional().describe('Default diverging color scheme name'),
  shape: PlotShapePaletteSchema.optional().describe('Default categorical shape palette'),
}).describe('Sparse Plot Source palette defaults');

/** Plot Source 的绘图区视觉默认片段 */
export const PlotAreaDefaultsSchema = strictObject({
  fill: PaintValueSchema.optional().describe('Plot area background fill'),
}).describe('Sparse Plot Source defaults for the plot area');

/** Plot Source 的全局 guide typography 视觉默认片段 */
export const PlotTypographyDefaultsSchema = strictObject({
  ...GuideTextStyleSchema.shape,
  textColor: CssColorSchema.optional().describe('Global guide foreground master color'),
}).describe('Sparse Plot Source defaults for guide typography');

/** Plot Source 的稀疏视觉默认片段，复用正式 Plot 字段路径 */
export const PlotDefaultsSchema = strictObject({
  plotArea: PlotAreaDefaultsSchema.optional().describe('Plot area visual defaults'),
  typography: PlotTypographyDefaultsSchema.optional().describe('Global guide typography defaults'),
  axis: PlotAxisDefaultsSchema.optional().describe('Axis visual defaults for existing axes'),
  legend: LegendGuideStyleSchema.optional().describe('Legend visual defaults for existing legends'),
  palette: PlotPaletteDefaultsSchema.optional().describe('Color and shape palette defaults'),
}).describe('Sparse Plot Source defaults for existing Plot visuals');
